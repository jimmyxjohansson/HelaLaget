-- Hela Laget: perioden som en händelse i tidslinjen hör till, så att mål i
-- tilläggstid (t.ex. 30+1') hamnar i rätt period. Null för äldre händelser.
alter table public.matchgoalsassists add column if not exists period int check (period between 1 and 3);
