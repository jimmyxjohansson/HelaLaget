-- ════════════════════════════════════════════════════════════════════════════
-- Hela Laget: stöd för flera föreningar och lag
-- ════════════════════════════════════════════════════════════════════════════
-- Körs EN gång i Supabase → SQL Editor. Allt sker i en transaktion: går något
-- fel ändras ingenting.
--
-- Befintlig data blir laget "P13" i föreningen "Skabersjö IF". Den nuvarande
-- appversionen fortsätter att fungera efter migreringen (nya rader hamnar då i
-- P13), så migreringen kan köras före den nya appversionen driftsätts.
--
-- Isolering mellan lag: appen kör varje anrop som rollen app_user med aktuell
-- användare och aktuellt lag satta (app.user_id / app.squad_id). RLS-reglerna
-- nedan släpper bara igenom det lagets data, och bara för godkända medlemmar.
-- ════════════════════════════════════════════════════════════════════════════

begin;

-- ─── Roller och scheman ─────────────────────────────────────────────────────
do $$ begin
  if not exists (select 1 from pg_roles where rolname = 'app_user') then
    create role app_user nologin;
  end if;
end $$;
grant app_user to postgres;

create schema if not exists app;
revoke all on schema app from public;
grant usage on schema app to app_user;

-- ─── Föreningar, lag och medlemskap ─────────────────────────────────────────
create type public.squad_role as enum ('viewer', 'leader', 'admin');          -- ordningen används vid jämförelse
create type public.membership_status as enum ('pending', 'approved', 'rejected');

create table public.organizations (
  id serial primary key,
  name text not null,
  created_at timestamptz not null default now()
);

create table public.squads (
  id serial primary key,
  organization_id int not null references public.organizations(id),
  name text not null,
  primary_color text not null default '#106A37',
  accent_color text not null default '#FFCF08',
  logo_url text,
  planning_url text,          -- extern planeringsapp (länk i Admin-menyn)
  training_app_url text,      -- extern träningsapp, {id} ersätts med träningens id
  join_code text not null unique default upper(substr(md5(random()::text || clock_timestamp()::text), 1, 8)),
  created_at timestamptz not null default now()
);
create index on public.squads (organization_id);

