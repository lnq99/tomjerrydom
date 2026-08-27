# syntax=docker/dockerfile:1
# Targets linux/arm64 (Oracle Cloud Ampere A1).

# ── Stage 1: build ────────────────────────────────────────────────────────────
FROM node:20-alpine AS builder
WORKDIR /app

RUN apk add --no-cache libc6-compat
RUN npm install -g pnpm

COPY pnpm-workspace.yaml pnpm-lock.yaml package.json ./
RUN pnpm install --frozen-lockfile

COPY . .

ARG NEXT_PUBLIC_MEDUSA_BACKEND_URL
ENV NEXT_PUBLIC_MEDUSA_BACKEND_URL=$NEXT_PUBLIC_MEDUSA_BACKEND_URL

RUN pnpm build

# ── Stage 2: production runtime ───────────────────────────────────────────────
FROM node:20-alpine AS runner
WORKDIR /app

RUN apk add --no-cache dumb-init
RUN npm install -g pnpm

ENV NODE_ENV=production

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3100
ENV PORT=3100
ENV HOSTNAME="0.0.0.0"

ENTRYPOINT ["dumb-init", "--"]
CMD ["node", "server.js"]
