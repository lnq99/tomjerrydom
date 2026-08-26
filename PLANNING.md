# PLANNING.md

Architecture and build roadmap for TomJerryDom — a Medusa v2 e-commerce platform for the Russian market.

---

## Build Order / Milestones

### Phase 1 — Infrastructure foundation
- [ ] Provision Oracle Cloud Ampere A1 VM (Ubuntu 22.04, ARM64)
- [ ] Install Docker + Docker Compose, configure firewall (ports 80/443 only)
- [ ] Clone repo, copy `.env.example` → `.env`, fill secrets
- [ ] `docker compose up -d postgres redis` — verify connectivity
- [ ] Configure Caddy with a real domain and test TLS

### Phase 2 — Medusa backend running
- [ ] Scaffold `backend/` as a Medusa v2 project (`npx create-medusa-app@latest` or manual)
- [ ] Write `backend/Dockerfile` (ARM64-compatible)
- [ ] `docker compose up -d medusa` — verify admin reachable at `/app`
- [ ] Run initial migrations, create admin user
- [ ] Configure Medusa region for Russia (RUB currency, tax settings)

### Phase 3 — R2 integration
- [ ] Implement custom Medusa file provider for Cloudflare R2 (`backend/src/modules/r2-file/`)
- [ ] Verify product image upload → R2 → served via `R2_PUBLIC_URL`
- [ ] Implement backup script (`scripts/backup.sh`), test restore with `scripts/restore.sh`
- [ ] Schedule nightly backup via cron on VM

### Phase 4 — YooKassa payment integration
- [ ] Implement YooKassa payment provider module (`backend/src/modules/yookassa/`)
- [ ] Handle 54-ФЗ fiscal receipt data (items, VAT, payment method) — see `docs/yookassa-54fz.md`
- [ ] Implement webhook handler for payment status updates
- [ ] Test payment flow end-to-end in YooKassa sandbox

### Phase 5 — Next.js storefront
- [ ] Scaffold `storefront/` (Next.js App Router, Medusa JS SDK)
- [ ] Implement: product listing → product detail → cart → checkout → order confirmation
- [ ] Configure `@cloudflare/next-on-pages` for Cloudflare Pages deployment
- [ ] Connect to YooKassa payment step in checkout

### Phase 6 — Admin customisation
- [ ] Scaffold `admin/` as a Medusa admin extension
- [ ] Add any custom widgets needed for store operations (e.g. order notes, region overrides)
- [ ] Verify admin works in production behind Caddy

### Phase 7 — POS module
- [ ] Build `admin/src/pos/logic/` — cart, pricing, YooKassa payment orchestration (no UI deps)
- [ ] Build `admin/src/pos/ui/` — touch-friendly React UI calling into logic layer
- [ ] Register POS as a custom admin route (`/app/pos`)
- [ ] Test on tablet in landscape mode

### Phase 8 — Telegram bot
- [ ] Scaffold `telegram-bot/` as a Cloudflare Worker (TypeScript, Wrangler)
- [ ] Implement browse → cart → checkout flow via Telegram Bot API
- [ ] Reuse or port POS `logic/` layer for cart and payment orchestration
- [ ] Register webhook with Telegram, deploy to Cloudflare Workers

### Phase 9 — Backups, monitoring, hardening
- [ ] Set up uptime monitoring (external ping — UptimeRobot or similar)
- [ ] Configure Caddy access logs, ship to persistent volume or remote sink
- [ ] Review Docker resource limits (`mem_limit`, `cpus`) to ensure Redis doesn't OOM the VM
- [ ] Document runbook (`docs/runbook.md`): deploy, rollback, backup restore, Redis removal

---

## Open Decisions

| # | Decision | Status | Notes |
|---|---|---|---|
| — | All open decisions resolved | — | — |

## Resolved Decisions

| Decision | Choice | Rationale |
|---|---|---|
| POS architecture | Admin UI extension (not standalone app) | Shares admin auth + API client; POS logic layer reusable by Telegram bot |
| Storefront framework | Next.js | Medusa official starter; strong ecosystem; Cloudflare Pages support |
| Next.js rendering strategy | `@opennextjs/cloudflare` (OpenNext) | Only option with full i18n routing, ISR via R2, and no `runtime='edge'` boilerplate. `next-on-pages` is maintenance-mode; static export breaks next-intl middleware routing. |
| Redis | Keep running | Retain in docker-compose; measure actual RAM after Phase 2 before removing. Removal path: delete redis service + switch Medusa event bus/cache modules to in-memory in `medusa-config.ts`. |
| Payments | YooKassa | Russian market standard; 54-ФЗ fiscal compliance built in |
| Hosting | Single Oracle Cloud Ampere A1 VM | Always Free tier (2 OCPU / 12 GB RAM ARM64); acceptable for early stage |
| Asset storage | Cloudflare R2 | S3-compatible, egress-free, integrates with Cloudflare CDN |
| Inventory | Medusa native stock location/reservation | No external ERP needed at this stage |

---

## Environment Variables

All variables are documented in `.env.example`. Summary by service:

| Service | Key variables |
|---|---|
| Medusa backend | `DATABASE_URL`, `REDIS_URL`, `JWT_SECRET`, `COOKIE_SECRET`, `*_CORS` |
| R2 (assets) | `R2_ACCESS_KEY_ID`, `R2_SECRET_ACCESS_KEY`, `R2_BUCKET_NAME`, `R2_ENDPOINT`, `R2_PUBLIC_URL` |
| R2 (backups) | `BACKUP_R2_BUCKET` (+ same R2 credentials) |
| YooKassa | `YOOKASSA_SHOP_ID`, `YOOKASSA_SECRET_KEY` |
| Storefront | `NEXT_PUBLIC_MEDUSA_BACKEND_URL`, `NEXT_PUBLIC_BASE_URL`, `NEXT_PUBLIC_DEFAULT_REGION` |
| Telegram bot | `TELEGRAM_BOT_TOKEN`, `TELEGRAM_WEBHOOK_SECRET`, `MEDUSA_BACKEND_URL`, `MEDUSA_API_KEY` |
| Backup scripts | `POSTGRES_DB`, `POSTGRES_USER`, `POSTGRES_PASSWORD`, `POSTGRES_HOST` |

---

## Known Accepted Risks

| Risk | Mitigation |
|---|---|
| Single VM — no high availability | Acceptable for launch; nightly backups to R2 limit data loss window |
| Oracle Always Free terms may change | Terms changed once already (June 2026 cut). Budget for a paid fallback VM (~$5–15/mo VPS) if needed. |
| Self-managed OS and Docker patching | Schedule monthly maintenance window; enable unattended-upgrades for security patches |
| Redis may be dropped under memory pressure | Medusa's in-memory fallbacks are functional; remove Redis service and update `medusa-config.ts` |
| ARM64 compatibility | Verify all Docker images have `linux/arm64` variants before adding to compose |
