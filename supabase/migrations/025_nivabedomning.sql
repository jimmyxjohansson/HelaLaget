-- Bedömningar enligt nivåmatrisen (Beräkna nivå på spelaren). Bara ledare ser dem.
create table if not exists public.player_level_assessments (
  id serial primary key,
  squad_id integer not null references public.squads(id) on delete cascade,
  player_id integer not null references public.players(id) on delete cascade,
  -- { "teknik": "B", "spelforstaelse": "A", ... }
  scores jsonb not null,
  suggested text not null,
  -- Nivån som sattes på spelaren, om ledaren gjorde det
  applied_rank text,
  comment text,
  created_by uuid,
  created_at timestamptz not null default now()
);
create index if not exists player_level_assessments_player_idx on public.player_level_assessments (player_id, created_at desc);

grant select, insert on public.player_level_assessments to app_user;
grant usage on sequence public.player_level_assessments_id_seq to app_user;
alter table public.player_level_assessments enable row level security;
create policy app_read on public.player_level_assessments for select to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')));
create policy app_insert on public.player_level_assessments for insert to app_user
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader')));
