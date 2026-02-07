/**
 * Template: Design System Compliance Skill
 *
 * Generates SKILL.md for Claude / Agents / Cursor skills.
 * References the generated rules and provides a quick summary.
 *
 * Fully agnostic — adapts to any CSS methodology and framework.
 */

import type { DsCoverageConfig } from "../config.js";

export function generateSkill(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;
  const primaryDir = config.componentAnalysis.primaryDirectory;
  const hasComponentAnalysis = config.componentAnalysis.enabled;

  const enabledViolations = Object.entries(config.violations).filter(([, v]) => v.enabled);

  const violationSummary = enabledViolations
    .map(([, v]) => `${v.icon} ${v.label}`)
    .join(", ");

  const forbiddenSizesList = api.forbiddenSizes.length > 0
    ? api.forbiddenSizes.map((s) => `\`${s}\``).join(", ")
    : "";

  const componentSection = hasComponentAnalysis
    ? buildComponentSection(config)
    : "";

  return `---
name: design-system-compliance
description: Protocole de conformité design system. Couvre l'enforcement des tokens, les standards de création de composants, la Boy Scout Rule, et les conventions de flagging. Référencer lors de la construction ou modification de toute UI frontend.
---

# Design System Compliance

> **Auto-généré par ds-coverage.** Relancez \`npx ds-coverage init\` pour mettre à jour.

**Charger les règles :**
- \`.cursor/rules/design-system-compliance.mdc\` — Protocole complet de conformité
${hasComponentAnalysis ? "- `.cursor/rules/ui-component-creation.mdc` — Standards de création de composants" : ""}

---

## Résumé du protocole

### CRITIQUE — Nouveau code = design system uniquement
**Chaque nouvelle ligne de code UI DOIT utiliser les tokens et composants du design system. Tolérance zéro pour les nouvelles valeurs hardcodées.**

### Violations détectées
Le scanner vérifie : ${violationSummary || "Aucune catégorie configurée — éditez ds-coverage.config.js"}
${componentSection}
### Boy Scout Rule
Quand vous éditez un fichier dans \`${config.scanDir}/\` :
1. **Appliquer les migrations simples** sur le code que vous touchez — uniquement quand non-ambigu
2. **Proposer des options** pour les cas ambigus — fournir du contexte visuel quand possible
3. Flagger les migrations complexes avec \`@ds-migrate: complex\`
4. Flagger les composants manquants avec \`@ds-todo\`
5. Ne jamais casser le comportement existant

### Conventions de flagging
\`\`\`
// @ds-migrate: simple | Swap valeur hardcodée → token sémantique
// @ds-migrate: complex | Description. Risques: ... Coût: ... Contrainte: ...
// @ds-todo: Créer <NomComposant> — rationale
\`\`\`

### Scanner
Lancez \`npx ds-coverage\` pour générer un rapport de couverture et un dashboard interactif.
Lancez \`npx ds-coverage --open\` pour ouvrir le dashboard dans le navigateur.
`;
}

// ============================================
// SECTION BUILDERS
// ============================================

function buildComponentSection(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;
  const primaryDir = config.componentAnalysis.primaryDirectory;

  const propsLine = api.expectedProps.length > 0
    ? `- Props de variant : ${api.expectedProps.map((p) => `**\`${p}\`**`).join(", ")}`
    : "";

  const sizesLine = api.expectedSizes.length > 0
    ? `- **\`size\`** : ${api.expectedSizes.map((s) => `\`${s}\``).join(", ")}`
    : "";

  const forbiddenSizesLine = api.forbiddenSizes.length > 0
    ? `- Valeurs de taille legacy interdites : ${api.forbiddenSizes.map((s) => `\`${s}\``).join(", ")} — utiliser les mots complets`
    : "";

  const forbiddenPropsLine = api.forbiddenProps.length > 0
    ? `- Noms de props legacy interdits : ${api.forbiddenProps.map((p) => `\`${p}\``).join(", ")}`
    : "";

  return `
### Hiérarchie de décision composant
1. **Utiliser un composant UI existant** (\`${primaryDir}\`) — toujours vérifier d'abord
2. **Créer un nouveau composant UI** dans \`${primaryDir}\` — tokens sémantiques, nom simple
3. **Inline avec tokens** — dernier recours, flagger si le pattern pourrait se répéter

### Conventions d'API composant
${propsLine}
${sizesLine}
- Toujours accepter **\`className\`** pour la composition
${api.requireCVA ? "- Utiliser **CVA** pour la gestion des variants\n" : ""}${api.requireRadix ? "- Supporter **`asChild`** via Radix Slot\n" : ""}- Utiliser **\`compoundVariants\`** pour les combinaisons complexes
${forbiddenPropsLine}
${forbiddenSizesLine}
- Zéro couleur hardcodée — tokens sémantiques uniquement
`;
}
