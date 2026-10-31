-- Hela Laget: länk till lagets sida på Svenskalag, som visas i menyn under Mina lag.
alter table public.squads add column if not exists svenskalag_url text;
