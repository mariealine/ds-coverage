/**
 * DS Coverage — Interactive Setup Wizard
 *
 * Guides the user through project configuration using Node.js readline.
 * Zero dependencies — uses only Node.js built-ins.
 */

import { createInterface } from "node:readline";
import type { DsCoverageConfig } from "./config.js";
import { getPreset, type PresetId, PRESETS_INFO } from "./presets.js";

// ============================================
// TYPES
// ============================================

export interface WizardAnswers {
  cssMethodology: CssMethodology;
  framework: Framework;
  dsStatus: DsStatus;
  scanDir: string;
  extensions: string[];
  componentDir: string;
  tokenCategories: string[];
  componentArchitecture: ComponentArchitecture;
  /** Target DS name for migration (empty = no migration) */
  migrationTargetDS: string;
}

export type CssMethodology =
  | "tailwind"
  | "css-modules"
  | "css-in-js"
  | "vanilla-css"
  | "utility-custom"
  | "none";

export type Framework =
  | "react"
  | "vue"
  | "svelte"
  | "vanilla"
  | "other";

export type DsStatus = "existing" | "from-scratch";

export type ComponentArchitecture =
  | "cva"
  | "styled-components"
  | "css-modules"
  | "vanilla"
  | "other";

// ============================================
// PROMPT HELPERS
// ============================================

function createReadline(): ReturnType<typeof createInterface> {
  return createInterface({
    input: process.stdin,
    output: process.stdout,
  });
}

async function ask(rl: ReturnType<typeof createInterface>, question: string): Promise<string> {
  return new Promise((resolve) => {
    rl.question(question, (answer) => {
      resolve(answer.trim());
    });
  });
}

async function askChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: { key: string; label: string }[],
  defaultIdx = 0,
): Promise<string> {
  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === defaultIdx ? "›" : " ";
    console.log(`    ${marker} [${i + 1}] ${options[i].label}`);
  }
  console.log("");

  const answer = await ask(rl, `  Votre choix (1-${options.length}) [${defaultIdx + 1}]: `);
  const idx = answer ? parseInt(answer, 10) - 1 : defaultIdx;
  if (idx >= 0 && idx < options.length) {
    return options[idx].key;
  }
  return options[defaultIdx].key;
}

async function askMultiChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: { key: string; label: string; defaultOn: boolean }[],
): Promise<string[]> {
  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const check = options[i].defaultOn ? "✓" : " ";
    console.log(`    [${i + 1}] ${check} ${options[i].label}`);
  }
  console.log("");

  const defaultNums = options
    .map((o, i) => (o.defaultOn ? String(i + 1) : null))
    .filter(Boolean)
    .join(",");

  const answer = await ask(
    rl,
    `  Entrez les numéros séparés par des virgules [${defaultNums}]: `,
  );

  if (!answer) {
    return options.filter((o) => o.defaultOn).map((o) => o.key);
  }

  if (answer.toLowerCase() === "all" || answer === "*") {
    return options.map((o) => o.key);
  }

  const selected = answer
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < options.length)
    .map((i) => options[i].key);

  return selected.length > 0
    ? selected
    : options.filter((o) => o.defaultOn).map((o) => o.key);
}

async function askText(
  rl: ReturnType<typeof createInterface>,
  question: string,
  defaultValue: string,
): Promise<string> {
  const answer = await ask(rl, `\n  ${question} [${defaultValue}]: `);
  return answer || defaultValue;
}

// ============================================
// WIZARD FLOW
// ============================================

