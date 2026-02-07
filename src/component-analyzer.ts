/**
 * DS Coverage — Component API Analyzer
 *
 * Analyzes reusable components for API compliance:
 * CVA usage, prop naming, size values, Radix, compoundVariants, etc.
 */

import { relative } from "node:path";
import type { DsCoverageConfig, ComponentApiConfig } from "./config.js";
import type {
  ComponentApiReport,
  ComponentApiIssue,
  ComponentApiSummary,
  FileReport,
} from "./types.js";

// ============================================
// COMPONENT ANALYSIS
// ============================================

function analyzeComponent(
  content: string,
  relativePath: string,
  apiConfig: ComponentApiConfig,
): ComponentApiReport | null {
  // Determine location
  let location = "other";
  for (const dir of apiConfig.directories) {
    if (relativePath.startsWith(dir)) {
      location = dir === apiConfig.primaryDirectory ? "primary" : dir.replace(/\/$/, "").split("/").pop() || "legacy";
      break;
    }
  }
  if (location === "other") return null;

  // Skip index/barrel files and helper files
  if (relativePath.endsWith("index.ts") || relativePath.endsWith("index.tsx")) return null;
  if (/\/(helpers|types|utils|constants)\.(ts|tsx)$/.test(relativePath)) return null;

  // Extract component name
  const exportMatch = content.match(/export\s+(?:function|const)\s+(\w+)/);
  const defaultExportMatch = content.match(/export\s+\{\s*(\w+)/);
  const name =
    exportMatch?.[1] ||
    defaultExportMatch?.[1] ||
    relativePath.split("/").pop()?.replace(/\.tsx?$/, "") ||
    "Unknown";

  // === Feature detection ===
  const usesCVA = /\bcva\s*\(/.test(content) || /from\s+["']class-variance-authority["']/.test(content);
  const usesRadix = /from\s+["'](?:@radix-ui|radix-ui)/.test(content);
  const hasClassName = /\bclassName[\s?:,})]/.test(content);
  const hasAsChild = /\basChild\b/.test(content);
  const usesCompoundVariants = /compoundVariants/.test(content);

  // Extract variant prop names from CVA
  const variantProps: string[] = [];
  const cvaVariantsMatch = content.match(/variants\s*:\s*\{([\s\S]*?)\n\s*\}/);
  if (cvaVariantsMatch) {
    const propNames = cvaVariantsMatch[1].match(/^\s*(\w+)\s*:/gm);
    if (propNames) {
      for (const p of propNames) {
        const clean = p.trim().replace(":", "").trim();
        if (clean && !["class", "className"].includes(clean)) {
          variantProps.push(clean);
        }
      }
    }
  }

  // Extract size values
  const sizeValues: string[] = [];
  const sizeBlockMatch = content.match(/size\s*:\s*\{([\s\S]*?)\}/);
  if (sizeBlockMatch) {
    const sizeKeys = sizeBlockMatch[1].match(/^\s*["']?(\w[\w-]*)["']?\s*:/gm);
    if (sizeKeys) {
      for (const k of sizeKeys) {
        const clean = k.trim().replace(/["':]/g, "").trim();
        if (clean) sizeValues.push(clean);
      }
    }
  }

  // Extract variant/appearance/hierarchy values
  const variantValues: string[] = [];
  const propsToSearch = [...apiConfig.api.expectedProps, ...apiConfig.api.forbiddenProps];
  for (const propName of propsToSearch) {
    if (propName === "size") continue; // already extracted
    const propBlockMatch = content.match(new RegExp(`${propName}\\s*:\\s*\\{([\\s\\S]*?)\\}`, "m"));
    if (propBlockMatch) {
      const keys = propBlockMatch[1].match(/^\s*["']?(\w[\w-]*)["']?\s*:/gm);
      if (keys) {
        for (const k of keys) {
          const clean = k.trim().replace(/["':]/g, "").trim();
          if (clean) variantValues.push(clean);
        }
      }
    }
  }

  // === Issue detection ===
  const issues: ComponentApiIssue[] = [];
  const forbiddenPropsSet = new Set(apiConfig.api.forbiddenProps);
  const forbiddenSizesSet = new Set(apiConfig.api.forbiddenSizes);
  const legacyValuesSet = new Set(apiConfig.api.legacyVariantValues);

  // CVA check (only for primary directory)
  if (!usesCVA && apiConfig.api.requireCVA && relativePath.startsWith(apiConfig.primaryDirectory)) {
    issues.push({
      type: "cva",
      severity: "error",
      message: "Component should use CVA for variant management",
    });
  }

  // className check
  if (!hasClassName) {
    issues.push({
      type: "props",
      severity: "warning",
      message: "Missing className prop for composition",
    });
  }

  // Forbidden prop names
  for (const prop of variantProps) {
    if (forbiddenPropsSet.has(prop)) {
      const expected = apiConfig.api.expectedProps.filter((p) => p !== "size").join("' + '");
      issues.push({
        type: "naming",
        severity: "error",
        message: `Uses '${prop}' prop — should use '${expected}' pattern`,
      });
    }
  }

  // compoundVariants check
  if (usesCVA) {
    const hasExpectedPair = apiConfig.api.expectedProps.filter((p) => p !== "size").every((p) => variantProps.includes(p));
    if (hasExpectedPair && !usesCompoundVariants) {
      issues.push({
        type: "compound",
        severity: "warning",
        message: `Has ${apiConfig.api.expectedProps.filter((p) => p !== "size").join(" + ")} but no compoundVariants`,
      });
    }
  }

  // Size values check
  const badSizes = sizeValues.filter((v) => forbiddenSizesSet.has(v));
  if (badSizes.length > 0) {
    issues.push({
      type: "sizes",
      severity: "error",
      message: `Size values use abbreviations: ${badSizes.join(", ")} — should use full words (${apiConfig.api.expectedSizes.join(", ")})`,
    });
  }

  // Legacy variant values check
  const badVariants = variantValues.filter((v) => legacyValuesSet.has(v));
  if (badVariants.length > 0) {
    issues.push({
      type: "variants",
      severity: "error",
      message: `Uses legacy variant values: ${badVariants.join(", ")}`,
    });
  }

  // === Compliance score ===
  const w = apiConfig.scoring;
  let score = 0;

  if (usesCVA) score += w.usesCVA;
  if (!variantProps.some((p) => forbiddenPropsSet.has(p))) score += w.correctNaming;
  if (sizeValues.length === 0 || badSizes.length === 0) score += w.correctSizes;
  if (hasClassName) score += w.hasClassName;
  if (usesCompoundVariants || !usesCVA) score += w.usesCompoundVariants;
  if (hasAsChild || !usesRadix) score += w.hasAsChild;
  // Radix bonus: given to Radix users, or components not in the primary directory (legacy/other don't need Radix)
  if (usesRadix || !relativePath.startsWith(apiConfig.primaryDirectory)) score += w.usesRadix;

  return {
    path: relativePath,
    name,
    location,
    usesCVA,
    usesRadix,
    hasClassName,
    hasAsChild,
    usesCompoundVariants,
    variantProps,
    sizeValues,
    variantValues,
    issues,
    complianceScore: Math.min(100, score),
    tokenCoverage: {
      score: 100,
      totalLines: 0,
      violationLines: 0,
      violations: {},
      totalViolations: 0,
    },
  };
}

// ============================================
// PUBLIC API
// ============================================

export function analyzeComponents(
  fileReports: FileReport[],
  fileContents: Map<string, string>,
  scanDir: string,
  config: DsCoverageConfig,
): { summary: ComponentApiSummary; components: ComponentApiReport[] } {
  if (!config.componentAnalysis.enabled) {
    return {
      summary: {
        totalComponents: 0,
        byLocation: {},
        usesCVA: 0,
        usesRadix: 0,
        hasClassName: 0,
        hasAsChild: 0,
        usesCompoundVariants: 0,
        correctApiNaming: 0,
        correctSizeValues: 0,
        avgComplianceScore: 0,
        compliantCount: 0,
        avgTokenScore: 100,
        tokenCompliantCount: 0,
      },
      components: [],
    };
  }

  const components: ComponentApiReport[] = [];
  const apiConfig = config.componentAnalysis;
  const forbiddenSizesSet = new Set(apiConfig.api.forbiddenSizes);

  // Build file report lookup
  const reportMap = new Map<string, FileReport>();
  for (const fr of fileReports) {
    reportMap.set(fr.path, fr);
  }

  for (const [filePath, content] of fileContents) {
    const relativePath = relative(scanDir, filePath);

    // Only analyze component directories
    const isInComponentDir = apiConfig.directories.some((dir) => relativePath.startsWith(dir));
    if (!isInComponentDir) continue;
    if (!filePath.endsWith(".tsx")) continue;

    const report = analyzeComponent(content, relativePath, apiConfig);
    if (!report) continue;

    // Compute token coverage from violation data
    const fr = reportMap.get(relativePath);
    const totalLines = content.split("\n").length;

    if (fr) {
      const violationLineSet = new Set<number>();
      for (const [, violations] of Object.entries(fr.violations)) {
        for (const v of violations) violationLineSet.add(v.line);
      }

      const violationLines = violationLineSet.size;
      const violationCounts: Record<string, number> = {};
      for (const [key, violations] of Object.entries(fr.violations)) {
        violationCounts[key] = violations.length;
      }

      report.tokenCoverage = {
        score: totalLines > 0 ? Math.round(((totalLines - violationLines) / totalLines) * 10000) / 100 : 100,
        totalLines,
        violationLines,
        violations: violationCounts,
        totalViolations: fr.totalViolations,
      };
    } else {
      report.tokenCoverage = {
        score: 100,
        totalLines,
        violationLines: 0,
        violations: {},
        totalViolations: 0,
      };
    }

    components.push(report);
  }

  // Sort by compliance score ascending
  components.sort((a, b) => a.complianceScore - b.complianceScore);

  // Build summary
  const byLocation: Record<string, number> = {};
  for (const c of components) {
    byLocation[c.location] = (byLocation[c.location] || 0) + 1;
  }

  const forbiddenPropsSet = new Set(apiConfig.api.forbiddenProps);

  const summary: ComponentApiSummary = {
    totalComponents: components.length,
    byLocation,
    usesCVA: components.filter((c) => c.usesCVA).length,
    usesRadix: components.filter((c) => c.usesRadix).length,
    hasClassName: components.filter((c) => c.hasClassName).length,
    hasAsChild: components.filter((c) => c.hasAsChild).length,
    usesCompoundVariants: components.filter((c) => c.usesCompoundVariants).length,
    correctApiNaming: components.filter((c) => !c.variantProps.some((p) => forbiddenPropsSet.has(p))).length,
    correctSizeValues: components.filter((c) => !c.sizeValues.some((v) => forbiddenSizesSet.has(v))).length,
    avgComplianceScore: components.length > 0
      ? Math.round(components.reduce((sum, c) => sum + c.complianceScore, 0) / components.length)
      : 0,
    compliantCount: components.filter((c) => c.complianceScore >= 80).length,
    avgTokenScore: components.length > 0
      ? Math.round(components.reduce((sum, c) => sum + c.tokenCoverage.score, 0) / components.length * 100) / 100
      : 100,
    tokenCompliantCount: components.filter((c) => c.tokenCoverage.totalViolations === 0).length,
  };

  return { summary, components };
}
