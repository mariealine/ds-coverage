/**
 * DS Coverage — Roadmap Builder
 *
 * Generates migration phases from scan results based on config.
 */

import type { DsCoverageConfig } from "./config.js";
import type { FileReport, Roadmap, RoadmapPhase, DirectorySummary } from "./types.js";

// ============================================
// ROADMAP GENERATION
// ============================================

function buildPhase(
  phaseConfig: DsCoverageConfig["roadmap"]["phases"][number],
  fileReports: FileReport[],
  config: DsCoverageConfig,
): RoadmapPhase | null {
  let matchedFiles: { path: string; count: number }[] = [];

  const filter = phaseConfig.filter;

  switch (filter.type) {
    case "flags": {
      const flagged = fileReports.filter((f) => f.totalFlags > 0);
      matchedFiles = flagged.map((f) => ({ path: f.path, count: f.totalFlags }));
      break;
    }
    case "directory": {
      const dirFiles = fileReports.filter(
        (f) => f.totalViolations > 0 && f.path.startsWith(filter.prefix),
      );
      matchedFiles = dirFiles.map((f) => ({ path: f.path, count: f.totalViolations }));
      break;
    }
    case "category": {
      const catFiles = fileReports.filter(
        (f) => (f.violations[filter.key]?.length || 0) > 0,
      );
      matchedFiles = catFiles.map((f) => ({
        path: f.path,
        count: f.violations[filter.key]?.length || 0,
      }));
      break;
    }
    case "quickWins": {
      const threshold = config.roadmap.quickWinThreshold;
      const qw = fileReports.filter(
        (f) => f.totalViolations > 0 && f.totalViolations <= threshold,
      );
      matchedFiles = qw.map((f) => ({ path: f.path, count: f.totalViolations }));
      break;
    }
    case "all": {
      const all = fileReports.filter((f) => f.totalViolations > 0);
      matchedFiles = all.map((f) => ({ path: f.path, count: f.totalViolations }));
      break;
    }
  }

  if (matchedFiles.length === 0) return null;

  // Sort by count descending and limit
  matchedFiles.sort((a, b) => b.count - a.count);
  const limitedFiles = matchedFiles.slice(0, config.roadmap.maxFilesPerPhase);

  const totalViolations = matchedFiles.reduce((s, f) => s + f.count, 0);

  // Dynamic description for quickWins
  let description = phaseConfig.description;
  if (filter.type === "quickWins") {
    description = `${matchedFiles.length} files can be fully migrated with minimal effort. Each needs only 1-${config.roadmap.quickWinThreshold} changes.`;
  }

  return {
    id: phaseConfig.id,
    title: phaseConfig.title,
    description,
    businessCase: phaseConfig.businessCase,
    filesCount: matchedFiles.length,
    violationsCount: totalViolations,
    files: limitedFiles,
  };
}

function buildDirectories(fileReports: FileReport[], config: DsCoverageConfig): DirectorySummary[] {
  const dirMap = new Map<string, { files: FileReport[]; allFiles: number }>();

  for (const f of fileReports) {
    const parts = f.path.split("/");
    const depth = Math.min(parts.length - 1, 3);
    const dir = parts.slice(0, depth).join("/");
    if (!dirMap.has(dir)) dirMap.set(dir, { files: [], allFiles: 0 });
    const entry = dirMap.get(dir)!;
    entry.allFiles++;
    if (f.totalViolations > 0 || f.totalFlags > 0) entry.files.push(f);
  }

  const categoryKeys = Object.keys(config.violations).filter(
    (k) => config.violations[k].enabled,
  );

  return Array.from(dirMap.entries())
    .map(([path, { files, allFiles }]) => {
      const filesWithV = files.filter((f) => f.totalViolations > 0);
      const totalV = filesWithV.reduce((s, f) => s + f.totalViolations, 0);
      const categories: Record<string, number> = {};
      for (const key of categoryKeys) {
        categories[key] = filesWithV.reduce(
          (s, f) => s + (f.violations[key]?.length || 0),
          0,
        );
      }
      return {
        path,
        totalFiles: allFiles,
        filesWithViolations: filesWithV.length,
        totalViolations: totalV,
        coveragePercent:
          allFiles > 0
            ? Math.round(((allFiles - filesWithV.length) / allFiles) * 10000) / 100
            : 100,
        categories,
      };
    })
    .filter((d) => d.totalViolations > 0)
    .sort((a, b) => b.totalViolations - a.totalViolations);
}

// ============================================
// PUBLIC API
// ============================================

export function buildRoadmap(
  fileReports: FileReport[],
  config: DsCoverageConfig,
): Roadmap {
  if (!config.roadmap.enabled) {
    return { phases: [], directories: [], quickWins: [] };
  }

  // Build phases from config
  const phases: RoadmapPhase[] = [];
  for (const phaseConfig of config.roadmap.phases) {
    const phase = buildPhase(phaseConfig, fileReports, config);
    if (phase) phases.push(phase);
  }

  // Build directory summaries
  const directories = buildDirectories(fileReports, config);

  // Quick wins list
  const threshold = config.roadmap.quickWinThreshold;
  const quickWins = fileReports
    .filter((f) => f.totalViolations > 0 && f.totalViolations <= threshold)
    .map((f) => ({ path: f.path, violations: f.totalViolations }))
    .sort((a, b) => a.violations - b.violations);

  return { phases, directories, quickWins };
}
