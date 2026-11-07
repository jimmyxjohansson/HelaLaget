-- Vem som håller i varje övning i en träningsplan, vem som ambulerar mellan
-- stationerna och vem som sparade planen senast.
alter table public.training_block_items
  add column if not exists leader_ids integer[] not null default '{}',
  -- En annan vuxen håller i övningen: null = nej, '' = ja utan namn, annars namnet
  add column if not exists other_adult text;

alter table public.trainings
  add column if not exists plan_roaming_leader_ids integer[] not null default '{}',
  add column if not exists plan_saved_by uuid references auth.users(id) on delete set null,
  add column if not exists plan_saved_at timestamptz;
