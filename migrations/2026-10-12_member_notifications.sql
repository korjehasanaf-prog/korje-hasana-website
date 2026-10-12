-- ============================================================
-- Member notification inbox, 45-day pending-account rule,
-- super-admin announcements.
-- Applied to project fgczixybyrzkrsoqrgdl.
-- ============================================================

-- 1) Tables -------------------------------------------------
create table if not exists public.member_notifications (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid not null references auth.users(id) on delete cascade,
  kind        text not null check (kind in ('loan_due','savings_due','pending_account','announcement','system')),
  title       text not null,
  body        text not null default '',
  link        text,
  dedupe_key  text not null,
  created_at  timestamptz not null default now(),
  read_at     timestamptz,
  constraint member_notifications_dedupe unique (user_id, dedupe_key)
);
create index if not exists member_notifications_user_unread
  on public.member_notifications (user_id) where read_at is null;

alter table public.member_notifications enable row level security;
revoke all on public.member_notifications from public, anon, authenticated;
grant select, insert, update, delete on public.member_notifications to service_role;

create table if not exists public.announcements (
  id               uuid primary key default gen_random_uuid(),
  title            text not null check (length(btrim(title)) between 1 and 200),
  body             text not null check (length(btrim(body)) between 1 and 4000),
  audience         text not null check (audience in ('all','depositors','borrowers','donors')),
  recipient_count  int  not null default 0,
  created_by       uuid references auth.users(id),
  created_at       timestamptz not null default now()
);
alter table public.announcements enable row level security;
revoke all on public.announcements from public, anon, authenticated;
grant select, insert, update, delete on public.announcements to service_role;

-- 2) Member RPCs (own rows only, auth.uid()) -----------------
create or replace function public.notification_unread_count()
returns int
language sql stable security definer set search_path = public
as $$
  select case when auth.uid() is null then 0 else (
    select count(*)::int from public.member_notifications
    where user_id = auth.uid() and read_at is null
  ) end;
$$;

create or replace function public.my_notifications(p_limit int default 50)
returns table (
  id uuid, kind text, title text, body text, link text,
  created_at timestamptz, read_at timestamptz
)
language sql stable security definer set search_path = public
as $$
  select n.id, n.kind, n.title, n.body, n.link, n.created_at, n.read_at
  from public.member_notifications n
  where n.user_id = auth.uid()
  order by n.created_at desc
  limit least(greatest(coalesce(p_limit, 50), 1), 100);
$$;

create or replace function public.notification_mark_read(p_ids uuid[])
returns int
language plpgsql security definer set search_path = public
as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode = '42501'; end if;
  update public.member_notifications set read_at = now()
  where user_id = auth.uid() and read_at is null and id = any(coalesce(p_ids, '{}'::uuid[]));
  get diagnostics v_n = row_count;
  return v_n;
end $$;

create or replace function public.notification_mark_all_read()
returns int
language plpgsql security definer set search_path = public
as $$
declare v_n int;
begin
  if auth.uid() is null then raise exception 'sign in required' using errcode = '42501'; end if;
  update public.member_notifications set read_at = now()
  where user_id = auth.uid() and read_at is null;
  get diagnostics v_n = row_count;
  return v_n;
end $$;

revoke all on function public.notification_unread_count() from public, anon;
revoke all on function public.my_notifications(int) from public, anon;
revoke all on function public.notification_mark_read(uuid[]) from public, anon;
revoke all on function public.notification_mark_all_read() from public, anon;
grant execute on function public.notification_unread_count() to authenticated, service_role;
grant execute on function public.my_notifications(int) to authenticated, service_role;
grant execute on function public.notification_mark_read(uuid[]) to authenticated, service_role;
grant execute on function public.notification_mark_all_read() to authenticated, service_role;

