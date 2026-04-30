-- ─────────────────────────────────────────────────────────────────────────────
-- Wallet app database schema
-- Run this in: supabase.com → your project → SQL Editor → New query
-- ─────────────────────────────────────────────────────────────────────────────

-- 1. Profiles table
-- Extends Supabase's built-in auth.users with app-specific fields.
-- The id column matches auth.users.id (same UUID).
create table if not exists public.profiles (
  id            uuid primary key references auth.users(id) on delete cascade,
  full_name     text not null,
  email         text not null,
  phone         text,
  avatar_url    text,
  basiq_user_id text,          -- Set after first bank connection
  created_at    timestamptz default now(),
  updated_at    timestamptz default now()
);

-- 2. Auto-create a profile row whenever a new user signs up via Supabase Auth
-- This is safer than doing it in your backend code.
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer as $$
begin
  insert into public.profiles (id, full_name, email)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', ''),
    new.email
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 3. Row Level Security — users can only read/write their own profile
alter table public.profiles enable row level security;

create policy "Users can view their own profile"
  on public.profiles for select
  using (auth.uid() = id);

create policy "Users can update their own profile"
  on public.profiles for update
  using (auth.uid() = id);

-- 4. Useful index
create index if not exists profiles_basiq_user_id_idx on public.profiles(basiq_user_id);
