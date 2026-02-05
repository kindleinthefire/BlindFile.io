-- Create a table for tracking user upload stats
create table if not exists public.user_stats (
  user_id uuid references auth.users not null primary key,
  total_uploaded bigint default 0,
  last_30_days_uploaded bigint default 0,
  last_reset_date timestamptz default now(),
  updated_at timestamptz default now()
);

-- Enable Row Level Security (RLS)
alter table public.user_stats enable row level security;

-- Policy: Users can view their own stats
create policy "Users can view their own stats"
  on public.user_stats for select
  using ( auth.uid() = user_id );

-- Policy: Users can insert/update their own stats
-- This allows the client-side code in UploadZone to increment the counters.
create policy "Users can update their own stats"
  on public.user_stats for all
  using ( auth.uid() = user_id )
  with check ( auth.uid() = user_id );

-- Optional: Create a function to automatically update 'updated_at'
create or replace function public.handle_updated_at()
returns trigger as $$
begin
  new.updated_at = now();
  return new;
end;
$$ language plpgsql;

create trigger on_user_stats_updated
  before update on public.user_stats
  for each row execute procedure public.handle_updated_at();
