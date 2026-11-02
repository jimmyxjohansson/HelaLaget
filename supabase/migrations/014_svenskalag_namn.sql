-- Kopplingar mellan namn i Svenskalags svarslistor och spelare/ledare i laget,
-- när namnen inte stämmer exakt. Sparas när en ledare kopplar ett namn för hand.
create table if not exists public.svenskalag_name_links (
  id serial primary key,
  squad_id integer not null references public.squads(id) on delete cascade,
  name_key text not null,
  player integer references public.players(id) on delete cascade,
  leader integer references public.leaders(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (squad_id, name_key),
  check ((player is null) <> (leader is null))
);

grant select, insert, update, delete on public.svenskalag_name_links to app_user;
grant usage, select on sequence public.svenskalag_name_links_id_seq to app_user;

alter table public.svenskalag_name_links enable row level security;

create policy app_read on public.svenskalag_name_links for select to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')));
create policy app_write on public.svenskalag_name_links for all to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader')));
