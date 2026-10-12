-- সেলফ সার্ভিস (১২ অক্টোবর ২০২৬)
-- নিয়ম: উৎস সবসময় সদস্যের নিজের সক্রিয় সঞ্চয় হিসাব। অন্য সদস্যের হিসাবে/ঋণে টাকা যাওয়ার কোনো পথ নেই।
--   (ক) নতুন সঞ্চয় হিসাব খোলা (নিজের হিসাব থেকে)
--   (খ) পূর্বে খোলা নিজের কোনো সঞ্চয় হিসাবে জমা
--   (গ) ঋণের কিস্তি / ঋণের আংশিক বা পূর্ণ পরিশোধ — পুরনো কিস্তি থেকে ক্রমানুসারে
--   (ঘ) দান — সঞ্চয় হিসাব থেকে (record_donation, payment_method = 'savings')
-- ২FA চ্যালেঞ্জ ছাড়া কিছু হয় না; চ্যালেঞ্জ এই সদস্য, হিসাব, অঙ্ক, ধরন ও গন্তব্যে বাঁধা।

-- 1) 2FA চ্যালেঞ্জে গন্তব্য-রেফারেন্স (নতুন হিসাব/ঋণ/গন্তব্য হিসাবের id)
alter table public.auth_challenges add column if not exists target_ref uuid;

-- 2) চ্যালেঞ্জ ইস্যু — পুরনো issue_2fa_challenge অপরিবর্তিত রইল
create or replace function public.issue_self_transfer_challenge(
  p_account uuid, p_amount numeric, p_kind text, p_target_ref uuid default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_owner uuid;
  v_factors jsonb;
  v_ch text;
  v_id uuid;
begin
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'not_signed_in'); end if;
  if p_kind not in ('new_account', 'deposit', 'loan', 'donation') then
    return jsonb_build_object('ok', false, 'error', 'অজানা স্থানান্তর');
  end if;
  if p_amount is null or p_amount <= 0 then return jsonb_build_object('ok', false, 'error', 'পরিমাণ বৈধ নয়'); end if;

  select user_id into v_owner from public.savings_accounts where id = p_account;
  if v_owner is distinct from v_uid then return jsonb_build_object('ok', false, 'error', 'এই হিসাবে অনুমতি নেই।'); end if;

  select coalesce(jsonb_agg(jsonb_build_object('id', id, 'kind', kind, 'credential_id', credential_id, 'label', label) order by created_at), '[]'::jsonb)
    into v_factors from public.auth_factors where user_id = v_uid and revoked_at is null;
  if jsonb_array_length(v_factors) = 0 then
    return jsonb_build_object('ok', false, 'code', 'no_factor',
      'error', 'স্থানান্তরের আগে ২FA চালু করতে হবে (ফোন/ব্রাউজারের ফিঙ্গারপ্রিন্ট বা ফেস আনলক)।');
  end if;

  v_ch := translate(rtrim(encode(extensions.gen_random_bytes(32), 'base64'), '='), '+/', '-_');
  insert into public.auth_challenges (user_id, purpose, account_id, amount, target, repayment_id, challenge, target_ref)
  values (v_uid, 'transfer', p_account, round(p_amount, 2), p_kind, null, v_ch, p_target_ref)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'challenge_id', v_id, 'challenge', v_ch, 'factors', v_factors);
end $$;

