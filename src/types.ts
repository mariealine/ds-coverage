/**
 * DS Coverage — Shared Types
 *
 * All types used across the scanner, analyzer, and dashboard.
 */

// ============================================
// VIOLATION TYPES
// ============================================

export interface Violation {
  line: number;
  column: number;
  match: string;
  /** Trimmed line content (max 120 chars) */
  context: string;
}

export interface FileReport {
  /** Relative path from scanDir */
  path: string;
  violations: Record<string, Violation[]>;
  flags: {
    migrateSimple: Violation[];
    migrateComplex: Violation[];
    todo: Violation[];
  };
  totalViolations: number;
  totalFlags: number;
}

// ============================================
// SUMMARY TYPES
// ============================================

export interface CategorySummary {
  totalFiles: number;
  totalViolations: number;
  topFiles: { path: string; count: number }[];
}

export interface DirectorySummary {
  path: string;
  totalFiles: number;
  filesWithViolations: number;
  totalViolations: number;
  coveragePercent: number;
  categories: Record<string, number>;
}

// ============================================
// ROADMAP TYPES
// ============================================

export interface RoadmapPhase {
  id: string;
  title: string;
  description: string;
  businessCase: string;
  filesCount: number;
  violationsCount: number;
  files: { path: string; count: number }[];
}

export interface Roadmap {
  phases: RoadmapPhase[];
  directories: DirectorySummary[];
  quickWins: { path: string; violations: number }[];
}

// ============================================
// COMPONENT API TYPES
// ============================================

export interface ComponentApiReport {
  path: string;
  name: string;
  location: string;
  usesCVA: boolean;
  usesRadix: boolean;
  hasClassName: boolean;
  hasAsChild: boolean;
  usesCompoundVariants: boolean;
  variantProps: string[];
  sizeValues: string[];
  variantValues: string[];
  issues: ComponentApiIssue[];
  complianceScore: number;
  tokenCoverage: TokenCoverage;
}

export interface ComponentApiIssue {
  type: string;
  severity: "error" | "warning";
  message: string;
}

export interface TokenCoverage {
  score: number;
  totalLines: number;
  violationLines: number;
  violations: Record<string, number>;
  totalViolations: number;
}

export interface ComponentApiSummary {
  totalComponents: number;
  byLocation: Record<string, number>;
  usesCVA: number;
  usesRadix: number;
  hasClassName: number;
  hasAsChild: number;
  usesCompoundVariants: number;
  correctApiNaming: number;
  correctSizeValues: number;
  avgComplianceScore: number;
  compliantCount: number;
  avgTokenScore: number;
  tokenCompliantCount: number;
}

// ============================================
// REPORT TYPE
// ============================================

export interface Report {
  generatedAt: string;
  scanDir: string;
  summary: {
    totalFiles: number;
    totalFilesScanned: number;
    totalFilesWithViolations: number;
    totalViolations: number;
    totalFlags: number;
    coveragePercent: number;
    categories: Record<string, CategorySummary>;
    flags: {
      migrateSimple: number;
      migrateComplex: number;
      todo: number;
    };
  };
  roadmap: Roadmap;
  componentApi: {
    summary: ComponentApiSummary;
    components: ComponentApiReport[];
  };
  files: FileReport[];
}
