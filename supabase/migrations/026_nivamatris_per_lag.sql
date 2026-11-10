-- Vilken nivåmatris laget använder för Beräkna nivå (null = ingen).
alter table public.squads add column if not exists level_matrix text;
-- Vilken matris en bedömning gjordes med
alter table public.player_level_assessments add column if not exists matrix text;
