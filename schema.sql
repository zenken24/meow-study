-- meow-study — Supabase schema (v4: tasks columns, pomodoro history, rich notes,
-- folders, labels, calendar sync fields, sound mixes)
-- Safe to re-run — every statement is idempotent.

create extension if not exists pgcrypto;

-- ================= tasks =================
create table if not exists public.tasks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  text text not null,
  project text default '',
  done boolean not null default false,
  priority text not null default 'medium',
  tags text[] not null default '{}',
  status text not null default 'todo',            -- 'todo' | 'in_progress' | 'completed'
  due_date date,
  subtasks jsonb not null default '[]',            -- [{ text, done }]
  minutes_spent integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.tasks add column if not exists priority text not null default 'medium';
alter table public.tasks add column if not exists tags text[] not null default '{}';
alter table public.tasks add column if not exists status text not null default 'todo';
alter table public.tasks add column if not exists due_date date;
alter table public.tasks add column if not exists subtasks jsonb not null default '[]';
alter table public.tasks add column if not exists minutes_spent integer not null default 0;
-- backfill status from the old `done` boolean for anyone upgrading
update public.tasks set status = 'completed' where done = true and status = 'todo';
alter table public.tasks enable row level security;
drop policy if exists "own tasks" on public.tasks;
create policy "own tasks" on public.tasks
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= folders (for notes) =================
create table if not exists public.folders (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  name text not null,
  created_at timestamptz not null default now()
);
alter table public.folders enable row level security;
drop policy if exists "own folders" on public.folders;
create policy "own folders" on public.folders
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= notes (rich, multi-type) =================
create table if not exists public.notes (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  title text default '',
  body text default '',                             -- plain text (search + list/voice transcript)
  html_body text default '',                         -- rich formatted HTML for text notes
  type text not null default 'text',                 -- text | list | voice | image | drawing
  color text default '',
  pinned boolean not null default false,
  archived boolean not null default false,
  folder_id uuid references public.folders(id) on delete set null,
  labels text[] not null default '{}',
  list_items jsonb not null default '[]',             -- [{ text, done }]
  audio_url text,
  image_url text,
  drawing_url text,
  reminder_at timestamptz,
  reminder_recurrence text default 'none',            -- none | daily | weekly
  updated_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);
alter table public.notes add column if not exists html_body text default '';
alter table public.notes add column if not exists type text not null default 'text';
alter table public.notes add column if not exists color text default '';
alter table public.notes add column if not exists pinned boolean not null default false;
alter table public.notes add column if not exists archived boolean not null default false;
alter table public.notes add column if not exists folder_id uuid references public.folders(id) on delete set null;
alter table public.notes add column if not exists labels text[] not null default '{}';
alter table public.notes add column if not exists list_items jsonb not null default '[]';
alter table public.notes add column if not exists audio_url text;
alter table public.notes add column if not exists image_url text;
alter table public.notes add column if not exists drawing_url text;
alter table public.notes add column if not exists reminder_at timestamptz;
alter table public.notes add column if not exists reminder_recurrence text default 'none';
alter table public.notes add column if not exists created_at timestamptz not null default now();
alter table public.notes enable row level security;
drop policy if exists "own notes" on public.notes;
create policy "own notes" on public.notes
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= label colors (per-user label -> color mapping) =================
create table if not exists public.label_colors (
  user_id uuid not null references auth.users(id) on delete cascade,
  label text not null,
  color text not null default '#FF1493',
  primary key (user_id, label)
);
alter table public.label_colors enable row level security;
drop policy if exists "own label colors" on public.label_colors;
create policy "own label colors" on public.label_colors
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= calendar events =================
create table if not exists public.calendar_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  title text not null,
  time text default '',
  category text default '',
  color text default '',
  google_event_id text,
  created_at timestamptz not null default now()
);
alter table public.calendar_events add column if not exists category text default '';
alter table public.calendar_events add column if not exists color text default '';
alter table public.calendar_events add column if not exists google_event_id text;
alter table public.calendar_events add column if not exists created_at timestamptz not null default now();
alter table public.calendar_events enable row level security;
drop policy if exists "own events" on public.calendar_events;
create policy "own events" on public.calendar_events
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= per-user settings =================
create table if not exists public.settings (
  user_id uuid primary key references auth.users(id) on delete cascade,
  timer_config jsonb not null default '{"focus":25,"short":5,"long":15,"every":4,"sessions":0,"autoStart":false,"dailyGoalMin":120}',
  sound_levels jsonb not null default '{}',
  sound_mixes jsonb not null default '[]',
  media_state jsonb not null default '{}',
  updated_at timestamptz not null default now()
);
alter table public.settings add column if not exists sound_mixes jsonb not null default '[]';
alter table public.settings enable row level security;
drop policy if exists "own settings" on public.settings;
create policy "own settings" on public.settings
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= study log (streak) =================
create table if not exists public.study_log (
  user_id uuid not null references auth.users(id) on delete cascade,
  date date not null,
  minutes integer not null default 0,
  primary key (user_id, date)
);
alter table public.study_log enable row level security;
drop policy if exists "own study log" on public.study_log;
create policy "own study log" on public.study_log
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= pomodoro session history =================
create table if not exists public.pomodoro_sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  task_id uuid references public.tasks(id) on delete set null,
  task_text text default '',
  mode text not null default 'focus',
  minutes integer not null default 0,
  completed_at timestamptz not null default now()
);
alter table public.pomodoro_sessions enable row level security;
drop policy if exists "own sessions" on public.pomodoro_sessions;
create policy "own sessions" on public.pomodoro_sessions
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= profiles =================
create table if not exists public.profiles (
  user_id uuid primary key references auth.users(id) on delete cascade,
  username text default '',
  avatar_url text,
  theme text not null default 'dark',
  background_mode text not null default 'default',
  custom_background_url text,
  updated_at timestamptz not null default now()
);
alter table public.profiles enable row level security;
drop policy if exists "own profile" on public.profiles;
create policy "own profile" on public.profiles
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= achievement badges (earned) =================
create table if not exists public.badges (
  user_id uuid not null references auth.users(id) on delete cascade,
  badge_id text not null,
  earned_at timestamptz not null default now(),
  primary key (user_id, badge_id)
);
alter table public.badges enable row level security;
drop policy if exists "own badges" on public.badges;
create policy "own badges" on public.badges
  for all using (auth.uid() = user_id) with check (auth.uid() = user_id);

-- ================= storage: avatars, backgrounds, notes-media =================
insert into storage.buckets (id, name, public) values ('avatars', 'avatars', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('backgrounds', 'backgrounds', true) on conflict (id) do nothing;
insert into storage.buckets (id, name, public) values ('notes-media', 'notes-media', true) on conflict (id) do nothing;

do $$
declare
  b text;
begin
  foreach b in array array['avatars','backgrounds','notes-media'] loop
    execute format('drop policy if exists "%1$s public read" on storage.objects', b);
    execute format('create policy "%1$s public read" on storage.objects for select using (bucket_id = %2$L)', b, b);

    execute format('drop policy if exists "%1$s own write" on storage.objects', b);
    execute format('create policy "%1$s own write" on storage.objects for insert with check (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)', b, b);

    execute format('drop policy if exists "%1$s own update" on storage.objects', b);
    execute format('create policy "%1$s own update" on storage.objects for update using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)', b, b);

    execute format('drop policy if exists "%1$s own delete" on storage.objects', b);
    execute format('create policy "%1$s own delete" on storage.objects for delete using (bucket_id = %2$L and (storage.foldername(name))[1] = auth.uid()::text)', b, b);
  end loop;
end $$;
