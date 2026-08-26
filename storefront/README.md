# storefront

Next.js 15 customer-facing storefront. Scaffolded from the official [Medusa DTC starter](https://github.com/medusajs/dtc-starter). Deployed to Cloudflare Pages via `@opennextjs/cloudflare`.

## Dev commands

```bash
npm install          # or pnpm install
npm run dev          # starts on http://localhost:8000
npm run build        # production build
npm run lint
```

## Structure

```
src/
├── app/
│   └── [countryCode]/   # Medusa region routing (e.g. /ru/products/...)
│       ├── (main)/      # storefront pages
│       └── (checkout)/  # checkout flow
├── lib/
│   ├── data/            # server-side Medusa Store API calls
│   └── util/            # pricing helpers, formatters
├── modules/             # feature modules (cart, checkout, products, account…)
└── middleware.ts        # region detection → countryCode redirect
```

## Region routing

The storefront uses Medusa's region/country model (not next-intl). `middleware.ts` maps each request to a country code from Medusa's configured regions and redirects to `/{countryCode}/...`. Set `NEXT_PUBLIC_DEFAULT_REGION=ru` and create a Russia region in Medusa admin.

The middleware reads `request.cf.country` from Cloudflare automatically — no extra config needed on Workers.

## Environment variables

Copy `.env.template` → `.env.local` for local dev. Production secrets go in Cloudflare Pages environment variables.

Key vars:
- `NEXT_PUBLIC_MEDUSA_PUBLISHABLE_KEY` — create in Medusa admin → Settings → API Keys
- `NEXT_PUBLIC_MEDUSA_BACKEND_URL` — backend URL (behind Caddy in production)
- `NEXT_PUBLIC_DEFAULT_REGION` — `ru` for this deployment
- `NEXT_PUBLIC_R2_PUBLIC_URL` — public CDN URL for product images from R2

## Deployment (Cloudflare Pages via OpenNext)

```bash
npm install -D @opennextjs/cloudflare wrangler
npx opennextjs-cloudflare build
npx wrangler deploy
```

`wrangler.jsonc` is pre-configured with the ISR cache R2 bucket binding. Create the bucket first:

```bash
npx wrangler r2 bucket create tomjerrydom-isr-cache
```

## Payment provider

The starter includes Stripe components (`src/modules/checkout/components/payment*`). **Do not use them** — replace with YooKassa when implementing checkout. The Stripe npm packages can be removed from `package.json` once the YooKassa payment module is wired up.
