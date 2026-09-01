# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

Medusa v2 e-commerce platform for the Russian market. Monorepo containing backend, standalone manager app (POS + product/order management), storefront, Telegram bot, and infra config.

## Decided Architecture (do not re-litigate these)

| Layer | Choice |
|---|---|
| Backend | Medusa v2 (Node.js/TypeScript) |
| Database | Self-hosted PostgreSQL (same VM) |
| Cache/queue | Redis (self-hosted, same VM — optional; may be dropped under memory pressure; Medusa in-memory modules are fallback) |
| Hosting | Single Oracle Cloud Always Free Ampere A1 VM — 2 OCPU / 12 GB RAM, ARM/aarch64, Docker Compose |
| Asset storage | Cloudflare R2 (S3-compatible) |
| Storefront hosting | Cloudflare Pages |
| Storefront SSR adapter | `@opennextjs/cloudflare` (OpenNext) — Node.js compat mode, ISR via R2 |
| Payments + fiscal | YooKassa (54-ФЗ compliance) |
| Inventory | Medusa v2 native stock location/reservation module |
| Backups | Cron `pg_dump` → Cloudflare R2 |
| Telegram channel | Cloudflare Workers |
| Explicitly excluded | MoySklad, Yandex Cloud, 152-ФЗ localization |

**Three surfaces:** customer storefront · admin back-office (Medusa default) · manager app (POS + ops)

## Manager App Architecture (confirmed, do not ask again)

Manager is a **standalone Next.js app** (`manager/`), not a Medusa admin extension. It has its own JWT auth (cookie `manager_token`), its own API client (`manager/src/lib/api.ts`), and runs on port 3100.

Intended user: **non-technical Vietnamese-speaking staff** (shop operators, not developers).

- Manager covers: POS, product catalog management, order fulfillment, pricing config, storefront media, analytics
- POS **business logic** (cart state, pricing, payment orchestration) is decoupled from UI in `manager/src/lib/` so it can later be called from a Telegram bot webhook handler without depending on UI context
- The `admin/` directory is reserved for future Medusa admin extensions (backend-developer-facing tools), separate from the manager surface

## Language & i18n (confirmed, do not ask again)

| Surface | Language |
|---|---|
| Manager UI | Vietnamese (primary staff language) |
| Receipts & QR payment screen | Russian (customer-facing printouts) |
| Storefront | Russian |
| Admin back-office | English (Medusa default) |

Russian i18n for the manager UI is planned. Foundation exists in `manager/src/lib/i18n.ts` and `manager/src/lib/lang-context.tsx` — strings are defined, but components still use Vietnamese hardcoded. Wire up gradually as needed.

## Price Units (confirmed, do not re-litigate)

**All prices are in whole rubles (₽) everywhere** — backend API responses, frontend state, cart math, database.

- Do NOT use kopecks (smallest unit) anywhere in this project
- `formatRub(amount)` formats whole rubles directly — no ÷100
- Round fractional values with `Math.round()` at input/API boundaries
- Exception: if calling a Medusa built-in API that internally requires smallest-unit (e.g., Medusa's own price list APIs), convert at that one call site only: `rubles * 100`

## Open Decisions (still pending user input)

- None — all decisions resolved.

## Known Accepted Risks

- Single VM, no HA
- Self-managed patching
- Oracle Always Free terms changed once already (June 2026 cut) — VM may be subject to future changes
- Redis may need to be dropped under memory pressure

## Planned Build Order

1. VM + Docker Compose skeleton
2. Medusa + Postgres running
3. R2 integration
4. YooKassa integration
5. Storefront
6. Manager app (POS, products, orders, pricing)
7. Telegram bot
8. Backups + monitoring

## Monorepo Structure

```
/
├── backend/          # Medusa v2 — custom modules, API routes, workflows, subscribers
├── admin/            # Medusa admin UI extensions (reserved for future backend-dev tools)
├── manager/          # Standalone Next.js manager app — POS, catalog, orders, pricing
│   └── src/
│       ├── app/      # Next.js App Router pages
│       ├── components/pos/  # POS-specific UI components
│       └── lib/      # Shared logic: api.ts, cart.ts, i18n.ts, lang-context.tsx, etc.
├── storefront/       # Next.js storefront — OpenNext adapter for Cloudflare Pages
├── telegram-bot/     # Cloudflare Worker for Telegram channel
├── infra/            # Docker Compose, nginx/Caddy config, Oracle VM provisioning notes
├── scripts/          # Backup cron, deployment scripts
├── docs/             # ADR-style architecture decisions, env var reference, runbook
├── .env.example
├── docker-compose.yml
└── PLANNING.md       # Milestones, decisions, env var list
```

## Current State

Manager app is functional with POS, orders, products, pricing config, and media management. Storefront skeleton exists. Telegram bot and infra pending.
