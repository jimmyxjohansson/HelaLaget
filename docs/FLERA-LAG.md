# Flera lag och föreningar

Hela Laget hanterar flera föreningar, var och en med flera lag. Ett konto kan
vara med i flera lag med olika roller. Man ansöker om att gå med, och lagets
admin godkänner.

## Så fungerar det

| | |
|---|---|
| **Förening** | T.ex. Skabersjö IF. Spelare, motståndarlag, ledare och övningar hör till föreningen och delas mellan dess lag. |
| **Lag** | T.ex. P13. Träningar, matcher, cuper, serier och försäljningar hör till ett lag. Varje lag har egna färger, logga och länkar. |
| **Spelare i lag** | En spelare kan vara med i flera av föreningens lag (lån mellan åldersgrupper), via *Spelare → Från föreningen*. |
| **Roller per lag** | **Admin** godkänner medlemmar och ändrar lagets inställningar. **Ledare** registrerar som tidigare. **Läsbehörighet** (t.ex. föräldrar) ser schema, resultat och närvaro, men inte födelsedatum, frånvaroorsaker, anteckningar eller rank, och kan inte ändra något. |
| **Föreningsadmin** | Har adminbehörighet i föreningens alla lag och kan skapa nya lag. |
| **Superadmin** | Skapar föreningar och utser föreningsadmins (Jimmy). |

**Gå med i ett lag:** lagets admin hittar inbjudningslänken och koden under
*Admin → Medlemmar*. Den som får länken skapar ett konto, och ansökan skickas
automatiskt. Admin väljer roll och godkänner på samma sida.

**Byta lag:** *Admin → Mina lag* (på datorn: klicka på lagets namn uppe till vänster).

## Säkerhet

Isoleringen mellan lag sköts av databasen, inte bara av appen:

- Varje anrop körs i en transaktion som rollen `app_user`, med inloggad användare
  och valt lag satta (`app.user_id`, `app.squad_id`).
- RLS-regler på alla tabeller släpper bara igenom det valda lagets data (och
  föreningens gemensamma data), och bara för godkända medlemmar. Skrivningar
  kräver rollen ledare eller admin.
- `db.query` vägrar köras utan lagkontext. Funktioner som hanterar konton och
  medlemskap använder `adminDb` och kontrollerar behörigheten själva.
- Testat mot en kopia av databasstrukturen: andra lag ser 0 rader, kan inte
  skriva till andra lag eller koppla in spelare från andra föreningar, läsrollen
  kan inte ändra något och väntande medlemmar ser ingenting.

Lägger du till en ny tabell: ge den `squad_id` eller `organization_id`, RLS-regler
och `grant` till `app_user` på samma sätt som i
[`supabase/migrations/001_flera_lag.sql`](../supabase/migrations/001_flera_lag.sql).

---

## Driftsättning

Den nya versionen ligger på grenen `flera-lag` i GitHub. Vercel bygger en
förhandsversion av den automatiskt, så att du kan testa innan laget får den.

### 1. Säkerhetskopiera databasen

I PowerShell (Session pooler-adressen från Supabase → Connect):

```powershell
& "C:\Program Files\PostgreSQL\17\bin\pg_dump.exe" --no-owner --no-privileges --schema=public --file "$HOME\Downloads\backup-fore-flera-lag.sql" "postgresql://postgres.xxxx:LÖSEN@aws-0-eu-north-1.pooler.supabase.com:5432/postgres"
```

### 2. Kör migreringen

Supabase → **SQL Editor** → klistra in hela
[`supabase/migrations/001_flera_lag.sql`](../supabase/migrations/001_flera_lag.sql) → **Run**.

- Allt körs i en transaktion. Blir det fel ändras ingenting.
- Befintlig data blir laget **P13** i föreningen **Skabersjö IF**.
- Alla befintliga konton blir godkända **ledare** i P13. Kontot
  `jimmy.x.johansson@gmail.com` blir **admin** och **superadmin**.
- Den nuvarande appversionen fortsätter att fungera som vanligt efteråt.

### 3. Tillåt registrering

Supabase → **Authentication**:

1. **Sign In / Providers**: slå på **Allow new users to sign up**.
2. Under **Email**: stäng av **Confirm email**, tills en egen e-postserver är
   uppsatt (se nedan). Supabases inbyggda e-post skickar bara till medlemmar i
   din Supabase-organisation, så bekräftelsemejlen skulle annars inte komma fram.

Utan bekräftelse kan någon registrera sig med en adress som inte är deras, men
kontot ser ingenting förrän en lagadmin godkänt det, och admin ser namn och
e-post i ansökan.

### 4. Testa förhandsversionen

Vercel → projektet → **Deployments**: den översta från grenen `flera-lag` har en
egen adress. Kontrollera under *Settings → Environment Variables* att
variablerna gäller även **Preview** (bocken), annars får förhandsversionen inte
kontakt med Supabase.

Testa gärna med ett andra konto (t.ex. en annan e-postadress) i ett privat
webbläsarfönster:

- [ ] Du ser P13 som vanligt; menyn visar "Skabersjö IF / P13"
- [ ] *Admin → Medlemmar*: dina befintliga ledare finns som Ledare
- [ ] Kopiera inbjudningslänken, öppna den i det privata fönstret, skapa konto → ansökan skickas
- [ ] Godkänn ansökan med rollen Läsbehörighet → det andra kontot ser laget, men inte födelsedatum, och kan inte ändra något
- [ ] *Admin → Föreningar*: skapa ett testlag i Skabersjö IF, gör det andra kontot till admin där → det andra kontot ser ett tomt lag, inte P13:s data
- [ ] I testlaget: *Spelare → Från föreningen* visar P13:s spelare, *Ny* skapar en spelare, *Cuper → Ny cup* fungerar
- [ ] Registrera en träning och en match i P13 som vanligt

### 5. Släpp den till laget

GitHub → repot → **Pull requests → New** → `flera-lag` till `main` → **Merge**.
Vercel driftsätter då den nya versionen på den vanliga adressen.

---

## Egen e-postserver (rekommenderas)

För bekräftelsemejl och "glömt lösenord" behöver Supabase en egen
e-postserver: *Authentication → Emails → SMTP Settings*. Enklast är
[Resend](https://resend.com) (gratis upp till 3 000 mejl/månad, kräver en egen
domän) eller ett Gmail-konto med *app-lösenord*
(`smtp.gmail.com`, port 587). Slå sedan på **Confirm email** igen.

## Kvar att göra

- Läsrollen ser fortfarande knappar för att ändra; de ger ett felmeddelande
  ("Du har bara läsbehörighet") i stället för att döljas.
- Föräldrar kan inte anmäla eller avanmäla sitt barn (kräver koppling konto ↔ spelare).
- Ta bort en spelare från ett lag (funktionen finns, `players/removePlayerFromSquad`, men saknar knapp).
- Retools exempeltabeller `mobile_app_sample_data` och `tour_orders` kan raderas.
