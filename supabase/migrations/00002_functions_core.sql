-- ============================================================
-- Arena Go — 00002 : Functions, triggers & RPCs (security definer)
-- All sensitive logic lives here / in RLS, never in the client.
-- ============================================================

-- ---------- updated_at helper ----------
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at := now();
  return new;
end $$;

create trigger trg_profiles_updated before update on public.profiles for each row execute function public.set_updated_at();
create trigger trg_venues_updated before update on public.venues for each row execute function public.set_updated_at();
create trigger trg_bookings_updated before update on public.bookings for each row execute function public.set_updated_at();
create trigger trg_teams_updated before update on public.teams for each row execute function public.set_updated_at();
create trigger trg_tournaments_updated before update on public.tournaments for each row execute function public.set_updated_at();
create trigger trg_matches_updated before update on public.tournament_matches for each row execute function public.set_updated_at();

-- ---------- notifications helper ----------
create or replace function public.notify(p_user uuid, p_title text, p_body text default '', p_type text default 'general', p_data jsonb default '{}')
returns void language plpgsql security definer set search_path = public as $$
begin
  if p_user is null then return; end if;
  insert into public.notifications (user_id, title, body, type, data)
  values (p_user, p_title, p_body, p_type, p_data);
end $$;

-- ---------- permission helpers ----------
create or replace function public.is_admin()
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin');
$$;

create or replace function public.is_venue_owner(p_venue uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.venues where id = p_venue and owner_id = auth.uid());
$$;

create or replace function public.is_tournament_organizer(p_tournament uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.tournaments where id = p_tournament and owner_id = auth.uid());
$$;

create or replace function public.is_team_captain(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.teams where id = p_team and captain_id = auth.uid() and is_active);
$$;

create or replace function public.is_team_member(p_team uuid)
returns boolean language sql stable security definer set search_path = public as $$
  select exists (select 1 from public.team_members where team_id = p_team and player_id = auth.uid());
$$;

create or replace function public.active_membership_count(p_player uuid default null)
returns integer language sql stable security definer set search_path = public as $$
  select count(*)::int
  from public.team_members m
  join public.teams t on t.id = m.team_id
  where m.player_id = coalesce(p_player, auth.uid()) and t.is_active;
$$;

create or replace function public.membership_limit(p_player uuid default null)
returns integer language sql stable security definer set search_path = public as $$
  select case when exists (
    select 1 from public.profiles
    where id = coalesce(p_player, auth.uid())
      and (is_premium = true and (premium_until is null or premium_until > now()))
  ) then 10 else 2 end;
$$;

-- ============================================================
-- AUTH: auto-create profile on signup (phone + password pattern)
-- ============================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_phone text;
  v_role text;
begin
  v_phone := coalesce(new.raw_user_meta_data->>'phone', '');
  v_role := coalesce(new.raw_user_meta_data->>'role', 'player');
  if v_role not in ('player','venue_owner') then v_role := 'player'; end if;

  if v_phone !~ '^9639[0-9]{8}$' then
    raise exception 'صيغة رقم الهاتف غير صحيحة، المطلوب: 9639XXXXXXXX';
  end if;

  begin
    insert into public.profiles (id, phone, full_name, role)
    values (new.id, v_phone, coalesce(new.raw_user_meta_data->>'full_name', ''), v_role);
  exception when unique_violation then
    raise exception 'رقم الهاتف مسجل مسبقاً';
  end;

  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create or replace function public.check_phone_available(p_phone text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.profiles where phone = p_phone);
$$;

-- ============================================================
-- TEAMS: one active team per player, invite codes, membership
-- ============================================================
create or replace function public.gen_invite_code()
returns text language plpgsql security definer set search_path = public as $$
declare
  v_chars text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text;
  i int;
begin
  loop
    v_code := 'ARENA-';
    for i in 1..5 loop
      v_code := v_code || substr(v_chars, floor(random() * length(v_chars) + 1)::int, 1);
    end loop;
    exit when not exists (select 1 from public.teams where invite_code = v_code);
  end loop;
  return v_code;
end $$;

create or replace function public.trg_team_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if exists (select 1 from public.teams where captain_id = new.captain_id and is_active) then
    raise exception 'لديك فريق نشط بالفعل، ولا يمكنك إنشاء أكثر من فريق واحد';
  end if;
  new.invite_code := public.gen_invite_code();
  return new;
