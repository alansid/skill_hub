-- =============================================================
-- 任老師中醫 預約系統：資料庫設定（病人查詢／取消預約）
--
-- 使用方式：執行過 01、02 之後，到 SQL Editor 貼上本檔案按 Run。
--
-- 病人輸入手機號碼，就能看到這支手機「尚未看診」的預約並取消。
-- 為保護隱私，姓名只顯示部分（例如 王○明），且同一個網路位置
-- 一小時內最多查詢 30 次。
-- =============================================================

-- 誰取消的：clinic = 診所；patient = 病人線上取消
alter table public.bookings
  add column if not exists cancelled_by text check (cancelled_by in ('clinic', 'patient'));

create or replace function public.bookings_touch() returns trigger
language plpgsql as $$
begin
  new.updated_at := now();
  if new.status = 'cancelled' and old.status is distinct from 'cancelled' then
    new.cancelled_at := now();
    new.cancelled_by := coalesce(new.cancelled_by, 'clinic');
  elsif new.status = 'booked' then
    new.cancelled_at := null;
    new.cancelled_by := null;
  end if;
  return new;
end $$;

-- 查詢次數紀錄（防止有人一直亂試號碼）
create table if not exists public.lookup_log (
  id bigint generated always as identity primary key,
  client text not null,
  at timestamptz not null default now()
);
create index if not exists lookup_log_client_at on public.lookup_log (client, at);
alter table public.lookup_log enable row level security;
revoke all on public.lookup_log from anon, authenticated;

-- 取得呼叫者的網路位置（Supabase 會帶在請求標頭裡）
create or replace function public.request_client() returns text
language sql stable as $$
  select coalesce(
    split_part(
      coalesce(current_setting('request.headers', true), '{}')::json ->> 'x-forwarded-for', ',', 1),
    'unknown')
$$;

-- 姓名遮蔽：王小明 → 王○明；王明 → 王○；Mary → M○y
create or replace function public.mask_name(n text) returns text
language sql immutable as $$
  select case
    when char_length(n) <= 1 then n
    when char_length(n) = 2 then left(n, 1) || '○'
    else left(n, 1) || repeat('○', char_length(n) - 2) || right(n, 1)
  end
$$;

-- 病人查詢自己的預約（只列出尚未看診、未取消的）
create or replace function public.find_my_bookings(p_phone text)
returns table (id uuid, date date, slot text, actual_time text, masked_name text, can_cancel boolean)
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  v_client text := request_client();
  cfg public.clinic_settings;
  now_tpe timestamp := taipei_now();
begin
  if v_phone !~ '^09\d{8}$' then
    raise exception 'invalid_phone' using errcode = 'P0001';
  end if;
  if (select count(*) from public.lookup_log
      where client = v_client and at > now() - interval '1 hour') >= 30 then
    raise exception 'rate_limited' using errcode = 'P0001';
  end if;
  insert into public.lookup_log (client) values (v_client);
  delete from public.lookup_log where at < now() - interval '1 day';

  select * into cfg from public.clinic_settings where clinic_settings.id = 1;

  return query
    select b.id, b.date, b.slot, b.actual_time, mask_name(b.name),
           (b.date + coalesce(b.actual_time, b.slot)::time)
             > now_tpe + make_interval(hours => cfg.min_hours_before_cancel)
    from public.bookings b
    where b.phone = v_phone
      and b.status = 'booked'
      and (b.date + coalesce(b.actual_time, b.slot)::time) > now_tpe
    order by b.date, b.slot;
end $$;

-- 病人取消自己的預約：需要手機號碼與預約編號都對得上
create or replace function public.cancel_my_booking(p_phone text, p_id uuid)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
  b public.bookings;
  cfg public.clinic_settings;
begin
  select * into cfg from public.clinic_settings where id = 1;
  select * into b from public.bookings where id = p_id and phone = v_phone for update;
  if not found then return 'not_found'; end if;
  if b.status <> 'booked' then return 'already_cancelled'; end if;
  if (b.date + coalesce(b.actual_time, b.slot)::time)
       <= taipei_now() + make_interval(hours => cfg.min_hours_before_cancel) then
    return 'too_late';
  end if;
  update public.bookings
     set status = 'cancelled', cancelled_by = 'patient'
   where id = b.id;
  return 'ok';
end $$;

revoke execute on function public.request_client() from public, anon;
revoke execute on function public.mask_name(text) from public, anon;
grant execute on function public.find_my_bookings(text) to anon, authenticated;
grant execute on function public.cancel_my_booking(text, uuid) to anon, authenticated;
