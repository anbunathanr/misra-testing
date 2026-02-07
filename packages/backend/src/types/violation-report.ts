/**
 * Violation Report Types
 * Defines structured report formats for MISRA violations
 */

import { RuleViolation, MisraRuleSet, ViolationSeverity } from './misra-rules';

/**
 * Report format options
 */
export enum ReportFormat {
  JSON = 'json',
  HTML = 'html',
  TEXT = 'text',
  CSV = 'csv',
  PDF = 'pdf'
}

/**
 * Violation grouped by severity
 */
export interface ViolationsBySeverity {
  mandatory: RuleViolation[];
  required: RuleViolation[];
  advisory: RuleViolation[];
}

/**
 * Violation grouped by rule
 */
export interface ViolationsByRule {
  ruleId: string;
  ruleTitle: string;
  severity: ViolationSeverity;
  count: number;
  violations: RuleViolation[];
}

/**
 * Summary statistics for violations
 */
export interface ViolationSummary {
  totalViolations: number;
  mandatoryCount: number;
  requiredCount: number;
  advisoryCount: number;
  uniqueRulesViolated: number;
  mostViolatedRule: string | null;
  averageViolationsPerLine: number;
}

/**
 * Detailed violation report
 */
export interface ViolationReport {
  reportId: string;
  fileId: string;
  fileName: string;
  ruleSet: MisraRuleSet;
  generatedAt: number;
  summary: ViolationSummary;
  violationsBySeverity: ViolationsBySeverity;
  violationsByRule: ViolationsByRule[];
  allViolations: RuleViolation[];
  recommendations: string[];
}

/**
 * Report generation options
 */
export interface ReportOptions {
  format?: ReportFormat;
  includeSummary?: boolean;
  includeRecommendations?: boolean;
  groupBySeverity?: boolean;
  groupByRule?: boolean;
  sortBy?: 'line' | 'severity' | 'rule';
  maxViolationsPerReport?: number;
}

/**
 * Multi-file report for batch analysis
 */
export interface BatchViolationReport {
  reportId: string;
  generatedAt: number;
  totalFiles: number;
  filesAnalyzed: number;
  fileReports: ViolationReport[];
  overallSummary: {
    totalViolations: number;
    totalMandatory: number;
    totalRequired: number;
    totalAdvisory: number;
    filesWithViolations: number;
    filesWithoutViolations: number;
  };
}
