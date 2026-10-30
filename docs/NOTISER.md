# Notiser från matcher

Den som vill får en push-notis i telefonen när något händer i en match:

| Händelse | När | Exempel |
|---|---|---|
| **Avspark** | Ledaren trycker på *Period 1* i tidslinjen | Avspark: Skabersjö IF P13 – IFK Malmö |
| **Mål för laget** | Ett mål sparas i tidslinjen | ⚽ Mål för Skabersjö IF P13! 34' Kalle A (assist Nils B) · Hörna, Skabersjö IF P13 2–1 IFK Malmö |
| **Mål för motståndarna** | Ett motståndarmål sparas | Mål för IFK Malmö: 40' Skabersjö IF P13 2–2 IFK Malmö |
| **Halvtid / paus** | *Stoppa* trycks under en period som inte är den sista | Halvtid: Skabersjö IF P13 2–2 IFK Malmö |
| **Ny period** | *Period 2* (eller 3) trycks | Period 2 har börjat: Skabersjö IF P13 2–2 IFK Malmö |
| **Slutsignal** | *Stoppa* trycks under sista perioden | Slutsignal: Skabersjö IF P13 3–2 IFK Malmö · Vinst |
| **Rättelse** | Ett mål som det skickats notis om tas bort | Målet i 34:e minuten är borttaget. Skabersjö IF P13 1–2 IFK Malmö |

Hemmalaget står först, precis som i en resultatlista. Vårt lag skrivs med
förening och lagnamn. Notisen visar loggan för laget som gjorde målet (lagets
logga från *Admin → Medlemmar*, motståndarens från motståndarlaget). På iPhone
visar iOS alltid appens ikon i stället.

**Inga notiser skickas**
- för matcher som är *Avslutad* eller *Registrerad i Fogis*
- för matcher som inte spelas i dag, så att mål som registreras i efterhand inte väcker hela laget
- för räddningar och för ändringar av ett mål (bara nya mål)
- till den som själv registrerar händelsen
- två gånger för samma händelse (t.ex. om *Period 1* trycks två gånger)

## Slå på notiser

Var och en gör det själv under **Admin → Notiser** och väljer där vilka lag de
vill ha notiser från. Alla roller kan slå på notiser, även läsbehörighet.

- **Android:** fungerar i Chrome och i den installerade appen.
- **iPhone/iPad:** kräver iOS 16.4 eller senare och att Hela Laget är tillagd på
  hemskärmen (*Dela → Lägg till på hemskärmen*). Öppna appen därifrån och slå
  på notiserna.

*Skicka testnotis* på samma sida visar om det fungerar.

## Driftsättning (en gång)

1. **Databasen:** kör
   [`supabase/migrations/004_notiser.sql`](../supabase/migrations/004_notiser.sql)
   i Supabase → **SQL Editor**.
2. **Nycklar:** i projektmappen på datorn:

   ```powershell
   node scripts/generate-vapid-keys.mjs
   ```

   Lägg in de två raderna (`VAPID_PUBLIC_KEY` och `VAPID_PRIVATE_KEY`) i Vercel →
   **Settings → Environment Variables**, för både Production och Preview. Den
   privata nyckeln är hemlig. Byts nycklarna måste alla slå på notiserna igen.
3. **Deploy:** Vercel → **Deployments → … → Redeploy**, så att nycklarna läses in.

Saknas nycklarna fungerar appen som vanligt, men sidan *Notiser* säger att
notiser inte är inställda och inga notiser skickas.

## Så fungerar det

- `public/sw.js` är en service worker som bara visar notiser (den cachar inget).
- `notifications/*` sparar enhetens prenumeration (`push_subscriptions`) och
  vilka lag användaren följer (`push_squads`).
- `matches/saveMatchEvent`, `deleteMatchEvent` och `notifyMatchClock` (anropas av
  tidslinjens klocka) lägger notisen i kö med Next.js `after()`. Den skickas
  med paketet `web-push` efter att svaret gått iväg, så registreringen blir
  inte långsammare. `match_notifications` håller reda på vad som redan skickats.
- Mottagare är de som följer laget och fortfarande har åtkomst till det.
  Enheter som avinstallerat appen eller nekat notiser tas bort automatiskt.
