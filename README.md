# Belle — conseillère beauté

A mobile-first web app (in French) that helps someone in France pick makeup and skincare that suits **their** skin, at the best price.

## Features

| Screen | What it does | Data |
|---|---|---|
| **Bienvenue** | First visit: three quick steps (skin, tone, allergies) so scores are personal from the first search. | Browser |
| **Profil** | Skin tone, undertone, skin type, concerns, allergies, ingredients to avoid, budget. Optional selfie → AI shade analysis. Optional sync to her Google account. | Browser; account copy in Redis if sync is on |
| **Chercher** | Search any product; results ranked 0–100 for her profile with plain-language reasons. | Open Beauty Facts |
| **Fiche produit** | Score breakdown, allergy warning, **shade names to try** in the product's range, prices reported in shops, **live online price comparison**, alternatives from other brands, full ingredient list. Missing or unknown product → **photograph the ingredient list** and Claude reads it. | Open Beauty Facts, Open Prices, Claude + web search |
| **Scanner** | Scan a barcode in a shop → instant verdict. | Camera (zxing) |
| **Conseils** | Chat with "Belle", who knows her profile, searches real products and checks current prices. The conversation is kept on the phone. | Claude |

## Run it locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local    # then paste your Anthropic API key inside
npm run dev
```

Open http://localhost:3000.

Without an API key, search / scores / scanner / shop prices still work; the selfie analysis, live prices and chat show a "clé API manquante" message.

## Cost protection

The three features that call Claude (chat, selfie analysis, live prices) are guarded by [src/lib/guard.ts](src/lib/guard.ts):

- **Per-visitor limits**, counted per Google account when signed in, otherwise per IP address:

  | Feature | Per hour (guest / signed in) | Per day (guest / signed in) |
  |---|---|---|
  | Chat | 10 / 30 | 25 / 100 |
  | Live prices | 5 / 15 | 15 / 50 |
  | Selfie analysis | 3 / 6 | 5 / 15 |

- **Daily spend cap** (`DAILY_BUDGET_USD`, default $5). Each response's token usage is priced at Claude Opus 5.5 list rates and added to a daily counter. Once the cap is reached, these features pause until midnight UTC; search, scores and the scanner keep working.
- **Live price cache**: results are shared by barcode for 6 hours (1 hour when no offer was found). Cache hits are free and don't count against limits.

The counters live in Redis (Upstash). On Vercel: *Storage* → *Create* → *Upstash for Redis*, connected to the project, which adds `KV_REST_API_URL` and `KV_REST_API_TOKEN`. Without Redis the app falls back to in-memory counters: fine locally, but unreliable once deployed.

The cap is an estimate. Also set a monthly spend limit in the [Anthropic Console](https://console.anthropic.com/settings/limits) as a hard backstop.

## Sign in with Google

Optional accounts use [Auth.js](https://authjs.dev). Google is the only method, so the same button signs in and signs up. There's no database: the session is an encrypted cookie, and the beauty profile stays in the browser.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials), open *OAuth consent screen* and set it up (External, app name "Belle").
2. Go to *Credentials* → *Create credentials* → *OAuth client ID* → *Web application*.
3. Under *Authorized redirect URIs*, add `http://localhost:3000/api/auth/callback/google`, plus `https://<your-domain>/api/auth/callback/google` once deployed.
4. Copy the client ID and secret into `.env.local` as `AUTH_GOOGLE_ID` and `AUTH_GOOGLE_SECRET`. Run `npx auth secret` to generate `AUTH_SECRET`.
5. On Vercel, add the same three variables.

Without these variables the rest of the app works, and the sign-in page shows "La connexion Google n'est pas encore configurée".

## Use it on a phone

The camera (scanner, selfie) only works over HTTPS. The easiest path is to deploy for free on Vercel:

1. Push this folder to a GitHub repository.
2. On https://vercel.com → *Add New Project* → import the repo.
3. In *Environment Variables*, add `ANTHROPIC_API_KEY`.
4. Deploy, open the URL on the phone, and use "Ajouter à l'écran d'accueil" (Android: Chrome menu → *Installer l'application*; iPhone: Safari → Partager → *Sur l'écran d'accueil*). The app opens full screen with its own icon ([manifest.ts](src/app/manifest.ts), icons in [public/icons/](public/icons/)).

## How the score works

`src/lib/scoring.ts` starts at 62 and adds or removes points from the INCI ingredient list:
allergies (hard stop, score ≤ 15), fragrance and the 26 EU fragrance allergens (for sensitive skin),
ingredients she wants to avoid, pore-clogging ingredients (oily/acne skin), hydrating actives (dry skin),
soothing actives (sensitive), actives for each concern, vegan/organic labels, popularity and price vs budget.
Products without an ingredient list are marked "Infos insuffisantes".

## Next steps

- Price alerts (needs a database + scheduled job).
- Retailer affiliate feeds (e.g. Awin) for complete, always-fresh prices and commission revenue.
- User accounts so the profile syncs across devices.
