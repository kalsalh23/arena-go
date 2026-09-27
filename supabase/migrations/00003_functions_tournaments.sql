-- ============================================================
-- Arena Go — 00003 : Tournament lifecycle functions
-- pending_admin_approval → registration_open → full → draw → ongoing → completed
-- ============================================================

-- ---------- Admin approval ----------
create or replace function public.admin_review_tournament(p_tournament_id uuid, p_decision text, p_reason text default null)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
begin
  if not public.is_admin() then raise exception 'مدير Arena Go فقط يمكنه الموافقة على البطولات'; end if;
  if p_decision not in ('approved','rejected') then raise exception 'قرار غير صحيح'; end if;
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'البطولة غير موجودة'; end if;
  if v_t.status <> 'pending_admin_approval' then raise exception 'تمت معالجة هذه البطولة مسبقاً'; end if;

  if p_decision = 'approved' then
    update public.tournaments
    set status = 'registration_open', approved_by = auth.uid(), approved_at = now(), rejection_reason = null
    where id = p_tournament_id;
    perform public.notify(v_t.owner_id, 'تمت الموافقة على بطولتك 🏆',
      'بطولة "' || v_t.name || '" مفتوحة الآن للتسجيل.', 'tournament', jsonb_build_object('tournament_id', p_tournament_id));
  else
    update public.tournaments
    set status = 'rejected', rejection_reason = p_reason
    where id = p_tournament_id;
    perform public.notify(v_t.owner_id, 'تم رفض بطولتك',
      'بطولة "' || v_t.name || '": ' || coalesce(p_reason, 'لم يتم تحديد سبب.'), 'tournament', jsonb_build_object('tournament_id', p_tournament_id));
  end if;
end $$;

-- ---------- Team registration (captain only) ----------
create or replace function public.register_team_in_tournament(p_tournament_id uuid, p_team_id uuid)
returns uuid language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
  v_team public.teams%rowtype;
  v_approved int;
  v_members int;
  v_tt uuid;
begin
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then raise exception 'البطولة غير موجودة'; end if;
  select * into v_team from public.teams where id = p_team_id;
  if not found or not v_team.is_active then raise exception 'الفريق غير متاح'; end if;
  if v_team.captain_id <> auth.uid() then raise exception 'الكابتن فقط يمكنه تسجيل فريقه في البطولة'; end if;

  if v_t.status <> 'registration_open' then raise exception 'التسجيل غير مفتوح لهذه البطولة'; end if;
  if v_t.registration_deadline is not null and current_date > v_t.registration_deadline then
    raise exception 'انتهى آخر موعد للتسجيل';
  end if;

  select count(*) into v_approved from public.tournament_teams
  where tournament_id = p_tournament_id and status = 'approved';
  if v_approved >= v_t.max_teams then raise exception 'اكتمل عدد الفرق في البطولة'; end if;

  select count(*) into v_members from public.team_members where team_id = p_team_id;
  if v_members > v_t.players_per_team then
    raise exception 'عدد لاعبي الفريق (%) يتجاوز الحد المسموح (%)', v_members, v_t.players_per_team;
  end if;

  if exists (select 1 from public.tournament_teams where tournament_id = p_tournament_id and team_id = p_team_id) then
    raise exception 'فريقك مسجل في هذه البطولة بالفعل';
  end if;

  insert into public.tournament_teams (tournament_id, team_id) values (p_tournament_id, p_team_id)
  returning id into v_tt;

  perform public.notify(v_t.owner_id, 'طلب مشاركة جديد في بطولة ' || v_t.name,
    'الفريق: ' || v_team.name, 'tournament', jsonb_build_object('tournament_id', p_tournament_id, 'team_id', p_team_id));
  return v_tt;
end $$;

-- ---------- Organizer reviews participation requests ----------
create or replace function public.review_tournament_team(p_tt_id uuid, p_decision text)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tt public.tournament_teams%rowtype;
  v_t public.tournaments%rowtype;
  v_team public.teams%rowtype;
  v_approved int;
