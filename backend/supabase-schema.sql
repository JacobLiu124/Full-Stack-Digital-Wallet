-- ============================================================
-- Digital Wallet — Supabase Schema
-- Run this in the Supabase SQL editor to set up your database.
-- ============================================================

-- Enable UUID extension
create extension if not exists "uuid-ossp";

-- -------------------------------------------------------
-- Users table
-- -------------------------------------------------------
create table if not exists public.users (
  id            uuid primary key default uuid_generate_v4(),
  name          text not null,
  email         text not null unique,
  phone         text not null,
  username      text not null unique,
  password_hash text not null,
  basiq_user_id text,                          -- Basiq's user ID (server-side only)
  bank_connected boolean not null default false,
  balance       numeric(12, 2) not null default 0.00,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);

-- Indexes
create index if not exists users_username_idx on public.users (username);
create index if not exists users_email_idx on public.users (email);

-- -------------------------------------------------------
-- Transactions table
-- -------------------------------------------------------
create table if not exists public.transactions (
  id                    uuid primary key default uuid_generate_v4(),
  reference_id          uuid not null,           -- shared ID linking sender+receiver records
  user_id               uuid not null references public.users(id),
  counterpart_id        uuid not null references public.users(id),
  counterpart_username  text not null,
  type                  text not null check (
    type in (
      'payment_sent',
      'payment_received',
      'request_sent',
      'request_received'
    )
  ),
  amount                numeric(12, 2) not null,
  note                  text,
  status                text not null default 'pending' check (
    status in ('pending', 'completed', 'declined', 'failed')
  ),
  created_at            timestamptz not null default now()
);

-- Indexes
create index if not exists tx_user_id_idx on public.transactions (user_id);
create index if not exists tx_reference_id_idx on public.transactions (reference_id);
create index if not exists tx_created_at_idx on public.transactions (created_at desc);

-- -------------------------------------------------------
-- Row-Level Security
-- The backend uses the service role key and bypasses RLS.
-- Enable RLS anyway as a safety net.
-- -------------------------------------------------------
alter table public.users enable row level security;
alter table public.transactions enable row level security;

-- Service role bypasses all policies automatically.
-- No additional policies needed for backend access.

-- -------------------------------------------------------
-- Updated_at trigger
-- -------------------------------------------------------
create or replace function public.handle_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger users_updated_at
  before update on public.users
  for each row execute procedure public.handle_updated_at();
