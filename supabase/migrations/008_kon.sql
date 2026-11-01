-- Hela Laget: spelarens kön (Pojke/Flicka), för planering och gruppindelning.
alter table public.players add column if not exists gender text check (gender in ('Pojke', 'Flicka'));
