-- Lagets egna länkar i menyn: lagets sida (tidigare bara Svenskalag) och dokument,
-- var och en med adress och namn. Adressen till lagets sida ligger kvar i svenskalag_url.
alter table public.squads add column if not exists site_name text;
alter table public.squads add column if not exists docs_url text;
alter table public.squads add column if not exists docs_name text;

-- Befintliga länkar hette Svenskalag i menyn: behåll det namnet.
update public.squads set site_name = 'Svenskalag' where svenskalag_url is not null and site_name is null;
