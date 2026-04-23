/**
 * Production Workflow Service
 *
 * Orchestrates the complete autonomous pipeline:
 * 1. Auto-register user
 * 2. Auto-login
 * 3. Auto-fetch & verify OTP
 * 4. Auto-upload sample file
 * 5. Auto-trigger MISRA analysis
 * 6. Track progress in real-time
 */
export interface WorkflowState {
    workflowId: string;
    email: string;
    userId: string;
    sessionToken: string;
    fileId: string;
    analysisId: string;
    status: 'INITIATED' | 'AUTH_VERIFIED' | 'FILE_INGESTED' | 'ANALYSIS_TRIGGERED' | 'COMPLETED' | 'FAILED';
    progress: number;
    currentStep: string;
    timestamp: number;
    ttl: number;
}
export declare class ProductionWorkflowService {
    /**
     * Start automated workflow after authentication
     */
    static startAutomatedWorkflow(email: string, userId: string, sessionToken: string): Promise<WorkflowState>;
    /**
     * Upload sample C/C++ file to S3
     */
    private static uploadSampleFile;
    /**
     * Trigger MISRA analysis Lambda
     */
    private static triggerMisraAnalysis;
    /**
     * Wait for analysis completion
     */
    private static waitForAnalysisCompletion;
    /**
     * Update workflow progress
     */
    private static updateProgress;
    /**
     * Update workflow state in DynamoDB
     */
    private static updateWorkflowState;
    /**
     * Get workflow state
     */
    private static getWorkflowState;
    /**
     * Get analysis state
     */
    private static getAnalysisState;
}
