-- Gula och röda kort i matchens tidslinje. Egen tabell, så att korten inte
-- påverkar resultatet eller målstatistiken som räknas från matchgoalsassists.
create table if not exists public.matchcards (
  id serial primary key,
  match integer not null references public.matches(id) on delete cascade,
  -- Vår spelare (null för motståndaren eller när spelaren inte är angiven)
  player integer references public.players(id),
  -- 'our' = vårt lag, 'their' = motståndaren
  side text not null default 'our' check (side in ('our', 'their')),
  color text not null check (color in ('Gul', 'Röd')),
  minute integer,
  period integer check (period between 1 and 3),
  created_at timestamptz not null default now()
);

create index if not exists matchcards_match_idx on public.matchcards (match);

grant select, insert, update, delete on public.matchcards to app_user;
grant usage, select on sequence public.matchcards_id_seq to app_user;

alter table public.matchcards enable row level security;

-- Synlig när matchen är synlig (matchens RLS gäller i underfrågan), ledare ändrar
create policy app_read on public.matchcards for select to app_user
  using (exists (select 1 from public.matches m where m.id = match) and (select app.has_role('viewer')));
create policy app_write on public.matchcards for all to app_user
  using (exists (select 1 from public.matches m where m.id = match) and (select app.has_role('leader')))
  with check (exists (select 1 from public.matches m where m.id = match) and (select app.has_role('leader'))
    and (player is null or exists (select 1 from public.players p where p.id = player)));
