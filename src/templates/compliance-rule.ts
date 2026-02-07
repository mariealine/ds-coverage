/**
 * Template: Design System Compliance Rule
 *
 * Generates a markdown rule file for AI assistants (Cursor, Claude, Agents)
 * based on the ds-coverage config. This ensures the AI enforces the same
 * rules the scanner detects.
 *
 * Fully agnostic — works with any CSS methodology and framework.
 */

import type { DsCoverageConfig } from "../config.js";

export function generateComplianceRule(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;
  const primaryDir = config.componentAnalysis.primaryDirectory;
  const legacyDirs = config.componentAnalysis.legacyDirectories;
  const hasComponentAnalysis = config.componentAnalysis.enabled;

  // Build violation checklist from config (dynamic — no hardcoded examples)
  const enabledViolations = Object.entries(config.violations).filter(([, v]) => v.enabled);

  const violationChecklist = enabledViolations
    .map(([, v]) => `- **${v.label}** ${v.icon} — Interdit de hardcoder. Utiliser les design tokens sémantiques.`)
    .join("\n");

  // Build prop section only if component analysis is enabled
  const propSection = hasComponentAnalysis
    ? buildPropSection(config)
    : "";

  // Build size section only if sizes are defined
  const sizeSection =
    hasComponentAnalysis && api.expectedSizes.length > 0
      ? buildSizeSection(config)
      : "";

  const forbiddenPropsNote =
    hasComponentAnalysis && api.forbiddenProps.length > 0
      ? `\n\n**Noms de props interdits** (legacy) : ${api.forbiddenProps.map((p) => `\`${p}\``).join(", ")}. Doivent être migrés vers les noms ci-dessus.`
      : "";

  // Build component decision hierarchy only if component analysis is enabled
  const componentHierarchy = hasComponentAnalysis
    ? buildComponentHierarchy(config)
    : "";

  // Build non-compliant section from actual config
  const nonCompliantList = enabledViolations
    .map(([, v]) => `- ${v.icon} **${v.label}** : Valeurs hardcodées détectées par le scanner`)
    .join("\n");

  return `---
description: Design system compliance protocol — applies to all frontend work
globs: ${config.scanDir}/**/*
---

# Protocole de conformité Design System

## S'applique à
Tout le travail frontend dans \`${config.scanDir}/\`.

## Règle

Cette règle définit le **cadre de décision** pour construire l'UI. Elle assure la consistance visuelle via la réutilisation de composants, le flagging systématique, et le refactoring incrémental.

> **Cette règle est auto-générée par ds-coverage.** Elle reste synchronisée avec la config du scanner pour que l'assistant AI applique les mêmes règles que le scanner détecte.

---

## CRITIQUE — Exigences pour le nouveau code

**Chaque ligne de code frontend DOIT être conforme au design system dès le départ.** C'est non-négociable — tolérance zéro pour l'introduction de nouvelle dette design.

Avant d'écrire du code UI, vérifier :
${violationChecklist}
${hasComponentAnalysis ? `- **Composants** → Un composant existe-t-il déjà dans \`${primaryDir}\` ? **L'utiliser.** ${legacyDirs.length > 0 ? `Vérifier aussi les répertoires legacy (${legacyDirs.map((d) => `\`${d}\``).join(", ")}) — mais les nouveaux composants DOIVENT aller dans \`${primaryDir}\`.` : ""}` : ""}

**Si cette règle n'est pas respectée, le code doit être rejeté.**

---
${componentHierarchy}
${propSection}${forbiddenPropsNote}
${sizeSection}

---

## Conventions de flagging

Trois types de flags pour annoter le code :

### \`@ds-migrate: simple\`
Un swap direct. Peut être fait inline par n'importe quel développeur ou assistant AI.

\`\`\`
// @ds-migrate: simple | Remplacer la valeur hardcodée par un token sémantique
\`\`\`

### \`@ds-migrate: complex\`
Une migration qui nécessite un effort dédié. Inclure : quoi migrer, risques, estimation de coût, et contraintes.

\`\`\`
// @ds-migrate: complex | Ce composant custom devrait utiliser le composant DS.
// Risques : La logique de navigation clavier custom pourrait confliter.
// Coût : ~2h de refacto, vérifier tous les usages.
\`\`\`

### \`@ds-todo\`
Un composant ou token manquant qui devrait être ajouté au design system.

\`\`\`
// @ds-todo: Créer <NomComposant> — rationale
\`\`\`

---

## Protocole Boy Scout Rule

Quand vous éditez un fichier dans \`${config.scanDir}/\` :

1. **Scanner le code que vous touchez** (la fonction, le composant, le bloc que vous modifiez)
2. **Appliquer les migrations non-ambiguës immédiatement** : swaps 1:1 de tokens avec un match sémantique clair
3. **Quand plusieurs tokens sémantiques pourraient correspondre**, **proposer les options au développeur** avec du contexte expliquant la signification sémantique de chaque candidat. Fournir du contexte visuel quand possible :
   - **(a) Prendre un screenshot** via les outils navigateur si disponibles
   - **(b) Demander un screenshot au développeur**, en donnant le chemin de navigation
   - **(c) Décrire visuellement** à quoi le composant ressemble en dernier recours
4. **Flagger les migrations complexes** : Ne pas refactorer silencieusement de gros patterns — ajouter \`@ds-migrate: complex\`
5. **Flagger les composants manquants** : Si vous repérez un pattern répété, ajouter \`@ds-todo\`
6. **Ne jamais casser le comportement existant** : Les migrations doivent être visuelles uniquement. Même look, mêmes interactions.

---

## Ce qui est "non-conforme"

N'importe lequel de ces éléments dans du code que vous éditez doit être flaggé ou corrigé :

${nonCompliantList}
${hasComponentAnalysis ? `- Éléments HTML natifs (\`<button>\`, \`<input>\`, \`<select>\`) quand un composant UI existe\n- Patterns UI dupliqués qui devraient être un composant` : ""}
${hasComponentAnalysis && api.forbiddenProps.length > 0 ? api.forbiddenProps.map((p) => `- Nom de prop legacy \`${p}\``).join("\n") : ""}
${hasComponentAnalysis && api.forbiddenSizes.length > 0 ? `- Valeurs de taille legacy : ${api.forbiddenSizes.map((s) => `\`${s}\``).join(", ")}` : ""}

---

## Workflow de refactoring

Pour les sessions de refactoring dédiées :

1. **Trouver les flags** : Chercher \`@ds-migrate\` et \`@ds-todo\` dans la codebase
2. **Lancer le scanner** : \`npx ds-coverage\` — ouvrir le dashboard pour voir les violations
3. **Prioriser** :
   - \`@ds-migrate: simple\` → batch and apply (quick wins)
   - \`@ds-todo\` → créer les composants DS manquants
   - \`@ds-migrate: complex\` → planifier comme tâches dédiées
4. **Vérifier** : Après migration, tester visuellement
5. **Nettoyer** : Supprimer le commentaire de flag après la migration
6. **Re-scanner** : Relancer \`npx ds-coverage\` pour vérifier les améliorations
`;
}

