# docs

Architecture decisions, operational runbook, and reference documentation.

## What lives here

- `adr/` — Architecture Decision Records (ADR format: context → decision → consequences)
- `runbook.md` — operational procedures: deploy, rollback, backup restore, scale Redis on/off
- `env-vars.md` — full environment variable reference with descriptions and example values
- `yookassa-54fz.md` — notes on YooKassa integration and 54-ФЗ fiscal receipt requirements

## ADR naming convention

```
adr/
├── 001-single-vm-hosting.md
├── 002-cloudflare-r2-storage.md
├── 003-yookassa-payment-provider.md
├── 004-pos-as-admin-extension.md
├── 005-storefront-nextjs.md
└── ...
```

Record a new ADR whenever a significant architectural decision is made. Include what was considered and why the chosen option was selected — this prevents re-litigating settled decisions.
