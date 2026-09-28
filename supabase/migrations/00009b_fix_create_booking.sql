-- ============================================================
-- Arena Go — 00009b : fix create_booking overload conflict
-- The 00009 migration created an overload (int → numeric) instead of
-- replacing the old signature. Drop both, keep exactly one.
-- ============================================================

drop function if exists public.create_booking(uuid, date, time, integer, text);
drop function if exists public.create_booking(uuid, date, time, numeric, text);

create or replace function public.create_booking(p_venue_id uuid, p_date date, p_start time, p_hours numeric default 1.5, p_notes text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_venue public.venues%rowtype;
  v_end time;
  v_full numeric;
  v_deposit int;
  v_booking uuid;
begin
  select * into v_venue from public.venues where id = p_venue_id;
  if not found or not v_venue.is_active then
    raise exception 'الملعب غير متاح حالياً';
  end if;
  if p_date < current_date then
    raise exception 'لا يمكن الحجز في تاريخ ماضٍ';
  end if;
  v_end := p_start + (p_hours * interval '1 hour');
  if p_start < v_venue.open_time or v_end > v_venue.close_time then
    raise exception 'الوقت المطلوب خارج أوقات عمل الملعب (% - %)', v_venue.open_time, v_venue.close_time;
  end if;

  -- Block times occupied by scheduled tournament matches
  if exists (
    select 1 from public.tournament_matches m
    where m.venue_id = p_venue_id and m.match_date = p_date
      and m.status = 'scheduled' and m.start_time is not null
      and (p_start < m.start_time + interval '1 hour')
      and (m.start_time < v_end)
  ) then
    raise exception 'هذا الوقت محجوز لمباراة بطولة على الملعب';
  end if;

  -- Fixed slots: 90-minute bookings with a mandatory 10-minute gap
  if exists (
    select 1 from public.bookings b
    where b.venue_id = p_venue_id and b.booking_date = p_date
      and b.booking_status in ('pending_review','confirmed')
      and b.start_time < v_end + interval '10 minutes'
      and b.end_time + interval '10 minutes' > p_start
  ) then
    raise exception 'الفاصل بين الحجوزات 10 دقائق — اختر وقتاً يلي ذلك';
  end if;

  v_full := v_venue.price_per_hour * p_hours;
  v_deposit := floor(v_full * v_venue.deposit_percent / 100.0)::int;

  begin
    insert into public.bookings (venue_id, user_id, booking_date, start_time, end_time, duration_hours,
                                 full_price, deposit_amount, remaining_amount, notes)
    values (p_venue_id, auth.uid(), p_date, p_start, v_end, p_hours, v_full, v_deposit, v_full - v_deposit, p_notes)
    returning id into v_booking;
  exception when unique_violation then
    raise exception 'عذراً، تم حجز هذا الوقت للتو من طرف شخص آخر';
  end;

  perform public.notify(
    v_venue.owner_id,
    'طلب حجز جديد لملعب ' || v_venue.name,
    'بانتظار مراجعتك وموافقتك على إشعار التحويل.',
    'booking', jsonb_build_object('booking_id', v_booking, 'venue_id', p_venue_id)
  );
  return v_booking;
end $$;
