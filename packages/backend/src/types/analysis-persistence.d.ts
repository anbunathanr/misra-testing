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
    analysisId: string;
    fileId: string;
    userId: string;
    organizationId?: string;
    fileName: string;
    ruleSet: MisraRuleSet;
    timestamp: number;
    violationsCount: number;
    rulesChecked: string[];
    violations: StoredViolation[];
    success: boolean;
    errorMessage?: string;
    createdAt: number;
    updatedAt: number;
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