begin
  if p_decision not in ('approved','rejected') then raise exception 'قرار غير صحيح'; end if;
  select * into v_tt from public.tournament_teams where id = p_tt_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  select * into v_t from public.tournaments where id = v_tt.tournament_id;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'منظم البطولة فقط يمكنه إدارة طلبات المشاركة';
  end if;
  select * into v_team from public.teams where id = v_tt.team_id;
  if v_tt.status <> 'pending' then raise exception 'تمت معالجة هذا الطلب مسبقاً'; end if;

  if p_decision = 'approved' then
    update public.tournament_teams
    set status = 'approved', approved_at = now(), approved_by = auth.uid()
    where id = p_tt_id;
    perform public.notify(v_team.captain_id, 'تم قبول فريقك في البطولة 🏆',
      'فريق "' || v_team.name || '" مشارك في بطولة "' || v_t.name || '".',
      'tournament', jsonb_build_object('tournament_id', v_t.id));

    select count(*) into v_approved from public.tournament_teams
    where tournament_id = v_t.id and status = 'approved';
    if v_approved >= v_t.max_teams then
      update public.tournaments set status = 'full' where id = v_t.id;
      perform public.notify(v_t.owner_id, 'اكتمل عدد الفرق 🎲',
        'وصلت بطولة "' || v_t.name || '" إلى العدد الكامل (' || v_t.max_teams || '/' || v_t.max_teams || '). يمكنك الآن بدء القرعة.',
        'tournament', jsonb_build_object('tournament_id', v_t.id));
    end if;
  else
    update public.tournament_teams set status = 'rejected' where id = p_tt_id;
    perform public.notify(v_team.captain_id, 'تم رفض مشاركة فريقك',
      'فريق "' || v_team.name || '" لم يُقبل في بطولة "' || v_t.name || '".',
      'tournament', jsonb_build_object('tournament_id', v_t.id));
  end if;
end $$;

