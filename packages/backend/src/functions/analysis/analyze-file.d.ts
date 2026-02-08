/**
 * Lambda function for MISRA file analysis
 * Triggered by Step Functions workflow or direct invocation
 */
import { MisraRuleSet } from '../../types/misra-rules';
interface AnalyzeFileEvent {
    fileId: string;
    fileName: string;
    s3Key: string;
    fileType: string;
    ruleSet?: MisraRuleSet;
    userId?: string;
    organizationId?: string;
    userEmail?: string;
}
export declare const handler: (event: AnalyzeFileEvent) => Promise<{
    statusCode: number;
    status: string;
    error: string;
    fileId?: undefined;
    analysisId?: undefined;
    results?: undefined;
    violations?: undefined;
    report?: undefined;
    errorId?: undefined;
} | {
    statusCode: number;
    status: string;
    fileId: string;
    analysisId: string;
    results: {
        violations_count: number;
        rules_checked: string[];
        completion_timestamp: number;
    };
    violations: import("../../types/misra-rules").RuleViolation[];
    report: {
        summary: import("../../types/violation-report").ViolationSummary;
        recommendations: string[];
        violationsByRule: {
            ruleId: string;
            ruleTitle: string;
            count: number;
        }[];
    };
    error?: undefined;
    errorId?: undefined;
} | {
    statusCode: number;
    status: string;
    fileId: string;
    analysisId: string;
    error: string | undefined;
    results?: undefined;
    violations?: undefined;
    report?: undefined;
    errorId?: undefined;
} | {
    statusCode: number;
    status: string;
    fileId: string;
    analysisId: string;
    errorId: string;
    error: string;
    results?: undefined;
    violations?: undefined;
    report?: undefined;
} | {
    statusCode: number;
    status: string;
    fileId: string;
    error: string;
    analysisId?: undefined;
    results?: undefined;
    violations?: undefined;
    report?: undefined;
    errorId?: undefined;
}>;
export {};
