-- ════════════════════════════════════════════════════════════════════════════
-- Hela Laget: matchklockan sparas på matchen
-- ════════════════════════════════════════════════════════════════════════════
-- Körs EN gång i Supabase → SQL Editor, efter 004_notiser.sql.
-- Klockan i tidslinjen fortsätter då att gå om sidan laddas om, appen stängs
-- eller en annan ledare öppnar matchen. Alla kolumner är NULL när klockan står.

begin;

alter table public.matches
  add column clock_started_at timestamptz,          -- verklig tidpunkt då klockan startades
  add column clock_period int,                      -- pågående period (1–3)
  add column clock_offset_minutes int,              -- matchminut när klockan startades
  add column clock_period_start_minutes int;        -- matchminut då perioden började

commit;
