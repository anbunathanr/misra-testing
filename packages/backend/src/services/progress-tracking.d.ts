export declare class ProgressTrackingService {
    updateProgress(analysisId: string, progress: number): Promise<void>;
    getProgress(analysisId: string): Promise<number>;
    updateStepProgress(workflowId: string, stepNumber: number, stepName: string, progress: number, message?: string, metadata?: any): Promise<void>;
    handleWorkflowError(workflowId: string, stepNumber?: number, stepName?: string, errorMessage?: string): Promise<void>;
    updateAnalysisProgress(analysisId: string, completedRules?: number, totalRules?: number, ruleId?: string, estimatedTimeRemaining?: number): Promise<void>;
}
export declare const progressTrackingService: ProgressTrackingService;
