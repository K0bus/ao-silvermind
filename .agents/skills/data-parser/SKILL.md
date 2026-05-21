---
name: data-parser
description: "Modifier, tester ou normaliser la logique d'analyse de données brutes d'Albion Online dans ao-parser ou market-engine"
---

# Skill: Analyse de Données, Normalisation et Tests (ao-parser)

Ce Skill guide l'agent dans la modification des algorithmes d'analyse (parsing) et de normalisation des données de jeu d'Albion Online, ainsi que sur l'écriture et l'exécution des tests associés.

## Contexte & Emplacements
- **Parseur de données d'Albion** : `packages/ao-parser/`
- **Moteur de prix du marché** : `packages/market-engine/`
- **Tests Unitaires / Vitest** : Définis dans `packages/**/__tests__/**/*.test.ts` et `scripts/**/__tests__/**/*.test.ts`
- **Fixtures de Test** : `packages/ao-parser/src/__tests__/fixtures.ts` (ou fichiers similaires proches du package testé)
- **Couverture de Code Cible** : Concentrée sur `packages/ao-parser/src/**`

---

## Instructions de Test et de Modification des Parsers

Lorsque vous devez intervenir sur la logique d'importation, de parsing, ou de calcul de prix :

### Étape 1 : Localisation et Compréhension de la Logique
1. Examinez les structures de données brutes fournies par l'API officielle ou le projet communautaire Albion Online Data Project.
2. Identifiez le normaliseur ciblé dans `packages/ao-parser/src/` ou le service de calcul dans `packages/market-engine/src/`.
3. Consultez les fixtures de test existantes dans `packages/ao-parser/src/__tests__/fixtures.ts` pour comprendre les formats d'entrée et de sortie attendus.

### Étape 2 : Écriture et Mise à Jour des Fixtures et Tests
1. Si vous ajoutez une nouvelle règle de parsing ou gérez un nouveau type d'item, mettez à jour les fixtures de test correspondantes avec des échantillons réalistes.
2. Rédigez des tests unitaires ciblés couvrant :
   - Les cas nominaux de parsing.
   - Les cas d'erreurs (données tronquées, valeurs manquantes, formats inattendus).
   - Les branches conditionnelles complexes (ex. items enchantés, calculs de marges).

### Étape 3 : Exécution de la Suite de Tests Vitest
1. Lancez les tests du package concerné ou de l'ensemble du projet :
   ```bash
   pnpm test
   ```
2. Pour observer les modifications en temps réel pendant le développement :
   ```bash
   pnpm --filter @albion-tool/ao-parser exec vitest
   ```

### Étape 4 : Analyse de la Couverture de Code
1. Assurez-vous que les modifications n'entrainent pas une diminution de la couverture de tests dans `packages/ao-parser/src/**`.
2. Exécutez le rapport de couverture avec V8 :
   ```bash
   pnpm test:coverage
   ```
3. Identifiez les lignes non couvertes et complétez les tests unitaires jusqu'à obtenir un niveau de couverture conforme aux standards du projet.

---

## Directives de Codage pour ao-parser & market-engine
- **Fonctions Pures** : Autant que possible, écrivez la logique de normalisation sous forme de fonctions pures (sans effets de bord), facilitant l'écriture de tests unitaires fiables.
- **Robustesse** : Le parser doit être tolérant aux pannes. Si un item contient une donnée corrompue, loggez l'anomalie de manière structurée sans faire planter l'intégralité du pipeline d'importation de données.
