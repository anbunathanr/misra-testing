"use strict";
/**
 * Progress Tracking Service
 *
 * Backend service for tracking and emitting real-time progress events
 * during MISRA analysis workflows. Integrates with CloudWatch for
 * demonstration logging and provides WebSocket/polling support for
 * real-time frontend updates.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.progressTrackingService = exports.ProgressTrackingService = void 0;
const aws_sdk_1 = require("aws-sdk");
class ProgressTrackingService {
    cloudWatchLogs;
    activeWorkflows = new Map();
    config;
    progressCallbacks = new Map();
    constructor(config = {}) {
        this.config = {
            enableCloudWatchLogging: config.enableCloudWatchLogging ?? true,
            logGroupName: config.logGroupName ?? '/aws/lambda/misra-analysis-progress',
            enableWebSocketUpdates: config.enableWebSocketUpdates ?? true,
            enablePollingUpdates: config.enablePollingUpdates ?? true,
            progressUpdateInterval: config.progressUpdateInterval ?? 1000
        };
        this.cloudWatchLogs = new aws_sdk_1.CloudWatchLogs({
            region: process.env.AWS_REGION || 'us-east-1'
        });
        this.initializeCloudWatchLogGroup();
    }
    /**
     * Start tracking a new workflow
     */
    startWorkflowTracking(workflowId, userId, totalSteps = 4) {
        const workflow = {
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
    updateStepProgress(workflowId, stepId, stepName, progress, message, metadata) {
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
    completeStep(workflowId, stepId, stepName, message = 'Step completed successfully') {
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
    updateAnalysisProgress(workflowId, rulesProcessed, totalRules, currentRule, estimatedTimeRemaining) {
        const analysisProgress = Math.round((rulesProcessed / totalRules) * 100);
        let message = `Processing MISRA rules: ${rulesProcessed}/${totalRules} (${analysisProgress}%)`;
        if (currentRule) {
            message += ` - Current: ${currentRule}`;
        }
        this.updateStepProgress(workflowId, 3, // Analysis step
        'MISRA Analysis', analysisProgress, message, {
            rulesProcessed,
            totalRules,
            analysisProgress,
            estimatedTimeRemaining,
            currentRule
        });
    }
    /**
     * Complete entire workflow
     */
    completeWorkflow(workflowId, results, message = 'Workflow completed successfully') {
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
    handleWorkflowError(workflowId, stepId, stepName, error) {
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
    getWorkflowProgress(workflowId) {
        return this.activeWorkflows.get(workflowId) || null;
    }
    /**
     * Get all active workflows
     */
    getActiveWorkflows() {
        return Array.from(this.activeWorkflows.values()).filter(w => w.isRunning);
    }
    /**
     * Subscribe to progress updates for a workflow
     */
    subscribeToProgress(workflowId, callback) {
        this.progressCallbacks.set(workflowId, callback);
    }
    /**
     * Unsubscribe from progress updates
     */
    unsubscribeFromProgress(workflowId) {
        this.progressCallbacks.delete(workflowId);
    }
    /**
     * Clean up completed workflows
     */
    cleanupCompletedWorkflows(maxAge = 3600000) {
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
    emitProgressEvent(workflowId, event) {
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
    async logToCloudWatch(workflowId, eventType, data) {
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
        }
        catch (error) {
            console.warn('Failed to log to CloudWatch:', error);
            // Don't throw - logging failures shouldn't break the workflow
        }
    }
    /**
     * Initialize CloudWatch log group
     */
    async initializeCloudWatchLogGroup() {
        if (!this.config.enableCloudWatchLogging) {
            return;
        }
        try {
            // Check if log group exists
            await this.cloudWatchLogs.describeLogGroups({
                logGroupNamePrefix: this.config.logGroupName
            }).promise();
        }
        catch (error) {
            try {
                // Create log group if it doesn't exist
                await this.cloudWatchLogs.createLogGroup({
                    logGroupName: this.config.logGroupName
                }).promise();
                console.log(`Created CloudWatch log group: ${this.config.logGroupName}`);
            }
            catch (createError) {
                console.warn('Failed to create CloudWatch log group:', createError);
            }
        }
    }
    /**
     * Create log stream for a workflow
     */
    async createLogStream(workflowId) {
        if (!this.config.enableCloudWatchLogging) {
            return;
        }
        try {
            await this.cloudWatchLogs.createLogStream({
                logGroupName: this.config.logGroupName,
                logStreamName: `workflow-${workflowId}`
            }).promise();
        }
        catch (error) {
            // Stream might already exist, which is fine
            if (!error.code || error.code !== 'ResourceAlreadyExistsException') {
                console.warn('Failed to create log stream:', error);
            }
        }
    }
}
exports.ProgressTrackingService = ProgressTrackingService;
// Export singleton instance
exports.progressTrackingService = new ProgressTrackingService({
    enableCloudWatchLogging: process.env.NODE_ENV === 'production',
    logGroupName: process.env.PROGRESS_LOG_GROUP || '/aws/lambda/misra-analysis-progress',
    enableWebSocketUpdates: true,
    enablePollingUpdates: true,
    progressUpdateInterval: 1000
});
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicHJvZ3Jlc3MtdHJhY2tpbmcuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwcm9ncmVzcy10cmFja2luZy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7Ozs7R0FPRzs7O0FBRUgscUNBQXlDO0FBd0N6QyxNQUFhLHVCQUF1QjtJQUMxQixjQUFjLENBQWlCO0lBQy9CLGVBQWUsR0FBa0MsSUFBSSxHQUFHLEVBQUUsQ0FBQztJQUMzRCxNQUFNLENBQXlCO0lBQy9CLGlCQUFpQixHQUFnRCxJQUFJLEdBQUcsRUFBRSxDQUFDO0lBRW5GLFlBQVksU0FBMEMsRUFBRTtRQUN0RCxJQUFJLENBQUMsTUFBTSxHQUFHO1lBQ1osdUJBQXVCLEVBQUUsTUFBTSxDQUFDLHVCQUF1QixJQUFJLElBQUk7WUFDL0QsWUFBWSxFQUFFLE1BQU0sQ0FBQyxZQUFZLElBQUkscUNBQXFDO1lBQzFFLHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxzQkFBc0IsSUFBSSxJQUFJO1lBQzdELG9CQUFvQixFQUFFLE1BQU0sQ0FBQyxvQkFBb0IsSUFBSSxJQUFJO1lBQ3pELHNCQUFzQixFQUFFLE1BQU0sQ0FBQyxzQkFBc0IsSUFBSSxJQUFJO1NBQzlELENBQUM7UUFFRixJQUFJLENBQUMsY0FBYyxHQUFHLElBQUksd0JBQWMsQ0FBQztZQUN2QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7UUFFSCxJQUFJLENBQUMsNEJBQTRCLEVBQUUsQ0FBQztJQUN0QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxxQkFBcUIsQ0FDMUIsVUFBa0IsRUFDbEIsTUFBYyxFQUNkLGFBQXFCLENBQUM7UUFFdEIsTUFBTSxRQUFRLEdBQXFCO1lBQ2pDLFVBQVU7WUFDVixNQUFNO1lBQ04sV0FBVyxFQUFFLENBQUM7WUFDZCxjQUFjLEVBQUUsRUFBRTtZQUNsQixlQUFlLEVBQUUsQ0FBQztZQUNsQixTQUFTLEVBQUUsSUFBSTtZQUNm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O1FBQ0gsQ0FBQztJQUNILENBQUM7Q0FDRjtBQW5aRCwwREFtWkM7QUFFRCw0QkFBNEI7QUFDZixRQUFBLHVCQUF1QixHQUFHLElBQUksdUJBQXVCLENBQUM7SUFDakUsdUJBQXVCLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxRQUFRLEtBQUssWUFBWTtJQUM5RCxZQUFZLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxxQ0FBcUM7SUFDckYsc0JBQXNCLEVBQUUsSUFBSTtJQUM1QixvQkFBb0IsRUFBRSxJQUFJO0lBQzFCLHNCQUFzQixFQUFFLElBQUk7Q0FDN0IsQ0FBQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFByb2dyZXNzIFRyYWNraW5nIFNlcnZpY2VcclxuICogXHJcbiAqIEJhY2tlbmQgc2VydmljZSBmb3IgdHJhY2tpbmcgYW5kIGVtaXR0aW5nIHJlYWwtdGltZSBwcm9ncmVzcyBldmVudHNcclxuICogZHVyaW5nIE1JU1JBIGFuYWx5c2lzIHdvcmtmbG93cy4gSW50ZWdyYXRlcyB3aXRoIENsb3VkV2F0Y2ggZm9yXHJcbiAqIGRlbW9uc3RyYXRpb24gbG9nZ2luZyBhbmQgcHJvdmlkZXMgV2ViU29ja2V0L3BvbGxpbmcgc3VwcG9ydCBmb3JcclxuICogcmVhbC10aW1lIGZyb250ZW5kIHVwZGF0ZXMuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ2xvdWRXYXRjaExvZ3MgfSBmcm9tICdhd3Mtc2RrJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3Jlc3NFdmVudCB7XHJcbiAgd29ya2Zsb3dJZDogc3RyaW5nO1xyXG4gIHN0ZXBJZDogbnVtYmVyO1xyXG4gIHN0ZXBOYW1lOiBzdHJpbmc7XHJcbiAgc3RhdHVzOiAnc3RhcnRlZCcgfCAncHJvZ3Jlc3MnIHwgJ2NvbXBsZXRlZCcgfCAnZXJyb3InO1xyXG4gIHByb2dyZXNzOiBudW1iZXI7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIHRpbWVzdGFtcDogRGF0ZTtcclxuICBtZXRhZGF0YT86IHtcclxuICAgIHJ1bGVzUHJvY2Vzc2VkPzogbnVtYmVyO1xyXG4gICAgdG90YWxSdWxlcz86IG51bWJlcjtcclxuICAgIGVzdGltYXRlZFRpbWVSZW1haW5pbmc/OiBudW1iZXI7XHJcbiAgICBhbmFseXNpc1Byb2dyZXNzPzogbnVtYmVyO1xyXG4gICAgW2tleTogc3RyaW5nXTogYW55O1xyXG4gIH07XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgV29ya2Zsb3dQcm9ncmVzcyB7XHJcbiAgd29ya2Zsb3dJZDogc3RyaW5nO1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG4gIGN1cnJlbnRTdGVwOiBudW1iZXI7XHJcbiAgY29tcGxldGVkU3RlcHM6IG51bWJlcltdO1xyXG4gIG92ZXJhbGxQcm9ncmVzczogbnVtYmVyO1xyXG4gIGlzUnVubmluZzogYm9vbGVhbjtcclxuICBzdGFydFRpbWU6IERhdGU7XHJcbiAgZW5kVGltZT86IERhdGU7XHJcbiAgZXZlbnRzOiBQcm9ncmVzc0V2ZW50W107XHJcbiAgZXJyb3I/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgUHJvZ3Jlc3NUcmFja2luZ0NvbmZpZyB7XHJcbiAgZW5hYmxlQ2xvdWRXYXRjaExvZ2dpbmc6IGJvb2xlYW47XHJcbiAgbG9nR3JvdXBOYW1lOiBzdHJpbmc7XHJcbiAgZW5hYmxlV2ViU29ja2V0VXBkYXRlczogYm9vbGVhbjtcclxuICBlbmFibGVQb2xsaW5nVXBkYXRlczogYm9vbGVhbjtcclxuICBwcm9ncmVzc1VwZGF0ZUludGVydmFsOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBQcm9ncmVzc1RyYWNraW5nU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBjbG91ZFdhdGNoTG9nczogQ2xvdWRXYXRjaExvZ3M7XHJcbiAgcHJpdmF0ZSBhY3RpdmVXb3JrZmxvd3M6IE1hcDxzdHJpbmcsIFdvcmtmbG93UHJvZ3Jlc3M+ID0gbmV3IE1hcCgpO1xyXG4gIHByaXZhdGUgY29uZmlnOiBQcm9ncmVzc1RyYWNraW5nQ29uZmlnO1xyXG4gIHByaXZhdGUgcHJvZ3Jlc3NDYWxsYmFja3M6IE1hcDxzdHJpbmcsIChldmVudDogUHJvZ3Jlc3NFdmVudCkgPT4gdm9pZD4gPSBuZXcgTWFwKCk7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbmZpZzogUGFydGlhbDxQcm9ncmVzc1RyYWNraW5nQ29uZmlnPiA9IHt9KSB7XHJcbiAgICB0aGlzLmNvbmZpZyA9IHtcclxuICAgICAgZW5hYmxlQ2xvdWRXYXRjaExvZ2dpbmc6IGNvbmZpZy5lbmFibGVDbG91ZFdhdGNoTG9nZ2luZyA/PyB0cnVlLFxyXG4gICAgICBsb2dHcm91cE5hbWU6IGNvbmZpZy5sb2dHcm91cE5hbWUgPz8gJy9hd3MvbGFtYmRhL21pc3JhLWFuYWx5c2lzLXByb2dyZXNzJyxcclxuICAgICAgZW5hYmxlV2ViU29ja2V0VXBkYXRlczogY29uZmlnLmVuYWJsZVdlYlNvY2tldFVwZGF0ZXMgPz8gdHJ1ZSxcclxuICAgICAgZW5hYmxlUG9sbGluZ1VwZGF0ZXM6IGNvbmZpZy5lbmFibGVQb2xsaW5nVXBkYXRlcyA/PyB0cnVlLFxyXG4gICAgICBwcm9ncmVzc1VwZGF0ZUludGVydmFsOiBjb25maWcucHJvZ3Jlc3NVcGRhdGVJbnRlcnZhbCA/PyAxMDAwXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuY2xvdWRXYXRjaExvZ3MgPSBuZXcgQ2xvdWRXYXRjaExvZ3Moe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSdcclxuICAgIH0pO1xyXG5cclxuICAgIHRoaXMuaW5pdGlhbGl6ZUNsb3VkV2F0Y2hMb2dHcm91cCgpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RhcnQgdHJhY2tpbmcgYSBuZXcgd29ya2Zsb3dcclxuICAgKi9cclxuICBwdWJsaWMgc3RhcnRXb3JrZmxvd1RyYWNraW5nKFxyXG4gICAgd29ya2Zsb3dJZDogc3RyaW5nLFxyXG4gICAgdXNlcklkOiBzdHJpbmcsXHJcbiAgICB0b3RhbFN0ZXBzOiBudW1iZXIgPSA0XHJcbiAgKTogV29ya2Zsb3dQcm9ncmVzcyB7XHJcbiAgICBjb25zdCB3b3JrZmxvdzogV29ya2Zsb3dQcm9ncmVzcyA9IHtcclxuICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBjdXJyZW50U3RlcDogMCxcclxuICAgICAgY29tcGxldGVkU3RlcHM6IFtdLFxyXG4gICAgICBvdmVyYWxsUHJvZ3Jlc3M6IDAsXHJcbiAgICAgIGlzUnVubmluZzogdHJ1ZSxcclxuICAgICAgc3RhcnRUaW1lOiBuZXcgRGF0ZSgpLFxyXG4gICAgICBldmVudHM6IFtdXHJcbiAgICB9O1xyXG5cclxuICAgIHRoaXMuYWN0aXZlV29ya2Zsb3dzLnNldCh3b3JrZmxvd0lkLCB3b3JrZmxvdyk7XHJcblxyXG4gICAgLy8gTG9nIHdvcmtmbG93IHN0YXJ0XHJcbiAgICB0aGlzLmVtaXRQcm9ncmVzc0V2ZW50KHdvcmtmbG93SWQsIHtcclxuICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgc3RlcElkOiAwLFxyXG4gICAgICBzdGVwTmFtZTogJ1dvcmtmbG93IFN0YXJ0ZWQnLFxyXG4gICAgICBzdGF0dXM6ICdzdGFydGVkJyxcclxuICAgICAgcHJvZ3Jlc3M6IDAsXHJcbiAgICAgIG1lc3NhZ2U6IGBGaXJlICYgRm9yZ2V0IHdvcmtmbG93IHN0YXJ0ZWQgZm9yIHVzZXIgJHt1c2VySWR9YCxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gd29ya2Zsb3c7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBVcGRhdGUgc3RlcCBwcm9ncmVzc1xyXG4gICAqL1xyXG4gIHB1YmxpYyB1cGRhdGVTdGVwUHJvZ3Jlc3MoXHJcbiAgICB3b3JrZmxvd0lkOiBzdHJpbmcsXHJcbiAgICBzdGVwSWQ6IG51bWJlcixcclxuICAgIHN0ZXBOYW1lOiBzdHJpbmcsXHJcbiAgICBwcm9ncmVzczogbnVtYmVyLFxyXG4gICAgbWVzc2FnZTogc3RyaW5nLFxyXG4gICAgbWV0YWRhdGE/OiBhbnlcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IHdvcmtmbG93ID0gdGhpcy5hY3RpdmVXb3JrZmxvd3MuZ2V0KHdvcmtmbG93SWQpO1xyXG4gICAgaWYgKCF3b3JrZmxvdykge1xyXG4gICAgICBjb25zb2xlLndhcm4oYFdvcmtmbG93ICR7d29ya2Zsb3dJZH0gbm90IGZvdW5kIGZvciBwcm9ncmVzcyB1cGRhdGVgKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFVwZGF0ZSBjdXJyZW50IHN0ZXBcclxuICAgIHdvcmtmbG93LmN1cnJlbnRTdGVwID0gc3RlcElkO1xyXG5cclxuICAgIC8vIEVtaXQgcHJvZ3Jlc3MgZXZlbnRcclxuICAgIHRoaXMuZW1pdFByb2dyZXNzRXZlbnQod29ya2Zsb3dJZCwge1xyXG4gICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICBzdGVwSWQsXHJcbiAgICAgIHN0ZXBOYW1lLFxyXG4gICAgICBzdGF0dXM6ICdwcm9ncmVzcycsXHJcbiAgICAgIHByb2dyZXNzLFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCksXHJcbiAgICAgIG1ldGFkYXRhXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENvbXBsZXRlIGEgd29ya2Zsb3cgc3RlcFxyXG4gICAqL1xyXG4gIHB1YmxpYyBjb21wbGV0ZVN0ZXAoXHJcbiAgICB3b3JrZmxvd0lkOiBzdHJpbmcsXHJcbiAgICBzdGVwSWQ6IG51bWJlcixcclxuICAgIHN0ZXBOYW1lOiBzdHJpbmcsXHJcbiAgICBtZXNzYWdlOiBzdHJpbmcgPSAnU3RlcCBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5J1xyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmFjdGl2ZVdvcmtmbG93cy5nZXQod29ya2Zsb3dJZCk7XHJcbiAgICBpZiAoIXdvcmtmbG93KSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgV29ya2Zsb3cgJHt3b3JrZmxvd0lkfSBub3QgZm91bmQgZm9yIHN0ZXAgY29tcGxldGlvbmApO1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWRkIHRvIGNvbXBsZXRlZCBzdGVwc1xyXG4gICAgaWYgKCF3b3JrZmxvdy5jb21wbGV0ZWRTdGVwcy5pbmNsdWRlcyhzdGVwSWQpKSB7XHJcbiAgICAgIHdvcmtmbG93LmNvbXBsZXRlZFN0ZXBzLnB1c2goc3RlcElkKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBVcGRhdGUgb3ZlcmFsbCBwcm9ncmVzc1xyXG4gICAgY29uc3QgdG90YWxTdGVwcyA9IDQ7IC8vIEF1dGhlbnRpY2F0aW9uLCBGaWxlIFNlbGVjdGlvbiwgQW5hbHlzaXMsIFJlc3VsdHNcclxuICAgIHdvcmtmbG93Lm92ZXJhbGxQcm9ncmVzcyA9ICh3b3JrZmxvdy5jb21wbGV0ZWRTdGVwcy5sZW5ndGggLyB0b3RhbFN0ZXBzKSAqIDEwMDtcclxuXHJcbiAgICAvLyBFbWl0IGNvbXBsZXRpb24gZXZlbnRcclxuICAgIHRoaXMuZW1pdFByb2dyZXNzRXZlbnQod29ya2Zsb3dJZCwge1xyXG4gICAgICB3b3JrZmxvd0lkLFxyXG4gICAgICBzdGVwSWQsXHJcbiAgICAgIHN0ZXBOYW1lLFxyXG4gICAgICBzdGF0dXM6ICdjb21wbGV0ZWQnLFxyXG4gICAgICBwcm9ncmVzczogMTAwLFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKClcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVwb3J0IGFuYWx5c2lzIHByb2dyZXNzIHdpdGggcnVsZS1sZXZlbCBkZXRhaWxcclxuICAgKi9cclxuICBwdWJsaWMgdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhcclxuICAgIHdvcmtmbG93SWQ6IHN0cmluZyxcclxuICAgIHJ1bGVzUHJvY2Vzc2VkOiBudW1iZXIsXHJcbiAgICB0b3RhbFJ1bGVzOiBudW1iZXIsXHJcbiAgICBjdXJyZW50UnVsZT86IHN0cmluZyxcclxuICAgIGVzdGltYXRlZFRpbWVSZW1haW5pbmc/OiBudW1iZXJcclxuICApOiB2b2lkIHtcclxuICAgIGNvbnN0IGFuYWx5c2lzUHJvZ3Jlc3MgPSBNYXRoLnJvdW5kKChydWxlc1Byb2Nlc3NlZCAvIHRvdGFsUnVsZXMpICogMTAwKTtcclxuICAgIFxyXG4gICAgbGV0IG1lc3NhZ2UgPSBgUHJvY2Vzc2luZyBNSVNSQSBydWxlczogJHtydWxlc1Byb2Nlc3NlZH0vJHt0b3RhbFJ1bGVzfSAoJHthbmFseXNpc1Byb2dyZXNzfSUpYDtcclxuICAgIGlmIChjdXJyZW50UnVsZSkge1xyXG4gICAgICBtZXNzYWdlICs9IGAgLSBDdXJyZW50OiAke2N1cnJlbnRSdWxlfWA7XHJcbiAgICB9XHJcblxyXG4gICAgdGhpcy51cGRhdGVTdGVwUHJvZ3Jlc3MoXHJcbiAgICAgIHdvcmtmbG93SWQsXHJcbiAgICAgIDMsIC8vIEFuYWx5c2lzIHN0ZXBcclxuICAgICAgJ01JU1JBIEFuYWx5c2lzJyxcclxuICAgICAgYW5hbHlzaXNQcm9ncmVzcyxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAge1xyXG4gICAgICAgIHJ1bGVzUHJvY2Vzc2VkLFxyXG4gICAgICAgIHRvdGFsUnVsZXMsXHJcbiAgICAgICAgYW5hbHlzaXNQcm9ncmVzcyxcclxuICAgICAgICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nLFxyXG4gICAgICAgIGN1cnJlbnRSdWxlXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDb21wbGV0ZSBlbnRpcmUgd29ya2Zsb3dcclxuICAgKi9cclxuICBwdWJsaWMgY29tcGxldGVXb3JrZmxvdyhcclxuICAgIHdvcmtmbG93SWQ6IHN0cmluZyxcclxuICAgIHJlc3VsdHM6IGFueSxcclxuICAgIG1lc3NhZ2U6IHN0cmluZyA9ICdXb3JrZmxvdyBjb21wbGV0ZWQgc3VjY2Vzc2Z1bGx5J1xyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmFjdGl2ZVdvcmtmbG93cy5nZXQod29ya2Zsb3dJZCk7XHJcbiAgICBpZiAoIXdvcmtmbG93KSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgV29ya2Zsb3cgJHt3b3JrZmxvd0lkfSBub3QgZm91bmQgZm9yIGNvbXBsZXRpb25gKTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHdvcmtmbG93LmlzUnVubmluZyA9IGZhbHNlO1xyXG4gICAgd29ya2Zsb3cuZW5kVGltZSA9IG5ldyBEYXRlKCk7XHJcbiAgICB3b3JrZmxvdy5vdmVyYWxsUHJvZ3Jlc3MgPSAxMDA7XHJcblxyXG4gICAgLy8gRW1pdCBjb21wbGV0aW9uIGV2ZW50XHJcbiAgICB0aGlzLmVtaXRQcm9ncmVzc0V2ZW50KHdvcmtmbG93SWQsIHtcclxuICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgc3RlcElkOiA5OTksXHJcbiAgICAgIHN0ZXBOYW1lOiAnV29ya2Zsb3cgQ29tcGxldGVkJyxcclxuICAgICAgc3RhdHVzOiAnY29tcGxldGVkJyxcclxuICAgICAgcHJvZ3Jlc3M6IDEwMCxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLFxyXG4gICAgICBtZXRhZGF0YToge1xyXG4gICAgICAgIHJlc3VsdHMsXHJcbiAgICAgICAgZXhlY3V0aW9uVGltZTogd29ya2Zsb3cuZW5kVGltZS5nZXRUaW1lKCkgLSB3b3JrZmxvdy5zdGFydFRpbWUuZ2V0VGltZSgpXHJcbiAgICAgIH1cclxuICAgIH0pO1xyXG5cclxuICAgIC8vIExvZyBmaW5hbCByZXN1bHRzIHRvIENsb3VkV2F0Y2hcclxuICAgIHRoaXMubG9nVG9DbG91ZFdhdGNoKHdvcmtmbG93SWQsICdXT1JLRkxPV19DT01QTEVURUQnLCB7XHJcbiAgICAgIHdvcmtmbG93SWQsXHJcbiAgICAgIHVzZXJJZDogd29ya2Zsb3cudXNlcklkLFxyXG4gICAgICBleGVjdXRpb25UaW1lOiB3b3JrZmxvdy5lbmRUaW1lLmdldFRpbWUoKSAtIHdvcmtmbG93LnN0YXJ0VGltZS5nZXRUaW1lKCksXHJcbiAgICAgIGNvbXBsZXRlZFN0ZXBzOiB3b3JrZmxvdy5jb21wbGV0ZWRTdGVwcy5sZW5ndGgsXHJcbiAgICAgIHJlc3VsdHM6IHtcclxuICAgICAgICBjb21wbGlhbmNlUGVyY2VudGFnZTogcmVzdWx0cy5jb21wbGlhbmNlUGVyY2VudGFnZSxcclxuICAgICAgICB2aW9sYXRpb25Db3VudDogcmVzdWx0cy52aW9sYXRpb25zPy5sZW5ndGggfHwgMFxyXG4gICAgICB9XHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEhhbmRsZSB3b3JrZmxvdyBlcnJvclxyXG4gICAqL1xyXG4gIHB1YmxpYyBoYW5kbGVXb3JrZmxvd0Vycm9yKFxyXG4gICAgd29ya2Zsb3dJZDogc3RyaW5nLFxyXG4gICAgc3RlcElkOiBudW1iZXIsXHJcbiAgICBzdGVwTmFtZTogc3RyaW5nLFxyXG4gICAgZXJyb3I6IHN0cmluZ1xyXG4gICk6IHZvaWQge1xyXG4gICAgY29uc3Qgd29ya2Zsb3cgPSB0aGlzLmFjdGl2ZVdvcmtmbG93cy5nZXQod29ya2Zsb3dJZCk7XHJcbiAgICBpZiAoIXdvcmtmbG93KSB7XHJcbiAgICAgIGNvbnNvbGUud2FybihgV29ya2Zsb3cgJHt3b3JrZmxvd0lkfSBub3QgZm91bmQgZm9yIGVycm9yIGhhbmRsaW5nYCk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB3b3JrZmxvdy5pc1J1bm5pbmcgPSBmYWxzZTtcclxuICAgIHdvcmtmbG93LmVycm9yID0gZXJyb3I7XHJcbiAgICB3b3JrZmxvdy5lbmRUaW1lID0gbmV3IERhdGUoKTtcclxuXHJcbiAgICAvLyBFbWl0IGVycm9yIGV2ZW50XHJcbiAgICB0aGlzLmVtaXRQcm9ncmVzc0V2ZW50KHdvcmtmbG93SWQsIHtcclxuICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgc3RlcElkLFxyXG4gICAgICBzdGVwTmFtZSxcclxuICAgICAgc3RhdHVzOiAnZXJyb3InLFxyXG4gICAgICBwcm9ncmVzczogMCxcclxuICAgICAgbWVzc2FnZTogYEVycm9yIGluICR7c3RlcE5hbWV9OiAke2Vycm9yfWAsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKVxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gTG9nIGVycm9yIHRvIENsb3VkV2F0Y2hcclxuICAgIHRoaXMubG9nVG9DbG91ZFdhdGNoKHdvcmtmbG93SWQsICdXT1JLRkxPV19FUlJPUicsIHtcclxuICAgICAgd29ya2Zsb3dJZCxcclxuICAgICAgc3RlcElkLFxyXG4gICAgICBzdGVwTmFtZSxcclxuICAgICAgZXJyb3IsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCB3b3JrZmxvdyBwcm9ncmVzc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRXb3JrZmxvd1Byb2dyZXNzKHdvcmtmbG93SWQ6IHN0cmluZyk6IFdvcmtmbG93UHJvZ3Jlc3MgfCBudWxsIHtcclxuICAgIHJldHVybiB0aGlzLmFjdGl2ZVdvcmtmbG93cy5nZXQod29ya2Zsb3dJZCkgfHwgbnVsbDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBhbGwgYWN0aXZlIHdvcmtmbG93c1xyXG4gICAqL1xyXG4gIHB1YmxpYyBnZXRBY3RpdmVXb3JrZmxvd3MoKTogV29ya2Zsb3dQcm9ncmVzc1tdIHtcclxuICAgIHJldHVybiBBcnJheS5mcm9tKHRoaXMuYWN0aXZlV29ya2Zsb3dzLnZhbHVlcygpKS5maWx0ZXIodyA9PiB3LmlzUnVubmluZyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdWJzY3JpYmUgdG8gcHJvZ3Jlc3MgdXBkYXRlcyBmb3IgYSB3b3JrZmxvd1xyXG4gICAqL1xyXG4gIHB1YmxpYyBzdWJzY3JpYmVUb1Byb2dyZXNzKFxyXG4gICAgd29ya2Zsb3dJZDogc3RyaW5nLFxyXG4gICAgY2FsbGJhY2s6IChldmVudDogUHJvZ3Jlc3NFdmVudCkgPT4gdm9pZFxyXG4gICk6IHZvaWQge1xyXG4gICAgdGhpcy5wcm9ncmVzc0NhbGxiYWNrcy5zZXQod29ya2Zsb3dJZCwgY2FsbGJhY2spO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVW5zdWJzY3JpYmUgZnJvbSBwcm9ncmVzcyB1cGRhdGVzXHJcbiAgICovXHJcbiAgcHVibGljIHVuc3Vic2NyaWJlRnJvbVByb2dyZXNzKHdvcmtmbG93SWQ6IHN0cmluZyk6IHZvaWQge1xyXG4gICAgdGhpcy5wcm9ncmVzc0NhbGxiYWNrcy5kZWxldGUod29ya2Zsb3dJZCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDbGVhbiB1cCBjb21wbGV0ZWQgd29ya2Zsb3dzXHJcbiAgICovXHJcbiAgcHVibGljIGNsZWFudXBDb21wbGV0ZWRXb3JrZmxvd3MobWF4QWdlOiBudW1iZXIgPSAzNjAwMDAwKTogdm9pZCB7XHJcbiAgICBjb25zdCBub3cgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICBmb3IgKGNvbnN0IFt3b3JrZmxvd0lkLCB3b3JrZmxvd10gb2YgdGhpcy5hY3RpdmVXb3JrZmxvd3MuZW50cmllcygpKSB7XHJcbiAgICAgIGlmICghd29ya2Zsb3cuaXNSdW5uaW5nICYmIHdvcmtmbG93LmVuZFRpbWUpIHtcclxuICAgICAgICBjb25zdCBhZ2UgPSBub3cgLSB3b3JrZmxvdy5lbmRUaW1lLmdldFRpbWUoKTtcclxuICAgICAgICBpZiAoYWdlID4gbWF4QWdlKSB7XHJcbiAgICAgICAgICB0aGlzLmFjdGl2ZVdvcmtmbG93cy5kZWxldGUod29ya2Zsb3dJZCk7XHJcbiAgICAgICAgICB0aGlzLnByb2dyZXNzQ2FsbGJhY2tzLmRlbGV0ZSh3b3JrZmxvd0lkKTtcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEVtaXQgcHJvZ3Jlc3MgZXZlbnQgdG8gYWxsIHN1YnNjcmliZXJzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBlbWl0UHJvZ3Jlc3NFdmVudCh3b3JrZmxvd0lkOiBzdHJpbmcsIGV2ZW50OiBQcm9ncmVzc0V2ZW50KTogdm9pZCB7XHJcbiAgICBjb25zdCB3b3JrZmxvdyA9IHRoaXMuYWN0aXZlV29ya2Zsb3dzLmdldCh3b3JrZmxvd0lkKTtcclxuICAgIGlmICh3b3JrZmxvdykge1xyXG4gICAgICB3b3JrZmxvdy5ldmVudHMucHVzaChldmVudCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsbCByZWdpc3RlcmVkIGNhbGxiYWNrXHJcbiAgICBjb25zdCBjYWxsYmFjayA9IHRoaXMucHJvZ3Jlc3NDYWxsYmFja3MuZ2V0KHdvcmtmbG93SWQpO1xyXG4gICAgaWYgKGNhbGxiYWNrKSB7XHJcbiAgICAgIGNhbGxiYWNrKGV2ZW50KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBMb2cgdG8gQ2xvdWRXYXRjaCBpZiBlbmFibGVkXHJcbiAgICBpZiAodGhpcy5jb25maWcuZW5hYmxlQ2xvdWRXYXRjaExvZ2dpbmcpIHtcclxuICAgICAgdGhpcy5sb2dUb0Nsb3VkV2F0Y2god29ya2Zsb3dJZCwgJ1BST0dSRVNTX1VQREFURScsIGV2ZW50KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBMb2cgdG8gY29uc29sZSBmb3IgZGV2ZWxvcG1lbnRcclxuICAgIGNvbnNvbGUubG9nKGBbUHJvZ3Jlc3NdICR7d29ya2Zsb3dJZH06ICR7ZXZlbnQuc3RlcE5hbWV9IC0gJHtldmVudC5tZXNzYWdlfWAsIHtcclxuICAgICAgcHJvZ3Jlc3M6IGV2ZW50LnByb2dyZXNzLFxyXG4gICAgICBtZXRhZGF0YTogZXZlbnQubWV0YWRhdGFcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGV2ZW50cyB0byBDbG91ZFdhdGNoIGZvciBkZW1vbnN0cmF0aW9uIHB1cnBvc2VzXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBhc3luYyBsb2dUb0Nsb3VkV2F0Y2goXHJcbiAgICB3b3JrZmxvd0lkOiBzdHJpbmcsXHJcbiAgICBldmVudFR5cGU6IHN0cmluZyxcclxuICAgIGRhdGE6IGFueVxyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKCF0aGlzLmNvbmZpZy5lbmFibGVDbG91ZFdhdGNoTG9nZ2luZykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbG9nRXZlbnQgPSB7XHJcbiAgICAgICAgdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICAgIG1lc3NhZ2U6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGV2ZW50VHlwZSxcclxuICAgICAgICAgIHdvcmtmbG93SWQsXHJcbiAgICAgICAgICBkYXRhLFxyXG4gICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICB9KVxyXG4gICAgICB9O1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5jbG91ZFdhdGNoTG9ncy5wdXRMb2dFdmVudHMoe1xyXG4gICAgICAgIGxvZ0dyb3VwTmFtZTogdGhpcy5jb25maWcubG9nR3JvdXBOYW1lLFxyXG4gICAgICAgIGxvZ1N0cmVhbU5hbWU6IGB3b3JrZmxvdy0ke3dvcmtmbG93SWR9YCxcclxuICAgICAgICBsb2dFdmVudHM6IFtsb2dFdmVudF1cclxuICAgICAgfSkucHJvbWlzZSgpO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUud2FybignRmFpbGVkIHRvIGxvZyB0byBDbG91ZFdhdGNoOicsIGVycm9yKTtcclxuICAgICAgLy8gRG9uJ3QgdGhyb3cgLSBsb2dnaW5nIGZhaWx1cmVzIHNob3VsZG4ndCBicmVhayB0aGUgd29ya2Zsb3dcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEluaXRpYWxpemUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXBcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGluaXRpYWxpemVDbG91ZFdhdGNoTG9nR3JvdXAoKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICBpZiAoIXRoaXMuY29uZmlnLmVuYWJsZUNsb3VkV2F0Y2hMb2dnaW5nKSB7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBDaGVjayBpZiBsb2cgZ3JvdXAgZXhpc3RzXHJcbiAgICAgIGF3YWl0IHRoaXMuY2xvdWRXYXRjaExvZ3MuZGVzY3JpYmVMb2dHcm91cHMoe1xyXG4gICAgICAgIGxvZ0dyb3VwTmFtZVByZWZpeDogdGhpcy5jb25maWcubG9nR3JvdXBOYW1lXHJcbiAgICAgIH0pLnByb21pc2UoKTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICB0cnkge1xyXG4gICAgICAgIC8vIENyZWF0ZSBsb2cgZ3JvdXAgaWYgaXQgZG9lc24ndCBleGlzdFxyXG4gICAgICAgIGF3YWl0IHRoaXMuY2xvdWRXYXRjaExvZ3MuY3JlYXRlTG9nR3JvdXAoe1xyXG4gICAgICAgICAgbG9nR3JvdXBOYW1lOiB0aGlzLmNvbmZpZy5sb2dHcm91cE5hbWVcclxuICAgICAgICB9KS5wcm9taXNlKCk7XHJcblxyXG4gICAgICAgIGNvbnNvbGUubG9nKGBDcmVhdGVkIENsb3VkV2F0Y2ggbG9nIGdyb3VwOiAke3RoaXMuY29uZmlnLmxvZ0dyb3VwTmFtZX1gKTtcclxuICAgICAgfSBjYXRjaCAoY3JlYXRlRXJyb3IpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBjcmVhdGUgQ2xvdWRXYXRjaCBsb2cgZ3JvdXA6JywgY3JlYXRlRXJyb3IpO1xyXG4gICAgICB9XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgbG9nIHN0cmVhbSBmb3IgYSB3b3JrZmxvd1xyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgY3JlYXRlTG9nU3RyZWFtKHdvcmtmbG93SWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgaWYgKCF0aGlzLmNvbmZpZy5lbmFibGVDbG91ZFdhdGNoTG9nZ2luZykge1xyXG4gICAgICByZXR1cm47XHJcbiAgICB9XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdGhpcy5jbG91ZFdhdGNoTG9ncy5jcmVhdGVMb2dTdHJlYW0oe1xyXG4gICAgICAgIGxvZ0dyb3VwTmFtZTogdGhpcy5jb25maWcubG9nR3JvdXBOYW1lLFxyXG4gICAgICAgIGxvZ1N0cmVhbU5hbWU6IGB3b3JrZmxvdy0ke3dvcmtmbG93SWR9YFxyXG4gICAgICB9KS5wcm9taXNlKCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICAvLyBTdHJlYW0gbWlnaHQgYWxyZWFkeSBleGlzdCwgd2hpY2ggaXMgZmluZVxyXG4gICAgICBpZiAoIWVycm9yLmNvZGUgfHwgZXJyb3IuY29kZSAhPT0gJ1Jlc291cmNlQWxyZWFkeUV4aXN0c0V4Y2VwdGlvbicpIHtcclxuICAgICAgICBjb25zb2xlLndhcm4oJ0ZhaWxlZCB0byBjcmVhdGUgbG9nIHN0cmVhbTonLCBlcnJvcik7XHJcbiAgICAgIH1cclxuICAgIH1cclxuICB9XHJcbn1cclxuXHJcbi8vIEV4cG9ydCBzaW5nbGV0b24gaW5zdGFuY2VcclxuZXhwb3J0IGNvbnN0IHByb2dyZXNzVHJhY2tpbmdTZXJ2aWNlID0gbmV3IFByb2dyZXNzVHJhY2tpbmdTZXJ2aWNlKHtcclxuICBlbmFibGVDbG91ZFdhdGNoTG9nZ2luZzogcHJvY2Vzcy5lbnYuTk9ERV9FTlYgPT09ICdwcm9kdWN0aW9uJyxcclxuICBsb2dHcm91cE5hbWU6IHByb2Nlc3MuZW52LlBST0dSRVNTX0xPR19HUk9VUCB8fCAnL2F3cy9sYW1iZGEvbWlzcmEtYW5hbHlzaXMtcHJvZ3Jlc3MnLFxyXG4gIGVuYWJsZVdlYlNvY2tldFVwZGF0ZXM6IHRydWUsXHJcbiAgZW5hYmxlUG9sbGluZ1VwZGF0ZXM6IHRydWUsXHJcbiAgcHJvZ3Jlc3NVcGRhdGVJbnRlcnZhbDogMTAwMFxyXG59KTsiXX0=