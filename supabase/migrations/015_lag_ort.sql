-- Ort för motståndarlag, med koordinater för kartan på statistiksidan.
-- Koordinaterna hämtas från orten när laget sparas.
alter table public.teams add column if not exists city text;
alter table public.teams add column if not exists lat double precision;
alter table public.teams add column if not exists lng double precision;
