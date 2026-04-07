import { AnalysisResult, Language } from '../../types/misra-analysis';
export declare class MISRAAnalysisEngine {
    private ruleEngine;
    private parser;
    private cache;
    constructor();
    analyzeFile(fileContent: string, language: Language, fileId: string, userId: string): Promise<AnalysisResult>;
    private buildSummary;
}
