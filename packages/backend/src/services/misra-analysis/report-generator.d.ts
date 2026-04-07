/**
 * Report Generator for MISRA Analysis Results
 * Generates PDF reports with executive summary and detailed violations
 *
 * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
 */
import { AnalysisResult } from '../../types/misra-analysis';
export declare class ReportGenerator {
    /**
     * Generate PDF report for MISRA analysis results
     * Requirements: 8.1, 8.2, 8.3, 8.4, 8.5
     */
    generatePDF(analysisResult: AnalysisResult, fileName: string): Promise<Buffer>;
    /**
     * Add title page to the report
     */
    private addTitlePage;
    /**
     * Add executive summary section
     * Requirements: 8.1, 8.2, 8.3
     * - 8.1: Include executive summary section
     * - 8.2: Show compliance percentage
     * - 8.3: Show severity breakdown
     */
    private addExecutiveSummary;
    /**
     * Add detailed violations section
     * Requirements: 8.4, 8.5
     * - 8.4: Group violations by severity
     * - 8.5: Include code snippets
     */
    private addDetailedViolations;
    /**
     * Add a section for violations of a specific severity
     */
    private addViolationSection;
    /**
     * Group violations by severity
     */
    private groupBySeverity;
    /**
     * Get color based on compliance percentage
     */
    private getComplianceColor;
    /**
     * Get assessment text based on compliance percentage
     */
    private getAssessment;
    /**
     * Calculate height needed for code snippet box
     */
    private calculateSnippetHeight;
}