create table public.squad_members (
  squad_id int not null references public.squads(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  role public.squad_role not null default 'viewer',
  status public.membership_status not null default 'pending',
  message text,
  requested_at timestamptz not null default now(),
  decided_at timestamptz,
  decided_by uuid references auth.users(id) on delete set null,
  primary key (squad_id, user_id)
);
create index on public.squad_members (user_id);

create table public.organization_admins (
  organization_id int not null references public.organizations(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  primary key (organization_id, user_id)
);

create table public.app_admins (
  user_id uuid primary key references auth.users(id) on delete cascade
);

create table public.app_settings (
  key text primary key,
  value text not null
);

-- ─── Kontextfunktioner ──────────────────────────────────────────────────────
create function app.user_id() returns uuid language sql stable as
$$ select nullif(current_setting('app.user_id', true), '')::uuid $$;

create function app.squad_id() returns int language sql stable as
$$ select nullif(current_setting('app.squad_id', true), '')::int $$;

create function app.org_id() returns int language sql stable security definer set search_path = '' as
$$ select s.organization_id from public.squads s where s.id = app.squad_id() $$;

-- Har inloggad användare minst rollen min_role i aktuellt lag?
-- Superadmins och föreningsadmins har alltid adminbehörighet.
create function app.has_role(min_role public.squad_role) returns boolean
language sql stable security definer set search_path = '' as $$
  select app.user_id() is not null and app.squad_id() is not null and (
    exists (select 1 from public.app_admins a where a.user_id = app.user_id())
    or exists (
      select 1 from public.organization_admins oa
      join public.squads s on s.organization_id = oa.organization_id
      where s.id = app.squad_id() and oa.user_id = app.user_id())
    or exists (
      select 1 from public.squad_members m
      where m.squad_id = app.squad_id() and m.user_id = app.user_id()
        and m.status = 'approved' and m.role >= min_role)
  )
$$;

-- Standardvärden för nya rader. Utan lagkontext (den nuvarande appversionen,
-- eller SQL Editor) hamnar nya rader i lagret som anges i app_settings.
create function app.default_squad_id() returns int language sql stable security definer set search_path = '' as $$
  select coalesce(app.squad_id(),
    (select value::int from public.app_settings where key = 'legacy_squad_id'))
$$;

create function app.default_org_id() returns int language sql stable security definer set search_path = '' as $$
  select s.organization_id from public.squads s where s.id = app.default_squad_id()
$$;

revoke all on all functions in schema app from public;
grant execute on all functions in schema app to app_user;

-- ─── Befintlig data blir Skabersjö IF / P13 ─────────────────────────────────
insert into public.organizations (id, name) values (1, 'Skabersjö IF');
insert into public.squads (id, organization_id, name, planning_url, training_app_url) values (
  1, 1, 'P13',
  'https://skabersjoifp13.retool.com/apps/d82e8f9c-c1cf-11ee-a364-47bcb6eb07b0/Planering?_embed=true',
  'https://skabersjoifp13.retool.com/apps/516eee86-af47-11f0-94ff-b74fb342d0cb/Tr%C3%A4ning?_embed=true#trainingid={id}'
);
select setval('public.organizations_id_seq', 1);
select setval('public.squads_id_seq', 1);
insert into public.app_settings (key, value) values ('legacy_squad_id', '1');

-- Alla befintliga konton blir godkända ledare i P13, Jimmy admin och superadmin.
insert into public.squad_members (squad_id, user_id, role, status, decided_at)
select 1, u.id,
  case when lower(u.email) = 'jimmy.x.johansson@gmail.com' then 'admin' else 'leader' end::public.squad_role,
  'approved', now()
from auth.users u;
insert into public.app_admins (user_id)
select id from auth.users where lower(email) = 'jimmy.x.johansson@gmail.com';

-- ─── Lagdata: squad_id ──────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['trainings', 'matches', 'cups', 'leagues', 'sales', 'series', 'trainingsgroups'] loop
    execute format('alter table public.%I add column squad_id int references public.squads(id)', t);
    execute format('update public.%I set squad_id = 1', t);
    execute format('alter table public.%I alter column squad_id set not null, alter column squad_id set default app.default_squad_id()', t);
    execute format('create index on public.%I (squad_id)', t);
  end loop;
end $$;

-- ─── Föreningsdata: organization_id ─────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['players', 'teams', 'leaders', 'trainingdrills', 'tests'] loop
    execute format('alter table public.%I add column organization_id int references public.organizations(id)', t);
    execute format('update public.%I set organization_id = 1', t);
    execute format('alter table public.%I alter column organization_id set not null, alter column organization_id set default app.default_org_id()', t);
    execute format('create index on public.%I (organization_id)', t);
  end loop;
end $$;

-- Vilka av föreningens spelare som hör till vilket lag.
create table public.squad_players (
  squad_id int not null references public.squads(id) on delete cascade,
  player_id int not null references public.players(id) on delete cascade,
  added_at timestamptz not null default now(),
  primary key (squad_id, player_id)
);
create index on public.squad_players (player_id);
insert into public.squad_players (squad_id, player_id) select 1, id from public.players;

-- Index för RLS-uppslag på barntabeller
create index if not exists participantstrainings_training_idx on public.participantstrainings (training);
create index if not exists participantsmatches_match_idx on public.participantsmatches (match);
create index if not exists participantscups_cup_idx on public.participantscups (cup);
create index if not exists matchgoalsassists_match_idx on public.matchgoalsassists (match);

-- ─── Behörigheter för app_user ──────────────────────────────────────────────
grant usage on schema public to app_user;
grant select, insert, update, delete on all tables in schema public to app_user;
grant usage, select on all sequences in schema public to app_user;
-- Medlemskap och inställningar hanteras bara av servern (som postgres).
revoke all on public.squad_members, public.organization_admins, public.app_admins, public.app_settings from app_user;
revoke insert, update, delete on public.squads, public.organizations from app_user;
-- Retools exempeltabeller används inte
revoke all on public.mobile_app_sample_data, public.tour_orders from app_user;

-- ─── RLS-regler ─────────────────────────────────────────────────────────────
alter table public.organizations enable row level security;
alter table public.squads enable row level security;
alter table public.squad_members enable row level security;
alter table public.organization_admins enable row level security;
alter table public.app_admins enable row level security;
alter table public.app_settings enable row level security;
alter table public.squad_players enable row level security;

create policy app_read on public.organizations for select to app_user
  using (id = (select app.org_id()) and (select app.has_role('viewer')));
create policy app_read on public.squads for select to app_user
  using (organization_id = (select app.org_id()) and (select app.has_role('viewer')));
-- Spelarlistor för alla lag i föreningen syns (för att se vem som spelar var vid lån)
create policy app_read on public.squad_players for select to app_user
  using (exists (select 1 from public.squads s where s.id = squad_id) and (select app.has_role('viewer')));
create policy app_write on public.squad_players for all to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader'))
    and exists (select 1 from public.players p where p.id = player_id));

do $$
declare t text;
begin
  -- Lagdata: bara aktuellt lag
  foreach t in array array['trainings', 'matches', 'cups', 'leagues', 'sales', 'series', 'trainingsgroups'] loop
    execute format($f$create policy app_read on public.%I for select to app_user
      using (squad_id = (select app.squad_id()) and (select app.has_role('viewer')))$f$, t);
    execute format($f$create policy app_write on public.%I for all to app_user
      using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
      with check (squad_id = (select app.squad_id()) and (select app.has_role('leader')))$f$, t);
  end loop;

  -- Föreningsdata: aktuellt lags förening
  foreach t in array array['players', 'teams', 'leaders', 'trainingdrills', 'tests'] loop
    execute format($f$create policy app_read on public.%I for select to app_user
      using (organization_id = (select app.org_id()) and (select app.has_role('viewer')))$f$, t);
    execute format($f$create policy app_write on public.%I for all to app_user
      using (organization_id = (select app.org_id()) and (select app.has_role('leader')))
      with check (organization_id = (select app.org_id()) and (select app.has_role('leader')))$f$, t);
  end loop;
end $$;

-- Barntabeller: synliga när föräldraraden är synlig (dess RLS gäller i underfrågan)
do $$
declare
  r record;
begin
  for r in select * from (values
    ('participantstrainings',      'trainings',       'training'),
    ('trainingplans',              'trainings',       'training'),
    ('participantsmatches',        'matches',         'match'),
    ('matchgoalsassists',          'matches',         'match'),
    ('involvedplayers',            'matches',         'match'),
    ('participantscups',           'cups',            'cup'),
    ('seriesstandings',            'leagues',         'league'),
    ('participantssales',          'sales',           'sale'),
    ('playertests',                'players',         'player'),
    ('participantstrainingsgroups','trainingsgroups', 'trainingsgroup')
  ) as v(child, parent, fk) loop
    execute format($f$create policy app_read on public.%1$I for select to app_user
      using (exists (select 1 from public.%2$I p where p.id = %1$I.%3$I) and (select app.has_role('viewer')))$f$,
      r.child, r.parent, r.fk);
    execute format($f$create policy app_write on public.%1$I for all to app_user
      using (exists (select 1 from public.%2$I p where p.id = %1$I.%3$I) and (select app.has_role('leader')))
      with check (exists (select 1 from public.%2$I p where p.id = %1$I.%3$I) and (select app.has_role('leader')))$f$,
      r.child, r.parent, r.fk);
  end loop;
end $$;

-- Deltagare får bara kopplas till spelare i den egna föreningen
do $$
declare t text;
begin
  foreach t in array array['participantstrainings', 'participantsmatches', 'participantscups'] loop
    execute format($f$create policy app_player_in_org on public.%I as restrictive for all to app_user
      using (true)
      with check (player is null or exists (select 1 from public.players p where p.id = player))$f$, t);
  end loop;
end $$;

-- Kontroll: alla tabeller i public ska ha RLS
do $$
declare missing text;
begin
  select string_agg(tablename, ', ') into missing from pg_tables where schemaname = 'public' and not rowsecurity;
  if missing is not null then
    raise exception 'Tabeller utan RLS: %', missing;
  end if;
end $$;

commit;
