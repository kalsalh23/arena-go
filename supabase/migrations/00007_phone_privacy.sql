-- ============================================================
-- Arena Go — 00007 : Phone privacy hardening
-- PostgREST `select=*` ignores column-level revokes, so phone numbers
-- move out of `profiles` into `user_phones` (RLS: owner-only access).
-- ============================================================

create table if not exists public.user_phones (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  phone text not null unique,
  created_at timestamptz not null default now()
);
alter table public.user_phones enable row level security;
drop policy if exists "phones_own" on public.user_phones;
create policy "phones_own" on public.user_phones for all to authenticated
  using (user_id = auth.uid()) with check (user_id = auth.uid());

-- Updated signup trigger: write profile + phone together
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
    insert into public.profiles (id, full_name, role)
    values (new.id, coalesce(new.raw_user_meta_data->>'full_name', ''), v_role);
    insert into public.user_phones (user_id, phone) values (new.id, v_phone);
  exception when unique_violation then
    raise exception 'رقم الهاتف مسجل مسبقاً';
  end;

  return new;
end $$;

create or replace function public.check_phone_available(p_phone text)
returns boolean language sql stable security definer set search_path = public as $$
  select not exists (select 1 from public.user_phones where phone = p_phone);
$$;

-- Migrate existing phones, then drop the exposed column
insert into public.user_phones (user_id, phone)
select id, phone from public.profiles
on conflict (user_id) do nothing;

alter table public.profiles drop column phone;
