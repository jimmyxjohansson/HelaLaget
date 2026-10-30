# Hela Laget

Lagappen för träningar, matcher, cuper, serier och spelare, för flera föreningar
och lag. Den byggdes ursprungligen i Retool för Skabersjö IF P13 och är flyttad
till Next.js med Supabase (databas, inloggning och bildlagring) och Vercel (hosting).

**Flera lag, roller och säkerhet:** se [docs/FLERA-LAG.md](docs/FLERA-LAG.md).

**Import från Svenskalag:** se [docs/SVENSKALAG.md](docs/SVENSKALAG.md).

**Notiser från matcher:** se [docs/NOTISER.md](docs/NOTISER.md).

**Ska appen flyttas från Retool?** Följ [docs/MIGRERING.md](docs/MIGRERING.md).

## Teknik

- **Next.js 16** (App Router) med React 19 och TypeScript
- **Tailwind CSS** och **shadcn/ui**-komponenter (samma tema som i Retool)
- **Supabase**: Postgres-databasen, inloggning (Supabase Auth) och Storage för bilder
- **Vercel**: hosting; varje push till `main` deployas automatiskt

## Kom igång lokalt

```bash
npm install
cp .env.example .env.local   # fyll i värdena från Supabase
npm run dev                  # http://localhost:3000
```

Lokalt körs appen mot samma Supabase-databas som produktionen, om du inte
pekar `DATABASE_URL` någon annanstans. Var försiktig med testdata.

## Struktur

```
src/
  app/                    Next.js-routes
    (app)/…/page.tsx      En route per vy (samma adresser som i Retool-appen)
    api/[module]/[fn]/    API-route som kör backend-funktionerna
    login/                Inloggningssidan
  views/                  Vyerna från Retool (klientkomponenter)
  components/             Delade komponenter, navigering och skal
  hooks/backend/          Krokar som useGetPlayers() – GENERERADE, se nedan
  lib/shadcn/             UI-komponenter (shadcn/ui)
  lib/supabase/           Supabase-klienter för webbläsare och server
  server/functions/       Backend-funktionerna med SQL, en fil per funktion
  server/db.ts            Databasanslutningen (ersätter retoolDb)
  proxy.ts                Kräver inloggning för alla sidor och API-anrop
supabase/                 SQL för säkerhet, lagring och återställning
scripts/                  Kodgenerator och bildflytt
```

## Hur data hämtas

Vyerna anropar backend-funktioner via krokar, precis som i Retool:

```tsx
const { data, loading, trigger } = useGetPlayers()
useEffect(() => { trigger({ months: 3 }) }, [])
```

`trigger(params)` skickar `POST /api/players/getPlayers` med parametrarna som JSON.
API-routen kontrollerar att användaren är inloggad, hittar valt lag (cookien
`hl_squad`) och användarens roll där, och kör
`src/server/functions/players/getPlayers.ts` i lagkontext: en transaktion som
databasrollen `app_user`, där RLS-reglerna bara släpper igenom lagets data.
Databasen nås bara från servern; webbläsaren ser aldrig anslutningsuppgifterna.

### Lägga till en backend-funktion

1. Skapa `src/server/functions/<modul>/<namn>.ts`:

   ```ts
   import { db } from '@/server/db'
   import type { User } from '@/server/types'

   type Params = { id: number }

   export default async function getSomething(req: { params: Params; user: User }) {
     const result = await db.query<{ id: number; name: string }>(
       'SELECT id, name FROM something WHERE id = $1',
       [req.params.id],
     )
     return result.data[0] ?? null
   }
   ```

2. Kör `npm run generate`. Då skapas kroken `useGetSomething` i
   `src/hooks/backend/<modul>.ts` och funktionen registreras i API:t.

**Behörighet:** funktioner som börjar på `get` kräver minst läsbehörighet i
laget, övriga kräver ledare. Annat anges i filen med
`export const access = 'admin' | 'user' | 'superadmin'` (se `src/server/types.ts`).
Läsrollen får automatiskt känsliga fält borttagna ur svaren (`src/server/redact.ts`).

### Bilduppladdning

`useUploadPlayerImage` och `useUploadTeamLogo` laddar upp direkt från webbläsaren
till Supabase Storage (bucket `images`) och returnerar en publik URL, som sparas i
`players.img` respektive `teams.imgurl`.

## Inloggning

E-post och lösenord via Supabase Auth. Nya användare skapar konto på
`/registrera` och ansöker om att gå med i ett lag med lagets kod eller
inbjudningslänk (`/join/<kod>`). `src/proxy.ts` skickar utloggade besökare
till `/login`.

## Skillnader mot Retool-versionen

- Inloggning, registrering, flera lag och roller är tillagda.
- Nya spelare, cuper och ledare kan skapas i appen (fanns i separata Retool-appar).
- Spelarbilder och lagloggor lagras i Supabase Storage.
- `views/Drills.tsx` (övningsbank) fanns i Retool-exporten men hade ingen route.
  Den finns kvar och kan kopplas in genom att skapa `src/app/(app)/drills/page.tsx`.
- Länkarna till planerings- och träningsapparna ställs in per lag (*Admin → Medlemmar*).