create or replace function public.withdraw_tournament_team(p_tt_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_tt public.tournament_teams%rowtype;
  v_t public.tournaments%rowtype;
  v_team public.teams%rowtype;
begin
  select * into v_tt from public.tournament_teams where id = p_tt_id for update;
  if not found then raise exception 'الطلب غير موجود'; end if;
  select * into v_t from public.tournaments where id = v_tt.tournament_id;
  select * into v_team from public.teams where id = v_tt.team_id;
  if not (v_team.captain_id = auth.uid() or v_t.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'غير مصرح';
  end if;
  if v_t.status in ('ongoing','completed','cancelled') then raise exception 'لا يمكن الانسحاب بعد انطلاق البطولة'; end if;
  update public.tournament_teams set status = 'withdrawn' where id = p_tt_id;
  if v_t.status = 'full' then
    update public.tournaments set status = 'registration_open' where id = v_t.id;
  end if;
end $$;

-- ============================================================
-- THE DRAW — server-side, random, organizer cannot pick matchups
-- ============================================================
create or replace function public.run_tournament_draw(p_tournament_id uuid)
returns jsonb language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
  v_teams uuid[];
  v_team uuid;
  v_g int;
  v_i int;
  v_r int;
  v_n int;
  v_group_ids uuid[] := '{}'::uuid[];
  v_group uuid;
  v_arr uuid[];
  v_home uuid;
  v_away uuid;
  v_max_round int := 1;
  v_result jsonb;
  v_letters text[] := array['أ','ب','ج','د','هـ','و','ز','ح'];
  v_group_data jsonb;
  v_match_ids uuid[] := '{}'::uuid[];
  v_new_id uuid;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'البطولة غير موجودة'; end if;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'منظم البطولة فقط يمكنه بدء القرعة';
  end if;
  if v_t.status <> 'full' then
    raise exception 'لا يمكن إجراء القرعة إلا بعد اكتمال عدد الفرق';
  end if;

  select array_agg(team_id order by random()) into v_teams
  from public.tournament_teams where tournament_id = p_tournament_id and status = 'approved';

  -- Clean any previous draw artifacts (regeneration only while still 'full')
  delete from public.tournament_matches where tournament_id = p_tournament_id;
  delete from public.tournament_group_teams where group_id in (select id from public.tournament_groups where tournament_id = p_tournament_id);
  delete from public.tournament_groups where tournament_id = p_tournament_id;
  delete from public.tournament_standings where tournament_id = p_tournament_id;
  delete from public.tournament_draws where tournament_id = p_tournament_id;

  if v_t.tournament_type in ('groups','groups_knockout') then
    v_n := array_length(v_teams, 1);
    v_g := least(v_t.group_count, greatest(v_n / 2, 1));
    for v_i in 1..v_g loop
      insert into public.tournament_groups (tournament_id, name, group_order)
      values (p_tournament_id, 'المجموعة ' || v_letters[v_i], v_i)
      returning id into v_group;
      v_group_ids := v_group_ids || v_group;
    end loop;

    -- serpentine distribution keeps groups balanced
    v_i := 0;
    foreach v_team in array v_teams loop
      v_group := v_group_ids[(v_i % v_g) + 1];
      insert into public.tournament_group_teams (group_id, team_id) values (v_group, v_team);
      v_i := v_i + 1;
    end loop;

    -- round-robin inside each group (circle method)
    foreach v_group in array v_group_ids loop
      v_arr := '{}'::uuid[];
      select array_agg(team_id order by created_at) into v_arr
      from public.tournament_group_teams where group_id = v_group;
      v_n := array_length(v_arr, 1);
      if v_n % 2 = 1 then v_arr := v_arr || null::uuid; v_n := v_n + 1; end if;
      for v_r in 0..v_n - 2 loop
        for v_i in 0..v_n / 2 - 1 loop
          v_home := v_arr[v_i + 1];
          v_away := v_arr[v_n - v_i];
          if v_home is not null and v_away is not null then
            insert into public.tournament_matches (tournament_id, group_id, home_team_id, away_team_id, venue_id, round, status)
            values (p_tournament_id, v_group, v_home, v_away, v_t.venue_id, v_r + 1, 'scheduled')
            returning id into v_new_id;
            v_match_ids := v_match_ids || v_new_id;
            if v_r + 1 > v_max_round then v_max_round := v_r + 1; end if;
          end if;
        end loop;
        -- rotate keeping first fixed
        v_arr := array[v_arr[1]] || v_arr[v_n:v_n] || v_arr[2:v_n - 1];
      end loop;
    end loop;

    select jsonb_agg(jsonb_build_object('name', g.name, 'order', g.group_order, 'teams',
             (select jsonb_agg(gt.team_id order by gt.created_at) from public.tournament_group_teams gt where gt.group_id = g.id)))
      into v_group_data
    from public.tournament_groups g where g.tournament_id = p_tournament_id;

    v_result := jsonb_build_object('type', v_t.tournament_type, 'groups', coalesce(v_group_data,'[]'::jsonb), 'matches', to_jsonb(v_match_ids));

  elsif v_t.tournament_type = 'knockout' then
    v_n := array_length(v_teams, 1);
    if v_n is null or v_n < 2 or (v_n & (v_n - 1)) <> 0 then
      raise exception 'نظام خروج المغلوب يتطلب عدداً من الفرق يساوي قوة العدد 2 (4، 8، 16)';
    end if;
    for v_i in 0..v_n / 2 - 1 loop
      insert into public.tournament_matches (tournament_id, home_team_id, away_team_id, venue_id, round, status)
      values (p_tournament_id, v_teams[v_i * 2 + 1], v_teams[v_i * 2 + 2], v_t.venue_id, 1, 'scheduled')
      returning id into v_new_id;
      v_match_ids := v_match_ids || v_new_id;
    end loop;
    v_result := jsonb_build_object('type', 'knockout', 'round1', to_jsonb(v_match_ids));
  end if;

  insert into public.tournament_draws (tournament_id, draw_type, result_data, created_by)
  values (p_tournament_id, v_t.tournament_type, v_result, auth.uid());

  update public.tournaments set status = 'draw_completed' where id = p_tournament_id;

  -- Notify captains
  perform public.notify(p.id, 'تم إجراء القرعة 🎲',
    'قرعة بطولة "' || v_t.name || '" جاهزة — شاهد مباريات فريقك.',
    'tournament', jsonb_build_object('tournament_id', p_tournament_id))
  from public.tournament_teams tt
  join public.teams t on t.id = tt.team_id
  join public.profiles p on p.id = t.captain_id
  where tt.tournament_id = p_tournament_id and tt.status = 'approved';

  perform public.notify(v_t.owner_id, 'اكتملت القرعة 🎲', 'تم توزيع الفرق عشوائياً في بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', p_tournament_id));
  return v_result;
end $$;

create or replace function public.start_tournament(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'البطولة غير موجودة'; end if;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then raise exception 'غير مصرح'; end if;
  if v_t.status <> 'draw_completed' then raise exception 'يجب إجراء القرعة أولاً'; end if;
  update public.tournaments set status = 'ongoing' where id = p_tournament_id;
  perform public.notify(p.id, 'انطلقت البطولة ⚽', 'بدأت مباريات بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', p_tournament_id))
  from public.tournament_teams tt join public.teams t on t.id = tt.team_id
  join public.profiles p on p.id = t.captain_id
  where tt.tournament_id = p_tournament_id and tt.status = 'approved';
end $$;

-- ---------- Match scheduling ----------
create or replace function public.set_match_schedule(p_match_id uuid, p_date date, p_time time)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m public.tournament_matches%rowtype;
  v_t public.tournaments%rowtype;
begin
  select * into v_m from public.tournament_matches where id = p_match_id for update;
  if not found then raise exception 'المباراة غير موجودة'; end if;
  select * into v_t from public.tournaments where id = v_m.tournament_id;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then raise exception 'غير مصرح'; end if;
  if v_m.status <> 'scheduled' then raise exception 'لا يمكن تعديل موعد مباراة منتهية'; end if;

  if exists (
    select 1 from public.bookings b
    where b.venue_id = coalesce(v_m.venue_id, v_t.venue_id) and b.booking_date = p_date
      and b.booking_status in ('pending_review','confirmed')
      and b.start_time < p_time + interval '1 hour'
      and p_time < b.end_time
  ) then
    raise exception 'يوجد حجز على الملعب في هذا الوقت — اختر وقتاً آخر';
  end if;
  if exists (
    select 1 from public.tournament_matches m2
    where m2.tournament_id = v_m.tournament_id and m2.id <> p_match_id
      and m2.venue_id = coalesce(v_m.venue_id, v_t.venue_id) and m2.match_date = p_date
      and m2.start_time = p_time and m2.status = 'scheduled'
  ) then
    raise exception 'توجد مباراة أخرى على الملعب في نفس الوقت';
  end if;

  update public.tournament_matches set match_date = p_date, start_time = p_time, venue_id = coalesce(v_m.venue_id, v_t.venue_id) where id = p_match_id;

  perform public.notify(p.id, 'تم تحديد موعد مباراتكم 📅',
    'بطولة "' || v_t.name || '" — ' || p_date::text || ' الساعة ' || p_time::text,
    'match', jsonb_build_object('match_id', p_match_id, 'tournament_id', v_t.id))
  from public.teams t join public.profiles p on p.id = t.captain_id
  where t.id in (v_m.home_team_id, v_m.away_team_id);
end $$;

-- ---------- Standings recalculation ----------
create or replace function public.recalc_standings(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
begin
  select * into v_t from public.tournaments where id = p_tournament_id;
  if not found then return; end if;

  delete from public.tournament_standings where tournament_id = p_tournament_id;

  -- zero rows for every participating team (group rows + knockout rows)
  insert into public.tournament_standings (tournament_id, group_id, team_id)
  select g.tournament_id, g.id, gt.team_id
  from public.tournament_groups g
  join public.tournament_group_teams gt on gt.group_id = g.id
  where g.tournament_id = p_tournament_id;

  insert into public.tournament_standings (tournament_id, group_id, team_id)
  select distinct m.tournament_id, null::uuid, x.team_id
  from public.tournament_matches m
  cross join lateral (values (m.home_team_id), (m.away_team_id)) as x(team_id)
  where m.tournament_id = p_tournament_id and m.group_id is null
    and not exists (
      select 1 from public.tournament_standings s
      where s.tournament_id = p_tournament_id and s.group_id is null and s.team_id = x.team_id
    );

  -- aggregate completed matches (unpivot home/away)
  with played as (
    select m.group_id, m.home_team_id as team_id, m.home_score as gf, m.away_score as ga
    from public.tournament_matches m
    where m.tournament_id = p_tournament_id and m.status = 'completed' and m.home_score is not null
    union all
    select m.group_id, m.away_team_id, m.away_score, m.home_score
    from public.tournament_matches m
    where m.tournament_id = p_tournament_id and m.status = 'completed' and m.away_score is not null
  ),
  agg as (
    select group_id, team_id,
      count(*)::int as played,
      count(*) filter (where gf > ga)::int as wins,
      count(*) filter (where gf = ga)::int as draws,
      count(*) filter (where gf < ga)::int as losses,
      coalesce(sum(gf),0)::int as gf,
      coalesce(sum(ga),0)::int as ga
    from played group by group_id, team_id
  )
  update public.tournament_standings s
  set played = agg.played, wins = agg.wins, draws = agg.draws, losses = agg.losses,
      goals_for = agg.gf, goals_against = agg.ga, goal_difference = agg.gf - agg.ga,
      points = agg.wins * v_t.points_win + agg.draws * v_t.points_draw + agg.losses * v_t.points_loss,
      updated_at = now()
  from agg
  where s.tournament_id = p_tournament_id
    and s.group_id is not distinct from agg.group_id
    and s.team_id = agg.team_id;

  with ranked as (
    select id, row_number() over (
      partition by group_id
      order by points desc, goal_difference desc, goals_for desc, wins desc, team_id
    ) as rk
    from public.tournament_standings where tournament_id = p_tournament_id
  )
  update public.tournament_standings s set rank = r.rk
  from ranked r where s.id = r.id;
end $$;

-- ---------- Result entry ----------
create or replace function public.set_match_result(
  p_match_id uuid, p_home_score int, p_away_score int, p_events jsonb default '[]'
)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_m public.tournament_matches%rowtype;
  v_t public.tournaments%rowtype;
  v_ev jsonb;
  v_pid uuid;
  v_tid uuid;
  v_etype text;
  v_min int;
  v_knockout_done boolean;
  v_group_pending boolean;
  v_events jsonb := '[]'::jsonb;
begin
  select * into v_m from public.tournament_matches where id = p_match_id for update;
  if not found then raise exception 'المباراة غير موجودة'; end if;
  select * into v_t from public.tournaments where id = v_m.tournament_id;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then
    raise exception 'منظم البطولة فقط يمكنه تسجيل النتائج';
  end if;
  if v_m.status = 'completed' then raise exception 'النتيجة مسجلة مسبقاً لهذه المباراة'; end if;
  if v_m.status = 'cancelled' then raise exception 'المباراة ملغاة'; end if;
  if p_home_score is null or p_away_score is null or p_home_score < 0 or p_away_score < 0 then
    raise exception 'نتيجة غير صحيحة';
  end if;
  if v_m.group_id is null and p_home_score = p_away_score then
    raise exception 'لا يُسمح بالتعادل في الأدوار الإقصائية';
  end if;

  update public.tournament_matches
  set home_score = p_home_score, away_score = p_away_score, status = 'completed',
      result_entered_by = auth.uid(), result_entered_at = now()
  where id = p_match_id;

  -- events: [{"player_id":"...","team_id":"...","event_type":"goal","minute":10}]
  -- accept both a real jsonb array and a JSON-encoded string
  begin
    if jsonb_typeof(p_events) = 'array' then
      v_events := p_events;
    elsif jsonb_typeof(p_events) = 'string' then
      v_events := (p_events #>> '{}')::jsonb;
    end if;
  exception when others then
    v_events := '[]'::jsonb;
  end;
  if jsonb_typeof(v_events) <> 'array' then v_events := '[]'::jsonb; end if;

  for v_ev in select * from jsonb_array_elements(v_events) loop
    v_pid := (v_ev->>'player_id')::uuid;
    v_tid := (v_ev->>'team_id')::uuid;
    v_etype := v_ev->>'event_type';
    v_min := nullif(v_ev->>'minute','')::int;
    if v_pid is null or v_etype is null then continue; end if;
    if v_tid not in (v_m.home_team_id, v_m.away_team_id) then continue; end if;
    if v_etype not in ('goal','yellow_card','red_card','assist') then continue; end if;
    -- player must belong to one of the two teams
    if not exists (select 1 from public.team_members where team_id = v_tid and player_id = v_pid) then continue; end if;

    insert into public.match_events (match_id, player_id, team_id, event_type, minute, created_by)
    values (p_match_id, v_pid, v_tid, v_etype, v_min, auth.uid());

    insert into public.tournament_player_stats (tournament_id, player_id, team_id,
      goals, assists, matches_played, yellow_cards, red_cards)
    values (v_t.id, v_pid, v_tid,
      case when v_etype = 'goal' then 1 else 0 end,
      case when v_etype = 'assist' then 1 else 0 end,
      1,
      case when v_etype = 'yellow_card' then 1 else 0 end,
      case when v_etype = 'red_card' then 1 else 0 end)
    on conflict (tournament_id, player_id) do update set
      goals = public.tournament_player_stats.goals + excluded.goals,
      assists = public.tournament_player_stats.assists + excluded.assists,
      matches_played = public.tournament_player_stats.matches_played + excluded.matches_played,
      yellow_cards = public.tournament_player_stats.yellow_cards + excluded.yellow_cards,
      red_cards = public.tournament_player_stats.red_cards + excluded.red_cards,
      updated_at = now();
  end loop;

  perform public.recalc_standings(v_t.id);

  perform public.notify(p.id, 'تم تسجيل نتيجة مباراتكم ⚽',
    'بطولة "' || v_t.name || '": ' || p_home_score::text || ' - ' || p_away_score::text,
    'match', jsonb_build_object('match_id', p_match_id, 'tournament_id', v_t.id))
  from public.teams t join public.profiles p on p.id = t.captain_id
  where t.id in (v_m.home_team_id, v_m.away_team_id);

  if v_m.group_id is null then
    -- knockout phase: advance winners / crown champion
    select bool_and(status = 'completed') into v_knockout_done
    from public.tournament_matches
    where tournament_id = v_t.id and group_id is null;

    if v_knockout_done then
      <<knockout_block>>
      declare
        v_last_round int;
        v_winners uuid[];
        v_i int;
      begin
        select max(round) into v_last_round
        from public.tournament_matches where tournament_id = v_t.id and group_id is null;

        select coalesce(array_agg(case when home_score > away_score then home_team_id else away_team_id end), '{}'::uuid[])
          into v_winners
        from public.tournament_matches
        where tournament_id = v_t.id and group_id is null and round = v_last_round and status = 'completed';

        if array_length(v_winners, 1) = 1 then
          update public.tournaments set status = 'completed' where id = v_t.id;
          perform public.notify(p.id, '🏆 فريقك بطل البطولة!',
            'توج فريق "' || t.name || '" بلقب بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', v_t.id))
          from public.teams t join public.profiles p on p.id = t.captain_id
          where t.id = v_winners[1];
        else
          for v_i in 0..(array_length(v_winners,1) / 2) - 1 loop
            insert into public.tournament_matches (tournament_id, home_team_id, away_team_id, venue_id, round, status)
            values (v_t.id, v_winners[v_i*2+1], v_winners[v_i*2+2], v_t.venue_id, v_last_round + 1, 'scheduled');
          end loop;
          perform public.notify(p.id, 'تأهل فريقك لدور جديد 🎉',
            'فريقك واصل مشواره في بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', v_t.id))
          from public.teams t join public.profiles p on p.id = t.captain_id
          where t.id = any(v_winners);
        end if;
      end knockout_block;
    end if;

  elsif v_t.tournament_type = 'groups_knockout' then
    select exists(
      select 1 from public.tournament_matches
      where tournament_id = v_t.id and status = 'scheduled' and group_id is not null
    ) into v_group_pending;
    if not v_group_pending and not exists (select 1 from public.tournament_matches where tournament_id = v_t.id and group_id is null) then
      perform public.notify(v_t.owner_id, 'اكتملت مرحلة المجموعات',
        'أنشئ الآن دور خروج المغلوب لبطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', v_t.id));
    end if;
  elsif v_t.tournament_type = 'groups' then
    if not exists (select 1 from public.tournament_matches where tournament_id = v_t.id and status = 'scheduled') then
      update public.tournaments set status = 'completed' where id = v_t.id;
      perform public.notify(p.id, 'انتهت البطولة 🏁', 'اكتملت جميع مباريات بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', v_t.id))
      from public.tournament_teams tt join public.teams t on t.id = tt.team_id
      join public.profiles p on p.id = t.captain_id
      where tt.tournament_id = v_t.id and tt.status = 'approved';
    end if;
  end if;
