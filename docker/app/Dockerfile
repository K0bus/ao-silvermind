ARG NODE_VERSION=22

# ── Base ──────────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS base
RUN npm install -g pnpm@9
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
RUN chmod +x docker/app/dev-entrypoint.sh
EXPOSE 3000
CMD ["sh", "/app/docker/app/dev-entrypoint.sh"]

# ── Builder ───────────────────────────────────────────────────
FROM deps AS builder
ARG APP_VERSION
ARG APP_BUILD
ENV NUXT_PUBLIC_APP_VERSION=${APP_VERSION}
ENV NUXT_PUBLIC_APP_BUILD=${APP_BUILD}
COPY . .
RUN pnpm --filter @albion-tool/database db:generate
RUN pnpm --filter web build

# ── Production ────────────────────────────────────────────────
FROM node:${NODE_VERSION}-alpine AS production
WORKDIR /app

# Copier les fichiers du build
COPY --from=builder /app/apps/web/.output ./
COPY --from=builder /app/packages/database/prisma ./prisma
COPY --from=builder /app/packages/database/prisma.config.mjs ./
COPY --from=builder /app/packages/database/package.json ./package.json
COPY docker/app/entrypoint.sh ./


# Installer Prisma et générer le client dans la couche de production
# On installe aussi @prisma/client pour être sûr qu'il est disponible
RUN npm install prisma@7 @prisma/client@7
RUN npx prisma generate --config=./prisma.config.mjs --schema=./prisma/schema.prisma

RUN chmod +x entrypoint.sh

ENV NODE_ENV=production
EXPOSE 3000

CMD ["./entrypoint.sh"]
