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

import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { DynamoDBDocumentClient, GetCommand, UpdateCommand } from '@aws-sdk/lib-dynamodb';

const dynamoClient = DynamoDBDocumentClient.from(new DynamoDBClient({ region: process.env.AWS_REGION }));

export interface AnalysisProgress {
  analysisId: string;
  status: 'queued' | 'running' | 'completed' | 'failed';
  progress: number; // 0-100
  currentStep: string;
  estimatedTimeRemaining: number; // seconds
  rulesProcessed: number;
  totalRules: number;
  startTime: number;
  lastUpdateTime: number;
}

export interface AnalysisMonitorOptions {
  pollInterval?: number; // milliseconds (default: 2000)
  timeout?: number; // milliseconds (default: 600000 - 10 minutes)
}

export class AnalysisMonitor {
  private readonly DEFAULT_POLL_INTERVAL = 2000; // 2 seconds (Requirement 3.3)
  private readonly DEFAULT_TIMEOUT = 600000; // 10 minutes
  private readonly ANALYSIS_RESULTS_TABLE = process.env.ANALYSIS_RESULTS_TABLE_NAME || 'AnalysisResults-dev';

  /**
   * Get current analysis progress from DynamoDB
   * Requirement 3.3: Poll analysis status every 2 seconds during active analysis
   */
  async getAnalysisProgress(analysisId: string): Promise<AnalysisProgress | null> {
    try {
      const result = await dynamoClient.send(new GetCommand({
        TableName: this.ANALYSIS_RESULTS_TABLE,
        Key: { analysisId }
      }));

      if (!result.Item) {
        console.log(`[AnalysisMonitor] Analysis not found: ${analysisId}`);
        return null;
      }

      const item = result.Item;
      const now = Date.now();
      const startTime = item.startTime || item.createdAt || now;
      const elapsedTime = now - startTime;

      // Calculate estimated time remaining based on progress
      const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(
        item.progress || 0,
        elapsedTime,
        item.estimatedDuration || 120000 // 2 minutes default
      );

      // Calculate rules processed based on progress
      const totalRules = item.totalRules || 50; // Default to 50 MISRA rules
      const rulesProcessed = Math.floor((item.progress || 0) / 100 * totalRules);

      return {
        analysisId,
        status: this.mapStatus(item.status),
        progress: item.progress || 0,
        currentStep: item.currentStep || 'Initializing analysis...',
        estimatedTimeRemaining,
        rulesProcessed,
        totalRules,
        startTime,
        lastUpdateTime: item.lastUpdateTime || now
      };
    } catch (error) {
      console.error('[AnalysisMonitor] Error getting analysis progress:', error);
      throw error;
    }
  }

  /**
   * Update analysis progress in DynamoDB
   * Used by the analysis engine to report progress
   */
  async updateAnalysisProgress(
    analysisId: string,
    progress: number,
    currentStep: string,
    status?: 'queued' | 'running' | 'completed' | 'failed'
  ): Promise<void> {
    try {
      const now = Date.now();
      
      await dynamoClient.send(new UpdateCommand({
        TableName: this.ANALYSIS_RESULTS_TABLE,
        Key: { analysisId },
        UpdateExpression: 'SET progress = :progress, currentStep = :currentStep, lastUpdateTime = :lastUpdateTime' +
          (status ? ', #status = :status' : ''),
        ExpressionAttributeNames: status ? { '#status': 'status' } : undefined,
        ExpressionAttributeValues: {
          ':progress': progress,
          ':currentStep': currentStep,
          ':lastUpdateTime': now,
          ...(status && { ':status': status })
        }
      }));

      console.log(`[AnalysisMonitor] Updated progress for ${analysisId}: ${progress}% - ${currentStep}`);
    } catch (error) {
      console.error('[AnalysisMonitor] Error updating analysis progress:', error);
      throw error;
    }
  }

