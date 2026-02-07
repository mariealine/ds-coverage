# ds-coverage

Design system coverage scanner & dashboard. Detect hardcoded tokens, audit component APIs, and track migration progress toward 100% design system compliance.

**Zero runtime dependencies.** Works with any React/Vue/Svelte + Tailwind project.

## Quick Start

```bash
# Install
npm install -D ds-coverage

# Scaffold AI guidelines (Cursor rules, Claude/Agents skills)
npx ds-coverage init

# Run scanner (scans ./src by default)
npx ds-coverage

# Open the generated dashboard
open ds-coverage-dashboard.html
```

## What it detects

| Category | What | Example violations |
|----------|------|--------------------|
| **Colors** | Hardcoded Tailwind palette classes | `bg-gray-100`, `text-blue-600`, `border-red-300` |
| **Typography** | Raw font-size/weight classes | `text-sm`, `font-medium`, `text-xl font-bold` |
| **Radius** | Hardcoded border-radius | `rounded-lg`, `rounded-xl`, `rounded-2xl` |
| **Shadows** | Hardcoded shadows | `shadow-sm`, `shadow-lg`, `shadow-inner` |
| **Dark mode** | `dark:` prefixes | `dark:bg-gray-900`, `dark:text-white` |
| **Custom** | Any regex pattern you define | Your own rules |

## Dashboard

The scanner generates a self-contained HTML dashboard with **4 tabs**:

1. **Metrics — App**: Coverage ring, violations by category, per-file breakdown with search/sort/pagination
2. **Metrics — Design System**: Token compliance score per component (% of lines free from hardcoded values)
3. **Components — API Redesign**: Audit of CVA usage, prop naming (`appearance`/`hierarchy`/`size`), compoundVariants, className, asChild
4. **Refactoring Roadmap**: Prioritized migration phases with business cases and directory heatmap

## Configuration

Create a `ds-coverage.config.js` (or `.ts`, `.mjs`, `.json`) at your project root:

```js
// ds-coverage.config.js
export default {
  // What to scan
  scanDir: "src",
  extensions: [".tsx", ".jsx"],
  exclude: ["stories/", "test/", "__tests__/", "node_modules/"],

  // Violation patterns — add, remove, or customize
  violations: {
    hardcodedColors: {
      enabled: true,
      label: "Colors",
      icon: "🎨",
      color: "oklch(0.637 0.237 25.331)", // dashboard badge color
      pattern: "(?:bg|text|border)-(?:gray|red|blue|green)-\\d{2,3}",
    },
    hardcodedTypography: {
      enabled: true,
      label: "Typography",
      icon: "🔤",
      color: "oklch(0.723 0.22 70.08)",
      pattern: "\\btext-(?:xs|sm|base|lg|xl)\\b|\\bfont-(?:medium|semibold|bold)\\b",
    },
    // Add your own categories:
    hardcodedSpacing: {
      enabled: true,
      label: "Spacing",
      icon: "📏",
      color: "oklch(0.623 0.214 259.815)",
      pattern: "\\b(?:p|m|px|py|mx|my|gap)-\\d+\\b",
    },
  },

  // Migration flags (searched in comments)
  flags: {
    migrateSimple: "@ds-migrate:\\s*simple",
    migrateComplex: "@ds-migrate:\\s*complex",
    todo: "@ds-todo",
  },

  // Component API analysis
  componentAnalysis: {
    enabled: true,
    directories: ["components/ui/", "components/shared/"],
    primaryDirectory: "components/ui/",
    legacyDirectories: ["components/shared/"],
    api: {
      requireCVA: true,
      requireRadix: false,
      expectedProps: ["appearance", "hierarchy", "size"],
      forbiddenProps: ["variant", "intent"],
      expectedSizes: ["small", "default", "large"],
      forbiddenSizes: ["sm", "md", "lg", "xl", "xs"],
      legacyVariantValues: ["destructive", "outline", "ghost"],
    },
  },

  // Roadmap phases (ordered)
  roadmap: {
    enabled: true,
    quickWinThreshold: 3,
    phases: [
      {
        id: "ui-components",
        title: "Fix UI components first",
        description: "Foundation components used everywhere.",
        businessCase: "Maximum leverage — fixes propagate to the entire app.",
        filter: { type: "directory", prefix: "components/ui/" },
      },
      {
        id: "quick-wins",
        title: "Quick wins",
        description: "Files with 1-3 violations.",
        businessCase: "Fast coverage improvement.",
        filter: { type: "quickWins" },
      },
      {
        id: "colors",
        title: "Migrate colors",
        description: "Largest category, needs visual context.",
        businessCase: "Brand consistency.",
        filter: { type: "category", key: "hardcodedColors" },
      },
    ],
  },

  // Dashboard branding
  dashboard: {
    title: "My Design System Coverage",
    subtitle: "", // auto-generated if empty
  },

  // Output paths
  output: {
    reportJson: "ds-coverage-report.json",
    dashboardHtml: "ds-coverage-dashboard.html",
  },
};
```

