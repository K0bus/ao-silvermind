---
name: type-sync
description: "Valider la conformité des types TypeScript dans le monorepo ou synchroniser les contrats de types partagés dans packages/types"
---

# Skill: Synchronisation & Validation TypeScript dans le Monorepo

Ce Skill guide l'agent sur la marche à suivre pour s'assurer de l'exactitude de la chaîne de types TypeScript à travers tout le projet **Albion SilverMind**.

## Contexte & Emplacements
- **Contrats partagés** : `packages/types/`
- **Application Frontend/BFF** : `apps/web/`
- **Génération Prisma** : `packages/database/src/` (les types de base générés depuis Prisma)
- **Commandes** : `pnpm typecheck` (équivalent de `turbo run typecheck`)

---

## Instructions d'Harmonisation et de Vérification des Types

Lorsque vous ajoutez de nouvelles structures de données (ex. un nouvel attribut d'item, un nouveau format de message de queue, ou une nouvelle réponse API Nitro) :

### Étape 1 : Mettre à Jour le Package Communs `@albion-tool/types`
1. Naviguez dans `packages/types/` et examinez les définitions existantes (fichiers `.ts`).
2. Déclarez les interfaces de transfert de données (DTOs), les payloads d'API et les structures globales de manière explicite.
3. Exportez toutes les nouvelles interfaces depuis l'index principal du package `packages/types/src/index.ts` afin qu'elles soient disponibles pour le reste du monorepo.

### Étape 2 : Harmonisation avec Prisma et le Backend
1. Si vos types correspondent à des modèles de base de données, assurez-vous qu'ils s'appuient ou étendent les types issus de `@prisma/client` (ex. `import type { Item } from '@prisma/client'`).
2. Vérifiez que la logique des contrôleurs Nitro sous `apps/web/server/api/v1/` utilise ces types pour typer ses arguments et retours :
   ```typescript
   // Exemple dans server/api/v1/items/[id].get.ts
   import type { ItemDetailResponse } from '@albion-tool/types'

   export default defineEventHandler(async (event): Promise<ItemDetailResponse> => {
     // ... implémentation
   })
   ```

### Étape 3 : Consommation dans le Frontend Vue/Nuxt
1. Dans `apps/web/pages/` ou `apps/web/components/`, importez les types requis depuis `@albion-tool/types` :
   ```typescript
   import type { ItemDetailResponse } from '@albion-tool/types'
   ```
2. Côté client, assurez-vous que les composables d'appels réseau comme `useFetch` ou `useAsyncData` sont correctement paramétrés avec le type de retour attendu.

### Étape 4 : Exécution du Diagnostic Global
Une fois les modifications terminées, vous **devez** exécuter une passe de vérification de type globale pour valider qu'aucune régression ou incohérence de type n'a été introduite dans le monorepo :
```bash
pnpm typecheck
```

---

## Directives de Conception TypeScript
- **Pas de typage lâche** : Évitez `any`. Si le type dépend d'une entrée externe non vérifiée (comme un payload d'API tierce ou de la télémétrie), utilisez `unknown` et passez par une fonction de validation de type (type guards ou schéma de validation comme Zod/Yup).
- **Extensibilité** : Privilégiez les interfaces extensibles (`interface A extends B`) plutôt que les intersections de types complexes (`type A = B & C`) afin de conserver des messages d'erreur TS clairs et lisibles.
- **Imports propres** : Utilisez toujours `import type { ... }` pour les types et interfaces afin d'éviter la génération de JS inutile lors du build.
