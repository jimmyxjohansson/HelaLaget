-- Laginformation kan begränsas till inomhus/utomhus och (för matcher) hemma/borta.
-- null = gäller alla.
alter table public.squad_infos
  add column if not exists only_indooroutdoor text check (only_indooroutdoor in ('Inomhus', 'Utomhus')),
  add column if not exists only_homeaway text check (only_homeaway in ('Hemma', 'Borta'));
