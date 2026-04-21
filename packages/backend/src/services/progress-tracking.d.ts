/**
 * Progress Tracking Service
 *
 * Backend service for tracking and emitting real-time progress events
 * during MISRA analysis workflows. Integrates with CloudWatch for
 * demonstration logging and provides WebSocket/polling support for
 * real-time frontend updates.
 */
export interface ProgressEvent {
    workflowId: string;
    stepId: number;
    stepName: string;
    status: 'started' | 'progress' | 'completed' | 'error';
    progress: number;
    message: string;
    timestamp: Date;
    metadata?: {
        rulesProcessed?: number;
        totalRules?: number;
        estimatedTimeRemaining?: number;
        analysisProgress?: number;
        [key: string]: any;
    };
}
export interface WorkflowProgress {
    workflowId: string;
    userId: string;
    currentStep: number;
    completedSteps: number[];
    overallProgress: number;
    isRunning: boolean;
    startTime: Date;
    endTime?: Date;
    events: ProgressEvent[];
    error?: string;
}
export interface ProgressTrackingConfig {
    enableCloudWatchLogging: boolean;
    logGroupName: string;
    enableWebSocketUpdates: boolean;
    enablePollingUpdates: boolean;
    progressUpdateInterval: number;
}
export declare class ProgressTrackingService {
    private cloudWatchLogs;
    private activeWorkflows;
    private config;
    private progressCallbacks;
    constructor(config?: Partial<ProgressTrackingConfig>);
    /**
     * Start tracking a new workflow
     */
    startWorkflowTracking(workflowId: string, userId: string, totalSteps?: number): WorkflowProgress;
    /**
     * Update step progress
     */
    updateStepProgress(workflowId: string, stepId: number, stepName: string, progress: number, message: string, metadata?: any): void;
    /**
     * Complete a workflow step
     */
    completeStep(workflowId: string, stepId: number, stepName: string, message?: string): void;
    /**
     * Report analysis progress with rule-level detail
     */
    updateAnalysisProgress(workflowId: string, rulesProcessed: number, totalRules: number, currentRule?: string, estimatedTimeRemaining?: number): void;
    /**
     * Complete entire workflow
     */
    completeWorkflow(workflowId: string, results: any, message?: string): void;
    /**
     * Handle workflow error
     */
    handleWorkflowError(workflowId: string, stepId: number, stepName: string, error: string): void;
    /**
     * Get workflow progress
     */
    getWorkflowProgress(workflowId: string): WorkflowProgress | null;
    /**
     * Get all active workflows
     */
    getActiveWorkflows(): WorkflowProgress[];
    /**
     * Subscribe to progress updates for a workflow
     */
    subscribeToProgress(workflowId: string, callback: (event: ProgressEvent) => void): void;
    /**
     * Unsubscribe from progress updates
     */
    unsubscribeFromProgress(workflowId: string): void;
    /**
     * Clean up completed workflows
     */
    cleanupCompletedWorkflows(maxAge?: number): void;
    /**
     * Emit progress event to all subscribers
     */
    private emitProgressEvent;
    /**
     * Log events to CloudWatch for demonstration purposes
     */
    private logToCloudWatch;
    /**
     * Initialize CloudWatch log group
     */
    private initializeCloudWatchLogGroup;
    /**
     * Create log stream for a workflow
     */
    private createLogStream;
}
export declare const progressTrackingService: ProgressTrackingService;
