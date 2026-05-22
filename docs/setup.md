# Setup & Deployment Guide

This document covers the steps required to get Albion SilverMind running in your local development environment or production server.

## Prerequisites

- **Node.js**: Version 22 or higher.
- **pnpm**: Version 9 or higher.
- **Docker**: For running PostgreSQL and Redis (recommended).

## Environment Variables

Copy the `.env.example` to `.env` and fill in the required values.

```bash
cp .env.example .env
```

| Variable | Description | Default |
| :--- | :--- | :--- |
| `DATABASE_URL` | PostgreSQL connection string | `postgresql://...` |
| `REDIS_URL` | Redis connection string | `redis://...` |
| `NUXT_SESSION_SECRET` | Secure key for session management | Generate one! |
| `APP_URL` | Public URL of the application | `http://localhost:3000` |

### Generating a Session Secret
```bash
node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"
```

---

## Local Development

1. **Install dependencies**:
   ```bash
   pnpm install
   ```

2. **Start Infrastructure**:
   Use Docker to spin up the database and cache.
   ```bash
   docker-compose up -d postgres redis
   ```

3. **Initialize Database**:
   Apply migrations and generate the Prisma client.
   ```bash
   pnpm db:migrate
   pnpm db:generate
   ```

4. **Run Application**:
   ```bash
   pnpm dev
   ```

---

## Production Deployment

The project is designed to be deployed using Docker Compose.

### 1. Build and Pull
```bash
export IMAGE_TAG=latest
docker compose -f docker-compose.prod.yml pull
```

### 2. Run
```bash
docker compose -f docker-compose.prod.yml up -d
```

> [!TIP]
> Ensure your `APP_URL` is correctly set to your domain for proper authentication and link generation.

---

## Data Import

To populate the database with Albion Online game data:

1. **Full Import**: `pnpm import:full`
2. **Market Sync**: `pnpm import:market`
3. **Icon Sync**: `pnpm import:icons`
