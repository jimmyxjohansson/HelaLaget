# Flytt från Retool till Supabase + Vercel

Steg för steg, från Retool-appen till att laget använder den nya appen. Räkna med
en till två timmar första gången. Gör gärna en **provflytt** först (steg 1–9) och
kör sedan steg 10 på bytesdagen.

Du behöver konton på [GitHub](https://github.com), [Supabase](https://supabase.com)
och [Vercel](https://vercel.com) (gratisnivåerna räcker), samt på din dator:

- **Node.js 20 eller senare** – för att köra appen lokalt och bildskriptet.
- **PostgreSQL-klientverktygen** (`pg_dump` och `psql`). På Windows: ladda ner
  installationsprogrammet för PostgreSQL 17 från postgresql.org/download/windows
  och välj bara *Command Line Tools*. Verktygen hamnar i
  `C:\Program Files\PostgreSQL\17\bin`.

---

## 1. Skapa Supabase-projektet

1. Supabase → **New project**. Välj region **North EU (Stockholm)**.
2. Spara databaslösenordet du väljer – det behövs nedan.

## 2. Exportera databasen från Retool

Retool Database är en vanlig Postgres-databas. Hämta anslutningssträngen för
**produktionsmiljön** i Retool under *Database* (anslutningsinställningarna /
*Connect*). Den ser ut ungefär som `postgresql://användare:lösen@värd/databas`.

Kör i PowerShell (byt ut strängen inom citattecken):

```powershell
pg_dump --no-owner --no-privileges --schema=public --file retool-dump.sql "postgresql://...retool..."
```

Ger `pg_dump` felet *server version mismatch*: installera en nyare version av
klientverktygen.

> `retool-dump.sql` innehåller personuppgifter. Lägg den inte i projektmappen
> (eller i alla fall aldrig i Git) och radera den när flytten är klar.

## 3. Importera till Supabase

I Supabase: klicka **Connect** högst upp och kopiera anslutningssträngen under
**Session pooler** (fungerar från alla nätverk). Byt `[YOUR-PASSWORD]` mot
databaslösenordet.

```powershell
psql "postgresql://postgres.xxxx:LÖSEN@aws-0-eu-north-1.pooler.supabase.com:5432/postgres" -f retool-dump.sql
```

Följande fel är **väntade och ofarliga**:

- `schema "public" already exists`
- `unrecognized configuration parameter "transaction_timeout"` (om dina
  klientverktyg är nyare än Supabase-databasen)

Andra fel ska undersökas. Kontrollera sedan i Supabase → *Table Editor* att
tabellerna (`players`, `trainings`, `matches` …) och raderna finns.

**Tidszon:** kör `show timezone;` både i Retool (i en query mot retool_db) och i
Supabase (SQL Editor). Visar Retool något annat än `UTC`, kör i Supabase:
`alter database postgres set timezone to 'VÄRDET_FRÅN_RETOOL';`. Det påverkar
t.ex. vad "idag" betyder för kommande födelsedagar och matcher.

## 4. Lås databasen och skapa bildlagringen

Supabase → **SQL Editor** → klistra in hela [`supabase/setup.sql`](../supabase/setup.sql)
→ **Run**. Sista resultatet ska vara en tom tabell ("tabell utan RLS": 0 rader).

Skriptet stänger Supabases automatiska REST-API för lagets tabeller (annars
skulle den publika nyckeln kunna läsa spelaruppgifterna) och skapar bucketen
`images` för spelarbilder och lagloggor.

## 5. Inloggning

1. **Authentication → Sign In / Providers**: stäng av
   **Allow new users to sign up**. *Email* ska vara påslaget.
2. **Authentication → Users → Add user → Create new user**: lägg in dig själv och
   övriga ledare med e-post och ett lösenord. Kryssa i **Auto Confirm User**.

Bara användare som finns här kan logga in. För att ta bort någons åtkomst:
radera användaren.

## 6. Lägg koden på GitHub

Skapa ett **privat** repo på GitHub (t.ex. `p13-app`) och ladda upp koden, med
GitHub Desktop eller i terminalen från projektmappen:

```powershell
git init
git add .
git commit -m "Flytt från Retool till Next.js"
git branch -M main
git remote add origin https://github.com/DITT-KONTO/p13-app.git
git push -u origin main
```

## 7. Deploya på Vercel

1. Vercel → **Add New → Project** → importera repot. Vercel känner igen Next.js.
2. Under **Environment Variables**, lägg in (värden från Supabase → *Connect* och
   *Project Settings → API Keys*):

   | Namn | Värde |
   |---|---|
   | `NEXT_PUBLIC_SUPABASE_URL` | `https://xxxx.supabase.co` |
   | `NEXT_PUBLIC_SUPABASE_ANON_KEY` | publishable-nyckeln (`sb_publishable_…`) eller den äldre anon-nyckeln |
   | `DATABASE_URL` | anslutningssträngen under **Transaction pooler** (port **6543**) med lösenordet ifyllt |
   | `NEXT_PUBLIC_STORAGE_BUCKET` | `images` |

3. **Deploy**. Öppna adressen du får, logga in och klicka runt.

Funktionerna körs i Stockholm (`vercel.json`), nära databasen.

## 8. Flytta bilderna

Bilderna ligger kvar i Retool Storage och fungerar tills vidare, men slutar
fungera när Retool-kontot avslutas. Flytta dem så här, från projektmappen:

1. Skapa `.env.local` (kopiera `.env.example`) och fyll i samma värden som i
   Vercel, plus `SUPABASE_SERVICE_ROLE_KEY` (*Project Settings → API Keys →
   Secret key*). Den nyckeln ska **bara** ligga i `.env.local` på din dator.
2. `npm install`
3. Torrkörning, som visar vad som skulle flyttas:
   `node --env-file=.env.local scripts/migrate-images.mjs`
4. Flytta på riktigt:
   `node --env-file=.env.local scripts/migrate-images.mjs --apply`
5. Skriptet skriver ut en ny adress för lagets egen logga. Lägg in den under
   *Admin → Medlemmar → Logga* för laget. Lag utan egen logga visar Hela Lagets
   neutrala logga.

Skriptet kan köras flera gånger. Bilder som inte går att hämta (t.ex. om de inte
var publika i Retool) behåller sin gamla länk och listas i slutet. Ladda upp dem
igen i appen.

## 9. Testa

Gå igenom det ni använder mest, gärna på mobilen:

- [ ] Inloggning och utloggning (Admin-menyn → Logga ut)
- [ ] Startsidan: kommande matcher, träningar och födelsedagar
- [ ] Skapa en träning, markera närvaro, dela in grupper, kopiera en träning
- [ ] Skapa en match, lägg till deltagare, registrera mål/assist i tidslinjen, avsluta matchen
- [ ] Cup: lägg till deltagare, synka deltagare till en cupmatch
- [ ] Serie: uppdatera tabellen
- [ ] Ladda upp en spelarbild och en laglogga
- [ ] Datum och tider visas likadant som i Retool

## 10. Bytesdagen

Data som registreras i Retool efter exporten följer inte med. Så här byter ni:

1. Be ledarna att inte registrera något i Retool under bytet.
2. Supabase → SQL Editor: kör [`supabase/reset-public.sql`](../supabase/reset-public.sql)
   (raderar provimporten).
3. Gör om steg 2–4 (export, import, `setup.sql`). Användarna i steg 5 och
   bilderna i Storage ligger kvar.
4. Kör bildskriptet igen (steg 8, med `--apply`).
5. Skicka den nya adressen till ledarna. Behåll Retool som reserv några veckor
   innan kontot avslutas.

---

## Kvar i Retool

- **Planering** (länken i Admin-menyn) och **Träning** (knappen "Öppna i
  Retool-app" i träningsvyn) är separata Retool-appar. Länkarna fungerar så länge de apparna
  finns kvar och är nästa kandidater att flytta.
