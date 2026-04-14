/**
 * Results Display Service
 * Formats and displays MISRA analysis results with compliance scores and violation categorization
 *
 * Requirements: 4.1, 4.2, 4.5, 7.1
 * Task: 6.1 - Create results display service
 */
export interface ViolationDetail {
    ruleId: string;
    ruleName: string;
    severity: 'mandatory' | 'required' | 'advisory';
    line: number;
    column: number;
    message: string;
    codeSnippet: string;
    category?: string;
}
export interface AnalysisResultInput {
    analysisId: string;
    fileId: string;
    fileName: string;
    language: 'C' | 'CPP';
    violations: ViolationDetail[];
    rulesChecked: number;
    timestamp: number;
    userId: string;
    organizationId?: string;
}
export interface ComplianceScore {
    percentage: number;
    grade: 'A' | 'B' | 'C' | 'D' | 'F';
    status: 'excellent' | 'good' | 'moderate' | 'poor' | 'critical';
}
export interface ViolationCategorization {
    bySeverity: {
        mandatory: ViolationDetail[];
        required: ViolationDetail[];
        advisory: ViolationDetail[];
    };
    counts: {
        mandatory: number;
        required: number;
        advisory: number;
        total: number;
    };
}
export interface FormattedResults {
    analysisId: string;
    fileId: string;
    fileName: string;
    language: 'C' | 'CPP';
    complianceScore: ComplianceScore;
    violations: ViolationCategorization;
    summary: {
        totalViolations: number;
        rulesChecked: number;
        rulesViolated: number;
        compliancePercentage: number;
    };
    timestamp: number;
    reportDownloadUrl?: string;
}
export interface ReportGenerationOptions {
    generatePDF: boolean;
    storageLocation?: string;
    expirationHours?: number;
}
/**
 * Results Display Service
 * Formats analysis results, calculates compliance scores, and generates reports
 */
export declare class ResultsDisplayService {
    private reportGenerator;
    private s3Client;
    private bucketName;
    constructor(bucketName?: string);
    /**
     * Format analysis results matching test system output format
     * Requirement 7.1: Format results matching test system output format
     */
    formatResults(analysisResult: AnalysisResultInput): FormattedResults;
    /**
     * Calculate compliance score and grade
     * Requirement 4.1: Display analysis results with compliance percentage
     */
    calculateComplianceScore(violations: ViolationDetail[], rulesChecked: number): ComplianceScore;
    /**
     * Categorize violations by severity
     * Requirement 4.2: Categorize violations by severity (error/warning/info)
     */
    categorizeViolations(violations: ViolationDetail[]): ViolationCategorization;
    /**
     * Generate downloadable PDF report
     * Requirement 4.5: Generate downloadable PDF reports with executive summary
     * Requirement 7.1: Create downloadable PDF report generation using existing infrastructure
     */
    generateDownloadableReport(analysisResult: AnalysisResultInput, options?: ReportGenerationOptions): Promise<string>;
    /**
     * Convert analysis result to format expected by ReportGenerator
     */
    private convertToReportFormat;
    /**
     * Format results for test system output compatibility
     * Matches the exact format used in test-button.html
     */
    formatForTestSystem(analysisResult: AnalysisResultInput): {
        success: boolean;
        complianceScore: number;
        violations: ViolationDetail[];
        summary: {
            total: number;
            mandatory: number;
            required: number;
            advisory: number;
        };
        timestamp: string;
    };
}
