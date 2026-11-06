# Belle — conseillère beauté

A mobile-first web app (in French) that helps someone in France pick makeup and skincare that suits **their** skin, at the best price.

## Features

| Screen | What it does | Data |
|---|---|---|
| **Profil** | Skin tone, undertone, skin type, concerns, allergies, ingredients to avoid, budget. Optional selfie → AI shade analysis. | Stored in the browser (localStorage) |
| **Chercher** | Search any product; results ranked 0–100 for her profile with plain-language reasons. | Open Beauty Facts |
| **Fiche produit** | Score breakdown, allergy warning, shade tip, prices reported in shops, **live online price comparison**, alternatives from other brands, full ingredient list. | Open Beauty Facts, Open Prices, Claude + web search |
| **Scanner** | Scan a barcode in a shop → instant verdict. | Camera (zxing) |
| **Conseils** | Chat with "Belle", who knows her profile, searches real products and checks current prices. | Claude |

## Run it locally

Requirements: Node.js 20+.

```bash
npm install
cp .env.example .env.local    # then paste your Anthropic API key inside
npm run dev
```

Open http://localhost:3000.

Without an API key, search / scores / scanner / shop prices still work; the selfie analysis, live prices and chat show a "clé API manquante" message.

## Use it on a phone

The camera (scanner, selfie) only works over HTTPS. The easiest path is to deploy for free on Vercel:

1. Push this folder to a GitHub repository.
2. On https://vercel.com → *Add New Project* → import the repo.
3. In *Environment Variables*, add `ANTHROPIC_API_KEY`.
4. Deploy, open the URL on the phone, and use "Ajouter à l'écran d'accueil".

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
