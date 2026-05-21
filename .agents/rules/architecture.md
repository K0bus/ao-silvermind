# Règles d'Architecture et Guide de Style - Albion Tool

Ce document régit les garde-fous passifs et contraintes d'architecture pour le projet **Albion Tool**. Tout agent intervenant sur ce projet doit s'y conformer rigoureusement.

---

## 1. Structure du Monorepo & Dépendances

Le projet est un monorepo géré avec **pnpm** (version `>=9.0.0`) et **Turborepo** (`turbo.json`).
- **Aucun import croisé profond (Cross-Package Deep Imports)** : N'importez jamais directement des fichiers d'un autre package via des chemins relatifs du type `../../database/src/index.ts`.
- **Imports par nom de package** : Référencez toujours les packages via leurs alias de workspace (ex. `@albion-tool/database`, `@albion-tool/types`, `@albion-tool/queue`, `@albion-tool/market-engine`, `@albion-tool/ao-parser`).
- **Frontières des modules** :
  - `apps/web` : Application full-stack Nuxt 3 (Vue 3, Nitro server, Tailwind CSS).
  - `packages/database` : Modèles Prisma, migrations, et client généré.
  - `packages/queue` : Définition des files d'attente BullMQ et des types de jobs.
  - `packages/types` : Contrats TypeScript partagés entre les services, le parseur et le frontend.
  - `packages/ao-parser` : Logique de parsing et de normalisation des données brutes d'Albion Online.
  - `packages/market-engine` : Moteur de synchronisation et de résolution des prix de marché.
  - `scripts/` : Scripts utilitaires opérationnels (imports manuels, backfill, etc.).

---

## 2. Style de Code & Conventions TypeScript

- **Formatage** :
  - Indentation : **2 espaces** systématiques.
  - Guillemets : **Simples** (`'`) pour les chaînes de caractères TypeScript/JS, doubles uniquement si nécessaire ou en HTML/Vue templates.
  - Pas de points-virgules (**no-semicolon**).
- **Typage Strict** :
  - **Interdiction absolue du type `any`** : Tous les paramètres, retours de fonctions, et variables doivent être explicitement typés. Si un type est dynamique, utilisez `unknown` ou une union type propre.
  - **Typage aux frontières** : Toutes les APIs Nitro (`server/api/v1/`), les helpers partagés, et les exports de packages doivent comporter des signatures de types explicites.
- **Conventions de Nommage** :
  - Fichiers Vue : **PascalCase** (ex. `ItemCard.vue`, `ProfitTable.vue`).
  - Composables Nuxt : Préfixe `use` en camelCase (ex. `useAuth.ts`, `useTopProfit.ts`).
  - Fichiers de routage Nitro : Formats standards Nuxt (ex. `index.get.ts`, `[id].get.ts`, `sync.post.ts`).

---

## 3. Base de Données & Migrations (Prisma)

- **Interdiction de modification SQL directe** : Ne modifiez jamais la base de données PostgreSQL directement via des clients tiers ou des requêtes SQL manuelles.
- **Flux de Migration Prisma** :
  1. Toute modification du schéma doit être effectuée uniquement dans `packages/database/prisma/schema.prisma`.
  2. Générez toujours la migration en exécutant `npx prisma migrate dev --name <migration_name>` à l'intérieur du package `packages/database`.
  3. **Note importante pour Prisma 7** : La constante `DATABASE_URL` est configurée dynamiquement dans `prisma.config.ts` (ou `prisma.config.mjs`) et injectée via un adaptateur de pilote au `PrismaClient` — ne tentez pas de la configurer directement en dur dans le bloc `datasource`.
  4. Lancez systématiquement `pnpm db:generate` pour mettre à jour les types générés du client Prisma après chaque migration.

---

## 4. Sécurité et Bonnes Pratiques

- **Pas de Secrets en Dur** : Ne committez aucun token d'API, mot de passe de base de données ou clé secrète. Configurez-les systématiquement via le fichier `.env` ou `.env.example`.
- **Contrôle d'Accès d'Administration** : Toutes les routes Nitro d'administration et les APIs sous `server/api/v1/admin/` doivent obligatoirement être sécurisées avec le middleware de garde `requireAdmin(event)` importé de `~/server/utils/guards.ts`.
- **Gestion des Erreurs** :
  - Côté serveur : Encapsulez les appels réseau et Prisma dans des blocs `try/catch` robustes. Retournez des erreurs structurées via `createError` de Nitro.
  - Côté client : Gérez gracieusement les états de chargement (`loading`) et les états d'erreur pour éviter les écrans blancs.

---

## 5. Mauvaises Pratiques Interdites (Anti-Patterns)

- **NE JAMAIS** faire d'imports profonds depuis les répertoires internes de packages tiers.
- **NE JAMAIS** omettre le typage de retour sur une API Nitro.
- **NE JAMAIS** committer des fichiers `.env` ou des données de session actives.
- **NE JAMAIS** utiliser de styles Tailwind ad-hoc sur les pages User Side en contournant le système de design global (géré via le Skill `frontend-ui`).
