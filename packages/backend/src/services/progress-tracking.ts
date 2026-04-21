/**
 * Progress Tracking Service
 * 
 * Backend service for tracking and emitting real-time progress events
 * during MISRA analysis workflows. Integrates with CloudWatch for
 * demonstration logging and provides WebSocket/polling support for
 * real-time frontend updates.
 */

import { CloudWatchLogs } from 'aws-sdk';

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

export class ProgressTrackingService {
  private cloudWatchLogs: CloudWatchLogs;
  private activeWorkflows: Map<string, WorkflowProgress> = new Map();
  private config: ProgressTrackingConfig;
  private progressCallbacks: Map<string, (event: ProgressEvent) => void> = new Map();

  constructor(config: Partial<ProgressTrackingConfig> = {}) {
    this.config = {
      enableCloudWatchLogging: config.enableCloudWatchLogging ?? true,
      logGroupName: config.logGroupName ?? '/aws/lambda/misra-analysis-progress',
      enableWebSocketUpdates: config.enableWebSocketUpdates ?? true,
      enablePollingUpdates: config.enablePollingUpdates ?? true,
      progressUpdateInterval: config.progressUpdateInterval ?? 1000
    };

    this.cloudWatchLogs = new CloudWatchLogs({
      region: process.env.AWS_REGION || 'us-east-1'
    });

    this.initializeCloudWatchLogGroup();
  }

  /**
   * Start tracking a new workflow
   */
  public startWorkflowTracking(
    workflowId: string,
    userId: string,
    totalSteps: number = 4
  ): WorkflowProgress {
    const workflow: WorkflowProgress = {
      workflowId,
      userId,
      currentStep: 0,
      completedSteps: [],
      overallProgress: 0,
      isRunning: true,
      startTime: new Date(),
      events: []
    };

    this.activeWorkflows.set(workflowId, workflow);

    // Log workflow start
    this.emitProgressEvent(workflowId, {
      workflowId,
      stepId: 0,
      stepName: 'Workflow Started',
      status: 'started',
      progress: 0,
      message: `Fire & Forget workflow started for user ${userId}`,
      timestamp: new Date()
    });

    return workflow;
  }

