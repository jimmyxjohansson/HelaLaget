-- Spelform per lag och föreningens standard för speltid och perioder per spelform.
-- Lagets spelform används när matcher och cuper läggs till eller synkas från Svenskalag.
alter table public.squads
  add column if not exists game_format text
    check (game_format in ('3 v 3', '5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11'));

-- Föreningens egna värden. Saknas en rad gäller appens standard.
create table if not exists public.org_game_formats (
  organization_id int not null references public.organizations(id) on delete cascade,
  format text not null check (format in ('3 v 3', '5 v 5', '7 v 7', '8 v 8', '9 v 9', '11 v 11')),
  playtime int check (playtime between 1 and 120),
  periods int check (periods between 1 and 10),
  primary key (organization_id, format)
);
alter table public.org_game_formats enable row level security;
grant select on public.org_game_formats to app_user;
create policy app_read on public.org_game_formats for select to app_user
  using (organization_id = (select app.org_id()) and (select app.has_role('viewer')));
