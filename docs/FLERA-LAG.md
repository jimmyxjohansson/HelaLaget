# Flera lag och föreningar – plan

Status: **planerat**, byggs när flytten från Retool är klar och verifierad.

## Beslut (30 okt 2026)

| Fråga | Beslut |
|---|---|
| Struktur | *Förening* (t.ex. Skabersjö IF) → flera *lag* (P13, F12 …). Dagens data blir laget P13 i Skabersjö IF. |
| Spelare | Hör till **föreningen** och kan kopplas till flera av dess lag (lån mellan åldersgrupper utan dubbelregistrering). |
| Nya föreningar och lag | **Superadmin** (Jimmy) skapar föreningar. Föreningsadmins kan skapa lag inom sin förening. |
| Roller per lag | **Admin** (godkänner medlemmar, hanterar laget), **ledare** (registrerar som idag), **läsbehörighet** (t.ex. föräldrar/spelare – ser schema och resultat). |
| Konton | Ett konto kan vara med i flera lag. Man ansöker om medlemskap; lagets admin godkänner eller nekar. |

## Tekniskt upplägg

- Nya tabeller: `organizations`, `squads` (lag – namnet `teams` används redan för motståndarlag), `organization_members`, `squad_members` (roll + status: väntande/godkänd/nekad), koppling spelare ↔ lag.
- `squad_id` på träningar, matcher, cuper, serier och övriga lagdata; `organization_id` på spelare. Motståndarlag (`teams`) delas inom föreningen.
- **Isolering i databasen:** appen ansluter med en egen roll utan RLS-undantag och sätter aktuell användare och lag per anrop (`set_config`). RLS-policies kräver godkänt medlemskap, så ett lag kan aldrig se ett annat lags data även om en fråga saknar filter.
- Behörighet per backend-funktion: läsfunktioner kräver minst läsroll, ändringar kräver ledare, medlemshantering kräver admin.
- UI: lagväljare i menyn, "Mina lag", ansökan om medlemskap, adminsida för medlemmar och lag. Lagets färger (idag hårdkodat grönt/gult) blir inställningar per lag.
- Självregistrering av konton kräver egen SMTP i Supabase (t.ex. Resend eller Gmail) för bekräftelsemejl.

## Öppna frågor inför bygget

- Vad ska läsrollen **inte** se? Förslag: födelsedatum, frånvaroorsaker, interna anteckningar och rank.
- Ska föräldrar kunna anmäla/avanmäla sitt barn till träningar och matcher, eller bara läsa?
- Domän och e-postavsändare för bekräftelsemejl.
