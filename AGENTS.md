# AGENTS.md

This file provides guidance to Codex (Codex.ai/code) when working with code in this repository.

## Project Overview

Medusa v2 e-commerce platform for the Russian market. Monorepo containing backend, admin extensions (with embedded POS), storefront, Telegram bot, and infra config.

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

**Three surfaces:** customer storefront · admin back-office · POS module

## POS Architecture (confirmed, do not ask again)

POS is a **Medusa v2 admin UI extension** (custom route/widget within the admin app), not a standalone app. It shares admin auth, API client, and deployment.

- POS-specific code lives in `admin/src/pos/` — separate from general admin customizations
- POS **business logic** (cart state, pricing, payment orchestration) must be **decoupled from POS UI components** so it can later be called from a Telegram bot webhook handler without depending on admin-UI context

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
6. Admin customization
7. POS (admin extension)
8. Telegram bot
9. Backups + monitoring

## Monorepo Structure

```
/
├── backend/          # Medusa v2 — custom modules, API routes, workflows, subscribers
├── admin/            # Medusa admin UI extensions
│   └── src/pos/      # POS-specific components and business logic (kept separate)
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

Skeleton scaffolded — directories and placeholder READMEs exist, no application code yet. See `PLANNING.md` for build milestones.
