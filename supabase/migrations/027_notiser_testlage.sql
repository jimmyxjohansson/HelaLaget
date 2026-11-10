-- Testläge för notiser per lag: notiserna går bara till lagets admin
-- (även den som orsakade dem), inte till ledare, spelare eller anhöriga.
alter table public.squads add column if not exists push_admin_only boolean not null default false;
-- Notiser som skickades i testläge
alter table public.push_log add column if not exists test_mode boolean not null default false;
