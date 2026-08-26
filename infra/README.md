# infra

Infrastructure configuration for the Oracle Cloud Ampere A1 VM.

## What lives here

- `docker-compose.prod.yml` — production-tuned compose overrides (resource limits, restart policies)
- `caddy/Caddyfile` — reverse proxy config (TLS termination, routing to Medusa on port 9000)
- `oracle-vm/` — provisioning notes and cloud-init snippets for the Ampere A1 VM
- `postgres/` — PostgreSQL init scripts, `pg_hba.conf` notes

## VM specifications

| Property | Value |
|---|---|
| Provider | Oracle Cloud Always Free |
| Shape | VM.Standard.A1.Flex |
| OCPU | 2 |
| RAM | 12 GB |
| Arch | ARM64 (aarch64) |
| OS | Ubuntu 22.04 LTS (recommended) |

All Docker images referenced in `docker-compose.yml` must have ARM64 variants. Verify before adding new services.

## Reverse proxy

Caddy handles:
- Automatic TLS (Let's Encrypt) for the domain
- Routing `/` → storefront (Cloudflare Pages — external)
- Routing `/api/*` and `/admin/*` → Medusa backend (port 9000, internal)

## Network topology

All services communicate on a private Docker bridge network. Only Caddy exposes ports 80/443 to the host. PostgreSQL and Redis are not exposed externally.
