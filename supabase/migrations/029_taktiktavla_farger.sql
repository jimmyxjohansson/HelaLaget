-- Färger på spelarna i Taktiktavlan: { us, usGK, opp, oppGK: { shirt, shorts } }. null = standard.
alter table public.squads add column if not exists tactics_kit jsonb;
