-- ============================================================
-- Arena Go — 00004 : Row Level Security
-- Permissions live in RLS + security-definer RPCs, never client-side only.
-- ============================================================

alter table public.villages              enable row level security;
alter table public.profiles              enable row level security;
alter table public.venues                enable row level security;
alter table public.venue_reviews         enable row level security;
alter table public.bookings              enable row level security;
alter table public.teams                 enable row level security;
alter table public.team_members          enable row level security;
alter table public.join_requests         enable row level security;
alter table public.tournaments           enable row level security;
alter table public.tournament_teams      enable row level security;
alter table public.tournament_groups     enable row level security;
alter table public.tournament_group_teams enable row level security;
alter table public.tournament_matches    enable row level security;
alter table public.match_events          enable row level security;
alter table public.tournament_player_stats enable row level security;
alter table public.tournament_standings  enable row level security;
alter table public.tournament_draws      enable row level security;
alter table public.notifications         enable row level security;
alter table public.push_subscriptions    enable row level security;

-- ---------- villages ----------
create policy "villages_read" on public.villages for select to anon, authenticated using (true);
create policy "villages_admin_write" on public.villages for all to authenticated using (public.is_admin()) with check (public.is_admin());

-- ---------- profiles ----------
create policy "profiles_read" on public.profiles for select to anon, authenticated using (true);
create policy "profiles_update_own" on public.profiles for update to authenticated
  using (id = auth.uid() or public.is_admin()) with check (id = auth.uid() or public.is_admin());
-- Phone numbers are hidden from the API (sensitive data). Definer functions still access them.
revoke select (phone) on public.profiles from anon, authenticated;

-- ---------- venues ----------
create policy "venues_read" on public.venues for select to anon, authenticated
  using (is_active = true or owner_id = auth.uid() or public.is_admin());
create policy "venues_insert_own" on public.venues for insert to authenticated
  with check (
    owner_id = auth.uid()
    and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('venue_owner','admin'))
  );
create policy "venues_update_own" on public.venues for update to authenticated
  using (owner_id = auth.uid() or public.is_admin()) with check (owner_id = auth.uid() or public.is_admin());
create policy "venues_delete_admin" on public.venues for delete to authenticated using (public.is_admin());

-- ---------- venue reviews ----------
create policy "reviews_read" on public.venue_reviews for select to anon, authenticated using (true);
create policy "reviews_insert_own" on public.venue_reviews for insert to authenticated
  with check (user_id = auth.uid());
create policy "reviews_update_own" on public.venue_reviews for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "reviews_delete_own" on public.venue_reviews for delete to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- ---------- bookings ----------
create policy "bookings_read" on public.bookings for select to authenticated
  using (
    user_id = auth.uid()
    or exists (select 1 from public.venues v where v.id = venue_id and v.owner_id = auth.uid())
    or public.is_admin()
  );
-- Insert/update happen only through security-definer RPCs (create_booking, review_booking, ...)
-- to enforce double-booking prevention and tournament-match conflicts server-side.

-- ---------- teams ----------
create policy "teams_read" on public.teams for select to anon, authenticated using (true);
create policy "teams_insert_own" on public.teams for insert to authenticated
  with check (captain_id = auth.uid());
create policy "teams_update_captain" on public.teams for update to authenticated
  using (captain_id = auth.uid() or public.is_admin()) with check (captain_id = auth.uid() or public.is_admin());
create policy "teams_delete_admin" on public.teams for delete to authenticated using (public.is_admin());

-- ---------- team members ----------
create policy "members_read" on public.team_members for select to anon, authenticated using (true);
create policy "members_remove" on public.team_members for delete to authenticated
  using (
    player_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
    or public.is_admin()
  );

-- ---------- join requests ----------
create policy "joinreq_read" on public.join_requests for select to authenticated
  using (
    player_id = auth.uid()
    or exists (select 1 from public.teams t where t.id = team_id and t.captain_id = auth.uid())
    or public.is_admin()
  );
create policy "joinreq_insert_own" on public.join_requests for insert to authenticated
  with check (player_id = auth.uid());
create policy "joinreq_delete_own" on public.join_requests for delete to authenticated
  using (player_id = auth.uid() and status = 'pending');
-- approve/reject through RPCs only (captain verified server-side)

-- ---------- tournaments ----------
create policy "tournaments_read" on public.tournaments for select to anon, authenticated
  using (
    status in ('registration_open','full','draw_pending','draw_completed','ongoing','completed')
    or owner_id = auth.uid()
    or public.is_admin()
  );
create policy "tournaments_insert_owner" on public.tournaments for insert to authenticated
  with check (
    owner_id = auth.uid()
    and status = 'pending_admin_approval'
    and exists (
      select 1 from public.venues v
      where v.id = venue_id and v.owner_id = auth.uid()
        and exists (select 1 from public.profiles p where p.id = auth.uid() and p.role in ('venue_owner','admin'))
    )
  );
create policy "tournaments_update_owner_pending" on public.tournaments for update to authenticated
  using (owner_id = auth.uid() and status = 'pending_admin_approval')
  with check (owner_id = auth.uid() and status = 'pending_admin_approval');
create policy "tournaments_update_admin" on public.tournaments for update to authenticated
  using (public.is_admin()) with check (public.is_admin());
create policy "tournaments_delete_admin" on public.tournaments for delete to authenticated using (public.is_admin());

-- ---------- tournament children: read for everyone, write through RPCs only ----------
create policy "tt_read" on public.tournament_teams for select to anon, authenticated using (true);
create policy "tt_delete_admin" on public.tournament_teams for delete to authenticated using (public.is_admin());

create policy "groups_read" on public.tournament_groups for select to anon, authenticated using (true);
create policy "gt_read" on public.tournament_group_teams for select to anon, authenticated using (true);
create policy "matches_read" on public.tournament_matches for select to anon, authenticated using (true);
create policy "events_read" on public.match_events for select to anon, authenticated using (true);
create policy "pstats_read" on public.tournament_player_stats for select to anon, authenticated using (true);
create policy "standings_read" on public.tournament_standings for select to anon, authenticated using (true);
create policy "draws_read" on public.tournament_draws for select to anon, authenticated using (true);

-- ---------- notifications ----------
create policy "notif_read_own" on public.notifications for select to authenticated
  using (user_id = auth.uid() or public.is_admin());
create policy "notif_update_own" on public.notifications for update to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
create policy "notif_delete_own" on public.notifications for delete to authenticated
  using (user_id = auth.uid());

-- ---------- push subscriptions ----------
create policy "push_own" on public.push_subscriptions for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());