end $$;

create trigger trg_teams_single_active before insert on public.teams
  for each row execute function public.trg_team_before_insert();

create or replace function public.trg_team_after_insert()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.team_members (team_id, player_id, role) values (new.id, new.captain_id, 'captain');
  return new;
end $$;

create trigger trg_teams_add_captain after insert on public.teams
  for each row execute function public.trg_team_after_insert();

-- Join-request limit: 2 teams (free) / 10 teams (premium)
create or replace function public.trg_join_request_before_insert()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_limit int;
  v_count int;
begin
  if not exists (select 1 from public.teams where id = new.team_id and is_active) then
    raise exception 'هذا الفريق غير متاح';
  end if;
  if exists (select 1 from public.team_members where team_id = new.team_id and player_id = new.player_id) then
    raise exception 'أنت عضو في هذا الفريق بالفعل';
  end if;
  v_limit := public.membership_limit(new.player_id);
  v_count := public.active_membership_count(new.player_id);
  if v_count >= v_limit then
    if v_limit = 2 then
      raise exception 'وصلت إلى الحد الأقصى (فريقان) في الخطة المجانية — قم بالترقية إلى Premium للانضمام حتى 10 فرق';
    else
      raise exception 'وصلت إلى الحد الأقصى (10 فرق) في خطة Premium';
    end if;
  end if;
  return new;
end $$;

create trigger trg_join_requests_limit before insert on public.join_requests
  for each row execute function public.trg_join_request_before_insert();

create or replace function public.approve_join_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_req public.join_requests%rowtype;
  v_team public.teams%rowtype;
  v_limit int;
  v_count int;
begin
  select * into v_req from public.join_requests where id = p_request_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if v_req.status <> 'pending' then raise exception 'تمت معالجة هذا الطلب مسبقاً'; end if;

  select * into v_team from public.teams where id = v_req.team_id;
  if not (public.is_team_captain(v_team.id) or public.is_admin()) then
    raise exception 'الكابتن فقط يمكنه قبول الأعضاء';
  end if;

  v_limit := public.membership_limit(v_req.player_id);
  v_count := public.active_membership_count(v_req.player_id);
  if v_count >= v_limit then
    raise exception 'تجاوز اللاعب الحد الأقصى للفرق (%/%)', v_count, v_limit;
  end if;

  insert into public.team_members (team_id, player_id, role) values (v_req.team_id, v_req.player_id, 'member');

  update public.join_requests
  set status = 'approved', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  perform public.notify(
    v_req.player_id,
    'تم قبولك في فريق ' || v_team.name,
    'مبروك! أصبحت الآن عضواً في الفريق.',
    'team', jsonb_build_object('team_id', v_team.id)
  );
end $$;

create or replace function public.reject_join_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_req public.join_requests%rowtype;
  v_team public.teams%rowtype;
begin
  select * into v_req from public.join_requests where id = p_request_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  if v_req.status <> 'pending' then raise exception 'تمت معالجة هذا الطلب مسبقاً'; end if;

  select * into v_team from public.teams where id = v_req.team_id;
  if not (public.is_team_captain(v_team.id) or public.is_admin()) then
    raise exception 'الكابتن فقط يمكنه رفض الطلبات';
  end if;

  update public.join_requests
  set status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
  where id = p_request_id;

  perform public.notify(
    v_req.player_id,
    'تم رفض طلب انضمامك إلى فريق ' || v_team.name,
    'لم يُقبل طلب الانضمام هذه المرة.',
    'team', jsonb_build_object('team_id', v_team.id)
  );
end $$;

