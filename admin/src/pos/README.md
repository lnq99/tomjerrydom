# admin/src/pos

POS (Point of Sale) module — tablet-optimised sales interface built as a Medusa admin UI extension.

## Architecture rule: decouple business logic from UI

This directory is split into two layers:

```
pos/
├── logic/        # Pure business logic — cart state, pricing, payment orchestration
│                 # No React, no admin-UI imports. Must be callable from non-UI contexts.
└── ui/           # React components and hooks that call into logic/
```

**Why this matters:** The Telegram bot (`telegram-bot/`) will eventually reuse the same cart, pricing, and YooKassa payment flow. If that logic is entangled with React or Medusa admin UI APIs, it cannot be extracted. Keep `logic/` dependency-free of UI frameworks.

## What belongs in `logic/`

- Cart creation / line-item management (calls to Medusa Store API)
- Pricing resolution (customer group, currency, region)
- YooKassa payment session creation and status polling
- Order confirmation / receipt generation

## What belongs in `ui/`

- React components for the POS layout (product grid, cart sidebar, payment screen)
- Hooks that connect UI state to `logic/` functions
- Touch-friendly styles (this surface runs on tablets)

## Access

The POS is reachable as a custom admin route, e.g. `/app/pos`. It inherits the operator's admin session — no separate login.
