create extension if not exists pgcrypto;

-- =========================================================
-- MEC SPACES
-- =========================================================

create table if not exists public.spaces (
  id uuid primary key default gen_random_uuid(),

  host_id uuid not null references auth.users(id) on delete cascade,

  title text not null,
  description text,

  mode text not null default 'audio'
    check (mode in ('audio', 'video', 'audio_video')),

  visibility text not null default 'family'
    check (visibility in ('family', 'selected')),

  theme text not null default 'gold'
    check (theme in ('gold', 'blue', 'purple', 'green', 'rose', 'custom')),

  custom_theme_color text,

  status text not null default 'scheduled'
    check (status in ('scheduled', 'live', 'ended', 'cancelled')),

  scheduled_for timestamptz,

  max_cohosts integer not null default 3
    check (max_cohosts between 1 and 3),

  max_speakers integer not null default 20
    check (max_speakers between 1 and 20),

  started_at timestamptz,
  ended_at timestamptz,

  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);


-- =========================================================
-- SPACE PARTICIPANTS
-- =========================================================

create table if not exists public.space_participants (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  role text not null default 'listener'
    check (role in ('host', 'cohost', 'speaker', 'listener')),

  audio_enabled boolean not null default false,
  video_enabled boolean not null default false,

  is_hand_raised boolean not null default false,

  joined_at timestamptz not null default now(),
  left_at timestamptz,

  created_at timestamptz not null default now(),

  unique(space_id, user_id)
);


-- =========================================================
-- SPACE INVITATIONS
-- =========================================================

create table if not exists public.space_invitations (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null references public.spaces(id) on delete cascade,
  invited_user_id uuid not null references auth.users(id) on delete cascade,
  invited_by uuid not null references auth.users(id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'accepted', 'declined')),

  created_at timestamptz not null default now(),
  responded_at timestamptz,

  unique(space_id, invited_user_id)
);


-- =========================================================
-- SPACE REACTIONS
-- =========================================================

create table if not exists public.space_reactions (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  emoji text not null,

  created_at timestamptz not null default now()
);


-- =========================================================
-- SPACE HAND RAISES
-- =========================================================

create table if not exists public.space_hand_raises (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  status text not null default 'pending'
    check (status in ('pending', 'approved', 'declined')),

  created_at timestamptz not null default now(),
  responded_at timestamptz,

  unique(space_id, user_id)
);


-- =========================================================
-- SELECTED SPACE MEMBERS
-- =========================================================

create table if not exists public.space_invited_members (
  id uuid primary key default gen_random_uuid(),

  space_id uuid not null references public.spaces(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,

  created_at timestamptz not null default now(),

  unique(space_id, user_id)
);


-- =========================================================
-- INDEXES
-- =========================================================

create index if not exists spaces_status_idx
  on public.spaces(status);

create index if not exists spaces_scheduled_for_idx
  on public.spaces(scheduled_for);

create index if not exists spaces_host_id_idx
  on public.spaces(host_id);

create index if not exists space_participants_space_id_idx
  on public.space_participants(space_id);

create index if not exists space_participants_user_id_idx
  on public.space_participants(user_id);

create index if not exists space_reactions_space_id_idx
  on public.space_reactions(space_id);

create index if not exists space_hand_raises_space_id_idx
  on public.space_hand_raises(space_id);


-- =========================================================
-- UPDATED_AT
-- =========================================================

create or replace function public.update_space_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists spaces_updated_at on public.spaces;

create trigger spaces_updated_at
before update on public.spaces
for each row
execute function public.update_space_updated_at();


-- =========================================================
-- ROW LEVEL SECURITY
-- =========================================================

alter table public.spaces enable row level security;
alter table public.space_participants enable row level security;
alter table public.space_invitations enable row level security;
alter table public.space_reactions enable row level security;
alter table public.space_hand_raises enable row level security;
alter table public.space_invited_members enable row level security;


-- =========================================================
-- SPACES POLICIES
-- =========================================================

drop policy if exists "Authenticated users can view family spaces"
on public.spaces;

create policy "Authenticated users can view family spaces"
on public.spaces
for select
to authenticated
using (
  visibility = 'family'
  or host_id = auth.uid()
  or exists (
    select 1
    from public.space_invited_members sim
    where sim.space_id = spaces.id
      and sim.user_id = auth.uid()
  )
);


drop policy if exists "Users can create their own spaces"
on public.spaces;

create policy "Users can create their own spaces"
on public.spaces
for insert
to authenticated
with check (
  host_id = auth.uid()
);


drop policy if exists "Hosts can update their spaces"
on public.spaces;

create policy "Hosts can update their spaces"
on public.spaces
for update
to authenticated
using (
  host_id = auth.uid()
)
with check (
  host_id = auth.uid()
);


drop policy if exists "Hosts can delete their spaces"
on public.spaces;

create policy "Hosts can delete their spaces"
on public.spaces
for delete
to authenticated
using (
  host_id = auth.uid()
);


-- =========================================================
-- PARTICIPANTS
-- =========================================================

drop policy if exists "Participants can view space participants"
on public.space_participants;

create policy "Participants can view space participants"
on public.space_participants
for select
to authenticated
using (
  exists (
    select 1
    from public.spaces s
    where s.id = space_participants.space_id
      and (
        s.visibility = 'family'
        or s.host_id = auth.uid()
        or exists (
          select 1
          from public.space_invited_members sim
          where sim.space_id = s.id
            and sim.user_id = auth.uid()
        )
      )
  )
);


drop policy if exists "Users can join spaces"
on public.space_participants;

create policy "Users can join spaces"
on public.space_participants
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists "Users can update their participation"
on public.space_participants;

create policy "Users can update their participation"
on public.space_participants
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


-- =========================================================
-- REACTIONS
-- =========================================================

drop policy if exists "Authenticated users can view reactions"
on public.space_reactions;

create policy "Authenticated users can view reactions"
on public.space_reactions
for select
to authenticated
using (true);


drop policy if exists "Users can send reactions"
on public.space_reactions;

create policy "Users can send reactions"
on public.space_reactions
for insert
to authenticated
with check (
  user_id = auth.uid()
);


-- =========================================================
-- HAND RAISES
-- =========================================================

drop policy if exists "Authenticated users can view hand raises"
on public.space_hand_raises;

create policy "Authenticated users can view hand raises"
on public.space_hand_raises
for select
to authenticated
using (true);


drop policy if exists "Users can raise their hand"
on public.space_hand_raises;

create policy "Users can raise their hand"
on public.space_hand_raises
for insert
to authenticated
with check (
  user_id = auth.uid()
);


drop policy if exists "Users can update their own hand raise"
on public.space_hand_raises;

create policy "Users can update their own hand raise"
on public.space_hand_raises
for update
to authenticated
using (
  user_id = auth.uid()
)
with check (
  user_id = auth.uid()
);


-- =========================================================
-- REALTIME
-- =========================================================

do $$
begin
  alter publication supabase_realtime add table public.spaces;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.space_participants;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.space_reactions;
exception
  when duplicate_object then null;
end $$;

do $$
begin
  alter publication supabase_realtime add table public.space_hand_raises;
exception
  when duplicate_object then null;
end $$;
