-- VARNING: raderar ALLA tabeller och enum-typer i schemat public, med data.
-- Används bara inför den slutliga importen från Retool (se docs/MIGRERING.md,
-- steg 10), när en testimport redan gjorts och ska ersättas med färsk data.
do $$
declare
  r record;
begin
  for r in select tablename from pg_tables where schemaname = 'public' loop
    execute format('drop table if exists public.%I cascade', r.tablename);
  end loop;
  for r in
    select t.typname from pg_type t join pg_namespace n on n.oid = t.typnamespace
    where n.nspname = 'public' and t.typtype = 'e'
  loop
    execute format('drop type if exists public.%I cascade', r.typname);
  end loop;
end
$$;
