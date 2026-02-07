/**
 * Analysis Persistence Types
 * Defines data models for storing analysis results in DynamoDB
 */

import { MisraRuleSet, ViolationSeverity } from './misra-rules';

/**
 * Stored violation record
 */
export interface StoredViolation {
  ruleId: string;
  ruleSet: MisraRuleSet;
  severity: ViolationSeverity;
  lineNumber: number;
  columnNumber?: number;
  message: string;
  codeSnippet: string;
  recommendation: string;
}

/**
 * Stored analysis result
 */
export interface StoredAnalysisResult {
  analysisId: string;           // UUID - Primary key
  fileId: string;               // File being analyzed
  userId: string;               // User who initiated analysis
  organizationId?: string;      // Optional organization
  fileName: string;             // Original filename
  ruleSet: MisraRuleSet;       // Rule set used
  timestamp: number;            // Analysis completion time (sort key)
  violationsCount: number;      // Total violations found
  rulesChecked: string[];       // Rules that were checked
  violations: StoredViolation[]; // All violations
  success: boolean;             // Whether analysis succeeded
  errorMessage?: string;        // Error if failed
  createdAt: number;            // Record creation time
  updatedAt: number;            // Last update time
}

/**
 * Query filters for analysis results
 */
export interface AnalysisQueryFilters {
  fileId?: string;
  userId?: string;
  ruleSet?: MisraRuleSet;
  startDate?: number;
  endDate?: number;
  minViolations?: number;
  maxViolations?: number;
  successOnly?: boolean;
}

/**
 * Pagination options for queries
 */
export interface AnalysisPaginationOptions {
  limit?: number;
  exclusiveStartKey?: any;
}

/**
 * Paginated analysis results
 */
export interface PaginatedAnalysisResults {
  items: StoredAnalysisResult[];
  lastEvaluatedKey?: any;
  count: number;
  scannedCount?: number;
}
