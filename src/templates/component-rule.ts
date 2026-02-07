/**
 * Template: UI Component Creation Standards
 *
 * Generates a markdown rule for how to create new UI components
 * following design system patterns.
 *
 * Fully agnostic — adapts to the configured component architecture.
 */

import type { DsCoverageConfig } from "../config.js";

export function generateComponentRule(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;
  const primaryDir = config.componentAnalysis.primaryDirectory;
  const legacyDirs = config.componentAnalysis.legacyDirectories;

  const sizeList = api.expectedSizes
    .map((size) => `  - \`${size}\``)
    .join("\n");

  const forbiddenSizeNote = api.forbiddenSizes.length > 0
    ? `\n\n**Interdites** (abréviations legacy) : ${api.forbiddenSizes.map((s) => `\`${s}\``).join(", ")}`
    : "";

  // Build architecture section based on config
  const architectureSection = buildArchitectureSection(config);

  return `---
description: UI component creation standards — applies when creating or modifying components
globs: ${primaryDir}**/*
---

# Standards de création de composants UI

## S'applique à
Fichiers dans \`${primaryDir}\`.

## Règle

Chaque composant UI DOIT suivre l'architecture du design system. Les composants UI sont les **briques atomiques** — ils doivent être génériques, réutilisables, et conformes au design system.

> **Cette règle est auto-générée par ds-coverage.** Mettez à jour votre \`ds-coverage.config\` et relancez \`npx ds-coverage init --force\` pour régénérer.

---

## Emplacement des composants

**Tous les composants réutilisables vivent dans un seul dossier :**

\`\`\`
${primaryDir}    ← TOUS les composants du design system
\`\`\`
${legacyDirs.length > 0 ? `\n> **Note :** Des composants legacy peuvent exister dans ${legacyDirs.map((d) => `\`${d}\``).join(", ")}. Quand vous les éditez, flagger pour migration vers \`${primaryDir}\` avec \`@ds-migrate: complex\` si approprié. Les nouveaux composants DOIVENT toujours aller dans \`${primaryDir}\`.\n` : ""}
---

## Créer un nouveau composant UI

### 1. Nommage
- **Simple et concis** : \`Badge\`, \`Card\`, \`Toggle\` — pas \`StatusIndicatorBadge\`
- **Un mot si possible**, deux mots max
- **Pas de nommage parent-enfant** : Chaque composant est autonome
- **Nom du fichier** = nom du composant : \`badge.tsx\` → \`Badge\`

${architectureSection}

### 3. Conformité aux design tokens

- **TOUTES les couleurs** : Doivent utiliser des tokens sémantiques — zéro valeur hardcodée
- **TOUS les radius** : Doivent utiliser des valeurs de tokens
- **TOUS les styles de texte** : Doivent utiliser le système typographique du DS
- **AUCUNE** couleur hardcodée, valeur hex, ou classe utilitaire brute pour les propriétés visuelles

### 4. Design d'API — noms de props

Utiliser ces **noms de props standardisés** dans tous les composants :
${api.expectedProps.map((p) => `- **\`${p}\`**`).join("\n")}
- **\`className\`** — toujours acceptée pour la composition (si applicable au framework)
- **\`disabled\`** — pour les composants interactifs

**Valeurs de \`size\`** :
${sizeList}${forbiddenSizeNote}

${api.forbiddenProps.length > 0 ? `**Noms de props interdits** (legacy — doivent être migrés) :\n${api.forbiddenProps.map((p) => `- \`${p}\``).join("\n")}` : ""}

### 5. Accessibilité

- Utiliser \`focus-visible\` (pas \`focus\`) pour les rings de focus clavier-only
- Inclure les attributs ARIA appropriés
- États disabled : visuels et fonctionnels

### 6. Checklist avant merge d'un nouveau composant UI

- [ ] Toutes les propriétés visuelles utilisent des tokens sémantiques (zéro valeur hardcodée)
- [ ] A une prop \`className\` pour la composition (si applicable)
- [ ] Nommage simple et concis (1-2 mots)
- [ ] API consistante avec les composants existants (${api.expectedProps.join(", ")})
- [ ] États focus-visible définis
- [ ] États disabled définis (si interactif)
${api.requireCVA ? "- [ ] Utilise CVA pour les variants\n" : ""}${api.requireRadix ? "- [ ] Supporte `asChild` via Radix Slot\n" : ""}`;
}

// ============================================
// ARCHITECTURE SECTION BUILDER
// ============================================

function buildArchitectureSection(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;

  if (api.requireCVA) {
    return buildCVAArchitecture(config);
  }

  // Generic architecture (no specific library)
  return `### 2. Architecture

Chaque composant UI doit suivre une structure consistante :

- **Variants via props** : Définir les variations visuelles (${api.expectedProps.map((p) => `\`${p}\``).join(", ")}) comme des props typées
- **Tokens sémantiques uniquement** : Pas de valeurs hardcodées dans les styles
- **Valeurs par défaut** : Définies dans la signature de la fonction/du composant
- **Composition** : Accepter \`className\` (ou équivalent) pour permettre la personnalisation
- **Typage strict** : Toutes les props de variant sont typées avec des unions/enums

\`\`\`
// Exemple de structure générique
// Adapter selon votre framework et méthodologie CSS

interface ComponentProps {
${api.expectedProps.map((p) => `  ${p}?: string;`).join("\n")}
  className?: string;
  children?: any;
}

// Mapper les combinaisons de variants vers les styles
// via des tokens sémantiques (classes CSS, CSS variables, etc.)
\`\`\``;
}

function buildCVAArchitecture(config: DsCoverageConfig): string {
  const api = config.componentAnalysis.api;

  const sizeVariants = api.expectedSizes
    .map((s) => `        ${s}: "",`)
    .join("\n");

  return `### 2. Architecture (CVA${api.requireRadix ? " + Radix" : ""})

\`\`\`tsx
import { cva, type VariantProps } from "class-variance-authority";${api.requireRadix ? '\nimport { Slot } from "radix-ui";' : ""}

const componentVariants = cva(
  // Classes de base — tokens sémantiques uniquement
  "base-styles-here",
  {
    variants: {${api.expectedProps.filter((p) => p !== "size").map((p) => `
      ${p}: {
        // Définir les valeurs pour ${p}
      },`).join("")}${api.expectedProps.includes("size") ? `
      size: {
${sizeVariants}
      },` : ""}
    },${api.expectedProps.filter((p) => !["size"].includes(p)).length >= 2 ? `
    compoundVariants: [
      // Combiner les variants pour des styles précis
    ],` : ""}
  },
);

function MyComponent({
  className,${api.expectedProps.map((p) => `\n  ${p},`).join("")}${api.requireRadix ? "\n  asChild = false," : ""}
  ...props
}: ComponentProps & VariantProps<typeof componentVariants>) {${api.requireRadix ? '\n  const Comp = asChild ? Slot : "div";' : ""}
  return (
    <${api.requireRadix ? "Comp" : "div"}
      className={cn(componentVariants({ ${api.expectedProps.join(", ")} }), className)}
      {...props}
    />
  );
}
\`\`\`

### Points clés :
1. **\`compoundVariants\`** pour les combinaisons de variants complexes
2. **Valeurs par défaut dans la signature** de la fonction, pas dans CVA
3. **Toujours accepter \`className\`** pour la composition
${api.requireRadix ? "4. **Supporter `asChild`** via Radix Slot\n" : ""}`;
}
