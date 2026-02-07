/**
 * DS Coverage — Init
 *
 * Scaffolds AI guidelines (rules + skills) into the project.
 * Supports Cursor (.cursor/rules/), Claude (.claude/skills/),
 * and generic agents (.agents/skills/).
 */

import { mkdir, writeFile, access } from "node:fs/promises";
import { join, dirname } from "node:path";
import { loadConfig } from "./config.js";
import type { DsCoverageConfig } from "./config.js";
import { generateComplianceRule } from "./templates/compliance-rule.js";
import { generateComponentRule } from "./templates/component-rule.js";
import { generateSkill } from "./templates/skill.js";

export interface InitOptions {
  projectRoot?: string;
  /** Override config (merged with file config + defaults) */
  config?: Partial<DsCoverageConfig>;
  /** Only generate for specific targets */
  targets?: Array<"cursor" | "claude" | "agents">;
  /** Silent mode */
  silent?: boolean;
  /** Dry run — show what would be created without writing */
  dryRun?: boolean;
  /** Force overwrite existing files */
  force?: boolean;
}

interface GeneratedFile {
  path: string;
  relativePath: string;
  content: string;
  skipped: boolean;
  reason?: string;
}

const ALL_TARGETS = ["cursor", "claude", "agents"] as const;

export async function init(options: InitOptions = {}): Promise<GeneratedFile[]> {
  const projectRoot = options.projectRoot || process.cwd();
  const targets = options.targets || [...ALL_TARGETS];
  const log = options.silent ? () => {} : console.log;

  // Load config
  let config = await loadConfig(projectRoot);
  if (options.config) {
    const { deepMerge } = await import("./config.js");
    config = deepMerge(config, options.config);
  }

  log("📐 Initializing DS Coverage AI guidelines...\n");

  // Generate content
  const complianceRule = generateComplianceRule(config);
  const componentRule = config.componentAnalysis.enabled
    ? generateComponentRule(config)
    : null;
  const skill = generateSkill(config);

  // Define all files to generate
  const filesToGenerate: Array<{
    target: string;
    relativePath: string;
    content: string;
  }> = [];

  for (const target of targets) {
    switch (target) {
      case "cursor":
        filesToGenerate.push({
          target: "cursor",
          relativePath: ".cursor/rules/design-system-compliance.md",
          content: complianceRule,
        });
        if (componentRule) {
          filesToGenerate.push({
            target: "cursor",
            relativePath: ".cursor/rules/ui-component-creation.md",
            content: componentRule,
          });
        }
        filesToGenerate.push({
          target: "cursor",
          relativePath: ".cursor/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;

      case "claude":
        filesToGenerate.push({
          target: "claude",
          relativePath: ".claude/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;

      case "agents":
        filesToGenerate.push({
          target: "agents",
          relativePath: ".agents/skills/design-system-compliance/SKILL.md",
          content: skill,
        });
        break;
    }
  }

  // Write files
  const results: GeneratedFile[] = [];

  for (const file of filesToGenerate) {
    const fullPath = join(projectRoot, file.relativePath);

    // Check if file exists
    let exists = false;
    try {
      await access(fullPath);
      exists = true;
    } catch {
      exists = false;
    }

    if (exists && !options.force) {
      results.push({
        path: fullPath,
        relativePath: file.relativePath,
        content: file.content,
        skipped: true,
        reason: "File already exists. Use --force to overwrite.",
      });
      log(`  ⏭  ${file.relativePath} (skipped — already exists)`);
      continue;
    }

    if (options.dryRun) {
      results.push({
        path: fullPath,
        relativePath: file.relativePath,
        content: file.content,
        skipped: false,
      });
      log(`  📝 ${file.relativePath} (dry run — would create)`);
      continue;
    }

    // Create directory and write file
    await mkdir(dirname(fullPath), { recursive: true });
    await writeFile(fullPath, file.content, "utf-8");

    results.push({
      path: fullPath,
      relativePath: file.relativePath,
      content: file.content,
      skipped: false,
    });
    log(`  ✅ ${file.relativePath}`);
  }

  // Summary
  const created = results.filter((r) => !r.skipped);
  const skipped = results.filter((r) => r.skipped);

  log("");
  if (created.length > 0) {
    log(`  ${options.dryRun ? "Would create" : "Created"} ${created.length} file(s)`);
  }
  if (skipped.length > 0) {
    log(`  Skipped ${skipped.length} file(s) (use --force to overwrite)`);
  }
  log("");

  if (!options.dryRun && created.length > 0) {
    log("  💡 These files are generated from your ds-coverage.config.");
    log("     Re-run `npx ds-coverage init --force` after changing your config.\n");
  }

  return results;
}
