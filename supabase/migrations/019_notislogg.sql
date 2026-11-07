-- Logg över skickade notiser per lag. Skrivs av servern när en notis skickas;
-- lagets admin kan läsa den.
create table if not exists public.push_log (
  id bigserial primary key,
  squad_id integer references public.squads(id) on delete cascade,
  created_at timestamptz not null default now(),
  -- Vilka den gick till: 'squad' (alla som följer laget), 'leaders' eller 'admins'
  audience text not null,
  title text not null,
  body text,
  url text,
  -- Den som orsakade notisen (registrerade händelsen eller tryckte Skicka), om någon
  sent_by uuid references auth.users(id) on delete set null,
  people integer not null default 0,
  devices integer not null default 0,
  failed integer not null default 0
);
create index if not exists push_log_squad_created_idx on public.push_log (squad_id, created_at desc);

grant select on public.push_log to app_user;
alter table public.push_log enable row level security;
create policy app_read on public.push_log for select to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('admin')));
