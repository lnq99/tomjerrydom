# backend

Medusa v2 application — the commerce engine. Scaffolded from the official [Medusa DTC starter](https://github.com/medusajs/dtc-starter).

## Dev commands

```bash
npm install
cp .env.template .env   # fill DATABASE_URL and secrets
npm run dev             # starts with HMR on http://localhost:9000
npm run build           # production build → .medusa/server/
npm run start           # run the production build
```

Migrations run automatically on `docker compose up`. For local dev, run manually:

```bash
npx medusa db:migrate
```

## Structure

```
src/
├── admin/          # Admin UI extensions (custom routes, widgets)
│   └── i18n/       # Admin i18n strings
├── api/
│   ├── admin/      # Custom admin API routes
│   └── store/      # Custom store API routes
├── modules/        # Custom Medusa modules (R2 file provider, YooKassa — added in later phases)
├── workflows/      # Multi-step transactional workflows
├── subscribers/    # Event subscribers
├── jobs/           # Scheduled jobs
└── links/          # Module link definitions
```

## Admin UI extensions

POS and other admin customizations live in `src/admin/`. Note: this is **inside the backend**, not the root-level `admin/` directory — Medusa co-locates admin extensions with the server. The root `admin/` directory documents the intent and architecture; actual code goes here.

## Configuration

`medusa-config.ts` is the single source of truth for modules. Currently configured:
- **Event bus**: Redis (`@medusajs/medusa/event-bus-redis`)
- **Cache**: Redis (`@medusajs/medusa/cache-redis`)
- **File storage**: commented placeholder for R2 (`@medusajs/file-s3`) — uncomment in Phase 3
- **Payments**: YooKassa module — added in Phase 4

To drop Redis (memory pressure): set both event bus and cache modules to their in-memory variants in `medusa-config.ts` and remove `redisUrl` from `projectConfig`.

## Docker

The `Dockerfile` uses a two-stage build targeting `linux/arm64` (Oracle Ampere A1). `node:20-alpine` is multi-arch and pulls the arm64 layer automatically on aarch64 hosts.

```bash
docker compose up --build medusa   # build and start with postgres + redis
docker compose logs -f medusa       # tail logs
```
