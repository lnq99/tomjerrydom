# telegram-bot

Telegram sales channel — a Cloudflare Worker that handles Telegram Bot API webhooks.

## What lives here

- `src/index.ts` — Worker entry point, webhook router
- `src/handlers/` — message and callback query handlers (browse, cart, checkout)
- `wrangler.toml` — Cloudflare Worker configuration

## Role

Provides a conversational commerce interface over Telegram. The bot communicates with the Medusa backend via the Store API using a dedicated API key (`MEDUSA_API_KEY`).

## Shared logic with POS

Cart state, pricing, and YooKassa payment orchestration are intentionally kept in `admin/src/pos/logic/` in a UI-framework-agnostic form so they can be called here. Before duplicating any checkout logic in this Worker, check whether it can be extracted from (or shared with) the POS logic layer.

## Environment variables (Cloudflare secrets)

See root `.env.example`:
- `TELEGRAM_BOT_TOKEN` — BotFather token
- `TELEGRAM_WEBHOOK_SECRET` — used to validate incoming webhook requests
- `MEDUSA_BACKEND_URL` — backend URL (internal or public, depending on network topology)
- `MEDUSA_API_KEY` — Medusa publishable or secret API key for store operations

## Deployment

```bash
wrangler deploy
wrangler secret put TELEGRAM_BOT_TOKEN
# ... other secrets
```
