-- ============================================================
-- Arena Go — 00001 : Core schema (tables, indexes, constraints)
-- Money convention: 1 stored unit = 100 SYP  (600 => 60,000 ل.س)
-- ============================================================

create extension if not exists pgcrypto;

-- ---------- Villages ----------
create table if not exists public.villages (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now()
);

-- ---------- Profiles ----------
create table if not exists public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  phone text not null unique,
  full_name text not null default '',
  avatar_url text,
  village_id uuid references public.villages(id),
  position text,
  jersey_number integer,
  role text not null default 'player' check (role in ('player','venue_owner','admin')),
  is_premium boolean not null default false,
  premium_until timestamptz,
  bio text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ---------- Venues ----------
create table if not exists public.venues (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id) on delete cascade,
  village_id uuid not null references public.villages(id),
  name text not null,
  description text default '',
  address text default '',
  venue_type text not null check (venue_type in ('f5','f7','f11')),
  images text[] not null default '{}',
  price_per_hour integer not null default 0 check (price_per_hour >= 0),
  deposit_percent integer not null default 20 check (deposit_percent between 0 and 100),
  open_time time not null default '08:00',
  close_time time not null default '23:00',
  amenities jsonb not null default '[]',
  phone text default '',
  whatsapp text default '',
  shamcash_number text default '',
  shamcash_name text default '',
  shamcash_qr_url text,
  shamcash_active boolean not null default true,
  rating numeric(3,2) not null default 0,
  ratings_count integer not null default 0,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists venues_village_idx on public.venues (village_id);
create index if not exists venues_owner_idx on public.venues (owner_id);

create table if not exists public.venue_reviews (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  rating integer not null check (rating between 1 and 5),
  comment text default '',
  created_at timestamptz not null default now(),
  unique (venue_id, user_id)
);

