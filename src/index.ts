/**
 * DS Coverage — Public API
 *
 * Programmatic interface for running the scanner, analyzer, and dashboard builder.
 */

import { join, relative } from "node:path";
import { writeFile } from "node:fs/promises";
import { loadConfig, deepMerge } from "./config.js";
import type { DsCoverageConfig } from "./config.js";
import { scan, buildCategorySummary } from "./scanner.js";
import { analyzeComponents } from "./component-analyzer.js";
import { buildRoadmap } from "./roadmap-builder.js";
import { buildDashboard } from "./dashboard-builder.js";
import type { Report } from "./types.js";

export type { DsCoverageConfig } from "./config.js";
export type { Report } from "./types.js";
export { DEFAULT_CONFIG } from "./config.js";
export { init } from "./init.js";
export type { InitOptions } from "./init.js";

export interface RunOptions {
  /** Project root directory (defaults to cwd) */
  projectRoot?: string;
  /** Override config (merged with file config + defaults) */
  config?: Partial<DsCoverageConfig>;
  /** Skip writing files to disk */
  dryRun?: boolean;
  /** Silent mode — no console output */
  silent?: boolean;
}

export interface RunResult {
  report: Report;
  dashboardHtml: string;
  reportJsonPath: string;
  dashboardPath: string;
}

/**
 * Run the full DS coverage scan pipeline.
 */
export async function run(options: RunOptions = {}): Promise<RunResult> {
  const projectRoot = options.projectRoot || process.cwd();

  // Load and merge config (deep merge to preserve nested defaults)
  let config = await loadConfig(projectRoot);
  if (options.config) {
    config = deepMerge(config, options.config);
  }

  const scanDir = join(projectRoot, config.scanDir);
  const log = options.silent ? () => {} : console.log;

  log("🔍 Scanning design system coverage...\n");

  // 1. Scan files
  const { fileReports, fileContents, totalFiles } = await scan(projectRoot, config);
  log(`  Found ${totalFiles} files, scanned ${fileReports.length} (after exclusions)\n`);

  // 2. Analyze component APIs
  const componentApi = analyzeComponents(fileReports, fileContents, scanDir, config);

  // 3. Build roadmap
  const roadmap = buildRoadmap(fileReports, config);

  // 4. Build summary
  const filesWithViolations = fileReports.filter((f) => f.totalViolations > 0);
  const totalViolations = fileReports.reduce((s, f) => s + f.totalViolations, 0);
  const totalFlags = fileReports.reduce((s, f) => s + f.totalFlags, 0);
  const coveragePercent =
    fileReports.length > 0
      ? Math.round(((fileReports.length - filesWithViolations.length) / fileReports.length) * 10000) / 100
      : 100;

  const categories: Record<string, ReturnType<typeof buildCategorySummary>> = {};
  for (const key of Object.keys(config.violations)) {
    if (config.violations[key].enabled) {
      categories[key] = buildCategorySummary(fileReports, key);
    }
  }

  const report: Report = {
    generatedAt: new Date().toISOString(),
    scanDir: relative(projectRoot, scanDir),
    summary: {
      totalFiles,
      totalFilesScanned: fileReports.length,
      totalFilesWithViolations: filesWithViolations.length,
      totalViolations,
      totalFlags,
      coveragePercent,
      categories,
      flags: {
        migrateSimple: fileReports.reduce((s, f) => s + f.flags.migrateSimple.length, 0),
        migrateComplex: fileReports.reduce((s, f) => s + f.flags.migrateComplex.length, 0),
        todo: fileReports.reduce((s, f) => s + f.flags.todo.length, 0),
      },
    },
    roadmap,
    componentApi,
    files: fileReports
      .filter((f) => f.totalViolations > 0 || f.totalFlags > 0)
      .sort((a, b) => b.totalViolations - a.totalViolations),
  };

  // 5. Build dashboard
  const dashboardHtml = await buildDashboard(report, config);

  // 6. Write output files
  const reportJsonPath = join(projectRoot, config.output.reportJson);
  const dashboardPath = join(projectRoot, config.output.dashboardHtml);

  if (!options.dryRun) {
    await writeFile(reportJsonPath, JSON.stringify(report, null, 2), "utf-8");
    await writeFile(dashboardPath, dashboardHtml, "utf-8");
  }

  // 7. Print summary
  log("📊 Design System Coverage Report");
  log("================================\n");
  log(`  Coverage:        ${coveragePercent}% (${fileReports.length - filesWithViolations.length}/${fileReports.length} files compliant)`);
  log(`  Total violations: ${totalViolations}`);
  log(`  Files affected:   ${filesWithViolations.length}\n`);
  log("  By category:");
  for (const [key, cat] of Object.entries(categories)) {
    const label = config.violations[key]?.label || key;
    log(`    ${label.padEnd(14)} ${cat.totalViolations} violations in ${cat.totalFiles} files`);
  }
  log("");
  log("  Flags:");
  log(`    @ds-migrate: simple  → ${report.summary.flags.migrateSimple}`);
  log(`    @ds-migrate: complex → ${report.summary.flags.migrateComplex}`);
  log(`    @ds-todo             → ${report.summary.flags.todo}`);

  if (config.componentAnalysis.enabled) {
    const ca = componentApi.summary;
    log("");
    log("  Component API:");
    log(`    Total:         ${ca.totalComponents} (${Object.entries(ca.byLocation).map(([k, v]) => `${v} ${k}/`).join(", ")})`);
    log(`    Uses CVA:      ${ca.usesCVA}`);
    log(`    Correct API:   ${ca.correctApiNaming}`);
    log(`    Avg compliance: ${ca.avgComplianceScore}%`);
  }

  if (!options.dryRun) {
    log(`\n  Report:    ${relative(projectRoot, reportJsonPath)}`);
    log(`  Dashboard: ${relative(projectRoot, dashboardPath)}\n`);
  }

  return { report, dashboardHtml, reportJsonPath, dashboardPath };
}
