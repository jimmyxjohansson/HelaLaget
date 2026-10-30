# Import från Svenskalag

Hela Laget hämtar lagets kalender från Svenskalag och skapar träningar och
matcher automatiskt. Kallelsesvar ingår inte: Svenskalags kalenderflöde
innehåller bara själva aktiviteterna.

## Så fungerar det

| Händelse i Svenskalag | Blir i Hela Laget |
|---|---|
| `Träning`, `Inomhusträning`, `Coerver`, `Målvaktsträning`, `JJ Fitness`, `Extraträning` … | Träning av rätt typ (inne/ute gissas från rubrik och plats) |
| `Match: Skabersjö IF - Tomelilla IF blå (serie)` | Match med motståndare, hemma/borta, plats och serie (om serien finns med samma namn). Okända motståndare läggs till. |
| Cuper, intresseanmälningar, genomgångar och annat | **Att granska**: en ledare väljer Cup, Träning, Match eller Ignorera |
| Föreningens gemensamma aktiviteter (årsmöten m.m.) | Hoppas över |

- Bara kommande aktiviteter hämtas; historiken rörs inte.
- Det som redan finns i Hela Laget känns igen på Svenskalag-länken
  (`…/aktivitet/<id>/…` eller `…/match/<id>/…`) och skapas inte igen.
- Ändras tiden (eller matchens plats) i Svenskalag uppdateras den i Hela Laget.
  Svenskalag gäller alltså över en tid som ändrats för hand i Hela Laget.
- Inget raderas automatiskt. En aktivitet som försvunnit från Svenskalag listas
  under *Borttagna i Svenskalag*, så att en ledare kan kontrollera den.
- Ett val i granskningslistan kommer ihåg till nästa hämtning, även *Ignorera*.

Hämtningen sker automatiskt varje natt (ca 05–06), och med knappen
*Hämta från Svenskalag nu* på sidan **Admin → Svenskalag**.

## Driftsättning (en gång)

1. **Kör migreringen**: Supabase → SQL Editor → klistra in
   [`supabase/migrations/002_svenskalag.sql`](../supabase/migrations/002_svenskalag.sql) → Run.
2. **Lägg till `CRON_SECRET` i Vercel** (*Settings → Environment Variables*):
   ett långt slumpat värde, t.ex. från PowerShell:
   `[guid]::NewGuid().ToString('N') + [guid]::NewGuid().ToString('N')`.
   Vercel skickar det automatiskt till den nattliga körningen; utan det
   körs den inte.
3. **Slå ihop grenen** `svenskalag` med `main` (eller be Claude göra det).

## Per lag

1. I Svenskalag: lagets sida → **Kalender** → **Prenumerera**, kopiera länken.
2. I Hela Laget: **Admin → Medlemmar** → *Lagets inställningar* → klistra in
   under **Svenskalag-kalender** → Spara. (`webcal://`-länkar fungerar.)
3. **Admin → Svenskalag** → *Hämta från Svenskalag nu*, och gå igenom listan
   *Att granska*.

## Teknik

- `src/server/svenskalag/ical.ts` – tolkar iCal-flödet
- `src/server/svenskalag/classify.ts` – känner igen träningar, matcher och föreningsaktiviteter
- `src/server/svenskalag/sync.ts` – synken (i en transaktion med lås per lag)
- `src/app/api/cron/svenskalag/route.ts` – nattlig körning (Vercel Cron, `vercel.json`)
- Tabellen `svenskalag_events` minns varje händelse och vad den blev.
