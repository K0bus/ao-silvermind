# Docker Development Environment Guide

Welcome to the Albion SilverMind Docker development guide! This document explains how to spin up a fully self-contained local development environment using Docker Compose.

The development environment includes:
- **Nuxt Web Application** (`app`): A fast development server running with automatic Prisma client generation, database migration application, and seeding on startup.
- **Background Worker** (`worker`): A BullMQ worker running with `tsx watch` for hot-reloading code changes.
- **PostgreSQL Database** (`postgres`): Prefconfigured with raw extensions required for game data searches (`uuid-ossp`, `pg_trgm`, `unaccent`).
- **Redis Cache/Queue** (`redis`): High performance data broker for BullMQ.
- **MinIO Storage** (`minio`): S3-compatible object storage to hold icons and game assets locally, preconfigured with an automatic bucket creator.
- **Prisma Studio** (`db-studio`): Exposes Prisma UI on port `5555`.

---

## Getting Started

### 1. Copy Environment Variables
Copy the template `.env.example` to `.env`:
```bash
cp .env.example .env
```
Make sure you review the secrets (e.g. `POSTGRES_PASSWORD`, `REDIS_PASSWORD`, `NUXT_SESSION_SECRET`).

### 2. Start the Stack
Start the development containers using the package helper script or direct docker compose command:

**Using npm/pnpm scripts:**
```bash
pnpm docker:dev
```

**Using Docker Compose directly:**
```bash
docker compose up --build
```

### 3. Verify Services
Once started, the services will be running at the following endpoints:
- **Nuxt App**: [http://localhost:3000](http://localhost:3000)
- **Prisma Studio**: [http://localhost:5555](http://localhost:5555)
- **MinIO Console**: [http://localhost:9001](http://localhost:9001) (Credentials: `albion_minio` / `changeme_minio` or as defined in `.env`)
- **MinIO API**: `http://localhost:9000`

---

## How It Works Under The Hood

### Hot-Reloading
- **Web App**: Source files are mounted via Docker volumes. Nuxt handles compilation and client hot-reloads instantly.
- **Worker**: The worker container runs using `tsx watch`, meaning any file changes in the monorepo packages (e.g., `packages/queue`, `packages/market-engine`, `scripts/worker`) will automatically reload the BullMQ background consumer process in real time without restarting the container.

### Startup Automation
On startup, the Nuxt container (`app`) runs a series of orchestration tasks:
1. Generates the Prisma Client.
2. Automatically deploys any new Prisma migrations (`db:migrate:deploy`).
3. Seeds the database with system bootstrap data and an initial admin account (`db:seed`).

This guarantees the database is fully setup and ready with zero developer intervention.

### Object Storage Setup
The `minio-create-bucket` container starts automatically, configures a client alias, creates the `albion-icons` bucket (if it doesn't already exist), and updates its read permissions to `public` so image URLs work out-of-the-box.

---

## Common Dev Commands

- **Stop the containers and keep data volumes**:
  ```bash
  docker compose down
  ```
- **Stop and destroy all data volumes (clean slate)**:
  ```bash
  pnpm docker:dev:down
  ```
- **Check container logs**:
  ```bash
  docker compose logs -f
  ```
- **Run tests inside the app container**:
  ```bash
  docker compose exec app pnpm test
  ```
