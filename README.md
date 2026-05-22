<div align="center">

![Albion SilverMind Banner](file:///home/k0bus/.gemini/antigravity/brain/60aef483-8fe9-4ec7-8081-57b7f005b8f2/albion_tool_banner_1778864662337.png)

# Albion SilverMind
### Advanced Data Platform for Albion Online Economy

[![Node.js](https://img.shields.io/badge/Node.js-22+-68a063?style=for-the-badge&logo=node.js&logoColor=white)](https://nodejs.org/)
[![pnpm](https://img.shields.io/badge/pnpm-9+-f69220?style=for-the-badge&logo=pnpm&logoColor=white)](https://pnpm.io/)
[![Nuxt 3](https://img.shields.io/badge/Nuxt_3-00DC82?style=for-the-badge&logo=nuxt.js&logoColor=white)](https://nuxt.com/)
[![Prisma](https://img.shields.io/badge/Prisma_7-2D3748?style=for-the-badge&logo=prisma&logoColor=white)](https://prisma.io/)
[![License](https://img.shields.io/badge/License-Private-red?style=for-the-badge)](LICENSE)

---

**Albion SilverMind** is a professional-grade data platform dedicated to the Albion Online economy. Designed for serious players, crafters, and market analysts, it provides deep insights into item profitability, crafting chains, and live market fluctuations.

[Explore Architecture](file:///home/k0bus/projects/albion-tool/docs/architecture.md) • [Setup Guide](file:///home/k0bus/projects/albion-tool/docs/setup.md) • [Development](file:///home/k0bus/projects/albion-tool/docs/development.md)

</div>

---

## ✨ Key Features

### 🔍 Smart Intelligence
- **Deep Item Analytics**: Real-time stats, tier/enchantment tracking, and progression paths.
- **Dynamic Search**: Advanced filtering by category, tier, city, and weapon family.
- **Crafting Tree Engine**: Recursive dependency tracking with multi-step recipe visualization.

### 💹 Market Mastery
- **Live Price Sync**: Real-time integration with Albion Online Data Project.
- **Profitability Simulation**: Advanced calculators for crafting, refining, and city arbitrage.
- **Historical Tracking**: Comprehensive price history and trend analysis.

### 🛠️ Admin Infrastructure
- **Full Data Management**: Automated sync for items, icons, and market prices.
- **User Moderation**: Granular roles and permissions with full audit logging.
- **Job Monitoring**: Background task tracking via BullMQ and Redis.

---

## 🚀 Tech Stack

| Layer | Technologies |
| :--- | :--- |
| **Frontend** | Nuxt 3, Vue 3, Tailwind CSS, Pinia |
| **Backend** | Nitro (Nuxt Server), BullMQ, TypeScript |
| **Database** | PostgreSQL, Prisma ORM v7 |
| **Infrastructure** | Redis, Docker, Nginx, PGBouncer |

---

## 🛠️ Quick Start

### 1. Prerequisites
Ensure you have **Node.js 22**, **pnpm 9**, and **Docker** installed.

### 2. Installation
```bash
# Install dependencies
pnpm install

# Start core services (PostgreSQL & Redis)
docker-compose up -d postgres redis

# Setup database
pnpm db:migrate
pnpm db:generate
```

### 3. Run Development
```bash
pnpm dev
```
Visit `http://localhost:3000` to access the dashboard.

---

## 🗺️ Roadmap

- [x] **Phase 1: Core Engine** - Database normalization, Item parser, Crafting foundations.
- [x] **Phase 2: Pricing Engine** - Live market sync, Profitability logic, Dashboards.
- [ ] **Phase 3: Economy Intelligence** - Transport optimization, Black market tools, Flip analysis.
- [ ] **Phase 4: SaaS Expansion** - Premium access, Public API, Guild ecosystem tools.

---

## 👥 Authors & License

- **Status**: Internal Private Development
- **Purpose**: Built for high-scale Albion Online economy optimization.

---
<div align="center">
Built with ❤️ for the Albion Community.
</div>
