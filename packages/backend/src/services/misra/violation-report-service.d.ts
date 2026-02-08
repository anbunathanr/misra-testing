/**
 * Violation Report Service
 * Generates structured violation reports with detailed analysis
 */
import { ViolationReport, ReportOptions, BatchViolationReport } from '../../types/violation-report';
import { AnalysisResult } from '../../types/misra-rules';
export declare class ViolationReportService {
    /**
     * Generate a detailed violation report from analysis results
     */
    generateReport(analysisResult: AnalysisResult, options?: ReportOptions): ViolationReport;
    /**
     * Generate a batch report for multiple files
     */
    generateBatchReport(analysisResults: AnalysisResult[], options?: ReportOptions): BatchViolationReport;
    /**
     * Generate summary statistics
     */
    private generateSummary;
    /**
     * Group violations by severity
     */
    private groupBySeverity;
    /**
     * Group violations by rule
     */
    private groupByRule;
    /**
     * Sort violations by specified criteria
     */
    private sortViolations;
    /**
     * Generate actionable recommendations based on violations
     */
    private generateRecommendations;
    /**
     * Format report as text
     */
    formatAsText(report: ViolationReport): string;
    /**
     * Format report as CSV
     */
    formatAsCSV(report: ViolationReport): string;
    /**
     * Helper methods for empty structures
     */
    private getEmptySummary;
    private getEmptyBySeverity;
}
