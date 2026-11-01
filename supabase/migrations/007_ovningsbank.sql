-- Hela Laget: övningsbank (per förening) och träningsplaner (per träningspass).
--
-- drills              Föreningens övningar, med spelformer, kategorier, ritning
--                     och progression (Lätt/Medel/Svår).
-- training_blocks     Ett träningspass delas in i block i tidsordning
--                     (Uppvärmning, Huvuddel, Spel, Avslutning …).
-- training_block_items Övningar i ett block, en per grupp eller station
--                     (grupp null = alla).
-- plan_templates      Sparade träningsplaner som kan användas igen.

create table public.drills (
  id serial primary key,
  organization_id int not null default app.default_org_id() references public.organizations(id),
  name text not null,
  summary text,                                   -- syfte, en eller två meningar
  description text,                               -- organisation steg för steg
  coaching text,                                  -- coachningspunkter, en per rad
  game_formats text[] not null default '{}',      -- '3v3', '5v5', '7v7', '9v9', '11v11'
  categories text[] not null default '{}',
  duration_minutes int check (duration_minutes between 1 and 180),
  players_min int check (players_min between 1 and 60),
  players_max int check (players_max between 1 and 60),
  area text,                                      -- t.ex. "30 × 20 m"
  equipment text,                                 -- t.ex. "8 koner, 2 småmål, västar"
  intensity text check (intensity in ('Låg', 'Medel', 'Hög')),
  video_url text,
  diagram jsonb,                                  -- grundritning (se src/utils/diagram.ts)
  levels jsonb not null default '{}',             -- { "Lätt": { text, diagram? }, "Medel": …, "Svår": … }
  starter_key text,                               -- satt för övningar från startpaketet
  created_by uuid,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index on public.drills (organization_id);
create unique index on public.drills (organization_id, starter_key) where starter_key is not null;

create table public.training_blocks (
  id serial primary key,
  training_id int not null references public.trainings(id) on delete cascade,
  position int not null default 0,
  name text not null,                             -- Uppvärmning, Huvuddel, Spel …
  minutes int check (minutes between 0 and 240),
  notes text
);
create index on public.training_blocks (training_id);

create table public.training_block_items (
  id serial primary key,
  block_id int not null references public.training_blocks(id) on delete cascade,
  position int not null default 0,
  group_name text,                                -- null = alla, annars Grupp 1–8 eller Målvakter
  drill_id int references public.drills(id) on delete set null,
  title text,                                     -- egen rubrik om ingen övning är vald
  level text check (level in ('Lätt', 'Medel', 'Svår')),
  notes text
);
create index on public.training_block_items (block_id);

create table public.plan_templates (
  id serial primary key,
  squad_id int not null default app.default_squad_id() references public.squads(id) on delete cascade,
  name text not null,
  blocks jsonb not null default '[]',             -- samma form som en träningsplan
  created_at timestamptz not null default now()
);
create index on public.plan_templates (squad_id);

grant select, insert, update, delete on public.drills, public.training_blocks, public.training_block_items, public.plan_templates to app_user;
grant usage, select on sequence public.drills_id_seq, public.training_blocks_id_seq, public.training_block_items_id_seq, public.plan_templates_id_seq to app_user;

alter table public.drills enable row level security;
alter table public.training_blocks enable row level security;
alter table public.training_block_items enable row level security;
alter table public.plan_templates enable row level security;

-- Föreningens övningar: alla i laget ser dem, ledare ändrar
create policy app_read on public.drills for select to app_user
  using (organization_id = (select app.org_id()) and (select app.has_role('viewer')));
create policy app_write on public.drills for all to app_user
  using (organization_id = (select app.org_id()) and (select app.has_role('leader')))
  with check (organization_id = (select app.org_id()) and (select app.has_role('leader')));

-- Träningsplan: synlig när träningen är synlig (träningens RLS gäller i underfrågan)
create policy app_read on public.training_blocks for select to app_user
  using (exists (select 1 from public.trainings t where t.id = training_id) and (select app.has_role('viewer')));
create policy app_write on public.training_blocks for all to app_user
  using (exists (select 1 from public.trainings t where t.id = training_id) and (select app.has_role('leader')))
  with check (exists (select 1 from public.trainings t where t.id = training_id) and (select app.has_role('leader')));

create policy app_read on public.training_block_items for select to app_user
  using (exists (select 1 from public.training_blocks b where b.id = block_id) and (select app.has_role('viewer')));
create policy app_write on public.training_block_items for all to app_user
  using (exists (select 1 from public.training_blocks b where b.id = block_id) and (select app.has_role('leader')))
  with check (exists (select 1 from public.training_blocks b where b.id = block_id) and (select app.has_role('leader'))
    and (drill_id is null or exists (select 1 from public.drills d where d.id = drill_id)));

create policy app_read on public.plan_templates for select to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('viewer')));
create policy app_write on public.plan_templates for all to app_user
  using (squad_id = (select app.squad_id()) and (select app.has_role('leader')))
  with check (squad_id = (select app.squad_id()) and (select app.has_role('leader')));
