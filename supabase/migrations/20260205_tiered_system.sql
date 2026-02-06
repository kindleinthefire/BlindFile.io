-- ==========================================
-- BLINDFILE TIERED PERMISSION SYSTEM
-- ==========================================

-- 1. Create Profiles Table (if not exists)
-- This table extends the default auth.users table
create table if not exists public.profiles (
  id uuid references auth.users not null primary key,
  subscription_tier text not null default 'basic' check (subscription_tier in ('basic', 'pro')),
  updated_at timestamp with time zone default timezone('utc'::text, now()) not null
);

-- 2. Enable Row Level Security (RLS)
alter table public.profiles enable row level security;

-- 3. Create Security Policies
-- Allow users to read their own profile
create policy "Users can view own profile" on public.profiles
  for select using (auth.uid() = id);

-- Allow users to update their own profile (optional, mostly for manual admin overrides or billing callbacks)
create policy "Users can update own profile" on public.profiles
  for update using (auth.uid() = id);

-- 4. Auto-Profile Creation Trigger
-- Automatically assigns 'basic' tier to new signups
create or replace function public.handle_new_user()
returns trigger as $$
begin
  insert into public.profiles (id, subscription_tier)
  values (new.id, 'basic');
  return new;
end;
$$ language plpgsql security definer;

-- Trigger execution
drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 5. Helper for 'Pro' Upgrade (Run manually or via webhook)
-- update public.profiles set subscription_tier = 'pro' where id = 'USER_UUID';
