-- Om Taktiktavlan visas i lagets meny (väljs under Laginställningar).
alter table public.squads add column if not exists tactics_board boolean not null default false;
