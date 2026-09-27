-- ============================================================
-- Arena Go — 00005 : Storage buckets, storage policies, Realtime
-- ============================================================

-- ---------- Buckets ----------
insert into storage.buckets (id, name, public) values
  ('avatars', 'avatars', true),
  ('team-logos', 'team-logos', true),
  ('venue-images', 'venue-images', true),
  ('tournament-logos', 'tournament-logos', true),
  ('receipts', 'receipts', false)
on conflict (id) do nothing;

-- ---------- Public media buckets ----------
create policy "media_read_public" on storage.objects for select to anon, authenticated
  using (bucket_id in ('avatars','team-logos','venue-images','tournament-logos'));

create policy "media_upload_own" on storage.objects for insert to authenticated
  with check (
    bucket_id in ('avatars','team-logos','venue-images','tournament-logos')
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "media_update_own" on storage.objects for update to authenticated
  using (bucket_id in ('avatars','team-logos','venue-images','tournament-logos') and (storage.foldername(name))[1] = auth.uid()::text);

create policy "media_delete_own" on storage.objects for delete to authenticated
  using (bucket_id in ('avatars','team-logos','venue-images','tournament-logos') and (storage.foldername(name))[1] = auth.uid()::text);

-- ---------- Receipts (private): path convention {user_id}/{booking_id}/{file} ----------
create policy "receipts_read" on storage.objects for select to authenticated
  using (
    bucket_id = 'receipts'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or exists (
        select 1
        from public.bookings b
        join public.venues v on v.id = b.venue_id
        where (storage.foldername(name))[2] = b.id::text
          and v.owner_id = auth.uid()
      )
      or public.is_admin()
    )
  );

create policy "receipts_insert_own" on storage.objects for insert to authenticated
  with check (
    bucket_id = 'receipts'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- ---------- Realtime ----------
alter table public.notifications replica identity full;
alter table public.bookings replica identity full;
alter table public.tournament_matches replica identity full;
alter table public.tournament_teams replica identity full;
alter table public.join_requests replica identity full;

alter publication supabase_realtime add table public.notifications;
alter publication supabase_realtime add table public.bookings;
alter publication supabase_realtime add table public.join_requests;
alter publication supabase_realtime add table public.tournament_teams;
alter publication supabase_realtime add table public.tournament_matches;
alter publication supabase_realtime add table public.tournaments;
