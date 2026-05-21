---
name: frontend-ui
description: "Créer, modifier, styliser ou étendre des composants Vue, pages Nuxt 3 ou styles CSS dans apps/web"
---

# Skill: Développement Frontend & Double Identité Visuelle

Ce Skill guide l'agent lors de la création, de la modification ou de la stylisation de composants et pages Vue dans l'application `apps/web`. Il définit les chartes de design strictes et les méthodes d'intégration du projet pour garantir une cohérence visuelle parfaite.

## Contexte & Emplacements
- **Layouts & Pages** : `apps/web/layouts/` et `apps/web/pages/`
- **Composants** : `apps/web/components/`
- **Design System CSS** : `apps/web/assets/css/design-system.css`
- **Configuration Tailwind** : `apps/web/tailwind.config.ts`

---

## Double Identité Esthétique (User Side vs Admin Panel)

L'application `apps/web` intègre deux chartes et méthodes d'intégration distinctes. Il est crucial de respecter leur intégrité respective.

### A. L'Application Utilisateur (User Side)
- **Emplacement** : Pages utilisateur classiques (ex. `/items`, `/crafting`, `/market`, `/builds`, `/islands`) et layout principal (`layouts/default.vue`).
- **Charte Graphique** :
  - Style inspiré d'Albion Online (ambiance sombre premium avec accents or/ambre).
  - Couleurs clés : Couleur primaire or (`var(--gold)` / `#f59e0b`), surfaces très sombres (`#0a0a0f` / `var(--bg-2)` / `var(--bg-3)`).
  - Polices de caractères : `Cinzel` pour les titres, `Inter` pour le corps du texte, et `JetBrains Mono` pour les nombres et structures de prix.
- **Règles d'Intégration** :
  - **Utilisation exclusive du Design System Global** défini dans `~/assets/css/design-system.css`.
  - N'écrivez pas de styles Tailwind ad-hoc qui brisent la cohérence visuelle.
  - Utilisez les classes utilitaires sémantiques comme `.ds-btn.primary`, `t-gold`, `t-mono`, `t-dim`.
  - Assurez-vous du bon fonctionnement réactif des méga-menus et des en-têtes collants (`.sticky-header`).

### B. Le Panel d'Administration (Admin Panel)
- **Emplacement** : Fichiers sous le répertoire de pages `/admin/` et layout d'administration (`layouts/admin.vue`).
- **Charte Graphique** :
  - Interface de type Dashboard SaaS moderne et technique pour la supervision.
  - Layout structuré avec une barre latérale (Sidebar) fixe à gauche et un bandeau d'en-tête dynamique.
- **Règles d'Intégration** :
  - Approche **Tailwind UI Utility-First**.
  - Tirez parti des échelles de couleurs personnalisées configurées dans `tailwind.config.ts` :
    - Palette de surfaces foncées : `bg-surface-950`, `bg-surface-900`, `border-surface-700`.
    - Accents primaires : `text-primary-500`, `bg-primary-600`.
  - **Composants Réutilisables** : Utilisez exclusivement les classes de composants prédéfinies sous `@layer components` dans `tailwind.css` pour les boutons et entrées utilisateur (ex. `.btn-primary`, `.btn-secondary`, `.btn-danger`, `.input`, `.card`).

---

## Directives pour les Fichiers Vue & Composables

- **Syntaxe Script Setup** : Utilisez obligatoirement `<script setup lang="ts">` pour tous les nouveaux composants et pages.
- **Gestion des Émissions et Propriétés** : Définissez explicitement `defineProps` et `defineEmits` avec des interfaces TypeScript claires.
- **Composables** : Privilégiez les composables réutilisables (ex. `useFetch`, `useAsyncData`) pour récupérer des données à partir de nos APIs Nitro, en typant le retour explicitement.
- **Accessibilité (A11y)** : Ajoutez des attributs `aria-*` appropriés et des rôles d'éléments pour les menus déroulants, modales et onglets d'administration.
