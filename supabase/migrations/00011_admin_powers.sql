-- ============================================================
-- Arena Go — 00011 : Admin powers
-- 1) Admin may create tournaments on ANY venue (multi-village events)
-- 2) admin_delete_user(): thorough, safe account removal
-- ============================================================

create policy "tournaments_insert_admin" on public.tournaments for insert to authenticated
  with check (
    public.is_admin()
    and status in ('pending_admin_approval','registration_open','approved')
  );

create or replace function public.admin_delete_user(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'مدير Arena Go فقط يمكنه حذف الحسابات';
  end if;
  if p_user = auth.uid() then
    raise exception 'لا يمكنك حذف حسابك بنفسك';
  end if;
  if exists (select 1 from public.profiles where id = p_user and role = 'admin') then
    raise exception 'لا يمكن حذف حساب مدير';
  end if;

  -- detach references that have no cascade
  update public.tournament_teams   set approved_by = null      where approved_by = p_user;
  update public.tournaments        set approved_by = null      where approved_by = p_user;
  update public.tournament_matches set result_entered_by = null where result_entered_by = p_user;
  update public.tournament_draws   set created_by = null       where created_by = p_user;
  update public.bookings           set reviewed_by = null      where reviewed_by = p_user;
  update public.join_requests      set reviewed_by = null      where reviewed_by = p_user;

  -- owned/related data
  delete from public.match_events  where player_id = p_user or created_by = p_user;
  delete from public.bookings      where user_id = p_user
     or venue_id in (select id from public.venues where owner_id = p_user);
  delete from public.tournaments   where owner_id = p_user;   -- cascades teams/matches/groups/draws/standings
  delete from public.venues        where owner_id = p_user;
  delete from public.teams         where captain_id = p_user; -- cascades members + tournament_teams
  delete from public.join_requests where player_id = p_user;
  delete from public.notifications where user_id = p_user;

  -- auth user (cascades: profiles, user_phones, identities, push_subscriptions,
  --              venue_reviews, team_members as player, tournament_player_stats)
  delete from auth.users where id = p_user;
end $$;
