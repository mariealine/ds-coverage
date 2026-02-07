/**
 * DS Coverage — Core Scanner
 *
 * Scans files for design system violations based on configurable patterns.
 * Zero dependencies — uses only Node.js built-ins.
 */

import { readdir, readFile } from "node:fs/promises";
import { join, relative, extname } from "node:path";
import type { DsCoverageConfig } from "./config.js";
import type { Violation, FileReport, CategorySummary } from "./types.js";

// ============================================
// FILE DISCOVERY
// ============================================

async function discoverFiles(
  scanDir: string,
  extensions: string[],
  exclude: string[],
): Promise<string[]> {
  const files: string[] = [];

  async function walk(dir: string): Promise<void> {
    const entries = await readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      const fullPath = join(dir, entry.name);
      const relativePath = relative(scanDir, fullPath);

      // Check exclusions
      if (exclude.some((exc) => relativePath.includes(exc))) continue;

      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (extensions.includes(extname(entry.name))) {
        files.push(fullPath);
      }
    }
  }

  await walk(scanDir);
  return files;
}

// ============================================
// VIOLATION DETECTION
// ============================================

function findViolations(
  content: string,
  patternStr: string,
  scanComments: boolean,
): Violation[] {
  const violations: Violation[] = [];
  const lines = content.split("\n");
  const pattern = new RegExp(patternStr, "g");

  for (let lineIdx = 0; lineIdx < lines.length; lineIdx++) {
    const line = lines[lineIdx];
    const trimmedLine = line.trim();

    // Skip comment-only lines unless scanning for flags
    if (!scanComments) {
      if (
        trimmedLine.startsWith("//") ||
        trimmedLine.startsWith("/*") ||
        trimmedLine.startsWith("*")
      ) {
        continue;
      }
    }

    // Reset regex state
    pattern.lastIndex = 0;
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(line)) !== null) {
      violations.push({
        line: lineIdx + 1,
        column: match.index + 1,
        match: match[0],
        context: trimmedLine.slice(0, 120),
      });
    }
  }

  return violations;
}

// ============================================
// FILE SCANNING
// ============================================

/**
 * Deduplicate violations by line number.
 * When multiple matches exist on the same line, merge them into one violation
 * (concatenating the match strings).
 */
function deduplicateByLine(violations: Violation[]): Violation[] {
  const byLine = new Map<number, Violation>();
  for (const v of violations) {
    if (byLine.has(v.line)) {
      const existing = byLine.get(v.line)!;
      existing.match = `${existing.match}, ${v.match}`;
    } else {
      byLine.set(v.line, { ...v });
    }
  }
  return Array.from(byLine.values()).sort((a, b) => a.line - b.line);
}

function scanFileContent(
  content: string,
  relativePath: string,
  config: DsCoverageConfig,
): FileReport {
  const allViolations: Record<string, Violation[]> = {};
  let totalViolations = 0;

  // Scan each violation category
  for (const [key, catConfig] of Object.entries(config.violations)) {
    if (!catConfig.enabled) continue;
    let violations = findViolations(content, catConfig.pattern, false);
    if (catConfig.deduplicateByLine) {
      violations = deduplicateByLine(violations);
    }
    allViolations[key] = violations;
    totalViolations += violations.length;
  }

  // Scan flags (always in comments)
  const migrateSimple = findViolations(content, config.flags.migrateSimple, true);
  const migrateComplex = findViolations(content, config.flags.migrateComplex, true);
  const todo = findViolations(content, config.flags.todo, true);
  const totalFlags = migrateSimple.length + migrateComplex.length + todo.length;

  return {
    path: relativePath,
    violations: allViolations,
    flags: { migrateSimple, migrateComplex, todo },
    totalViolations,
    totalFlags,
  };
}

// ============================================
// SUMMARY BUILDER
// ============================================

export function buildCategorySummary(
  files: FileReport[],
  categoryKey: string,
): CategorySummary {
  const filesWithViolations = files.filter(
    (f) => (f.violations[categoryKey]?.length || 0) > 0,
  );
  const totalViolations = filesWithViolations.reduce(
    (sum, f) => sum + (f.violations[categoryKey]?.length || 0),
    0,
  );
  const topFiles = filesWithViolations
    .map((f) => ({ path: f.path, count: f.violations[categoryKey]?.length || 0 }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 20);

  return { totalFiles: filesWithViolations.length, totalViolations, topFiles };
}

// ============================================
// PUBLIC API
// ============================================

export interface ScanResult {
  fileReports: FileReport[];
  /** Map of absolute file path → file content */
  fileContents: Map<string, string>;
  /** All discovered file paths (before exclusions) */
  totalFiles: number;
}

export async function scan(
  projectRoot: string,
  config: DsCoverageConfig,
): Promise<ScanResult> {
  const scanDir = join(projectRoot, config.scanDir);
  const filePaths = await discoverFiles(scanDir, config.extensions, config.exclude);

  // Read all file contents
  const fileContents = new Map<string, string>();
  await Promise.all(
    filePaths.map(async (fp) => {
      const content = await readFile(fp, "utf-8");
      fileContents.set(fp, content);
    }),
  );

  // Scan each file
  const fileReports: FileReport[] = [];
  for (const [fp, content] of fileContents) {
    const relativePath = relative(scanDir, fp);
    const report = scanFileContent(content, relativePath, config);
    fileReports.push(report);
  }

  return {
    fileReports,
    fileContents,
    totalFiles: filePaths.length,
  };
}