-- ---------- Bookings ----------
create table if not exists public.bookings (
  id uuid primary key default gen_random_uuid(),
  venue_id uuid not null references public.venues(id),
  user_id uuid not null references public.profiles(id),
  booking_date date not null,
  start_time time not null,
  end_time time not null,
  duration_hours integer not null default 1 check (duration_hours between 1 and 6),
  full_price integer not null default 0 check (full_price >= 0),
  deposit_amount integer not null default 0 check (deposit_amount >= 0),
  remaining_amount integer not null default 0 check (remaining_amount >= 0),
  payment_status text not null default 'unpaid' check (payment_status in ('unpaid','deposit_paid','paid','refunded')),
  booking_status text not null default 'pending_review' check (booking_status in ('pending_review','confirmed','rejected','cancelled','completed')),
  payment_receipt_url text,
  refund_amount integer not null default 0,
  refund_status text not null default 'none' check (refund_status in ('none','requested','refunded')),
  refund_receipt_url text,
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz,
  notes text default '',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
-- Prevent double booking at DB level (any pending/confirmed booking locks the slot)
create unique index if not exists bookings_no_double_booking
  on public.bookings (venue_id, booking_date, start_time)
  where booking_status in ('pending_review','confirmed');
create index if not exists bookings_venue_date_idx on public.bookings (venue_id, booking_date);
create index if not exists bookings_user_idx on public.bookings (user_id, created_at desc);

-- ---------- Teams ----------
create table if not exists public.teams (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  logo_url text,
  village_id uuid references public.villages(id),
  description text default '',
  captain_id uuid not null references public.profiles(id),
  invite_code text not null unique,
  is_active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists teams_village_idx on public.teams (village_id);
create index if not exists teams_captain_idx on public.teams (captain_id);

create table if not exists public.team_members (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('captain','member')),
  joined_at timestamptz not null default now(),
  unique (team_id, player_id)
);
create index if not exists team_members_player_idx on public.team_members (player_id);

create table if not exists public.join_requests (
  id uuid primary key default gen_random_uuid(),
  team_id uuid not null references public.teams(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','cancelled')),
  created_at timestamptz not null default now(),
  reviewed_by uuid references public.profiles(id),
  reviewed_at timestamptz
);
create unique index if not exists join_requests_one_pending
  on public.join_requests (team_id, player_id) where status = 'pending';
create index if not exists join_requests_team_idx on public.join_requests (team_id, status);

-- ---------- Tournaments ----------
create table if not exists public.tournaments (
  id uuid primary key default gen_random_uuid(),
  owner_id uuid not null references public.profiles(id),
  venue_id uuid not null references public.venues(id),
  village_id uuid not null references public.villages(id),
  name text not null,
  description text default '',
  logo_url text,
  start_date date,
  end_date date,
  registration_deadline date,
  max_teams integer not null check (max_teams >= 2),
  registration_fee integer not null default 0 check (registration_fee >= 0),
  conditions text default '',
  tournament_type text not null check (tournament_type in ('groups','knockout','groups_knockout')),
  players_per_team integer not null default 11 check (players_per_team between 3 and 25),
  group_count integer not null default 2 check (group_count between 1 and 8),
  points_win integer not null default 3,
  points_draw integer not null default 1,
  points_loss integer not null default 0,
  prize_description text default '',
  status text not null default 'pending_admin_approval'
    check (status in ('draft','pending_admin_approval','rejected','approved','registration_open','full','draw_pending','draw_completed','ongoing','completed','cancelled')),
  approved_by uuid references public.profiles(id),
  approved_at timestamptz,
  rejection_reason text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index if not exists tournaments_status_idx on public.tournaments (status);
create index if not exists tournaments_village_idx on public.tournaments (village_id);

create table if not exists public.tournament_teams (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','approved','rejected','withdrawn')),
  joined_at timestamptz not null default now(),
  approved_at timestamptz,
  approved_by uuid references public.profiles(id),
  unique (tournament_id, team_id)
);
create index if not exists tournament_teams_team_idx on public.tournament_teams (team_id);

create table if not exists public.tournament_groups (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  name text not null,
  group_order integer not null default 1,
  created_at timestamptz not null default now(),
  unique (tournament_id, group_order)
);

create table if not exists public.tournament_group_teams (
  id uuid primary key default gen_random_uuid(),
  group_id uuid not null references public.tournament_groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (group_id, team_id)
);

create table if not exists public.tournament_matches (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id),
  home_team_id uuid not null references public.teams(id),
  away_team_id uuid not null references public.teams(id),
  venue_id uuid references public.venues(id),
  booking_id uuid references public.bookings(id),
  match_date date,
  start_time time,
  round integer not null default 1,
  home_score integer,
  away_score integer,
  status text not null default 'scheduled' check (status in ('scheduled','completed','cancelled')),
  result_entered_by uuid references public.profiles(id),
  result_entered_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  check (home_team_id <> away_team_id)
);
create index if not exists tournament_matches_tournament_idx on public.tournament_matches (tournament_id, round);
create index if not exists tournament_matches_status_idx on public.tournament_matches (tournament_id, status);

create table if not exists public.match_events (
  id uuid primary key default gen_random_uuid(),
  match_id uuid not null references public.tournament_matches(id) on delete cascade,
  player_id uuid not null references public.profiles(id),
  team_id uuid not null references public.teams(id),
  event_type text not null check (event_type in ('goal','yellow_card','red_card','assist')),
  minute integer,
  created_by uuid references public.profiles(id),
  created_at timestamptz not null default now()
);
create index if not exists match_events_match_idx on public.match_events (match_id);
create index if not exists match_events_player_idx on public.match_events (player_id, event_type);

create table if not exists public.tournament_player_stats (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  player_id uuid not null references public.profiles(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  goals integer not null default 0,
  assists integer not null default 0,
  matches_played integer not null default 0,
  yellow_cards integer not null default 0,
  red_cards integer not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (tournament_id, player_id)
);
create index if not exists tournament_player_stats_top_idx on public.tournament_player_stats (tournament_id, goals desc);

create table if not exists public.tournament_standings (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  group_id uuid references public.tournament_groups(id) on delete cascade,
  team_id uuid not null references public.teams(id) on delete cascade,
  played integer not null default 0,
  wins integer not null default 0,
  draws integer not null default 0,
  losses integer not null default 0,
  goals_for integer not null default 0,
  goals_against integer not null default 0,
  goal_difference integer not null default 0,
  points integer not null default 0,
  rank integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists tournament_standings_rank_idx on public.tournament_standings (tournament_id, points desc, goal_difference desc);

create table if not exists public.tournament_draws (
  id uuid primary key default gen_random_uuid(),
  tournament_id uuid not null references public.tournaments(id) on delete cascade,
  draw_type text not null,
  seed integer not null default 0,
  result_data jsonb not null,
  created_at timestamptz not null default now(),
  created_by uuid references public.profiles(id)
);

-- ---------- Notifications & push ----------
create table if not exists public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text default '',
  type text not null default 'general',
  data jsonb not null default '{}',
  is_read boolean not null default false,
  created_at timestamptz not null default now()
);
create index if not exists notifications_user_idx on public.notifications (user_id, created_at desc);

create table if not exists public.push_subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  endpoint text not null unique,
  keys jsonb not null,
  created_at timestamptz not null default now()
);
