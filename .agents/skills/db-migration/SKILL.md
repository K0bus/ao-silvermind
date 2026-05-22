---
name: db-migration
description: "Modifier le schéma de base de données, créer une migration Prisma ou mettre à jour un modèle dans schema.prisma du projet Albion SilverMind"
---

# Skill: Gestion du Schéma et des Migrations de Base de Données

Ce Skill fournit des instructions spécifiques sur la manière de modifier le schéma de base de données PostgreSQL à l'aide de Prisma ORM dans le cadre du monorepo **Albion SilverMind**.

## Contexte & Emplacements
- **Fichier de Schéma** : `packages/database/prisma/schema.prisma`
- **Configuration Prisma 7** : `packages/database/prisma.config.mjs` (Lien et adaptateurs de pilotes)
- **Commandes** : À exécuter depuis la racine ou filtrées via `pnpm --filter @albion-tool/database`

---

## Instructions de Réalisation d'une Modification de Schéma

Suivez rigoureusement ces étapes dès qu'un changement de schéma est requis :

### Étape 1 : Modification du Fichier de Schéma
1. Ouvrez `packages/database/prisma/schema.prisma`.
2. Ajoutez ou modifiez les modèles ou enums requis en respectant la casse en PascalCase pour les modèles et UPPERCASE pour les enums.
3. Si un modèle intègre des index fréquents (comme des clés étrangères), n'oubliez pas d'ajouter des directives `@@index` pour optimiser les performances des requêtes SQL de l'application.

> [!WARNING]
> La `DATABASE_URL` ne doit PAS être configurée en dur dans le datasource. Elle est gérée de manière dynamique dans `prisma.config.mjs` / `prisma.config.ts`. Ne touchez pas à la configuration du datasource.

### Étape 2 : Création de la Migration
Exécutez la commande de création de la migration de développement dans la console. Vous devez attribuer un nom descriptif en convention snake_case ou kebab-case.
Commandes à exécuter :
```bash
# Pour créer et appliquer la migration localement :
pnpm --filter @albion-tool/database exec prisma migrate dev --name <nom_de_la_migration>
```
*Alternative si exécuté directement dans le sous-dossier `packages/database` :*
```bash
npx prisma migrate dev --name <nom_de_la_migration>
```

### Étape 3 : Régénération du Client Prisma
La modification du schéma nécessite la mise à jour des définitions de types TypeScript générées du client Prisma.
Exécutez :
```bash
pnpm db:generate
```

### Étape 4 : Validation et Ensemencement (Optionnel)
Si le schéma introduit de nouveaux champs obligatoires ou de nouveaux enums, assurez-vous de mettre à jour le script de seed s'il existe et de le tester :
```bash
pnpm db:seed
```

---

## Liste de Contrôle post-migration pour le LLM
- [ ] La migration SQL a été générée dans `packages/database/prisma/migrations/`.
- [ ] Le client Prisma a été régénéré avec `pnpm db:generate`.
- [ ] Le code TypeScript dépendant (services, types, serveurs Nitro) a été mis à jour pour s'aligner sur le nouveau modèle de données.
- [ ] Les types de `packages/types` ont été synchronisés si ces données transitent par l'API.
- [ ] `pnpm typecheck` se termine sans erreur.
