create table if not exists waiting_list (
  id uuid default gen_random_uuid() primary key,
  email text not null unique,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table waiting_list enable row level security;

create policy "Enable insert for everyone" on waiting_list
  for insert with check (true);

create policy "Enable read access for service role only" on waiting_list
  for select using (auth.role() = 'service_role');
