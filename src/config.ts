/**
 * DS Coverage — Configuration
 *
 * Defines the config schema and provides sensible defaults
 * for React + Tailwind projects.
 */

import { readFileSync } from "node:fs";
import { resolve, join } from "node:path";

// ============================================
// CONFIG TYPES
// ============================================

export interface ViolationCategoryConfig {
  enabled: boolean;
  label: string;
  icon: string;
  /** CSS color for the dashboard */
  color: string;
  /** Regex pattern string (without flags — 'g' is added automatically) */
  pattern: string;
  /**
   * When true, multiple matches on the same line are merged into one violation.
   * Useful for typography: `text-sm font-medium` on one line = 1 violation, not 2.
   * @default false
   */
  deduplicateByLine?: boolean;
}

export interface ComponentApiConfig {
  enabled: boolean;
  /** Directories containing reusable components (relative to scanDir) */
  directories: string[];
  /** The "target" directory where new components should live */
  primaryDirectory: string;
  /** Legacy directories (to flag for migration) */
  legacyDirectories: string[];
  api: {
    requireCVA: boolean;
    requireRadix: boolean;
    /** Expected variant prop names (e.g. ['appearance', 'hierarchy', 'size']) */
    expectedProps: string[];
    /** Forbidden prop names that indicate legacy code (e.g. ['variant', 'intent']) */
    forbiddenProps: string[];
    /** Expected size values (full words) */
    expectedSizes: string[];
    /** Forbidden size values (abbreviations) */
    forbiddenSizes: string[];
    /** Legacy variant values to flag */
    legacyVariantValues: string[];
  };
  /** Scoring weights for compliance score (should sum to ~100) */
  scoring: {
    usesCVA: number;
    correctNaming: number;
    correctSizes: number;
    hasClassName: number;
    usesCompoundVariants: number;
    hasAsChild: number;
    usesRadix: number;
  };
}

export interface DsCoverageConfig {
  /** Directory to scan (relative to project root) */
  scanDir: string;
  /** File extensions to scan */
  extensions: string[];
  /** Paths to exclude (substring match) */
  exclude: string[];

  /** Violation categories to detect */
  violations: Record<string, ViolationCategoryConfig>;

  /** Migration flag patterns (searched in comments) */
  flags: {
    migrateSimple: string;
    migrateComplex: string;
    todo: string;
  };

  /** Component API analysis configuration */
  componentAnalysis: ComponentApiConfig;

  /** Roadmap generation settings */
  roadmap: {
    enabled: boolean;
    /** Max files shown per phase */
    maxFilesPerPhase: number;
    /** Max violations for a file to be a "quick win" */
    quickWinThreshold: number;
    /** Custom phases (in order). Each phase filters files by a function description. */
    phases: Array<{
      id: string;
      title: string;
      description: string;
      businessCase: string;
      /** Which violation category this phase targets, or 'flags' for flagged files, or 'quickWins', or a directory prefix */
      filter:
        | { type: "flags" }
        | { type: "directory"; prefix: string }
        | { type: "category"; key: string }
        | { type: "quickWins" }
        | { type: "all" };
    }>;
  };

  /** Dashboard customization */
  dashboard: {
    title: string;
    subtitle: string;
  };

  /** Output paths (relative to project root) */
  output: {
    reportJson: string;
    dashboardHtml: string;
  };
}

// ============================================
// DEFAULTS — Tailwind + React projects
// ============================================

const TAILWIND_COLOR_PREFIXES = [
  "gray", "slate", "zinc", "neutral", "stone",
  "red", "orange", "amber", "yellow", "lime",
  "green", "emerald", "teal", "cyan", "sky",
  "blue", "indigo", "violet", "purple", "fuchsia",
  "pink", "rose",
];

const COLOR_PATTERN = `(?:bg|text|border|ring|outline|shadow|accent|fill|stroke|from|via|to)-(?:${TAILWIND_COLOR_PREFIXES.join("|")})-(?:\\d{2,3}(?:/\\d+)?)`;
const BW_PATTERN = `(?:bg|text|border|ring)-(?:white|black)(?![a-z-])`;

