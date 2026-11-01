-- Hela Laget: "Tysta notiser" på en enskild match. Inga notiser skickas för matchen när flaggan är satt.
alter table public.matches add column if not exists mute_notifications boolean not null default false;
