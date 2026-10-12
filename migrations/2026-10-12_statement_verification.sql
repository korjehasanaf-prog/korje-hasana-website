-- স্টেটমেন্টের QR যাচাই (১২ অক্টোবর ২০২৬) — প্রোডাকশনে প্রয়োগ হয়েছে
-- প্রতিটি PDF তৈরিতে সার্ভারে একটি স্ন্যাপশট লেখা হয়; অঙ্ক my_statement থেকেই আসে।

create table if not exists public.statement_verifications (
  ref             text primary key,
  user_id         uuid not null references auth.users(id) on delete cascade,
  period_from     date not null,
  period_to       date not null,
  closing_balance numeric(14,2) not null,
  issued_at       timestamptz not null default now()
);
alter table public.statement_verifications enable row level security;
revoke all on public.statement_verifications from anon, authenticated;
grant select, insert, update, delete on public.statement_verifications to service_role;

create or replace function public.issue_statement_ref(p_from date default null, p_to date default null)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  v_uid uuid := auth.uid();
  v_st  jsonb;
  v_ref text;
begin
  if v_uid is null then raise exception 'not_authenticated'; end if;
  v_st := public.my_statement(p_from, p_to);
  loop
    v_ref := 'STM-' || to_char(now() at time zone 'Asia/Dhaka', 'YYMMDD') || '-'
             || upper(substr(encode(extensions.gen_random_bytes(6), 'hex'), 1, 10));
    exit when not exists (select 1 from public.statement_verifications where ref = v_ref);
  end loop;
  insert into public.statement_verifications (ref, user_id, period_from, period_to, closing_balance)
  values (v_ref, v_uid, (v_st->>'from')::date, (v_st->>'to')::date, round((v_st->>'savings_closing')::numeric, 2));
  return jsonb_build_object('ok', true, 'ref', v_ref);
end $$;

create or replace function public.verify_statement(p_ref text)
returns jsonb
language plpgsql security definer set search_path to 'public'
as $$
declare
  r record;
  v_name text;
begin
  select * into r from public.statement_verifications where ref = upper(trim(coalesce(p_ref, '')));
  if not found then
    return jsonb_build_object('ok', false, 'error', 'এই কোড কোনো স্টেটমেন্টের সাথে মেলে না।');
  end if;
  select full_name into v_name from public.user_profiles where id = r.user_id;
  return jsonb_build_object('ok', true, 'ref', r.ref, 'issued_at', r.issued_at,
    'period_from', r.period_from, 'period_to', r.period_to, 'closing_balance', r.closing_balance,
    'holder', left(coalesce(v_name, 'স'), 1) || ' ••••');
end $$;

revoke all on function public.issue_statement_ref(date, date) from public, anon;
grant execute on function public.issue_statement_ref(date, date) to authenticated, service_role;
revoke all on function public.verify_statement(text) from public;
grant execute on function public.verify_statement(text) to anon, authenticated, service_role;

-- get_my_loan_schedule-এ প্রতিটি ঋণে loan id যোগ (স্ব-সেবা পরিশোধে লাগে) — অন্য সব অপরিবর্তিত
