# Local Dev Guide

## Prerequisites

- Docker + Docker Compose
- Node.js 20+
- `npm`

---

## 1. Environment

```bash
cp .env.example .env
```

Minimum values needed for local dev (edit `.env`):

```
POSTGRES_PASSWORD=localdev
JWT_SECRET=localdev
COOKIE_SECRET=localdev
STORE_CORS=http://localhost:8000
ADMIN_CORS=http://localhost:9000
AUTH_CORS=http://localhost:8000,http://localhost:9000
```

R2 and YooKassa vars can stay blank — those features will error only when exercised.

---

## 2. Start infrastructure

```bash
docker compose up -d postgres redis
```

Skip `medusa` and `proxy` services for now — run Medusa natively for HMR.

Verify:

```bash
docker compose ps          # postgres and redis should be healthy
docker compose logs redis  # expect "Ready to accept connections"
```

---

## 3. Backend (Medusa)

```bash
cd backend
npm install
cp .env.template .env      # fill the same values as root .env
npm run dev                # http://localhost:9000
```

First run runs migrations automatically. Verify:

```bash
curl http://localhost:9000/health   # → {"status":"ok"}
```

Create admin user (first time only):

```bash
npx medusa user -e admin@example.com -p password123
```

Open admin UI: **http://localhost:9000/app**

Check POS route: **http://localhost:9000/app/pos** — should show the POS layout with product grid and cart panel.

---

## 4. Storefront

```bash
cd storefront
npm install
cp .env.template .env.local
```

Set in `storefront/.env.local`:

```
NEXT_PUBLIC_MEDUSA_BACKEND_URL=http://localhost:9000
NEXT_PUBLIC_BASE_URL=http://localhost:8000
NEXT_PUBLIC_DEFAULT_REGION=ru
```

```bash
npm run dev    # http://localhost:8000
```

Verify: product list page loads, cart works, no console errors.

---

## 5. Smoke-test checklist

| Check | How |
|---|---|
| Postgres reachable | `docker compose exec postgres psql -U medusa -c '\l'` |
| Redis reachable | `docker compose exec redis redis-cli ping` → `PONG` |
| Medusa health | `curl http://localhost:9000/health` |
| Admin login | http://localhost:9000/app — log in with the user created above |
| POS loads | http://localhost:9000/app/pos — product grid visible |
| Storefront | http://localhost:8000 — homepage renders |
| R2 (optional) | Upload a product image in admin; check it appears at `R2_PUBLIC_URL` |

---

## Stopping

```bash
docker compose down        # stops containers, keeps volumes
docker compose down -v     # also wipes postgres + redis data
```

---

## Notes

- The `proxy` (Caddy) service is not needed for local dev — it's only used in production.
- Storefront uses OpenNext for Cloudflare Pages; `npm run dev` runs a plain Next.js dev server locally, which is fine for development.
- If you change `medusa-config.ts`, restart `npm run dev` — it doesn't hot-reload config.
