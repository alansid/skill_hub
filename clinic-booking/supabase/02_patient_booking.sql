-- =============================================================
-- 任老師中醫 預約系統：資料庫設定（第二階段：病人預約頁）
--
-- 使用方式：先執行過 01_schema.sql，再到 SQL Editor 貼上本檔案按 Run。
--
-- 病人（未登入）只能呼叫下面三個功能，完全無法直接讀取預約資料：
--   get_booking_config()   診所名稱、電話、可預約天數
--   get_availability()     哪些日期、哪些時段還有空（只有時間，沒有任何病人資料）
--   create_online_booking() 送出一筆預約
-- =============================================================

-- 預留：同一支手機最多可以有幾筆「尚未到來」的線上預約（防止惡意占位）
alter table public.clinic_settings
  add column if not exists max_online_per_phone int not null default 3;

-- 台灣時間的「現在」
create or replace function public.taipei_now() returns timestamp
language sql stable as $$ select (now() at time zone 'Asia/Taipei') $$;

-- 某一天開放的時段（照平常規則，加上臨時休診／部分時段設定）
create or replace function public.open_slots_on(d date) returns text[]
language sql stable security definer set search_path = public as $$
  select case
    when o.date is null then
      case when extract(dow from d)::int = any (s.open_weekdays) then s.slots else '{}'::text[] end
    when o.closed then '{}'::text[]
    when o.open_slots is null then s.slots
    else array(select x from unnest(s.slots) x where x = any (o.open_slots) order by x)
  end
  from public.clinic_settings s
  left join public.day_overrides o on o.date = d
  where s.id = 1
$$;

-- 病人可見的診所設定
create or replace function public.get_booking_config()
returns table (clinic_name text, clinic_phone text, booking_window_days int,
               same_day_booking boolean, min_hours_before_booking int, today date)
language sql stable security definer set search_path = public as $$
  select clinic_name, clinic_phone, booking_window_days, same_day_booking,
         min_hours_before_booking, taipei_now()::date
  from public.clinic_settings where id = 1
$$;

-- 每個看診日還有空的時段。只回傳日期與時間，不含任何病人資料。
create or replace function public.get_availability(p_from date, p_to date)
returns table (date date, available text[], open_count int)
language sql stable security definer set search_path = public as $$
  with cfg as (
    select s.*, taipei_now() as now_tpe from public.clinic_settings s where id = 1
  ),
  days as (
    select d::date as d
    from cfg, generate_series(
      greatest(p_from, (cfg.now_tpe::date + case when cfg.same_day_booking then 0 else 1 end)),
      least(p_to, cfg.now_tpe::date + cfg.booking_window_days, p_from + 120),
      interval '1 day') d
  ),
  opened as (
    select days.d, open_slots_on(days.d) as slots from days
  )
  select o.d,
         array(
           select x from unnest(o.slots) x, cfg
           where (o.d + x::time) > cfg.now_tpe + make_interval(hours => cfg.min_hours_before_booking)
             and not exists (
               select 1 from public.bookings b
               where b.date = o.d and b.slot = x and b.status = 'booked')
           order by x),
         cardinality(o.slots)
  from opened o
  where cardinality(o.slots) > 0
  order by o.d
$$;

-- 病人送出預約。成功回傳 'ok'，失敗回傳原因代碼。
create or replace function public.create_online_booking(
  p_date date, p_slot text, p_name text, p_phone text)
returns text
language plpgsql volatile security definer set search_path = public as $$
declare
  cfg public.clinic_settings;
  now_tpe timestamp := taipei_now();
  v_name text := btrim(coalesce(p_name, ''));
  v_phone text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g');
begin
  select * into cfg from public.clinic_settings where id = 1;

  if length(v_name) < 1 or length(v_name) > 30 then return 'invalid_name'; end if;
  if v_phone !~ '^09\d{8}$' then return 'invalid_phone'; end if;
  if p_slot is null or p_slot !~ '^\d{2}:\d{2}$' then return 'slot_unavailable'; end if;

  if p_date > now_tpe::date + cfg.booking_window_days then return 'too_far'; end if;
  if not cfg.same_day_booking and p_date <= now_tpe::date then return 'too_late'; end if;
  if (p_date + p_slot::time) <= now_tpe + make_interval(hours => cfg.min_hours_before_booking) then
    return 'too_late';
  end if;
  if not (p_slot = any (open_slots_on(p_date))) then return 'slot_unavailable'; end if;

  -- 同一時段一次只處理一個人，避免同時搶位
  perform pg_advisory_xact_lock(hashtext('slot:' || p_date || ' ' || p_slot));
  -- 同一支手機一次只處理一筆，避免連按
  perform pg_advisory_xact_lock(hashtext('phone:' || v_phone));

  if exists (select 1 from public.bookings
             where date = p_date and slot = p_slot and status = 'booked') then
    return 'slot_taken';
  end if;
  if exists (select 1 from public.bookings
             where date = p_date and phone = v_phone and status = 'booked') then
    return 'already_booked_that_day';
  end if;
  if (select count(*) from public.bookings
      where phone = v_phone and status = 'booked' and source = 'online'
        and date >= now_tpe::date) >= cfg.max_online_per_phone then
    return 'too_many';
  end if;

  insert into public.bookings (date, slot, name, phone, source)
  values (p_date, p_slot, v_name, v_phone, 'online');
  return 'ok';
exception when unique_violation then
  return 'slot_taken';
end $$;

-- 權限：未登入的病人只能呼叫這三個功能
revoke execute on function public.open_slots_on(date) from public, anon;
revoke execute on function public.taipei_now() from public, anon;
grant execute on function public.get_booking_config() to anon, authenticated;
grant execute on function public.get_availability(date, date) to anon, authenticated;
grant execute on function public.create_online_booking(date, text, text, text) to anon, authenticated;
