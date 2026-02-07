/**
 * ds-coverage — Example configuration
 *
 * Copy this file to your project root as `ds-coverage.config.js`
 * and customize it to match your design system.
 *
 * All values below are the defaults — you only need to specify what you override.
 * @type {import('ds-coverage/config').DsCoverageConfig}
 */
export default {
  // ─── What to scan ────────────────────────────────────────
  scanDir: "src",
  extensions: [".tsx", ".jsx"],
  exclude: [
    "stories/",
    ".storybook/",
    "test/",
    "__tests__/",
    ".test.",
    ".spec.",
    "node_modules/",
  ],

  // ─── Violation categories ────────────────────────────────
  // Each category defines a regex pattern for violations.
  // Add, remove, or override categories to match your design system.
  violations: {
    hardcodedColors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)",
      pattern:
        "(?:bg|text|border|ring|outline|shadow|accent|fill|stroke|from|via|to)-(?:gray|slate|zinc|neutral|stone|red|orange|amber|yellow|lime|green|emerald|teal|cyan|sky|blue|indigo|violet|purple|fuchsia|pink|rose)-(?:\\d{2,3}(?:/\\d+)?)|(?:bg|text|border|ring)-(?:white|black)(?![a-z-])",
    },
    hardcodedTypography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern:
        "\\btext-(?:xs|sm|base|lg|xl|2xl|3xl|4xl|5xl|6xl|7xl|8xl|9xl)\\b|\\bfont-(?:thin|light|normal|medium|semibold|bold|extrabold|black)\\b",
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
    // Add your own:
    // hardcodedSpacing: {
    //   enabled: true,
    //   label: "Spacing",
    //   icon: "📏",
    //   color: "oklch(0.623 0.214 259.815)",
    //   pattern: "\\b(?:p|m|px|py|mx|my|gap)-\\d+\\b",
    // },
  },

  // ─── Migration flags ─────────────────────────────────────
  flags: {
    migrateSimple: "@ds-migrate:\\s*simple",
    migrateComplex: "@ds-migrate:\\s*complex",
    todo: "@ds-todo",
  },

  // ─── Component API analysis ──────────────────────────────
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

  // ─── Roadmap phases ──────────────────────────────────────
  roadmap: {
    enabled: true,
    maxFilesPerPhase: 30,
    quickWinThreshold: 3,
    phases: [
      {
        id: "resolve-flags",
        title: "Resolve migration flags",
        description: "Files annotated with @ds-migrate from previous reviews.",
        businessCase:
          "Highest ROI — zero discovery cost, just execution.",
        filter: { type: "flags" },
      },
      {
        id: "ui-components",
        title: "Migrate UI components to 100%",
        description: "Foundation components reused everywhere.",
        businessCase:
          "Maximum leverage — one fix propagates to the entire app.",
        filter: { type: "directory", prefix: "components/ui/" },
      },
      {
        id: "quick-wins",
        title: "Quick wins — 1-3 violations",
        description: "Files that can be fully migrated with minimal effort.",
        businessCase: "Best coverage improvement per hour.",
        filter: { type: "quickWins" },
      },
      {
        id: "colors",
        title: "Migrate hardcoded colors",
        description: "Largest category, may need visual context.",
        businessCase: "Brand consistency and future-proofing.",
        filter: { type: "category", key: "hardcodedColors" },
      },
    ],
  },

  // ─── Dashboard ───────────────────────────────────────────
  dashboard: {
    title: "Design System Coverage",
    subtitle: "", // auto-generated if empty
  },

  // ─── Output ──────────────────────────────────────────────
  output: {
    reportJson: "ds-coverage-report.json",
    dashboardHtml: "ds-coverage-dashboard.html",
  },
};