-- 3) Super-admin announcements -------------------------------
create or replace function public.admin_send_announcement(p_title text, p_body text, p_audience text)
returns jsonb
language plpgsql security definer set search_path = public
as $$
declare v_id uuid; v_n int;
        v_title text := btrim(coalesce(p_title, ''));
        v_body  text := btrim(coalesce(p_body, ''));
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'only super admin can send announcements' using errcode = '42501';
  end if;
  if p_audience not in ('all','depositors','borrowers','donors') then
    raise exception 'invalid audience';
  end if;
  if v_title = '' or v_body = '' then
    raise exception 'title and body are required';
  end if;

  insert into public.announcements (title, body, audience, created_by)
  values (v_title, v_body, p_audience, auth.uid())
  returning id into v_id;

  insert into public.member_notifications (user_id, kind, title, body, link, dedupe_key)
  select up.id, 'announcement', v_title, v_body, null, 'ann:' || v_id::text
  from public.user_profiles up
  where p_audience = 'all'
     or (p_audience = 'depositors' and up.is_depositor)
     or (p_audience = 'borrowers'  and up.is_borrower)
     or (p_audience = 'donors'     and up.is_donor)
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_n = row_count;

  update public.announcements set recipient_count = v_n where id = v_id;
  return jsonb_build_object('id', v_id, 'recipients', v_n);
end $$;

create or replace function public.admin_list_announcements(p_limit int default 20)
returns table (id uuid, title text, body text, audience text, recipient_count int, created_at timestamptz)
language plpgsql stable security definer set search_path = public
as $$
begin
  if auth.uid() is null or not public.is_super_admin() then
    raise exception 'only super admin' using errcode = '42501';
  end if;
  return query
    select a.id, a.title, a.body, a.audience, a.recipient_count, a.created_at
    from public.announcements a
    order by a.created_at desc
    limit least(greatest(coalesce(p_limit, 20), 1), 100);
end $$;

revoke all on function public.admin_send_announcement(text, text, text) from public, anon;
revoke all on function public.admin_list_announcements(int) from public, anon;
grant execute on function public.admin_send_announcement(text, text, text) to authenticated, service_role;
grant execute on function public.admin_list_announcements(int) to authenticated, service_role;

-- 4) Daily generator: savings/loan reminders, 45-day pending-account rule ----
create or replace function public.generate_member_notifications(p_today date default current_date)
returns jsonb language plpgsql security definer set search_path = public
as $$
declare
  v_sav_rules  jsonb := coalesce((select value from public.app_settings where key = 'savings_rules'), '{}'::jsonb);
  v_loan_rules jsonb := coalesce((select value from public.app_settings where key = 'loan_rules'), '{}'::jsonb);
  v_due_day    int   := coalesce((v_sav_rules->>'due_day')::int, 20);
  v_sav_grace  int   := coalesce((v_sav_rules->>'grace_days')::int, 3);
  v_loan_grace int   := coalesce((v_loan_rules->>'grace_days')::int, 3);
  v_week       text  := to_char(p_today, 'IYYY-IW');
  v_period     text  := to_char(p_today, 'YYYY-MM');
  v_due_date   date  := make_date(extract(year from p_today)::int, extract(month from p_today)::int,
                         least(v_due_day, extract(day from (date_trunc('month', p_today) + interval '1 month - 1 day'))::int));
  v_sav int := 0; v_loan int := 0; v_acc int := 0; v_closed int := 0;
