-- Lagets information (t.ex. koder till bolltunna och förråd) som visas
-- på träningar och/eller matcher. Admin ändrar den under Laginställningar.
create table if not exists public.squad_infos (
  id serial primary key,
  squad_id integer not null references public.squads(id) on delete cascade,
  title text not null,
  -- Enkel formatering: **fet**, *kursiv*, rader som börjar med "- " blir punktlista
  body text not null default '',
  on_trainings boolean not null default true,
  on_matches boolean not null default false,
  -- 'leaders' = bara ledare och admin, 'all' = även spelare och anhöriga
  audience text not null default 'leaders' check (audience in ('leaders', 'all')),
  position integer not null default 0,
  updated_at timestamptz not null default now()
);
create index if not exists squad_infos_squad_idx on public.squad_infos (squad_id, position);

grant select on public.squad_infos to app_user;
alter table public.squad_infos enable row level security;
create policy app_read on public.squad_infos for select to app_user
  using (squad_id = (select app.squad_id()) and (audience = 'all' or (select app.has_role('leader'))));
