-- Vem som senast ändrade en övning (skapad av finns redan i created_by).
alter table public.drills add column if not exists updated_by uuid;
