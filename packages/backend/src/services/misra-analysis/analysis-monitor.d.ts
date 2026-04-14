/**
 * Analysis Monitoring Service
 *
 * Task 5.2: Create real-time analysis monitoring
 *
 * Features:
 * - Analysis progress polling mechanism using existing Lambda functions
 * - WebSocket-like updates for live progress display
 * - Estimated time remaining calculations
 * - Rules processed counters
 *
 * Requirements: 3.3, 3.4
 */
export interface AnalysisProgress {
    analysisId: string;
    status: 'queued' | 'running' | 'completed' | 'failed';
    progress: number;
    currentStep: string;
    estimatedTimeRemaining: number;
    rulesProcessed: number;
    totalRules: number;
    startTime: number;
    lastUpdateTime: number;
}
export interface AnalysisMonitorOptions {
    pollInterval?: number;
    timeout?: number;
}
export declare class AnalysisMonitor {
    private readonly DEFAULT_POLL_INTERVAL;
    private readonly DEFAULT_TIMEOUT;
    private readonly ANALYSIS_RESULTS_TABLE;
    /**
     * Get current analysis progress from DynamoDB
     * Requirement 3.3: Poll analysis status every 2 seconds during active analysis
     */
    getAnalysisProgress(analysisId: string): Promise<AnalysisProgress | null>;
    /**
     * Update analysis progress in DynamoDB
     * Used by the analysis engine to report progress
     */
    updateAnalysisProgress(analysisId: string, progress: number, currentStep: string, status?: 'queued' | 'running' | 'completed' | 'failed'): Promise<void>;
    /**
     * Calculate estimated time remaining based on current progress
     * Requirement 3.4: Add estimated time remaining calculations
     */
    private calculateEstimatedTimeRemaining;
    /**
     * Map internal status to external status format
     */
    private mapStatus;
    /**
     * Poll analysis status with callback for updates
     * Requirement 3.3: Poll analysis status every 2 seconds during active analysis
     *
     * @param analysisId - The analysis ID to monitor
     * @param onProgress - Callback function called on each progress update
     * @param options - Polling options (interval, timeout)
     * @returns Promise that resolves when analysis completes or fails
     */
    pollAnalysisStatus(analysisId: string, onProgress: (progress: AnalysisProgress) => void, options?: AnalysisMonitorOptions): Promise<AnalysisProgress>;
    /**
     * Start monitoring an analysis with automatic progress updates
     * This is a convenience method that combines polling with progress tracking
     */
    startMonitoring(analysisId: string, onProgress: (progress: AnalysisProgress) => void, options?: AnalysisMonitorOptions): Promise<AnalysisProgress>;
    /**
     * Stop monitoring an analysis (cleanup method)
     * Note: Actual polling is stopped by the promise resolution/rejection
     */
    stopMonitoring(analysisId: string): void;
}
export declare const analysisMonitor: AnalysisMonitor;