create or replace function public.cancel_join_request(p_request_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.join_requests
  set status = 'cancelled', reviewed_at = now()
  where id = p_request_id and player_id = auth.uid() and status = 'pending';
  if not found then raise exception 'لا يمكن إلغاء هذا الطلب'; end if;
end $$;

create or replace function public.leave_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams%rowtype;
begin
  select * into v_team from public.teams where id = p_team_id;
  if not found then raise exception 'الفريق غير موجود'; end if;
  if v_team.captain_id = auth.uid() then
    raise exception 'الكابتن لا يمكنه مغادرة فريقه — يمكنك حل الفريق بدلاً من ذلك';
  end if;
  delete from public.team_members where team_id = p_team_id and player_id = auth.uid();
  if not found then raise exception 'أنت لست عضواً في هذا الفريق'; end if;
end $$;

create or replace function public.remove_team_member(p_team_id uuid, p_player_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_team public.teams%rowtype;
begin
  select * into v_team from public.teams where id = p_team_id;
  if not found then raise exception 'الفريق غير موجود'; end if;
  if not (public.is_team_captain(p_team_id) or public.is_admin()) then
    raise exception 'الكابتن فقط يمكنه إزالة الأعضاء';
  end if;
  if p_player_id = v_team.captain_id then
    raise exception 'لا يمكن إزالة الكابتن';
  end if;
  delete from public.team_members where team_id = p_team_id and player_id = p_player_id;
  if not found then raise exception 'اللاعب ليس عضواً في الفريق'; end if;
  perform public.notify(p_player_id, 'تمت إزالتك من فريق ' || v_team.name, '', 'team', jsonb_build_object('team_id', p_team_id));
end $$;

create or replace function public.disband_team(p_team_id uuid)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not (public.is_team_captain(p_team_id) or public.is_admin()) then
    raise exception 'الكابتن فقط يمكنه حل الفريق';
  end if;
  update public.teams set is_active = false where id = p_team_id;
  if not found then raise exception 'الفريق غير موجود'; end if;
end $$;

create or replace function public.regenerate_invite_code(p_team_id uuid)
returns text language plpgsql security definer set search_path = public as $$
declare
  v_code text;
begin
  if not (public.is_team_captain(p_team_id) or public.is_admin()) then
    raise exception 'الكابتن فقط يمكنه تجديد كود الدعوة';
  end if;
  v_code := public.gen_invite_code();
  update public.teams set invite_code = v_code where id = p_team_id;
  return v_code;
end $$;

create or replace function public.get_team_by_code(p_code text)
returns table (team_id uuid, name text, logo_url text, description text, village_name text, captain_name text, members_count bigint)
language sql stable security definer set search_path = public as $$
  select t.id, t.name, t.logo_url, t.description, coalesce(v.name, ''), coalesce(p.full_name, ''),
         (select count(*) from public.team_members m where m.team_id = t.id)
  from public.teams t
  left join public.villages v on v.id = t.village_id
  left join public.profiles p on p.id = t.captain_id
  where upper(trim(t.invite_code)) = upper(trim(p_code)) and t.is_active;
$$;

-- ============================================================
-- BOOKINGS: server-side creation (no double booking, match conflicts)
-- ============================================================
create or replace function public.create_booking(p_venue_id uuid, p_date date, p_start time, p_hours int, p_notes text default '')
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_venue public.venues%rowtype;
  v_end time;
  v_full int;
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
  v_end := p_start + make_interval(hours => p_hours);
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

create or replace function public.set_payment_receipt(p_booking_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
begin
  update public.bookings
  set payment_receipt_url = p_url
  where id = p_booking_id and user_id = auth.uid()
    and booking_status in ('pending_review','rejected');
  if not found then raise exception 'لا يمكن تحديث إشعار الدفع لهذا الحجز'; end if;
end $$;

create or replace function public.review_booking(p_booking_id uuid, p_decision text, p_note text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
begin
  if p_decision not in ('approved','rejected') then raise exception 'قرار غير صحيح'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'الحجز غير موجود'; end if;
  select * into v_venue from public.venues where id = v_booking.venue_id;
  if not (v_venue.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'صاحب الملعب فقط يمكنه مراجعة الحجوزات';
  end if;
  if v_booking.booking_status <> 'pending_review' then raise exception 'تمت معالجة هذا الحجز مسبقاً'; end if;

  if p_decision = 'approved' then
    update public.bookings
    set booking_status = 'confirmed', payment_status = 'deposit_paid',
        reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_booking_id;
    perform public.notify(v_booking.user_id, 'تم تأكيد حجزك ✅', 'تم قبول إشعار الدفع، حجزك مؤكد في ' || v_venue.name, 'booking', jsonb_build_object('booking_id', p_booking_id));
  else
    update public.bookings
    set booking_status = 'rejected', reviewed_by = auth.uid(), reviewed_at = now()
    where id = p_booking_id;
    perform public.notify(v_booking.user_id, 'تم رفض حجزك ❌', coalesce(p_note, 'يرجى مراجعة إشعار التحويل وإعادة رفعه.'), 'booking', jsonb_build_object('booking_id', p_booking_id));
  end if;
end $$;

create or replace function public.cancel_booking(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.user_id <> auth.uid() then raise exception 'الحجز غير موجود'; end if;
  if v_booking.booking_status not in ('pending_review','confirmed') then
    raise exception 'لا يمكن إلغاء هذا الحجز';
  end if;
  select * into v_venue from public.venues where id = v_booking.venue_id;
  update public.bookings set booking_status = 'cancelled' where id = p_booking_id;
  perform public.notify(v_venue.owner_id, 'تم إلغاء حجز', 'أُلغي حجز في ملعب ' || v_venue.name, 'booking', jsonb_build_object('booking_id', p_booking_id));
end $$;

create or replace function public.request_refund(p_booking_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found or v_booking.user_id <> auth.uid() then raise exception 'الحجز غير موجود'; end if;
  if v_booking.booking_status <> 'confirmed' or v_booking.refund_status <> 'none' then
    raise exception 'لا يمكن طلب استرداد لهذا الحجز';
  end if;
  select * into v_venue from public.venues where id = v_booking.venue_id;
  update public.bookings set refund_status = 'requested' where id = p_booking_id;
  perform public.notify(v_venue.owner_id, 'طلب استرداد جديد', 'طلب لاعب استرداد العربون لحجز في ' || v_venue.name, 'booking', jsonb_build_object('booking_id', p_booking_id));
end $$;

create or replace function public.review_refund(p_booking_id uuid, p_decision text, p_refund_amount int default 0)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
  v_venue public.venues%rowtype;
begin
  if p_decision not in ('approved','rejected') then raise exception 'قرار غير صحيح'; end if;
  select * into v_booking from public.bookings where id = p_booking_id for update;
  if not found then raise exception 'الحجز غير موجود'; end if;
  select * into v_venue from public.venues where id = v_booking.venue_id;
  if not (v_venue.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'صاحب الملعب فقط يمكنه معالجة الاسترداد';
  end if;
  if v_booking.refund_status <> 'requested' then raise exception 'لا يوجد طلب استرداد معلق'; end if;

  if p_decision = 'approved' then
    update public.bookings
    set refund_status = 'refunded', refund_amount = p_refund_amount,
        payment_status = 'refunded', booking_status = 'cancelled'
    where id = p_booking_id;
    perform public.notify(v_booking.user_id, 'تمت الموافقة على الاسترداد', 'سيتم إرسال المبلغ المسترد عبر شام كاش.', 'booking', jsonb_build_object('booking_id', p_booking_id));
  else
    update public.bookings set refund_status = 'none' where id = p_booking_id;
    perform public.notify(v_booking.user_id, 'تم رفض طلب الاسترداد', '', 'booking', jsonb_build_object('booking_id', p_booking_id));
  end if;
end $$;

create or replace function public.set_refund_receipt(p_booking_id uuid, p_url text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_booking public.bookings%rowtype;
begin
  select * into v_booking from public.bookings where id = p_booking_id;
  if not found then raise exception 'الحجز غير موجود'; end if;
  if not (exists (select 1 from public.venues v where v.id = v_booking.venue_id and v.owner_id = auth.uid()) or public.is_admin()) then
    raise exception 'صاحب الملعب فقط';
  end if;
  update public.bookings set refund_receipt_url = p_url where id = p_booking_id;
end $$;

-- Venue rating maintenance
create or replace function public.trg_review_maintains_rating()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  v_venue uuid := coalesce(new.venue_id, old.venue_id);
  v_avg numeric;
  v_count int;
begin
  select coalesce(avg(rating),0), count(*) into v_avg, v_count from public.venue_reviews where venue_id = v_venue;
  update public.venues set rating = round(v_avg, 2), ratings_count = v_count where id = v_venue;
  return null;
end $$;

create trigger trg_reviews_rating after insert or update or delete on public.venue_reviews
  for each row execute function public.trg_review_maintains_rating();