### Config deep merge

You only need to specify what you want to override. Everything else uses sensible defaults for React + Tailwind projects. For example, to just change the scan directory:

```js
export default { scanDir: "app" };
```

### Config file formats

| Format | File name | Requirements |
|--------|-----------|-------------|
| **JS (recommended)** | `ds-coverage.config.js` or `.mjs` | None — works with any Node.js |
| **JSON** | `ds-coverage.config.json` | None |
| **TypeScript** | `ds-coverage.config.ts` | Requires `tsx` installed, or Node.js ≥ 22.6 with `--experimental-strip-types` |

> **Tip:** For maximum portability, use `.js` or `.mjs` with JSDoc types for autocompletion:
> ```js
> /** @type {import('ds-coverage/config').DsCoverageConfig} */
> export default { scanDir: "app" };
> ```

## Programmatic API

### Scan

```ts
import { run } from "ds-coverage";

const { report, dashboardHtml } = await run({
  projectRoot: "/path/to/project",
  config: { scanDir: "app" }, // optional overrides (deep merged)
  dryRun: false,
  silent: false,
});

console.log(`Coverage: ${report.summary.coveragePercent}%`);
console.log(`Violations: ${report.summary.totalViolations}`);
```

### Init (scaffold AI guidelines)

```ts
import { init } from "ds-coverage";

const files = await init({
  projectRoot: "/path/to/project",
  targets: ["cursor", "claude", "agents"], // default: all
  force: true,  // overwrite existing
});

console.log(`Created ${files.filter(f => !f.skipped).length} files`);
```

## CLI Commands

### `npx ds-coverage` (scan)

Scans the codebase and generates the dashboard + JSON report.

```bash
npx ds-coverage                    # Scan and generate dashboard
npx ds-coverage --dry-run          # Scan without writing files
npx ds-coverage --silent           # No console output
npx ds-coverage --open             # Open dashboard in browser after scan
npx ds-coverage --dir /path/to/project  # Custom project root
npx ds-coverage --help             # Show help
```

### `npx ds-coverage init`

Scaffolds AI guidelines into your project — Cursor rules, Claude skills, and generic agent skills. All generated files are **derived from your `ds-coverage.config`**, so the AI assistants enforce the exact same rules the scanner detects.

```bash
npx ds-coverage init               # Scaffold all AI guidelines
npx ds-coverage init --force       # Overwrite existing files
npx ds-coverage init --dry-run     # Preview what would be created
npx ds-coverage init --target cursor           # Only Cursor rules
npx ds-coverage init --target claude --target agents  # Multiple targets
```

Generated files:

| Target | Files |
|--------|-------|
| **cursor** | `.cursor/rules/design-system-compliance.md`, `.cursor/rules/ui-component-creation.md`, `.cursor/skills/design-system-compliance/SKILL.md` |
| **claude** | `.claude/skills/design-system-compliance/SKILL.md` |
| **agents** | `.agents/skills/design-system-compliance/SKILL.md` |

> **Tip:** After changing your `ds-coverage.config`, re-run `npx ds-coverage init --force` to regenerate the AI guidelines and keep them in sync with the scanner.

## Adding to CI

```yaml
# GitHub Actions example
- name: DS Coverage Check
  run: |
    npx ds-coverage --silent
    COVERAGE=$(node -p "JSON.parse(require('fs').readFileSync('ds-coverage-report.json','utf8')).summary.coveragePercent")
    echo "Coverage: $COVERAGE%"
    if [ $(echo "$COVERAGE < 50" | bc) -eq 1 ]; then
      echo "::error::DS coverage below 50%"
      exit 1
    fi
```

## How scoring works

### File coverage
A file is "compliant" if it has **zero violations** across all enabled categories. Coverage = compliant files / total files.

### Token score (per component)
`score = (total_lines - lines_with_violations) / total_lines × 100`

A line is counted once even if it has multiple violations.

### API compliance score (per component)
Weighted checklist (configurable via `componentAnalysis.scoring`):

| Check | Default weight |
|-------|---------------|
| Uses CVA | 25 |
| Correct prop naming (no forbidden props) | 25 |
| Correct size values (full words) | 15 |
| Has className prop | 10 |
| Uses compoundVariants | 15 |
| Has asChild prop | 5 |
| Uses Radix | 5 |

## License

MIT
