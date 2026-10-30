# Skabersjö IF P13

Lagappen för träningar, matcher, cuper, serier och spelare. Den byggdes ursprungligen
i Retool och är flyttad till Next.js med Supabase (databas, inloggning och
bildlagring) och Vercel (hosting).

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
API-routen kontrollerar att användaren är inloggad och kör
`src/server/functions/players/getPlayers.ts` på servern, som gör sin SQL-fråga mot
Supabase. Databasen nås bara från servern; webbläsaren ser aldrig
anslutningsuppgifterna.

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

### Bilduppladdning

`useUploadPlayerImage` och `useUploadTeamLogo` laddar upp direkt från webbläsaren
till Supabase Storage (bucket `images`) och returnerar en publik URL, som sparas i
`players.img` respektive `teams.imgurl`.

## Inloggning

E-post och lösenord via Supabase Auth. Det går inte att registrera sig själv:
nya ledare läggs till i Supabase under *Authentication → Users → Add user*.
`src/proxy.ts` skickar utloggade besökare till `/login`.

## Skillnader mot Retool-versionen

- Inloggning är tillagd (Retool skötte den tidigare), och "Logga ut" finns i menyn.
- Spelarbilder och lagloggor lagras i Supabase Storage.
- `views/Drills.tsx` (övningsbank) fanns i Retool-exporten men hade ingen route.
  Den finns kvar och kan kopplas in genom att skapa `src/app/(app)/drills/page.tsx`.
- Planering och Träning är fortfarande separata Retool-appar som appen länkar till.
