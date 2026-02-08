/**
 * MISRA Rule Engine Service
 * Core service for analyzing code against MISRA standards
 */
import { AnalysisConfig, AnalysisResult } from '../../types/misra-rules';
export declare class MisraRuleEngine {
    private config;
    constructor(config: AnalysisConfig);
    /**
     * Analyze source code against MISRA rules
     */
    analyzeCode(fileId: string, fileName: string, sourceCode: string): Promise<AnalysisResult>;
    /**
     * Get rules to check based on configuration
     */
    private getRulesToCheck;
    /**
     * Perform line-by-line analysis of source code
     */
    private performAnalysis;
    /**
     * Check a specific rule against a line of code
     */
    private checkRuleAgainstLine;
    /**
     * Create a violation object
     */
    private createViolation;
    /**
     * Filter violations by configured severity levels
     */
    private filterViolationsBySeverity;
    /**
     * Update analysis configuration
     */
    updateConfig(config: Partial<AnalysisConfig>): void;
    /**
     * Get current configuration
     */
    getConfig(): AnalysisConfig;
}
