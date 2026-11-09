-- När spelaren eller ledaren svarade på kallelsen i Svenskalag (svenskt klockslag).
-- Fylls vid import av svar, bara framåt.
alter table public.participantstrainings add column if not exists replied_at timestamp;
