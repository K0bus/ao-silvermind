ARG NODE_VERSION=22

# ── Base ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN apk add --no-cache ttf-dejavu fontconfig && npm install -g pnpm@9
WORKDIR /app

# ── Dependencies ──────────────────────────────────────────────
FROM base AS deps
COPY pnpm-workspace.yaml package.json pnpm-lock.yaml ./
COPY packages/database/package.json packages/database/
COPY packages/types/package.json packages/types/
COPY packages/ao-parser/package.json packages/ao-parser/
COPY packages/queue/package.json packages/queue/
COPY packages/market-engine/package.json packages/market-engine/
COPY apps/web/package.json apps/web/
COPY scripts/package.json scripts/
RUN pnpm install --frozen-lockfile

# ── Development ───────────────────────────────────────────────
FROM deps AS development
COPY . .
RUN chmod +x docker/worker/dev-entrypoint.sh
CMD ["sh", "/app/docker/worker/dev-entrypoint.sh"]

# ── Production ────────────────────────────────────────────────
FROM deps AS production
COPY . .
RUN pnpm --filter @albion-tool/database db:generate

# Utilise la commande de production sans --env-file
CMD ["pnpm", "--filter", "@albion-tool/scripts", "worker:prod"]
