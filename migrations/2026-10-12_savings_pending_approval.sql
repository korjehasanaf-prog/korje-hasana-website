-- ============================================================
-- নতুন সঞ্চয় হিসাব: প্রাথমিক জমা ম্যানুয়াল বা নগদ হলে হিসাব
-- "অনুমোদনের অপেক্ষায়" (pending_approval) অবস্থায় খোলে; এডমিন
-- জমাটি অনুমোদন দিলে হিসাব চালু (active) হয়।
--  • নগদে রেফারেন্স/মন্তব্য লাগে না
--  • ম্যানুয়াল মাধ্যমে রেফারেন্স বা মন্তব্য লাগবেই
--  • হিসাব খোলা ও জমা একই লেনদেনে — একটি ব্যর্থ হলে কিছুই খোলে না
-- গেটওয়ে পেমেন্টের পথ আগের মতোই (হিসাব খুলে তারপর পরিশোধ)।
-- ============================================================

-- 1) নতুন স্ট্যাটাস
alter table savings_accounts drop constraint if exists savings_accounts_status_check;
alter table savings_accounts add constraint savings_accounts_status_check
  check (status = any (array['active'::text, 'pending_approval'::text, 'frozen'::text, 'closed'::text]));

-- 2) জমা: অপেক্ষারত হিসাবেও নেওয়া যাবে; ম্যানুয়াল (নগদ ছাড়া) জমায় রেফারেন্স বা মন্তব্য বাধ্যতামূলক
create or replace function public.deposit_to_savings(p_account uuid, p_reference text default null::text, p_notes text default null::text, p_amount numeric default null::numeric, p_method text default null::text)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $function$
declare
  a        savings_accounts;
  st       jsonb;
  v_amt    numeric;
  v_month  date;
  v_id     uuid;
  v_ref    text := nullif(trim(coalesce(p_reference,'')), '');
  v_method text := nullif(lower(trim(coalesce(p_method,''))), '');
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  select * into a from savings_accounts where id = p_account;
  if a.id is null then raise exception 'হিসাব পাওয়া যায়নি'; end if;
  if a.user_id is distinct from auth.uid() then raise exception 'এটি আপনার হিসাব নয়'; end if;
  if a.status not in ('active', 'pending_approval') then raise exception 'হিসাবটি এখন সক্রিয় নয়'; end if;
  if v_method is not null
     and v_method not in ('bkash','nagad','rocket','upay','gpay','bqr','bank','card','cash','agent') then
    raise exception 'টাকা দেওয়ার মাধ্যমটি চেনা গেল না';
  end if;
  if v_method is distinct from 'cash'
     and v_ref is null and nullif(trim(coalesce(p_notes,'')),'') is null then
    raise exception 'ম্যানুয়াল জমায় রেফারেন্স নম্বর বা মন্তব্য লিখুন';
  end if;
  st := public.savings_due_status(p_account);
  if (st->>'has_schedule')::boolean then
    v_amt   := a.instalment;
    v_month := (st->>'next_due')::date;
    if v_month is null then
      raise exception 'এই হিসাবের চলতি মাস পর্যন্ত সব কিস্তি পরিশোধিত — পরের মাসে জমা দিতে পারবেন';
    end if;
  else
    v_amt   := p_amount;
    v_month := null;
    if coalesce(v_amt,0) <= 0 then raise exception 'জমার পরিমাণ লিখুন'; end if;
  end if;
  insert into savings_transactions (depositor_id, account_id, type, amount, status,
                                    reference, notes, period_month, payment_method)
  values (a.user_id, a.id, 'deposit', v_amt, 'pending', v_ref,
          nullif(trim(coalesce(p_notes,'')),''), v_month, v_method)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id, 'account_no', a.account_no,
                            'amount', v_amt, 'period_month', v_month,
                            'method', v_method,
                            'due', public.savings_due_status(p_account));
exception when unique_violation then
  raise exception 'এই মাসের কিস্তি ইতিমধ্যে জমা দেওয়া হয়েছে';
end $function$;

-- 3) এডমিন জমা অনুমোদন দিলে অপেক্ষারত হিসাব চালু হবে
create or replace function public.trg_savings_activate_on_approval()
 returns trigger language plpgsql
as $f$
begin
  if new.type = 'deposit' and new.status = 'approved' and (old.status is distinct from 'approved') then
    update savings_accounts set status = 'active' where id = new.account_id and status = 'pending_approval';
  end if;
  return new;
end $f$;

drop trigger if exists savings_activate_on_approval on savings_transactions;
create trigger savings_activate_on_approval
  after update of status on savings_transactions
  for each row execute function public.trg_savings_activate_on_approval();

-- 4) হিসাব খোলা + প্রাথমিক জমা — একটি লেনদেনে
create or replace function public.open_savings_account_with_deposit(p_scheme text, p_instalment numeric, p_nominees jsonb, p_method text, p_reference text default null, p_notes text default null, p_amount numeric default null, p_withdrawal_method text default null, p_withdrawal_account text default null, p_withdrawal_bank text default null)
 returns jsonb language plpgsql security definer set search_path to 'public'
as $f$
declare
  v_method text := lower(trim(coalesce(p_method,'')));
  r        jsonb;
  v_id     uuid;
  v_dep    jsonb;
begin
  if auth.uid() is null then raise exception 'not_authenticated'; end if;
  if v_method not in ('cash','bkash','nagad','rocket','upay','gpay','bqr','bank','card','agent') then
    raise exception 'টাকা দেওয়ার মাধ্যমটি চেনা গেল না';
  end if;
  r := public.open_savings_account(p_scheme, p_instalment, p_withdrawal_method, p_withdrawal_account, p_withdrawal_bank, p_nominees);
  v_id := (r->>'id')::uuid;
  update savings_accounts set status = 'pending_approval' where id = v_id;
  v_dep := public.deposit_to_savings(v_id, p_reference, p_notes, p_amount, v_method);
  return jsonb_build_object('ok', true, 'id', v_id, 'account_no', r->>'account_no',
                            'status', 'pending_approval', 'deposit_id', v_dep->>'id',
                            'amount', v_dep->'amount', 'method', v_method, 'due', v_dep->'due');
end $f$;

revoke all on function public.open_savings_account_with_deposit(text, numeric, jsonb, text, text, text, numeric, text, text, text) from public, anon;
grant execute on function public.open_savings_account_with_deposit(text, numeric, jsonb, text, text, text, numeric, text, text, text) to authenticated, service_role;
