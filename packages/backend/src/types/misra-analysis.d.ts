/**
 * TypeScript interfaces and enums for MISRA C/C++ analysis
 */
export declare enum AnalysisStatus {
    PENDING = "PENDING",
    PROCESSING = "PROCESSING",
    COMPLETED = "COMPLETED",
    FAILED = "FAILED"
}
export declare enum Language {
    C = "C",
    CPP = "CPP"
}
export interface Violation {
    ruleId: string;
    ruleName: string;
    severity: 'mandatory' | 'required' | 'advisory';
    line: number;
    column: number;
    message: string;
    codeSnippet: string;
}
export interface AnalysisSummary {
    totalViolations: number;
    criticalCount: number;
    majorCount: number;
    minorCount: number;
    compliancePercentage: number;
}
export interface AnalysisResult {
    analysisId: string;
    fileId: string;
    userId: string;
    language: Language;
    violations: Violation[];
    summary: AnalysisSummary;
    createdAt: string;
    status: AnalysisStatus;
    totalRules?: number;
}
