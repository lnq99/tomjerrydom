# syntax=docker/dockerfile:1
# Targets linux/arm64 (Oracle Cloud Ampere A1). node:20-alpine is multi-arch
# and will pull the arm64 layer automatically on aarch64 hosts.

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

# Install native build tools needed by some npm packages (e.g. sharp, bcrypt)
RUN apk add --no-cache python3 make g++
RUN npm install -g pnpm

COPY package.json pnpm-lock.yaml ./
RUN pnpm install --frozen-lockfile

COPY . .
RUN pnpm run build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

# dumb-init handles PID 1 responsibilities (signal forwarding, zombie reaping)
RUN apk add --no-cache dumb-init

ENV NODE_ENV=production

# medusa build outputs the server bundle to .medusa/server
COPY --from=builder /app/.medusa/server ./
# node_modules are embedded in the bundle, but some packages need the original
# node_modules for native bindings — copy only production deps
COPY --from=builder /app/node_modules ./node_modules

EXPOSE 9000

ENTRYPOINT ["dumb-init", "--"]
# Runs migrations then starts the server.
# In docker-compose, override this command to separate migrate from start if needed.
CMD ["node", "index.js"]