  /**
   * Update step progress
   */
  public updateStepProgress(
    workflowId: string,
    stepId: number,
    stepName: string,
    progress: number,
    message: string,
    metadata?: any
  ): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      console.warn(`Workflow ${workflowId} not found for progress update`);
      return;
    }

    // Update current step
    workflow.currentStep = stepId;

    // Emit progress event
    this.emitProgressEvent(workflowId, {
      workflowId,
      stepId,
      stepName,
      status: 'progress',
      progress,
      message,
      timestamp: new Date(),
      metadata
    });
  }

  /**
   * Complete a workflow step
   */
  public completeStep(
    workflowId: string,
    stepId: number,
    stepName: string,
    message: string = 'Step completed successfully'
  ): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      console.warn(`Workflow ${workflowId} not found for step completion`);
      return;
    }

    // Add to completed steps
    if (!workflow.completedSteps.includes(stepId)) {
      workflow.completedSteps.push(stepId);
    }

    // Update overall progress
    const totalSteps = 4; // Authentication, File Selection, Analysis, Results
    workflow.overallProgress = (workflow.completedSteps.length / totalSteps) * 100;

    // Emit completion event
    this.emitProgressEvent(workflowId, {
      workflowId,
      stepId,
      stepName,
      status: 'completed',
      progress: 100,
      message,
      timestamp: new Date()
    });
  }

  /**
   * Report analysis progress with rule-level detail
   */
  public updateAnalysisProgress(
    workflowId: string,
    rulesProcessed: number,
    totalRules: number,
    currentRule?: string,
    estimatedTimeRemaining?: number
  ): void {
    const analysisProgress = Math.round((rulesProcessed / totalRules) * 100);
    
    let message = `Processing MISRA rules: ${rulesProcessed}/${totalRules} (${analysisProgress}%)`;
    if (currentRule) {
      message += ` - Current: ${currentRule}`;
    }

    this.updateStepProgress(
      workflowId,
      3, // Analysis step
      'MISRA Analysis',
      analysisProgress,
      message,
      {
        rulesProcessed,
        totalRules,
        analysisProgress,
        estimatedTimeRemaining,
        currentRule
      }
    );
  }

  /**
   * Complete entire workflow
   */
  public completeWorkflow(
    workflowId: string,
    results: any,
    message: string = 'Workflow completed successfully'
  ): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      console.warn(`Workflow ${workflowId} not found for completion`);
      return;
    }

    workflow.isRunning = false;
    workflow.endTime = new Date();
    workflow.overallProgress = 100;

    // Emit completion event
    this.emitProgressEvent(workflowId, {
      workflowId,
      stepId: 999,
      stepName: 'Workflow Completed',
      status: 'completed',
      progress: 100,
      message,
      timestamp: new Date(),
      metadata: {
        results,
        executionTime: workflow.endTime.getTime() - workflow.startTime.getTime()
      }
    });

    // Log final results to CloudWatch
    this.logToCloudWatch(workflowId, 'WORKFLOW_COMPLETED', {
      workflowId,
      userId: workflow.userId,
      executionTime: workflow.endTime.getTime() - workflow.startTime.getTime(),
      completedSteps: workflow.completedSteps.length,
      results: {
        compliancePercentage: results.compliancePercentage,
        violationCount: results.violations?.length || 0
      }
    });
  }

  /**
   * Handle workflow error
   */
  public handleWorkflowError(
    workflowId: string,
    stepId: number,
    stepName: string,
    error: string
  ): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (!workflow) {
      console.warn(`Workflow ${workflowId} not found for error handling`);
      return;
    }

    workflow.isRunning = false;
    workflow.error = error;
    workflow.endTime = new Date();

    // Emit error event
    this.emitProgressEvent(workflowId, {
      workflowId,
      stepId,
      stepName,
      status: 'error',
      progress: 0,
      message: `Error in ${stepName}: ${error}`,
      timestamp: new Date()
    });

    // Log error to CloudWatch
    this.logToCloudWatch(workflowId, 'WORKFLOW_ERROR', {
      workflowId,
      stepId,
      stepName,
      error,
      timestamp: new Date().toISOString()
    });
  }

  /**
   * Get workflow progress
   */
  public getWorkflowProgress(workflowId: string): WorkflowProgress | null {
    return this.activeWorkflows.get(workflowId) || null;
  }

  /**
   * Get all active workflows
   */
  public getActiveWorkflows(): WorkflowProgress[] {
    return Array.from(this.activeWorkflows.values()).filter(w => w.isRunning);
  }

  /**
   * Subscribe to progress updates for a workflow
   */
  public subscribeToProgress(
    workflowId: string,
    callback: (event: ProgressEvent) => void
  ): void {
    this.progressCallbacks.set(workflowId, callback);
  }

  /**
   * Unsubscribe from progress updates
   */
  public unsubscribeFromProgress(workflowId: string): void {
    this.progressCallbacks.delete(workflowId);
  }

  /**
   * Clean up completed workflows
   */
  public cleanupCompletedWorkflows(maxAge: number = 3600000): void {
    const now = Date.now();
    
    for (const [workflowId, workflow] of this.activeWorkflows.entries()) {
      if (!workflow.isRunning && workflow.endTime) {
        const age = now - workflow.endTime.getTime();
        if (age > maxAge) {
          this.activeWorkflows.delete(workflowId);
          this.progressCallbacks.delete(workflowId);
        }
      }
    }
  }

  /**
   * Emit progress event to all subscribers
   */
  private emitProgressEvent(workflowId: string, event: ProgressEvent): void {
    const workflow = this.activeWorkflows.get(workflowId);
    if (workflow) {
      workflow.events.push(event);
    }

    // Call registered callback
    const callback = this.progressCallbacks.get(workflowId);
    if (callback) {
      callback(event);
    }

    // Log to CloudWatch if enabled
    if (this.config.enableCloudWatchLogging) {
      this.logToCloudWatch(workflowId, 'PROGRESS_UPDATE', event);
    }

    // Log to console for development
    console.log(`[Progress] ${workflowId}: ${event.stepName} - ${event.message}`, {
      progress: event.progress,
      metadata: event.metadata
    });
  }

  /**
   * Log events to CloudWatch for demonstration purposes
   */
  private async logToCloudWatch(
    workflowId: string,
    eventType: string,
    data: any
  ): Promise<void> {
    if (!this.config.enableCloudWatchLogging) {
      return;
    }

    try {
      const logEvent = {
        timestamp: Date.now(),
        message: JSON.stringify({
          eventType,
          workflowId,
          data,
          timestamp: new Date().toISOString()
        })
      };

      await this.cloudWatchLogs.putLogEvents({
        logGroupName: this.config.logGroupName,
        logStreamName: `workflow-${workflowId}`,
        logEvents: [logEvent]
      }).promise();

    } catch (error) {
      console.warn('Failed to log to CloudWatch:', error);
      // Don't throw - logging failures shouldn't break the workflow
    }
  }

  /**
   * Initialize CloudWatch log group
   */
  private async initializeCloudWatchLogGroup(): Promise<void> {
    if (!this.config.enableCloudWatchLogging) {
      return;
    }

    try {
      // Check if log group exists
      await this.cloudWatchLogs.describeLogGroups({
        logGroupNamePrefix: this.config.logGroupName
      }).promise();

    } catch (error) {
      try {
        // Create log group if it doesn't exist
        await this.cloudWatchLogs.createLogGroup({
          logGroupName: this.config.logGroupName
        }).promise();

        console.log(`Created CloudWatch log group: ${this.config.logGroupName}`);
      } catch (createError) {
        console.warn('Failed to create CloudWatch log group:', createError);
      }
    }
  }

  /**
   * Create log stream for a workflow
   */
  private async createLogStream(workflowId: string): Promise<void> {
    if (!this.config.enableCloudWatchLogging) {
      return;
    }

    try {
      await this.cloudWatchLogs.createLogStream({
        logGroupName: this.config.logGroupName,
        logStreamName: `workflow-${workflowId}`
      }).promise();
    } catch (error) {
      // Stream might already exist, which is fine
      if (!error.code || error.code !== 'ResourceAlreadyExistsException') {
        console.warn('Failed to create log stream:', error);
      }
    }
  }
}

// Export singleton instance
export const progressTrackingService = new ProgressTrackingService({
  enableCloudWatchLogging: process.env.NODE_ENV === 'production',
  logGroupName: process.env.PROGRESS_LOG_GROUP || '/aws/lambda/misra-analysis-progress',
  enableWebSocketUpdates: true,
  enablePollingUpdates: true,
  progressUpdateInterval: 1000
});