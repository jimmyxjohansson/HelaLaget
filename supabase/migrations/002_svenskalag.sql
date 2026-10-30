-- ════════════════════════════════════════════════════════════════════════════
-- Hela Laget: import från Svenskalags kalender
-- ════════════════════════════════════════════════════════════════════════════
-- Körs EN gång i Supabase → SQL Editor, efter 001_flera_lag.sql.
-- Lägger till kalenderlänk per lag och en tabell som minns varje händelse
-- från Svenskalag (vad den blev i Hela Laget, eller att den ska ignoreras).

begin;

alter table public.squads
  add column svenskalag_ical_url text,
  add column svenskalag_synced_at timestamptz,
  add column svenskalag_sync_message text;

create table public.svenskalag_events (
  squad_id int not null references public.squads(id) on delete cascade,
  external_id bigint not null,                -- Svenskalags aktivitets-id
  kind text not null,                         -- training | match | other | club
  title text not null,
  starts_at timestamp not null,               -- lokal tid (Europe/Stockholm)
  ends_at timestamp,
  location text,
  description text,
  url text,
  -- pending: väntar på granskning, auto: skapad automatiskt, linked: fanns redan,
  -- imported: skapad efter granskning, ignored: ska inte importeras, club: föreningsaktivitet
  decision text not null default 'pending'
    check (decision in ('pending', 'auto', 'linked', 'imported', 'ignored', 'club')),
  target_table text check (target_table in ('trainings', 'matches', 'cups')),
  target_id int,
  removed boolean not null default false,     -- finns inte längre i Svenskalag
  removed_acknowledged boolean not null default false,
  first_seen timestamptz not null default now(),
  last_seen timestamptz not null default now(),
  primary key (squad_id, external_id)
);
create index on public.svenskalag_events (squad_id, decision);

alter table public.svenskalag_events enable row level security;
grant select, insert, update, delete on public.svenskalag_events to app_user;

create policy app_read on public.svenskalag_events for select to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('viewer')));
create policy app_write on public.svenskalag_events for all to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader')));

commit;
