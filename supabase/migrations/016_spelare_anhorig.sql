-- Läsbehörighet delas upp i Spelare och Anhörig. Båda kopplas till en eller
-- flera spelare i laget och ser då bara de spelarnas statistik.
alter table public.squad_members add column if not exists member_kind text
  check (member_kind in ('player', 'relative'));

-- De som har läsbehörighet i dag blir Anhörig (utan koppling)
update public.squad_members set member_kind = 'relative' where role = 'viewer' and member_kind is null;

create table if not exists public.squad_member_players (
  squad_id integer not null references public.squads(id) on delete cascade,
  user_id uuid not null,
  player_id integer not null references public.players(id) on delete cascade,
  primary key (squad_id, user_id, player_id)
);

create index if not exists squad_member_players_user_idx on public.squad_member_players (user_id);

-- Läses och skrivs bara av servern (adminDb); appanvändaren får ingen åtkomst
alter table public.squad_member_players enable row level security;
