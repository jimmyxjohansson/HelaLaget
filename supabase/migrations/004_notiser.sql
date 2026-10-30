-- ════════════════════════════════════════════════════════════════════════════
-- Hela Laget: push-notiser
-- ════════════════════════════════════════════════════════════════════════════
-- Körs EN gång i Supabase → SQL Editor, efter 003_ledare_per_lag.sql.
--
-- push_subscriptions  en rad per enhet (telefon/webbläsare) som slagit på notiser
-- push_squads         vilka lag användaren vill ha notiser från
-- match_notifications vilka notiser som redan skickats för en match, så att
--                     samma händelse aldrig skickas två gånger
--
-- Tabellerna nås bara från servern (adminDb). RLS är på utan regler, så varken
-- app_user eller Supabase publika API kommer åt dem.

begin;

create table public.push_subscriptions (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users(id) on delete cascade,
  endpoint text not null unique,
  p256dh text not null,
  auth text not null,
  user_agent text,
  created_at timestamptz not null default now(),
  last_used_at timestamptz
);
create index on public.push_subscriptions (user_id);

create table public.push_squads (
  user_id uuid not null references auth.users(id) on delete cascade,
  squad_id int not null references public.squads(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, squad_id)
);
create index on public.push_squads (squad_id);

create table public.match_notifications (
  match_id int not null references public.matches(id) on delete cascade,
  key text not null,
  sent_at timestamptz not null default now(),
  primary key (match_id, key)
);

alter table public.push_subscriptions enable row level security;
alter table public.push_squads enable row level security;
alter table public.match_notifications enable row level security;

commit;