export async function runWizard(): Promise<WizardAnswers> {
  const rl = createReadline();

  try {
    console.log("");
    console.log("  ╔════════════════════════════════════════════════╗");
    console.log("  ║  📐 DS Coverage — Assistant de configuration  ║");
    console.log("  ╚════════════════════════════════════════════════╝");
    console.log("");
    console.log("  Ce wizard va configurer les guidelines de votre design system");
    console.log("  et générer des règles Cursor pour guider votre développement.");
    console.log("");
    console.log("  ─── Stack technique ───────────────────────────────");

    // 1. CSS Methodology
    const cssMethodology = (await askChoice(rl, "Quelle méthodologie CSS utilisez-vous ?", [
      { key: "tailwind", label: "Tailwind CSS" },
      { key: "css-modules", label: "CSS Modules" },
      { key: "css-in-js", label: "CSS-in-JS (styled-components, Emotion, etc.)" },
      { key: "vanilla-css", label: "CSS / SCSS / LESS classique" },
      { key: "utility-custom", label: "Utility-first custom" },
      { key: "none", label: "Pas encore décidé / Autre" },
    ])) as CssMethodology;

    // 2. Framework
    const framework = (await askChoice(rl, "Quel framework frontend ?", [
      { key: "react", label: "React (JSX / TSX)" },
      { key: "vue", label: "Vue (SFC)" },
      { key: "svelte", label: "Svelte" },
      { key: "vanilla", label: "Vanilla JS / TypeScript" },
      { key: "other", label: "Autre" },
    ])) as Framework;

    // 3. Design System Status
    const dsStatus = (await askChoice(
      rl,
      "Quel est l'état de votre design system ?",
      [
        { key: "existing", label: "J'ai un design system existant à rendre consistant" },
        { key: "from-scratch", label: "Je pars de zéro — je veux en construire un" },
      ],
    )) as DsStatus;

    console.log("");
    console.log("  ─── Structure du projet ───────────────────────────");

    // 4. Source directory
    const scanDir = await askText(rl, "Répertoire source à scanner ?", "src");

    // 5. Extensions
    const defaultExtensions = getDefaultExtensions(framework);
    const extensionsStr = await askText(
      rl,
      "Extensions de fichiers (séparées par des virgules) ?",
      defaultExtensions.join(", "),
    );
    const extensions = extensionsStr.split(",").map((s) => s.trim()).filter(Boolean);

    // 6. Component directory
    const componentDir = await askText(
      rl,
      "Répertoire des composants UI réutilisables ?",
      "components/ui",
    );

    // 7. Component architecture
    const componentArchitecture = (await askChoice(
      rl,
      "Quelle architecture pour vos composants ?",
      getComponentArchitectureOptions(cssMethodology),
    )) as ComponentArchitecture;

    console.log("");
    console.log("  ─── Design Tokens ─────────────────────────────────");

    // 8. Token categories
    const tokenCategories = await askMultiChoice(
      rl,
      "Quelles catégories de tokens voulez-vous appliquer ?",
      getTokenCategoryOptions(cssMethodology),
    );

    console.log("");
    console.log("  ─── Migration (optionnel) ─────────────────────────");

    // 9. Migration planning
    const wantsMigration = (await askChoice(
      rl,
      "Prévoyez-vous une migration de librairie de composants ?",
      [
        { key: "no", label: "Non, pas pour le moment" },
        { key: "yes", label: "Oui, je veux planifier une migration" },
      ],
    ));

    let migrationTargetDS = "";
    if (wantsMigration === "yes") {
      migrationTargetDS = await askText(
        rl,
        "Nom du design system cible (ex: shadcn/ui, Radix, Custom DS v2) ?",
        "shadcn/ui",
      );
    }

    console.log("");
    console.log("  ─── Récapitulatif ─────────────────────────────────");
    console.log("");
    console.log(`    CSS:           ${PRESETS_INFO[cssMethodology]?.label || cssMethodology}`);
    console.log(`    Framework:     ${getFrameworkLabel(framework)}`);
    console.log(`    Design System: ${dsStatus === "existing" ? "Existant" : "Nouveau (from scratch)"}`);
    console.log(`    Source:        ${scanDir}/`);
    console.log(`    Extensions:    ${extensions.join(", ")}`);
    console.log(`    Composants:    ${componentDir}/`);
    console.log(`    Tokens:        ${tokenCategories.join(", ")}`);
    if (migrationTargetDS) console.log(`    Migration →    ${migrationTargetDS}`);
    console.log("");

    const confirm = await ask(rl, "  Confirmer et générer ? (O/n): ");
    if (confirm.toLowerCase() === "n" || confirm.toLowerCase() === "non") {
      console.log("\n  Annulé. Relancez `npx ds-coverage init` pour recommencer.\n");
      process.exit(0);
    }

    return {
      cssMethodology,
      framework,
      dsStatus,
      scanDir,
      extensions,
      componentDir,
      tokenCategories,
      componentArchitecture,
      migrationTargetDS,
    };
  } finally {
    rl.close();
  }
}

// ============================================
// CONFIG BUILDER
// ============================================