end $$;

-- ---------- Knockout from groups (groups_knockout) ----------
create or replace function public.create_knockout_from_groups(p_tournament_id uuid)
returns void language plpgsql security definer set search_path = public as $$
declare
  v_t public.tournaments%rowtype;
  v_max_group_round int;
  v_q record;
  v_i int := 0;
  v_first uuid;
  v_second uuid;
begin
  select * into v_t from public.tournaments where id = p_tournament_id for update;
  if not found then raise exception 'البطولة غير موجودة'; end if;
  if not (v_t.owner_id = auth.uid() or public.is_admin()) then raise exception 'غير مصرح'; end if;
  if v_t.tournament_type <> 'groups_knockout' then raise exception 'هذه البطولة ليست بنظام مجموعات + خروج مغلق'; end if;
  if exists (select 1 from public.tournament_matches where tournament_id = p_tournament_id and group_id is null) then
    raise exception 'مرحلة خروج المغلوب منشأة بالفعل';
  end if;
  if exists (select 1 from public.tournament_matches where tournament_id = p_tournament_id and group_id is not null and status = 'scheduled') then
    raise exception 'يجب إكمال جميع مباريات المجموعات أولاً';
  end if;

  select coalesce(max(round), 1) into v_max_group_round from public.tournament_matches where tournament_id = p_tournament_id;

  -- pair each group winner with the next group's runner-up
  for v_q in
    select g.id, g.group_order,
      (select team_id from public.tournament_standings s where s.tournament_id = p_tournament_id and s.group_id = g.id and s.rank = 1) as first,
      (select team_id from public.tournament_standings s where s.tournament_id = p_tournament_id and s.group_id = g.id and s.rank = 2) as second
    from public.tournament_groups g
    where g.tournament_id = p_tournament_id
    order by g.group_order
  loop
    if v_i % 2 = 0 then
      v_first := v_q.first;
      v_second := v_q.second;
    else
      insert into public.tournament_matches (tournament_id, home_team_id, away_team_id, venue_id, round, status)
      values (p_tournament_id, v_first, v_q.second, v_t.venue_id, v_max_group_round + 1, 'scheduled');
      insert into public.tournament_matches (tournament_id, home_team_id, away_team_id, venue_id, round, status)
      values (p_tournament_id, v_q.first, v_second, v_t.venue_id, v_max_group_round + 1, 'scheduled');
    end if;
    v_i := v_i + 1;
  end loop;

  perform public.notify(p.id, 'أُقرّت مواجهات خروج المغلوب 🔥',
    'بدأ دور خروج المغلوب في بطولة "' || v_t.name || '".', 'tournament', jsonb_build_object('tournament_id', p_tournament_id))
  from public.tournament_teams tt join public.teams t on t.id = tt.team_id
  join public.profiles p on p.id = t.captain_id
  where tt.tournament_id = p_tournament_id and tt.status = 'approved';
end $$;
