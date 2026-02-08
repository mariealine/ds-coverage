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
  currentKey?: string,
): Promise<string> {
  const idxFromKey = currentKey != null
    ? options.findIndex((o) => o.key === currentKey)
    : -1;
  const effectiveDefault = idxFromKey >= 0 ? idxFromKey : defaultIdx;

  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const marker = i === effectiveDefault ? "›" : " ";
    console.log(`    ${marker} [${i + 1}] ${options[i].label}`);
  }
  console.log("");

  const answer = await ask(rl, `  Your choice (1-${options.length}) [${effectiveDefault + 1}]: `);
  const idx = answer ? parseInt(answer, 10) - 1 : effectiveDefault;
  if (idx >= 0 && idx < options.length) {
    return options[idx].key;
  }
  return options[effectiveDefault].key;
}

async function askMultiChoice(
  rl: ReturnType<typeof createInterface>,
  question: string,
  options: { key: string; label: string; defaultOn: boolean }[],
  currentSelection?: string[],
): Promise<string[]> {
  const defaultKeys =
    currentSelection && currentSelection.length > 0
      ? currentSelection
      : options.filter((o) => o.defaultOn).map((o) => o.key);
  const defaultNums = options
    .map((o, i) => (defaultKeys.includes(o.key) ? String(i + 1) : null))
    .filter(Boolean)
    .join(",");

  console.log(`\n  ${question}\n`);
  for (let i = 0; i < options.length; i++) {
    const check = defaultKeys.includes(options[i].key) ? "✓" : " ";
    console.log(`    [${i + 1}] ${check} ${options[i].label}`);
  }
  console.log("");

  const answer = await ask(
    rl,
    `  Enter numbers separated by commas [${defaultNums}]: `,
  );

  if (!answer) {
    return defaultKeys;
  }

  if (answer.toLowerCase() === "all" || answer === "*") {
    return options.map((o) => o.key);
  }

  const selected = answer
    .split(",")
    .map((s) => parseInt(s.trim(), 10) - 1)
    .filter((i) => i >= 0 && i < options.length)
    .map((i) => options[i].key);

  return selected.length > 0 ? selected : defaultKeys;
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

const WIZARD_STEP_LABELS = [
  "CSS methodology",
  "Framework",
  "Design system status",
  "Source directory",
  "File extensions",
  "Component directory",
  "Component architecture",
  "Token categories",
  "Migration",
] as const;

type WizardState = Partial<WizardAnswers>;

async function runStepsFrom(
  rl: ReturnType<typeof createInterface>,
  state: WizardState,
  fromStep: number,
): Promise<WizardState> {
  const a = state;

  if (fromStep <= 0) {
    console.log("");
    if (state.cssMethodology == null) {
      console.log("  ─── Tech Stack ───────────────────────────────────");
    }
    a.cssMethodology = (await askChoice(
      rl,
      "Which CSS methodology do you use?",
      [
        { key: "tailwind", label: "Tailwind CSS" },
        { key: "css-modules", label: "CSS Modules" },
        { key: "css-in-js", label: "CSS-in-JS (styled-components, Emotion, etc.)" },
        { key: "vanilla-css", label: "CSS / SCSS / LESS (classic)" },
        { key: "utility-custom", label: "Custom utility-first" },
        { key: "none", label: "Not decided yet / Other" },
      ],
      0,
      a.cssMethodology,
    )) as CssMethodology;
  }

  if (fromStep <= 1) {
    a.framework = (await askChoice(
      rl,
      "Which frontend framework?",
      [
        { key: "react", label: "React (JSX / TSX)" },
        { key: "vue", label: "Vue (SFC)" },
        { key: "svelte", label: "Svelte" },
        { key: "vanilla", label: "Vanilla JS / TypeScript" },
        { key: "other", label: "Other" },
      ],
      0,
      a.framework,
    )) as Framework;
  }

  if (fromStep <= 2) {
    a.dsStatus = (await askChoice(
      rl,
      "What is the current state of your design system?",
      [
        { key: "existing", label: "I have an existing design system to enforce" },
        { key: "from-scratch", label: "Starting from scratch — I want to build one" },
      ],
      0,
      a.dsStatus,
    )) as DsStatus;
  }

  if (fromStep <= 3) {
    console.log("");
    console.log("  ─── Project Structure ─────────────────────────────");
    a.scanDir = await askText(rl, "Source directory to scan?", a.scanDir ?? "src");
  }

  if (fromStep <= 4) {
    const defaultExtensions = getDefaultExtensions(a.framework ?? "react");
    const defaultStr = (a.extensions?.length ? a.extensions.join(", ") : defaultExtensions.join(", ")) as string;
    const extensionsStr = await askText(
      rl,
      "File extensions (comma-separated)?",
      defaultStr,
    );
    a.extensions = extensionsStr.split(",").map((s) => s.trim()).filter(Boolean);
  }

  if (fromStep <= 5) {
    a.componentDir = await askText(
      rl,
      "Reusable UI components directory?",
      a.componentDir ?? "components/ui",
    );
  }

  if (fromStep <= 6) {
    a.componentArchitecture = (await askChoice(
      rl,
      "Which architecture for your components?",
      getComponentArchitectureOptions(a.cssMethodology ?? "tailwind"),
      0,
      a.componentArchitecture,
    )) as ComponentArchitecture;
  }

  if (fromStep <= 7) {
    console.log("");
    console.log("  ─── Design Tokens ─────────────────────────────────");
    a.tokenCategories = await askMultiChoice(
      rl,
      "Which token categories do you want to enforce?",
      getTokenCategoryOptions(a.cssMethodology ?? "tailwind"),
      a.tokenCategories,
    );
  }

  if (fromStep <= 8) {
    console.log("");
    console.log("  ─── Migration (optional) ─────────────────────────");
    const wantsMigration = await askChoice(
      rl,
      "Are you planning a component library migration?",
      [
        { key: "no", label: "No, not at this time" },
        { key: "yes", label: "Yes, I want to plan a migration" },
      ],
      0,
      a.migrationTargetDS ? "yes" : "no",
    );

    if (wantsMigration === "yes") {
      a.migrationTargetDS = await askText(
        rl,
        "Target design system name (e.g. shadcn/ui, Radix, Custom DS v2)?",
        a.migrationTargetDS ?? "shadcn/ui",
      );
    } else {
      a.migrationTargetDS = "";
    }
  }

  return a;
}

function showSummary(a: WizardState): void {
  console.log("");
  console.log("  ─── Summary ───────────────────────────────────────");
  console.log("");
  console.log(`    CSS:           ${PRESETS_INFO[a.cssMethodology!]?.label ?? a.cssMethodology}`);
  console.log(`    Framework:     ${getFrameworkLabel(a.framework!)}`);
  console.log(`    Design System: ${a.dsStatus === "existing" ? "Existing" : "New (from scratch)"}`);
  console.log(`    Source:        ${a.scanDir}/`);
  console.log(`    Extensions:    ${a.extensions?.join(", ") ?? ""}`);
  console.log(`    Components:    ${a.componentDir}/`);
  console.log(`    Tokens:        ${a.tokenCategories?.join(", ") ?? ""}`);
  if (a.migrationTargetDS) console.log(`    Migration →    ${a.migrationTargetDS}`);
  console.log("");
}

export async function runWizard(): Promise<WizardAnswers> {
  const rl = createReadline();

  try {
    console.log("");
    console.log("  ╔════════════════════════════════════════════════╗");
    console.log("  ║  📐 DS Coverage — Configuration Wizard        ║");
    console.log("  ╚════════════════════════════════════════════════╝");
    console.log("");
    console.log("  This wizard will configure your design system guidelines");
    console.log("  and generate Cursor rules to guide your development.");
    console.log("  You can go back to edit any answer from the summary.");
    console.log("");

    let state: WizardState = {};

    for (;;) {
      state = await runStepsFrom(rl, state, 0);
      showSummary(state);

      const confirm = await ask(rl, "  Confirm and generate? (Y/n): ");
      if (confirm.toLowerCase() !== "n" && confirm.toLowerCase() !== "no") {
        break;
      }

      console.log("");
      console.log("  Which step do you want to edit?");
      for (let i = 0; i < WIZARD_STEP_LABELS.length; i++) {
        console.log(`    [${i + 1}] ${WIZARD_STEP_LABELS[i]}`);
      }
      console.log("");

      const editInput = await ask(
        rl,
        `  Enter step number (1-${WIZARD_STEP_LABELS.length}), or Enter to cancel: `,
      );
      const editNum = editInput ? parseInt(editInput.trim(), 10) : 0;
      if (editNum < 1 || editNum > WIZARD_STEP_LABELS.length) {
        console.log("\n  Cancelled. Re-run `npx ds-coverage init` to start over.\n");
        process.exit(0);
      }

      const fromStep = editNum - 1;
      state = await runStepsFrom(rl, state, fromStep);
    }

    return state as WizardAnswers;
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
      return [".tsx", ".jsx", ".css", ".scss"];
    case "vue":
      return [".vue", ".ts", ".js", ".css", ".scss"];
    case "svelte":
      return [".svelte", ".ts", ".js", ".css", ".scss"];
    case "vanilla":
      return [".ts", ".js", ".html", ".css", ".scss"];
    default:
      return [".ts", ".js", ".tsx", ".jsx", ".css", ".scss"];
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
    options.push({ key: "cva", label: "CVA (Class Variance Authority) — recommended with utility classes" });
  }
  if (css === "css-in-js") {
    options.push({ key: "styled-components", label: "Styled Components / Emotion — variants via props" });
  }
  if (css === "css-modules") {
    options.push({ key: "css-modules", label: "CSS Modules — variants via conditional classNames" });
  }
  options.push({ key: "vanilla", label: "Classic CSS — BEM or custom conventions" });
  options.push({ key: "other", label: "Other / I'll decide later" });

  return options;
}

function getTokenCategoryOptions(
  css: CssMethodology,
): { key: string; label: string; defaultOn: boolean }[] {
  return [
    { key: "colors", label: "Colors", defaultOn: true },
    { key: "typography", label: "Typography", defaultOn: true },
    { key: "spacing", label: "Spacing (margin, padding, gap)", defaultOn: css === "tailwind" },
    { key: "radius", label: "Border radius", defaultOn: true },
    { key: "shadows", label: "Shadows", defaultOn: true },
    { key: "darkMode", label: "Dark mode (semantic enforcement)", defaultOn: css === "tailwind" },
  ];
}

function getFrameworkLabel(framework: Framework): string {
  const labels: Record<Framework, string> = {
    react: "React",
    vue: "Vue",
    svelte: "Svelte",
    vanilla: "Vanilla JS/TS",
    other: "Other",
  };
  return labels[framework];
}

// ============================================
// CONFIG FILE SERIALIZER
// ============================================

export function serializeConfig(config: Partial<DsCoverageConfig>): string {
  return `/**
 * ds-coverage.config.mjs
 *
 * Auto-generated by \`npx ds-coverage init\`.
 * Customize the patterns, categories, and rules to match your design system.
 *
 * @type {import('ds-coverage/config').DsCoverageConfig}
 */
export default ${JSON.stringify(config, null, 2)};
`;
}
