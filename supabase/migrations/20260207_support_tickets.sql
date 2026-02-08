create table if not exists support_tickets (
  id uuid default gen_random_uuid() primary key,
  name text not null,
  email text not null,
  message text not null,
  ticket_type text not null,
  created_at timestamp with time zone default timezone('utc'::text, now()) not null
);

alter table support_tickets enable row level security;

create policy "Enable insert for everyone" on support_tickets
  for insert with check (true);

create policy "Enable read access for service role only" on support_tickets
  for select using (auth.role() = 'service_role');