  /**
   * Calculate estimated time remaining based on current progress
   * Requirement 3.4: Add estimated time remaining calculations
   */
  private calculateEstimatedTimeRemaining(
    currentProgress: number,
    elapsedTime: number,
    estimatedDuration: number
  ): number {
    if (currentProgress === 0) {
      // No progress yet, use estimated duration
      return Math.floor(estimatedDuration / 1000);
    }

    if (currentProgress >= 100) {
      // Analysis complete
      return 0;
    }

    // Calculate based on current progress rate
    const progressRate = currentProgress / elapsedTime; // progress per millisecond
    const remainingProgress = 100 - currentProgress;
    const estimatedRemainingTime = remainingProgress / progressRate;

    // Return in seconds, with a minimum of 5 seconds
    return Math.max(5, Math.floor(estimatedRemainingTime / 1000));
  }

  /**
   * Map internal status to external status format
   */
  private mapStatus(internalStatus: string): 'queued' | 'running' | 'completed' | 'failed' {
    switch (internalStatus?.toUpperCase()) {
      case 'PENDING':
        return 'queued';
      case 'PROCESSING':
        return 'running';
      case 'COMPLETED':
        return 'completed';
      case 'FAILED':
        return 'failed';
      default:
        return 'queued';
    }
  }

  /**
   * Poll analysis status with callback for updates
   * Requirement 3.3: Poll analysis status every 2 seconds during active analysis
   * 
   * @param analysisId - The analysis ID to monitor
   * @param onProgress - Callback function called on each progress update
   * @param options - Polling options (interval, timeout)
   * @returns Promise that resolves when analysis completes or fails
   */
  async pollAnalysisStatus(
    analysisId: string,
    onProgress: (progress: AnalysisProgress) => void,
    options?: AnalysisMonitorOptions
  ): Promise<AnalysisProgress> {
    const pollInterval = options?.pollInterval || this.DEFAULT_POLL_INTERVAL;
    const timeout = options?.timeout || this.DEFAULT_TIMEOUT;
    const startTime = Date.now();

    return new Promise((resolve, reject) => {
      const poll = async () => {
        try {
          // Check timeout
          if (Date.now() - startTime > timeout) {
            clearInterval(intervalId);
            reject(new Error('Analysis timeout - exceeded maximum wait time'));
            return;
          }

          // Get current progress
          const progress = await this.getAnalysisProgress(analysisId);

          if (!progress) {
            clearInterval(intervalId);
            reject(new Error('Analysis not found'));
            return;
          }

          // Call progress callback
          onProgress(progress);

          // Check if analysis is complete
          if (progress.status === 'completed') {
            clearInterval(intervalId);
            resolve(progress);
            return;
          }

          // Check if analysis failed
          if (progress.status === 'failed') {
            clearInterval(intervalId);
            reject(new Error('Analysis failed'));
            return;
          }

          // Continue polling if status is 'queued' or 'running'
        } catch (error) {
          clearInterval(intervalId);
          reject(error);
        }
      };

      // Start polling
      const intervalId = setInterval(poll, pollInterval);
      
      // Initial poll
      poll();
    });
  }

  /**
   * Start monitoring an analysis with automatic progress updates
   * This is a convenience method that combines polling with progress tracking
   */
  async startMonitoring(
    analysisId: string,
    onProgress: (progress: AnalysisProgress) => void,
    options?: AnalysisMonitorOptions
  ): Promise<AnalysisProgress> {
    console.log(`[AnalysisMonitor] Starting monitoring for analysis: ${analysisId}`);
    
    try {
      const result = await this.pollAnalysisStatus(analysisId, onProgress, options);
      console.log(`[AnalysisMonitor] Analysis completed: ${analysisId}`);
      return result;
    } catch (error) {
      console.error(`[AnalysisMonitor] Monitoring failed for ${analysisId}:`, error);
      throw error;
    }
  }

  /**
   * Stop monitoring an analysis (cleanup method)
   * Note: Actual polling is stopped by the promise resolution/rejection
   */
  stopMonitoring(analysisId: string): void {
    console.log(`[AnalysisMonitor] Stopped monitoring for analysis: ${analysisId}`);
    // Cleanup logic if needed (e.g., clear cached data)
  }
}

// Export singleton instance
export const analysisMonitor = new AnalysisMonitor();
