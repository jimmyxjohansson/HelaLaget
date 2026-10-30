-- Körs EN gång i Supabase (SQL Editor) efter att datan importerats från Retool.
-- Skriptet kan köras om utan att något går sönder.

-- ─── 1. Stäng Supabase Data API för lagets tabeller ─────────────────────────
-- Supabase exponerar automatiskt alla tabeller i schemat public via ett REST-API
-- som nås med den publika "anon"-nyckeln (den som ligger i webbläsaren).
-- Utan RLS skulle vem som helst med nyckeln kunna läsa spelarnas uppgifter.
-- Med RLS påslaget och inga policies nekas alla anrop via API:t. Appen påverkas
-- inte: den läser databasen direkt från servern som tabellägare.
do $$
declare
  t record;
begin
  for t in select tablename from pg_tables where schemaname = 'public' loop
    execute format('alter table public.%I enable row level security', t.tablename);
  end loop;
end
$$;

-- ─── 2. Lagring för spelarbilder och lagloggor ──────────────────────────────
-- Publik bucket, precis som i Retool (isPublic: true). Filnamnen är slumpade.
insert into storage.buckets (id, name, public, file_size_limit)
values ('images', 'images', true, 10485760) -- max 10 MB per bild
on conflict (id) do update set public = excluded.public, file_size_limit = excluded.file_size_limit;

-- Bara inloggade ledare får ladda upp. Ingen får skriva över eller radera via API:t.
drop policy if exists "Inloggade kan ladda upp bilder" on storage.objects;
create policy "Inloggade kan ladda upp bilder"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'images');

-- ─── 3. Kontroll ────────────────────────────────────────────────────────────
-- Ska returnera noll rader (alla tabeller har RLS).
select tablename as "tabell utan RLS"
from pg_tables
where schemaname = 'public' and not rowsecurity;