begin
  -- 1. monthly savings due: no approved deposit this month, past grace; reminded once a week
  if coalesce((v_sav_rules->>'reminder_enabled')::boolean, true) and p_today > v_due_date + v_sav_grace then
    insert into public.member_notifications (user_id, kind, title, body, link, dedupe_key)
    select d.id, 'savings_due', 'সঞ্চয় জমার রিমাইন্ডার',
           format('%s মাসের মাসিক সঞ্চয় জমা এখনো বাকি। নির্ধারিত তারিখ ছিল %s।', v_period, to_char(v_due_date, 'DD Mon YYYY')),
           'savings-portal.html', 'sav:' || v_period || ':' || v_week
    from public.depositors d
    where d.status = 'active'
      and coalesce(d.monthly_amount, 0) > 0
      and not exists (
        select 1 from public.savings_transactions t
        where t.depositor_id = d.id and t.type = 'deposit' and t.status = 'approved'
          and to_char(t.created_at, 'YYYY-MM') = v_period)
    on conflict (user_id, dedupe_key) do nothing;
    get diagnostics v_sav = row_count;
  end if;

  -- 2. overdue loan instalments; reminded once a week
  if coalesce((v_loan_rules->>'reminder_enabled')::boolean, true) then
    insert into public.member_notifications (user_id, kind, title, body, link, dedupe_key)
    select up.id, 'loan_due', 'ঋণের কিস্তি বকেয়া',
           format('ঋণ %s-এর কিস্তি #%s বকেয়া: %s টাকা, নির্ধারিত তারিখ %s।',
                  l.loan_no, r.installment_no, greatest(r.amount_due - coalesce(r.amount_paid, 0), 0),
                  to_char(r.due_date, 'DD Mon YYYY')),
           'borrower-portal.html', 'loan:' || r.id::text || ':' || v_week
    from public.repayments r
    join public.loans l on l.id = r.loan_id and l.status = 'active'
    join public.user_profiles up on up.borrower_id = r.borrower_id
    where coalesce(r.is_paid, false) = false
      and r.due_date < p_today - v_loan_grace
    on conflict (user_id, dedupe_key) do nothing;
    get diagnostics v_loan = row_count;
  end if;

  -- 3a. accounts left awaiting approval for 45 days with no deposit at all -> closed
  --     (a rejected deposit counts as no deposit; a deposit still awaiting approval does not)
  with stale as (
    select a.id from public.savings_accounts a
    where a.status = 'pending_approval'
      and (p_today - a.opened_on) >= 45
      and not exists (
        select 1 from public.savings_transactions t
        where t.account_id = a.id and t.type = 'deposit' and t.status in ('pending', 'approved'))
  ),
  closed as (
    update public.savings_accounts a
    set status = 'closed',
        updated_at = now(),
        notes = coalesce(a.notes || E'\n', '') || 'স্বয়ংক্রিয়ভাবে বন্ধ: ৪৫ দিনের মধ্যে জমা হয়নি'
    from stale s
    where a.id = s.id
    returning a.id, a.user_id, a.account_no
  )
  insert into public.member_notifications (user_id, kind, title, body, link, dedupe_key)
  select c.user_id, 'pending_account', 'হিসাব বন্ধ হয়েছে',
         format('হিসাব %s ৪৫ দিনের মধ্যে প্রথম জমা না পাওয়ায় স্বয়ংক্রিয়ভাবে বন্ধ হয়েছে। প্রয়োজন হলে নতুন হিসাব খুলুন।', c.account_no),
         'savings-portal.html', 'acct_closed:' || c.id::text
  from closed c
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_closed = row_count;

  -- 3b. pending accounts with no deposit: reminder every 7 days (ages 7, 14, 21, 28, 35, 42)
  insert into public.member_notifications (user_id, kind, title, body, link, dedupe_key)
  select a.user_id, 'pending_account', 'হিসাব অনুমোদনের অপেক্ষায়',
         format('হিসাব %s এখনো প্রথম জমার অপেক্ষায়। আর %s দিনের মধ্যে জমা না হলে হিসাবটি স্বয়ংক্রিয়ভাবে বন্ধ হবে।',
                a.account_no, 45 - (p_today - a.opened_on)),
         'savings-portal.html', 'acct_remind:' || a.id::text || ':' || ((p_today - a.opened_on) / 7)::text
  from public.savings_accounts a
  where a.status = 'pending_approval'
    and (p_today - a.opened_on) between 7 and 44
    and not exists (
      select 1 from public.savings_transactions t
      where t.account_id = a.id and t.type = 'deposit' and t.status = 'pending')
  on conflict (user_id, dedupe_key) do nothing;
  get diagnostics v_acc = row_count;

  return jsonb_build_object('date', p_today, 'savings_due', v_sav, 'loan_due', v_loan,
                            'pending_reminders', v_acc, 'accounts_closed', v_closed);
end $$;

revoke all on function public.generate_member_notifications(date) from public, anon, authenticated;
grant execute on function public.generate_member_notifications(date) to service_role;

-- 5) Daily schedule (UTC 02:20 = Dhaka 08:20), after kh_daily_due_scan at 02:15
-- select cron.schedule('kh_member_notifications', '20 2 * * *', 'select public.generate_member_notifications();');
