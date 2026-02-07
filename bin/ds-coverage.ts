/**
 * DS Coverage CLI
 *
 * Usage:
 *   npx ds-coverage              # Scan and generate dashboard
 *   npx ds-coverage init         # Scaffold AI guidelines (rules + skills)
 *   npx ds-coverage --dry-run    # Scan without writing files
 *   npx ds-coverage --silent     # No console output
 *   npx ds-coverage --open       # Open dashboard in browser after scan
 *   npx ds-coverage --help       # Show help
 */

import { run, init } from "../src/index.js";

const args = process.argv.slice(2);
const command = args[0] && !args[0].startsWith("-") ? args[0] : "scan";

if (args.includes("--help") || args.includes("-h")) {
  console.log(`
  ds-coverage — Design System Coverage Scanner & AI Guidelines

  Usage:
    npx ds-coverage [command] [options]

  Commands:
    scan (default)   Scan codebase and generate dashboard
    init             Scaffold AI guidelines (Cursor rules, Claude/Agents skills)

  Scan options:
    --dry-run        Scan without writing report/dashboard files
    --silent         No console output
    --open           Open dashboard in browser after scan
    --dir <path>     Project root directory (default: cwd)

  Init options:
    --force          Overwrite existing files
    --dry-run        Show what would be created without writing
    --target <name>  Only generate for specific target (cursor, claude, agents)
                     Can be repeated: --target cursor --target claude
    --dir <path>     Project root directory (default: cwd)

  General:
    -h, --help       Show this help message

  Configuration:
    Create a ds-coverage.config.js (or .ts, .mjs, .json) at your project root.
    All options have sensible defaults for React + Tailwind projects.

    The generated AI guidelines are derived from your config, ensuring
    that scanner rules and AI assistant behavior stay in sync.
  `);
  process.exit(0);
}

// Parse shared options
const dryRun = args.includes("--dry-run");
const silent = args.includes("--silent");

let projectRoot = process.cwd();
const dirIdx = args.indexOf("--dir");
if (dirIdx !== -1 && args[dirIdx + 1]) {
  projectRoot = args[dirIdx + 1];
}

async function main() {
  try {
    if (command === "init") {
      // Parse init-specific options
      const force = args.includes("--force");
      const targets: Array<"cursor" | "claude" | "agents"> = [];
      let i = 0;
      while (i < args.length) {
        if (args[i] === "--target" && args[i + 1]) {
          const target = args[i + 1] as "cursor" | "claude" | "agents";
          if (["cursor", "claude", "agents"].includes(target)) {
            targets.push(target);
          }
          i += 2;
        } else {
          i++;
        }
      }

      await init({
        projectRoot,
        dryRun,
        silent,
        force,
        targets: targets.length > 0 ? targets : undefined,
      });
    } else {
      // Default: scan
      const open = args.includes("--open");
      const { dashboardPath } = await run({ projectRoot, dryRun, silent });

      if (open && !dryRun) {
        const { exec } = await import("node:child_process");
        const cmd =
          process.platform === "darwin"
            ? "open"
            : process.platform === "win32"
              ? "start"
              : "xdg-open";
        exec(`${cmd} "${dashboardPath}"`);
      }
    }
  } catch (err) {
    console.error(`❌ DS Coverage ${command} failed:`, err);
    process.exit(1);
  }
}

main();