-- 3) মূল RPC — সব সেলফ-সার্ভিস স্থানান্তর এখান থেকে
create or replace function public.self_transfer(
  p_from uuid, p_kind text, p_amount numeric, p_challenge uuid,
  p_target_account uuid default null, p_loan_id uuid default null,
  p_scheme text default null, p_instalment numeric default null, p_nominees jsonb default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_uid  uuid := auth.uid();
  a      public.savings_accounts;
  t      public.savings_accounts;
  v_ch   public.auth_challenges;
  v_amt  numeric := round(coalesce(p_amount, 0), 2);
  v_bal  numeric;
  v_ref  text;
  v_new  jsonb;
  v_prof public.user_profiles;
  v_loan public.loans;
  v_rep  public.repayments;
  v_out  numeric;
  v_left numeric;
  v_take numeric;
  v_paid int;
  v_tgt  uuid;
  v_don  jsonb;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  if p_kind not in ('new_account', 'deposit', 'loan', 'donation') then raise exception 'স্থানান্তরের ধরন চেনা গেল না'; end if;
  if v_amt < 1 then raise exception 'কমপক্ষে ১ টাকা লিখুন'; end if;

  -- উৎস: নিজের, সক্রিয়, সঞ্চয় হিসাব
  select * into a from public.savings_accounts where id = p_from for update;
  if a.id is null then raise exception 'হিসাব পাওয়া যায়নি'; end if;
  if a.user_id is distinct from v_uid then raise exception 'এটি আপনার হিসাব নয়'; end if;
  if a.status <> 'active' then raise exception 'হিসাবটি এখন সক্রিয় নয়'; end if;

  -- ২FA: ধরন, অঙ্ক, উৎস ও গন্তব্য একই হতে হবে
  v_tgt := case p_kind when 'deposit' then p_target_account when 'loan' then p_loan_id else null end;
  select * into v_ch from public.auth_challenges where id = p_challenge for update;
  if v_ch.id is null or v_ch.user_id is distinct from v_uid or v_ch.purpose <> 'transfer'
     or v_ch.account_id <> p_from or v_ch.amount <> v_amt
     or v_ch.target is distinct from p_kind or v_ch.target_ref is distinct from v_tgt
     or v_ch.approved_at is null or v_ch.consumed_at is not null or v_ch.expires_at < now() then
    raise exception '২FA যাচাই মেলেনি বা মেয়াদ শেষ — আবার চেষ্টা করুন';
  end if;

  -- স্থিতি: অনুমোদিত জমা − (অনুমোদিত + অপেক্ষমাণ) উত্তোলন (উত্তোলনের নিয়মের সাথে মিল)
  select coalesce(sum(case when type = 'deposit' and status = 'approved' then amount
                           when type = 'withdrawal' and status in ('approved', 'pending') then -amount
                           else 0 end), 0)
    into v_bal from public.savings_transactions where account_id = a.id;
  if v_amt > v_bal then raise exception 'হিসাবে পর্যাপ্ত স্থিতি নেই (আছে: %)', v_bal; end if;

  update public.auth_challenges set consumed_at = now() where id = v_ch.id;
  v_ref := 'TRF-' || to_char(now(), 'YYMMDDHH24MISS') || '-' || upper(substr(md5(random()::text), 1, 4));

  if p_kind = 'new_account' then
    if p_scheme is null then raise exception 'নতুন হিসাবের স্কীম বাছুন'; end if;
    v_new := public.open_savings_account(p_scheme, p_instalment, null, null, null, p_nominees);

    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (a.user_id, a.id, 'withdrawal', v_amt, 'approved', v_ref,
            'স্থানান্তর: নতুন হিসাব ' || (v_new->>'account_no'), now(), now(), v_uid, null);
    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (a.user_id, (v_new->>'id')::uuid, 'deposit', v_amt, 'approved', v_ref,
            'স্থানান্তর: ' || a.account_no || ' থেকে', now(), now(), v_uid, null);

    return jsonb_build_object('ok', true, 'kind', p_kind, 'amount', v_amt, 'account_no', v_new->>'account_no',
                              'balance', v_bal - v_amt, 'reference', v_ref);

  elsif p_kind = 'deposit' then
    if p_target_account is null or p_target_account = p_from then raise exception 'গন্তব্য হিসাব বাছুন'; end if;
    select * into t from public.savings_accounts where id = p_target_account for update;
    -- অন্য সদস্যের হিসাব হলে এখানেই থামে
    if t.id is null or t.user_id is distinct from v_uid then raise exception 'এটি আপনার হিসাব নয়'; end if;
    if t.status <> 'active' then raise exception 'গন্তব্য হিসাবটি সক্রিয় নয়'; end if;

    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (a.user_id, a.id, 'withdrawal', v_amt, 'approved', v_ref,
            'স্থানান্তর: ' || t.account_no || '-এ', now(), now(), v_uid, null);
    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (t.user_id, t.id, 'deposit', v_amt, 'approved', v_ref,
            'স্থানান্তর: ' || a.account_no || ' থেকে', now(), now(), v_uid, null);

    return jsonb_build_object('ok', true, 'kind', p_kind, 'amount', v_amt, 'account_no', t.account_no,
                              'balance', v_bal - v_amt, 'reference', v_ref);

  elsif p_kind = 'donation' then
    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (a.user_id, a.id, 'withdrawal', v_amt, 'approved', v_ref,
            'স্থানান্তর: দানে', now(), now(), v_uid, null);

    v_don := public.record_donation(v_amt, null, null, null, 'savings', 'SAV-' || a.account_no, 'general', false);

    return jsonb_build_object('ok', true, 'kind', p_kind, 'amount', v_amt, 'donation_no', v_don->>'donation_no',
                              'balance', v_bal - v_amt, 'reference', v_ref);

  else  -- loan: আংশিক বা পূর্ণ, পুরনো কিস্তি থেকে ক্রমানুসারে
    select * into v_prof from public.user_profiles where id = v_uid;
    if v_prof.borrower_id is null then raise exception 'কোনো ঋণ হিসাব পাওয়া যায়নি'; end if;
    select * into v_loan from public.loans where id = p_loan_id for update;
    if v_loan.id is null or v_loan.borrower_id is distinct from v_prof.borrower_id then
      raise exception 'এই ঋণ আপনার নয়';
    end if;
    if v_loan.status is distinct from 'active' then raise exception 'এই ঋণ এখন সক্রিয় নয়'; end if;

    select coalesce(sum(amount_due - coalesce(amount_paid, 0)), 0) into v_out
      from public.repayments where loan_id = v_loan.id and coalesce(is_paid, false) = false;
    if v_amt > round(v_out, 2) then
      raise exception 'পরিশোধের অঙ্ক বাকির (%) বেশি হতে পারবে না', round(v_out, 2);
    end if;

    v_left := v_amt;
    for v_rep in
      select * from public.repayments
       where loan_id = v_loan.id and coalesce(is_paid, false) = false
       order by installment_no
       for update
    loop
      exit when v_left <= 0;
      v_take := least(v_left, round(v_rep.amount_due - coalesce(v_rep.amount_paid, 0), 2));
      continue when v_take <= 0;
      update public.repayments
         set amount_paid     = coalesce(amount_paid, 0) + v_take,
             is_paid         = (coalesce(amount_paid, 0) + v_take) >= amount_due,
             payment_date    = current_date,
             payment_method  = 'savings',
             transaction_ref = v_ref,
             notes           = trim(both from coalesce(notes || ' | ', '') || 'সঞ্চয় থেকে পরিশোধ: ' || v_take::text),
             updated_at      = now()
       where id = v_rep.id;
      v_left := v_left - v_take;
    end loop;
    if v_left <> 0 then raise exception 'কিস্তি সমন্বয় করা যায়নি'; end if;

    insert into public.savings_transactions (depositor_id, account_id, type, amount, status, reference, notes,
                                             processed_at, approved_at, approved_by, payment_method)
    values (a.user_id, a.id, 'withdrawal', v_amt, 'approved', v_ref,
            'স্থানান্তর: ঋণ ' || v_loan.loan_no || ' পরিশোধ', now(), now(), v_uid, null);

    -- ঋণের সারসংক্ষেপ হালনাগাদ (পুরনো transfer_savings-এ এটি বাদ ছিল)
    select count(*) into v_paid from public.repayments where loan_id = v_loan.id and is_paid = true;
    update public.loans
       set paid_amount       = coalesce(paid_amount, 0) + v_amt,
           paid_installments = v_paid,
           last_payment_date = current_date,
           status            = case when v_out - v_amt <= 0 then 'completed' else status end,
           completed_at      = case when v_out - v_amt <= 0 then now() else completed_at end,
           updated_at        = now()
     where id = v_loan.id;

    return jsonb_build_object('ok', true, 'kind', p_kind, 'amount', v_amt, 'loan_no', v_loan.loan_no,
                              'outstanding_after', round(v_out - v_amt, 2), 'completed', (v_out - v_amt <= 0),
                              'balance', v_bal - v_amt, 'reference', v_ref);
  end if;
end $$;

-- 4) পুরনো স্থানান্তর পথ বন্ধ (দান ও সরাসরি কিস্তি — দুটোই এখন সেলফ সার্ভিসে)
create or replace function public.transfer_savings(
  p_account uuid, p_target text, p_amount numeric, p_repayment_id uuid default null, p_challenge uuid default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
begin
  raise exception 'এই স্থানান্তর পদ্ধতিটি বন্ধ হয়েছে — সেলফ সার্ভিস ব্যবহার করুন';
end $$;

-- গ্রান্ট (প্রোডাকশনে প্রয়োগ হয়েছে): শুধু সাইন-ইন করা সদস্য; anon কিছু ডাকতে পারবে না
revoke all on function public.issue_self_transfer_challenge(uuid, numeric, text, uuid) from public, anon;
grant execute on function public.issue_self_transfer_challenge(uuid, numeric, text, uuid) to authenticated, service_role;
revoke all on function public.self_transfer(uuid, text, numeric, uuid, uuid, uuid, text, numeric, jsonb) from public, anon;
grant execute on function public.self_transfer(uuid, text, numeric, uuid, uuid, uuid, text, numeric, jsonb) to authenticated, service_role;