export function buildConfigFromAnswers(answers: WizardAnswers): Partial<DsCoverageConfig> {
  const preset = getPreset(answers.cssMethodology as PresetId);

  // Filter violation categories based on user selection
  const violations: Record<string, DsCoverageConfig["violations"][string]> = {};
  for (const [key, catConfig] of Object.entries(preset.violations || {})) {
    if (answers.tokenCategories.includes(key)) {
      violations[key] = { ...catConfig, enabled: true };
    }
  }

  // Determine file extensions for component analysis
  const componentExtFilter = answers.extensions.filter((e) =>
    [".tsx", ".jsx", ".vue", ".svelte", ".ts", ".js"].includes(e),
  );

  // Build component analysis config
  const requireCVA = answers.componentArchitecture === "cva";
  const componentAnalysis: DsCoverageConfig["componentAnalysis"] = {
    enabled: true,
    directories: [`${answers.componentDir}/`],
    primaryDirectory: `${answers.componentDir}/`,
    legacyDirectories: [],
    api: {
      requireCVA,
      requireRadix: false,
      expectedProps: preset.componentAnalysis?.api?.expectedProps || ["variant", "size"],
      forbiddenProps: [],
      expectedSizes: preset.componentAnalysis?.api?.expectedSizes || ["small", "medium", "large"],
      forbiddenSizes: [],
      legacyVariantValues: [],
    },
    scoring: {
      usesCVA: requireCVA ? 25 : 0,
      correctNaming: 25,
      correctSizes: 15,
      hasClassName: answers.framework === "react" ? 15 : 0,
      usesCompoundVariants: requireCVA ? 15 : 0,
      hasAsChild: 0,
      usesRadix: 0,
    },
  };

  // Normalize scoring to sum to ~100
  const totalWeight = Object.values(componentAnalysis.scoring).reduce((a, b) => a + b, 0);
  if (totalWeight > 0 && totalWeight !== 100) {
    const factor = 100 / totalWeight;
    for (const key of Object.keys(componentAnalysis.scoring) as Array<keyof typeof componentAnalysis.scoring>) {
      componentAnalysis.scoring[key] = Math.round(componentAnalysis.scoring[key] * factor);
    }
  }

  // Build migration config
  const migration = answers.migrationTargetDS
    ? {
        enabled: true,
        targetDS: answers.migrationTargetDS,
        mappings: [] as DsCoverageConfig["migration"]["mappings"],
      }
    : {
        enabled: false,
        targetDS: "",
        mappings: [] as DsCoverageConfig["migration"]["mappings"],
      };

  return {
    scanDir: answers.scanDir,
    extensions: answers.extensions,
    exclude: getDefaultExclusions(answers.framework),
    violations,
    componentAnalysis,
    migration,
    dashboard: {
      title: "Design System Coverage",
      subtitle: answers.dsStatus === "from-scratch"
        ? "Building a design system from scratch"
        : "",
    },
  };
}

// ============================================
// HELPERS
// ============================================

function getDefaultExtensions(framework: Framework): string[] {
  switch (framework) {
    case "react":
      return [".tsx", ".jsx"];
    case "vue":
      return [".vue", ".ts", ".js"];
    case "svelte":
      return [".svelte", ".ts", ".js"];
    case "vanilla":
      return [".ts", ".js", ".html", ".css"];
    default:
      return [".ts", ".js", ".tsx", ".jsx"];
  }
}

function getDefaultExclusions(framework: Framework): string[] {
  const base = [
    "node_modules/",
    "dist/",
    "build/",
    ".test.",
    ".spec.",
    "test/",
    "__tests__/",
  ];

  switch (framework) {
    case "react":
      return [...base, "stories/", ".storybook/"];
    case "vue":
      return [...base, "stories/", ".storybook/"];
    default:
      return base;
  }
}

function getComponentArchitectureOptions(
  css: CssMethodology,
): { key: string; label: string }[] {
  const options: { key: string; label: string }[] = [];

  if (css === "tailwind" || css === "utility-custom") {
    options.push({ key: "cva", label: "CVA (Class Variance Authority) — recommandé avec utility classes" });
  }
  if (css === "css-in-js") {
    options.push({ key: "styled-components", label: "Styled Components / Emotion — variants via props" });
  }
  if (css === "css-modules") {
    options.push({ key: "css-modules", label: "CSS Modules — variants via classNames conditionnels" });
  }
  options.push({ key: "vanilla", label: "CSS classique — BEM ou conventions custom" });
  options.push({ key: "other", label: "Autre / Je déciderai plus tard" });

  return options;
}

function getTokenCategoryOptions(
  css: CssMethodology,
): { key: string; label: string; defaultOn: boolean }[] {
  return [
    { key: "colors", label: "Couleurs", defaultOn: true },
    { key: "typography", label: "Typographie", defaultOn: true },
    { key: "spacing", label: "Espacement (margin, padding, gap)", defaultOn: css === "tailwind" },
    { key: "radius", label: "Border radius", defaultOn: true },
    { key: "shadows", label: "Ombres", defaultOn: true },
    { key: "darkMode", label: "Dark mode (enforcement sémantique)", defaultOn: css === "tailwind" },
  ];
}

function getFrameworkLabel(framework: Framework): string {
  const labels: Record<Framework, string> = {
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
    vanilla: "Vanilla JS/TS",
    other: "Autre",
  };
  return labels[framework];
}

// ============================================
// CONFIG FILE SERIALIZER
// ============================================

export function serializeConfig(config: Partial<DsCoverageConfig>): string {
  return `/**
 * ds-coverage.config.js
 *
 * Auto-generated by \`npx ds-coverage init\`.
 * Customize the patterns, categories, and rules to match your design system.
 *
 * @type {import('ds-coverage/config').DsCoverageConfig}
 */
export default ${JSON.stringify(config, null, 2)};
`;
}
