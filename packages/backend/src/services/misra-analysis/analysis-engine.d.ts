import { AnalysisResult, Language } from '../../types/misra-analysis';
export interface AnalysisProgressCallback {
    (progress: number, message: string): Promise<void>;
}
export interface AnalysisOptions {
    progressCallback?: AnalysisProgressCallback;
    updateInterval?: number;
    workflowId?: string;
    enableRealTimeProgress?: boolean;
}
export declare class MISRAAnalysisEngine {
    private ruleEngine;
    private parser;
    private cache;
    private readonly DEFAULT_UPDATE_INTERVAL;
    constructor();
    analyzeFile(fileContent: string, language: Language, fileId: string, userId: string, options?: AnalysisOptions): Promise<AnalysisResult>;
    /**
     * Check rules with progress tracking and periodic updates
     * Requirements: 3.3 (2-second progress updates)
     */
    private checkRulesWithProgress;
    private buildSummary;
}
