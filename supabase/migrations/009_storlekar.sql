-- Hela Laget: klädstorlekar på spelaren (fritext, t.ex. 140, S, 35–38).
alter table public.players
  add column if not exists shirt_size text,
  add column if not exists shorts_size text,
  add column if not exists sock_size text;