export const DEFAULT_CONFIG: DsCoverageConfig = {
  scanDir: "src",
  extensions: [".tsx", ".jsx"],
  exclude: [
    "stories/", ".storybook/", "test/", "__tests__/",
    ".test.", ".spec.", "node_modules/",
  ],

  violations: {
    hardcodedColors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern: `(?:${COLOR_PATTERN})|(?:${BW_PATTERN})`,
    },
    hardcodedTypography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "\\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b|\\bfont-(?:thin|light|normal|medium|semibold|bold|extrabold|black)\\b",
      deduplicateByLine: true,
    },
    hardcodedRadius: {
      enabled: true,
      label: "Radius",
      icon: "⬜",
      color: "oklch(0.8 0.25 102.212)",
      pattern: "\\brounded-(?:sm|md|lg|xl|2xl|3xl|none)\\b",
    },
    hardcodedShadows: {
      enabled: true,
      label: "Shadows",
      icon: "🌫️",
      color: "oklch(0.723 0.219 149.579)",
      pattern: "\\bshadow-(?:sm|md|lg|xl|2xl|inner)\\b",
    },
    darkMode: {
      enabled: true,
      label: "Dark Mode",
      icon: "🌙",
      color: "oklch(0.623 0.214 264.376)",
      pattern: "\\bdark:",
    },
  },

  flags: {
    migrateSimple: "@ds-migrate:\\s*simple",
    migrateComplex: "@ds-migrate:\\s*complex",
    todo: "@ds-todo",
  },

  componentAnalysis: {
    enabled: true,
    directories: ["components/ui/", "components/common/"],
    primaryDirectory: "components/ui/",
    legacyDirectories: ["components/common/"],
    api: {
      requireCVA: true,
      requireRadix: false,
      expectedProps: ["appearance", "hierarchy", "size"],
      forbiddenProps: ["variant", "intent"],
      expectedSizes: ["xxsmall", "xsmall", "small", "default", "large"],
      forbiddenSizes: ["sm", "md", "lg", "xl", "xs", "2xs"],
      legacyVariantValues: ["destructive", "outline", "ghost", "link"],
    },
    scoring: {
      usesCVA: 25,
      correctNaming: 25,
      correctSizes: 15,
      hasClassName: 10,
      usesCompoundVariants: 15,
      hasAsChild: 5,
      usesRadix: 5,
    },
  },

  roadmap: {
    enabled: true,
    maxFilesPerPhase: 30,
    quickWinThreshold: 3,
    phases: [
      {
        id: "resolve-flags",
        title: "Resolve existing migration flags",
        description: "Files already annotated with migration flags from previous reviews.",
        businessCase: "Highest ROI — zero discovery cost, just execution. Leaving flags unresolved erodes team discipline.",
        filter: { type: "flags" },
      },
      {
        id: "primary-components",
        title: "Migrate primary UI components to 100%",
        description: "Design system foundation — these components are reused everywhere.",
        businessCase: "Maximum leverage — one fix here propagates to the entire app.",
        filter: { type: "directory", prefix: "components/ui/" },
      },
      {
        id: "remove-dark-mode",
        title: "Remove dark: prefixes",
        description: "Remove all dark: prefixes and replace with semantic tokens.",
        businessCase: "Dead code removal — reduces maintenance burden and future conflicts.",
        filter: { type: "category", key: "darkMode" },
      },
      {
        id: "quick-wins",
        title: "Quick wins — files with 1-3 violations",
        description: "Files that can be fully migrated with minimal effort.",
        businessCase: "Best coverage metric improvement per hour. Builds momentum.",
        filter: { type: "quickWins" },
      },
      {
        id: "shadows",
        title: "Migrate hardcoded shadows",
        description: "Replace shadow-sm/md/lg with named shadow tokens.",
        businessCase: "Depth consistency — low risk, zero ambiguity, easy to batch.",
        filter: { type: "category", key: "hardcodedShadows" },
      },
      {
        id: "radius",
        title: "Migrate hardcoded radius",
        description: "Replace rounded-sm/md/lg with token values.",
        businessCase: "Shape consistency — low risk, fully automatable.",
        filter: { type: "category", key: "hardcodedRadius" },
      },
      {
        id: "typography",
        title: "Migrate hardcoded typography",
        description: "Replace text-xs/sm + font-medium combinations with typescale classes.",
        businessCase: "Readability hierarchy — enables future brand evolution from a single file.",
        filter: { type: "category", key: "hardcodedTypography" },
      },
      {
        id: "colors",
        title: "Migrate hardcoded colors",
        description: "The largest category. Many are ambiguous and need visual context.",
        businessCase: "Brand consistency and future-proofing — highest effort but highest long-term value.",
        filter: { type: "category", key: "hardcodedColors" },
      },
    ],
  },

  dashboard: {
    title: "Design System Coverage",
    subtitle: "",
  },

  output: {
    reportJson: "ds-coverage-report.json",
    dashboardHtml: "ds-coverage-dashboard.html",
  },
};

// ============================================
// CONFIG LOADER
// ============================================

const CONFIG_FILE_NAMES = [
  "ds-coverage.config.js",
  "ds-coverage.config.mjs",
  "ds-coverage.config.cjs",
  "ds-coverage.config.json",
  "ds-coverage.config.ts",
];

/** Deep merge two objects (source overrides target) */
// biome-ignore lint: any is needed for generic deep merge
export function deepMerge(target: any, source: any): any {
  const result = { ...target };
  for (const key of Object.keys(source)) {
    const sourceVal = source[key];
    const targetVal = target[key];
    if (
      sourceVal !== null &&
      sourceVal !== undefined &&
      typeof sourceVal === "object" &&
      !Array.isArray(sourceVal) &&
      typeof targetVal === "object" &&
      !Array.isArray(targetVal) &&
      targetVal !== null
    ) {
      result[key] = deepMerge(targetVal, sourceVal);
    } else if (sourceVal !== undefined) {
      result[key] = sourceVal;
    }
  }
  return result;
}

export async function loadConfig(projectRoot: string): Promise<DsCoverageConfig> {
  for (const fileName of CONFIG_FILE_NAMES) {
    const filePath = join(projectRoot, fileName);
    try {
      if (fileName.endsWith(".json")) {
        const raw = readFileSync(filePath, "utf-8");
        const userConfig = JSON.parse(raw);
        return deepMerge(DEFAULT_CONFIG, userConfig);
      }

      // For .js, .mjs, .cjs, .ts — use dynamic import
      const fileUrl = `file://${resolve(filePath)}`;
      const mod = await import(fileUrl);
      const userConfig = mod.default || mod;
      return deepMerge(DEFAULT_CONFIG, userConfig);
    } catch {
      // File doesn't exist or can't be loaded — try next
      continue;
    }
  }

  // No config file found — use defaults
  return { ...DEFAULT_CONFIG };
}