// ============================================
// SECTION BUILDERS
// ============================================

function buildComponentHierarchy(config: DsCoverageConfig): string {
  const primaryDir = config.componentAnalysis.primaryDirectory;
  const legacyDirs = config.componentAnalysis.legacyDirectories;
  const api = config.componentAnalysis.api;

  const architectureNote = api.requireCVA
    ? "- Utiliser CVA pour les variants\n"
    : "";

  return `
## Hiérarchie de décision (suivre dans l'ordre)

### 1. Utiliser un composant UI existant
Vérifier \`${primaryDir}\` en premier. Si un composant existe qui correspond au besoin, **l'utiliser**. Ne pas recréer buttons, badges, inputs, dialogs, selects, etc.
${legacyDirs.length > 0 ? `\n> **Note :** Certains composants vivent encore dans des répertoires legacy (${legacyDirs.map((d) => `\`${d}\``).join(", ")}). Vérifier là aussi, mais les nouveaux composants vont toujours dans \`${primaryDir}\`.` : ""}

### 2. Créer un nouveau composant UI
Si aucun composant existant ne convient, en créer un dans \`${primaryDir}\`. Le composant DOIT :
${architectureNote}- Utiliser exclusivement des design tokens sémantiques
- Avoir un nom simple et concis (1-2 mots)
- Suivre les conventions de props ci-dessous

### 3. Dernier recours : code inline avec tokens
Si vous avez besoin d'un layout one-off qui ne justifie pas un composant, vous pouvez écrire du code inline — mais vous DEVEZ utiliser des tokens sémantiques. Flagger si le pattern pourrait être réutilisable :

\`\`\`
// @ds-todo: Envisager la création d'un composant si ce pattern se répète
\`\`\`
`;
}

function buildPropSection(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;

  if (api.expectedProps.length === 0) return "";

  return `
---

## Conventions de nommage des props

Tous les composants du design system utilisent ces **noms de props standardisés** :

### Props de variant attendues : ${api.expectedProps.map((p) => `\`${p}\``).join(", ")}
`;
}

function buildSizeSection(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;

  const sizeTable = api.expectedSizes
    .map((size) => `| \`${size}\` |`)
    .join("\n");

  const forbiddenSizesList = api.forbiddenSizes.length > 0
    ? api.forbiddenSizes.map((s) => `\`${s}\``).join(", ")
    : "";

  return `
### Prop \`size\` — valeurs attendues
| Valeurs acceptées |
|-------------------|
${sizeTable}
${forbiddenSizesList ? `\n**Interdites** (abréviations legacy) : ${forbiddenSizesList}` : ""}
`;
}
