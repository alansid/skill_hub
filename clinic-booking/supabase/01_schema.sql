-- =============================================================
-- 任老師中醫 預約系統：資料庫設定（第一階段：診所管理頁）
--
-- 使用方式：在 Supabase 網站 → SQL Editor → New query，
-- 把整個檔案貼上，按 Run。只需要執行一次。
-- =============================================================

-- ---------- 診所設定（只有一列） ----------
create table if not exists public.clinic_settings (
  id                  int primary key default 1 check (id = 1),
  clinic_name         text    not null default '任老師中醫',
  clinic_phone        text    not null default '02-23022457',
  -- 平常看診的星期：0 = 星期日、2 = 星期二 …
  open_weekdays       int[]   not null default '{0,2,3,4,6}',
  slots               text[]  not null default
    '{08:30,09:10,09:50,10:30,11:10,14:30,15:10,16:30,17:10,19:30,20:10}',
  -- 病人最多可以預約幾天內
  booking_window_days int     not null default 90,
  -- 病人可否預約當天
  same_day_booking    boolean not null default true,
  -- 以下為之後功能預留
  -- 病人最晚要在看診前幾分鐘預約
  min_minutes_before_booking int  not null default 30,
  min_hours_before_cancel  int     not null default 0,
  allow_patient_cancel     boolean not null default false,
  reminder_enabled         boolean not null default false
);
insert into public.clinic_settings (id) values (1) on conflict do nothing;

-- ---------- 特定日期設定：臨時休診、只開部分時段 ----------
create table if not exists public.day_overrides (
  date       date primary key,
  closed     boolean not null default false,
  -- null 代表全部時段都開
  open_slots text[],
  note       text not null default '',
  updated_at timestamptz not null default now()
);

-- ---------- 預約 ----------
create table if not exists public.bookings (
  id           uuid primary key default gen_random_uuid(),
  date         date not null,
  -- 登記本上的時段，例如 '19:30'
  slot         text not null check (slot ~ '^\d{2}:\d{2}$'),
  -- 實際時間（與時段不同時才填，例如 '19:50'）
  actual_time  text check (actual_time ~ '^\d{2}:\d{2}$'),
  name         text not null check (length(btrim(name)) between 1 and 50),
  -- 只存數字
  phone        text not null default '' check (phone ~ '^\d{0,15}$'),
  note         text not null default '' check (length(note) <= 500),
  status       text not null default 'booked' check (status in ('booked', 'cancelled')),
  -- 加號：同一時段的第二位以後
  is_extra     boolean not null default false,
  -- admin = 櫃台登記；online = 病人線上預約
  source       text not null default 'admin' check (source in ('admin', 'online')),
  -- 以下為之後功能預留
  cancel_token     uuid not null default gen_random_uuid(),  -- 病人自行取消用
  reminder_sent_at timestamptz,                               -- 簡訊／LINE 提醒
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now(),
  cancelled_at timestamptz
);

-- 防止重複預約：同一天、同一時段，只能有一筆「有效且非加號」的預約。
-- 兩人同時搶同一時段時，資料庫只會接受第一筆。
create unique index if not exists bookings_one_per_slot
  on public.bookings (date, slot)
  where status = 'booked' and not is_extra;

create index if not exists bookings_date_idx  on public.bookings (date);
create index if not exists bookings_phone_idx on public.bookings (phone);

-- 自動記錄修改時間、取消時間
create or replace function public.bookings_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := now();
  elsif new.status = 'booked' then
    new.cancelled_at := null;
  end if;
  return new;
end $$;

drop trigger if exists bookings_touch on public.bookings;
create trigger bookings_touch before update on public.bookings
  for each row execute function public.bookings_touch();

-- ---------- 診所人員名單：只有名單上的 Email 登入後才能看資料 ----------
create table if not exists public.staff (
  email text primary key
);

create or replace function public.is_staff() returns boolean
language sql stable security definer set search_path = public as $$
  select exists (
    select 1 from public.staff
    where lower(email) = lower(coalesce(auth.jwt() ->> 'email', ''))
  );
$$;

-- ---------- 權限：未登入的人什麼都看不到 ----------
alter table public.clinic_settings enable row level security;
alter table public.day_overrides   enable row level security;
alter table public.bookings        enable row level security;
alter table public.staff           enable row level security;

revoke all on public.clinic_settings, public.day_overrides, public.bookings, public.staff from anon;
revoke all on public.staff from authenticated;
revoke delete on public.bookings from authenticated;  -- 預約只能取消，不能刪除

drop policy if exists staff_read_settings on public.clinic_settings;
create policy staff_read_settings on public.clinic_settings
  for select to authenticated using (public.is_staff());
drop policy if exists staff_update_settings on public.clinic_settings;
create policy staff_update_settings on public.clinic_settings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_all_overrides on public.day_overrides;
create policy staff_all_overrides on public.day_overrides
  for all to authenticated using (public.is_staff()) with check (public.is_staff());

drop policy if exists staff_read_bookings on public.bookings;
create policy staff_read_bookings on public.bookings
  for select to authenticated using (public.is_staff());
drop policy if exists staff_insert_bookings on public.bookings;
create policy staff_insert_bookings on public.bookings
  for insert to authenticated with check (public.is_staff());
drop policy if exists staff_update_bookings on public.bookings;
create policy staff_update_bookings on public.bookings
  for update to authenticated using (public.is_staff()) with check (public.is_staff());

-- ---------- 搜尋：用姓名或電話找預約紀錄 ----------
create or replace function public.search_bookings(q text)
returns setof public.bookings
language sql stable as $$
  with p as (
    select
      replace(replace(replace(btrim(q), '\', '\\'), '%', '\%'), '_', '\_') as text_q,
      regexp_replace(q, '\D', '', 'g') as digits
  )
  select b.* from public.bookings b, p
  where p.text_q <> ''
    and (b.name ilike '%' || p.text_q || '%'
         or (length(p.digits) >= 3 and b.phone like '%' || p.digits || '%'))
  order by b.date desc, b.slot, b.created_at
  limit 200;
$$;
revoke execute on function public.search_bookings(text) from anon, public;
grant execute on function public.search_bookings(text) to authenticated;

-- ---------- 即時同步 ----------
do $$
begin
  alter publication supabase_realtime add table public.bookings;
exception when duplicate_object then null;
end $$;
do $$
begin
  alter publication supabase_realtime add table public.day_overrides;
exception when duplicate_object then null;
end $$;

-- =============================================================
-- ★ 最後一步：把下面的 Email 改成診所登入用的 Email，再執行。
-- =============================================================
insert into public.staff (email) values ('請改成診所的Email@example.com')
on conflict do nothing;
