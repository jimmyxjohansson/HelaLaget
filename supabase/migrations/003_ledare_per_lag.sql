-- ════════════════════════════════════════════════════════════════════════════
-- Hela Laget: ledare kopplade till lag
-- ════════════════════════════════════════════════════════════════════════════
-- Körs EN gång i Supabase → SQL Editor, efter 002_svenskalag.sql.
-- Ledare hör fortfarande till föreningen (och kan vara med i flera lag), men
-- varje lag har en egen ledarlista – på samma sätt som spelare (squad_players).
--
-- Befintliga ledare kopplas till de lag där de har varit med på träningar,
-- matcher eller cuper. Ledare som aldrig varit med någonstans kopplas till
-- alla lag i sin förening, så att ingen försvinner; ta bort dem från lag de
-- inte hör till under Admin → Medlemmar → Ledare.

begin;

create table public.squad_leaders (
  squad_id int not null references public.squads(id) on delete cascade,
  leader_id int not null references public.leaders(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (squad_id, leader_id)
);
create index on public.squad_leaders (leader_id);

-- Ledare som varit med i lagets aktiviteter
insert into public.squad_leaders (squad_id, leader_id)
select distinct t.squad_id, pt.leader
from public.participantstrainings pt join public.trainings t on t.id = pt.training
where pt.leader is not null
union
select distinct m.squad_id, pm.leader
from public.participantsmatches pm join public.matches m on m.id = pm.match
where pm.leader is not null
union
select distinct c.squad_id, pc.leader
from public.participantscups pc join public.cups c on c.id = pc.cup
where pc.leader is not null
on conflict do nothing;

-- Ledare utan någon aktivitet: alla lag i föreningen
insert into public.squad_leaders (squad_id, leader_id)
select s.id, l.id
from public.leaders l join public.squads s on s.organization_id = l.organization_id
where not exists (select 1 from public.squad_leaders sl where sl.leader_id = l.id)
on conflict do nothing;

alter table public.squad_leaders enable row level security;
grant select, insert, update, delete on public.squad_leaders to app_user;

-- Föreningens alla lags ledarlistor syns (för att se vem som är ledare var)
create policy app_read on public.squad_leaders for select to app_user
  using (exists (select 1 from public.squads s where s.id = squad_id) and (select app.has_role('viewer')));
create policy app_write on public.squad_leaders for all to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader'))
    and exists (select 1 from public.leaders l where l.id = leader_id));

do $$
declare r record;
begin
  for r in
    select s.name, count(sl.leader_id) as n
    from public.squads s left join public.squad_leaders sl on sl.squad_id = s.id
    group by s.id, s.name order by s.id
  loop
    raise notice 'Ledare i %: %', r.name, r.n;
  end loop;
end $$;

commit;
