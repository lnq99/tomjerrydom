# admin

Medusa v2 admin UI extensions — custom routes, widgets, and the embedded POS module.

## What lives here

- `src/routes/` — custom admin UI pages (React, loaded by Medusa's admin extension system)
- `src/widgets/` — custom widgets injected into existing admin pages
- `src/pos/` — POS module (see `src/pos/README.md`)

## Extension model

Medusa v2's admin is a Vite/React app. Extensions are loaded at build time by placing files in the correct paths under `src/`. The admin extension shares the admin's auth session and API client — no separate auth needed for POS.

## Build

Admin extensions are bundled together with the Medusa backend build (`medusa build` in `backend/`). No separate build step required unless developing with HMR (`medusa develop`).
