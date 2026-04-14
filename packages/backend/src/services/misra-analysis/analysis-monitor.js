"use strict";
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
Object.defineProperty(exports, "__esModule", { value: true });
exports.analysisMonitor = exports.AnalysisMonitor = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const lib_dynamodb_1 = require("@aws-sdk/lib-dynamodb");
const dynamoClient = lib_dynamodb_1.DynamoDBDocumentClient.from(new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION }));
class AnalysisMonitor {
    DEFAULT_POLL_INTERVAL = 2000; // 2 seconds (Requirement 3.3)
    DEFAULT_TIMEOUT = 600000; // 10 minutes
    ANALYSIS_RESULTS_TABLE = process.env.ANALYSIS_RESULTS_TABLE_NAME || 'AnalysisResults-dev';
    /**
     * Get current analysis progress from DynamoDB
     * Requirement 3.3: Poll analysis status every 2 seconds during active analysis
     */
    async getAnalysisProgress(analysisId) {
        try {
            const result = await dynamoClient.send(new lib_dynamodb_1.GetCommand({
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
            const estimatedTimeRemaining = this.calculateEstimatedTimeRemaining(item.progress || 0, elapsedTime, item.estimatedDuration || 120000 // 2 minutes default
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
        }
        catch (error) {
            console.error('[AnalysisMonitor] Error getting analysis progress:', error);
            throw error;
        }
    }
    /**
     * Update analysis progress in DynamoDB
     * Used by the analysis engine to report progress
     */
    async updateAnalysisProgress(analysisId, progress, currentStep, status) {
        try {
            const now = Date.now();
            await dynamoClient.send(new lib_dynamodb_1.UpdateCommand({
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
        }
        catch (error) {
            console.error('[AnalysisMonitor] Error updating analysis progress:', error);
            throw error;
        }
    }
    /**
     * Calculate estimated time remaining based on current progress
     * Requirement 3.4: Add estimated time remaining calculations
     */
    calculateEstimatedTimeRemaining(currentProgress, elapsedTime, estimatedDuration) {
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
    mapStatus(internalStatus) {
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
    async pollAnalysisStatus(analysisId, onProgress, options) {
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
                }
                catch (error) {
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
    async startMonitoring(analysisId, onProgress, options) {
        console.log(`[AnalysisMonitor] Starting monitoring for analysis: ${analysisId}`);
        try {
            const result = await this.pollAnalysisStatus(analysisId, onProgress, options);
            console.log(`[AnalysisMonitor] Analysis completed: ${analysisId}`);
            return result;
        }
        catch (error) {
            console.error(`[AnalysisMonitor] Monitoring failed for ${analysisId}:`, error);
            throw error;
        }
    }
    /**
     * Stop monitoring an analysis (cleanup method)
     * Note: Actual polling is stopped by the promise resolution/rejection
     */
    stopMonitoring(analysisId) {
        console.log(`[AnalysisMonitor] Stopped monitoring for analysis: ${analysisId}`);
        // Cleanup logic if needed (e.g., clear cached data)
    }
}
exports.AnalysisMonitor = AnalysisMonitor;
// Export singleton instance
exports.analysisMonitor = new AnalysisMonitor();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtbW9uaXRvci5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFuYWx5c2lzLW1vbml0b3IudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7Ozs7Ozs7R0FZRzs7O0FBRUgsOERBQTBEO0FBQzFELHdEQUEwRjtBQUUxRixNQUFNLFlBQVksR0FBRyxxQ0FBc0IsQ0FBQyxJQUFJLENBQUMsSUFBSSxnQ0FBYyxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxFQUFFLENBQUMsQ0FBQyxDQUFDO0FBbUJ6RyxNQUFhLGVBQWU7SUFDVCxxQkFBcUIsR0FBRyxJQUFJLENBQUMsQ0FBQyw4QkFBOEI7SUFDNUQsZUFBZSxHQUFHLE1BQU0sQ0FBQyxDQUFDLGFBQWE7SUFDdkMsc0JBQXNCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxxQkFBcUIsQ0FBQztJQUUzRzs7O09BR0c7SUFDSCxLQUFLLENBQUMsbUJBQW1CLENBQUMsVUFBa0I7UUFDMUMsSUFBSSxDQUFDO1lBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxZQUFZLENBQUMsSUFBSSxDQUFDLElBQUkseUJBQVUsQ0FBQztnQkFDcEQsU0FBUyxFQUFFLElBQUksQ0FBQyxzQkFBc0I7Z0JBQ3RDLEdBQUcsRUFBRSxFQUFFLFVBQVUsRUFBRTthQUNwQixDQUFDLENBQUMsQ0FBQztZQUVKLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxFQUFFLENBQUM7Z0JBQ2pCLE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLFVBQVUsRUFBRSxDQUFDLENBQUM7Z0JBQ25FLE9BQU8sSUFBSSxDQUFDO1lBQ2QsQ0FBQztZQUVELE1BQU0sSUFBSSxHQUFHLE1BQU0sQ0FBQyxJQUFJLENBQUM7WUFDekIsTUFBTSxHQUFHLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFDO1lBQ3ZCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxTQUFTLElBQUks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QUFNLENBQUMsS0FBSyxDQUFDLENBQUM7Z0JBQ2hCLENBQUM7WUFDSCxDQUFDLENBQUM7WUFFRixnQkFBZ0I7WUFDaEIsTUFBTSxVQUFVLEdBQUcsV0FBVyxDQUFDLElBQUksRUFBRSxZQUFZLENBQUMsQ0FBQztZQUVuRCxlQUFlO1lBQ2YsSUFBSSxFQUFFLENBQUM7UUFDVCxDQUFDLENBQUMsQ0FBQztJQUNMLENBQUM7SUFFRDs7O09BR0c7SUFDSCxLQUFLLENBQUMsZUFBZSxDQUNuQixVQUFrQixFQUNsQixVQUFnRCxFQUNoRCxPQUFnQztRQUVoQyxPQUFPLENBQUMsR0FBRyxDQUFDLHVEQUF1RCxVQUFVLEVBQUUsQ0FBQyxDQUFDO1FBRWpGLElBQUksQ0FBQztZQUNILE1BQU0sTUFBTSxHQUFHLE1BQU0sSUFBSSxDQUFDLGtCQUFrQixDQUFDLFVBQVUsRUFBRSxVQUFVLEVBQUUsT0FBTyxDQUFDLENBQUM7WUFDOUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5Q0FBeUMsVUFBVSxFQUFFLENBQUMsQ0FBQztZQUNuRSxPQUFPLE1BQU0sQ0FBQztRQUNoQixDQUFDO1FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztZQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsMkNBQTJDLFVBQVUsR0FBRyxFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQy9FLE1BQU0sS0FBSyxDQUFDO1FBQ2QsQ0FBQztJQUNILENBQUM7SUFFRDs7O09BR0c7SUFDSCxjQUFjLENBQUMsVUFBa0I7UUFDL0IsT0FBTyxDQUFDLEdBQUcsQ0FBQyxzREFBc0QsVUFBVSxFQUFFLENBQUMsQ0FBQztRQUNoRixvREFBb0Q7SUFDdEQsQ0FBQztDQUNGO0FBeE9ELDBDQXdPQztBQUVELDRCQUE0QjtBQUNmLFFBQUEsZUFBZSxHQUFHLElBQUksZUFBZSxFQUFFLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQW5hbHlzaXMgTW9uaXRvcmluZyBTZXJ2aWNlXHJcbiAqIFxyXG4gKiBUYXNrIDUuMjogQ3JlYXRlIHJlYWwtdGltZSBhbmFseXNpcyBtb25pdG9yaW5nXHJcbiAqIFxyXG4gKiBGZWF0dXJlczpcclxuICogLSBBbmFseXNpcyBwcm9ncmVzcyBwb2xsaW5nIG1lY2hhbmlzbSB1c2luZyBleGlzdGluZyBMYW1iZGEgZnVuY3Rpb25zXHJcbiAqIC0gV2ViU29ja2V0LWxpa2UgdXBkYXRlcyBmb3IgbGl2ZSBwcm9ncmVzcyBkaXNwbGF5XHJcbiAqIC0gRXN0aW1hdGVkIHRpbWUgcmVtYWluaW5nIGNhbGN1bGF0aW9uc1xyXG4gKiAtIFJ1bGVzIHByb2Nlc3NlZCBjb3VudGVyc1xyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiAzLjMsIDMuNFxyXG4gKi9cclxuXHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgRHluYW1vREJEb2N1bWVudENsaWVudCwgR2V0Q29tbWFuZCwgVXBkYXRlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2xpYi1keW5hbW9kYic7XHJcblxyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBEeW5hbW9EQkRvY3VtZW50Q2xpZW50LmZyb20obmV3IER5bmFtb0RCQ2xpZW50KHsgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIH0pKTtcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgQW5hbHlzaXNQcm9ncmVzcyB7XHJcbiAgYW5hbHlzaXNJZDogc3RyaW5nO1xyXG4gIHN0YXR1czogJ3F1ZXVlZCcgfCAncnVubmluZycgfCAnY29tcGxldGVkJyB8ICdmYWlsZWQnO1xyXG4gIHByb2dyZXNzOiBudW1iZXI7IC8vIDAtMTAwXHJcbiAgY3VycmVudFN0ZXA6IHN0cmluZztcclxuICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nOiBudW1iZXI7IC8vIHNlY29uZHNcclxuICBydWxlc1Byb2Nlc3NlZDogbnVtYmVyO1xyXG4gIHRvdGFsUnVsZXM6IG51bWJlcjtcclxuICBzdGFydFRpbWU6IG51bWJlcjtcclxuICBsYXN0VXBkYXRlVGltZTogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEFuYWx5c2lzTW9uaXRvck9wdGlvbnMge1xyXG4gIHBvbGxJbnRlcnZhbD86IG51bWJlcjsgLy8gbWlsbGlzZWNvbmRzIChkZWZhdWx0OiAyMDAwKVxyXG4gIHRpbWVvdXQ/OiBudW1iZXI7IC8vIG1pbGxpc2Vjb25kcyAoZGVmYXVsdDogNjAwMDAwIC0gMTAgbWludXRlcylcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEFuYWx5c2lzTW9uaXRvciB7XHJcbiAgcHJpdmF0ZSByZWFkb25seSBERUZBVUxUX1BPTExfSU5URVJWQUwgPSAyMDAwOyAvLyAyIHNlY29uZHMgKFJlcXVpcmVtZW50IDMuMylcclxuICBwcml2YXRlIHJlYWRvbmx5IERFRkFVTFRfVElNRU9VVCA9IDYwMDAwMDsgLy8gMTAgbWludXRlc1xyXG4gIHByaXZhdGUgcmVhZG9ubHkgQU5BTFlTSVNfUkVTVUxUU19UQUJMRSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRSB8fCAnQW5hbHlzaXNSZXN1bHRzLWRldic7XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjdXJyZW50IGFuYWx5c2lzIHByb2dyZXNzIGZyb20gRHluYW1vREJcclxuICAgKiBSZXF1aXJlbWVudCAzLjM6IFBvbGwgYW5hbHlzaXMgc3RhdHVzIGV2ZXJ5IDIgc2Vjb25kcyBkdXJpbmcgYWN0aXZlIGFuYWx5c2lzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0QW5hbHlzaXNQcm9ncmVzcyhhbmFseXNpc0lkOiBzdHJpbmcpOiBQcm9taXNlPEFuYWx5c2lzUHJvZ3Jlc3MgfCBudWxsPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChuZXcgR2V0Q29tbWFuZCh7XHJcbiAgICAgICAgVGFibGVOYW1lOiB0aGlzLkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUsXHJcbiAgICAgICAgS2V5OiB7IGFuYWx5c2lzSWQgfVxyXG4gICAgICB9KSk7XHJcblxyXG4gICAgICBpZiAoIXJlc3VsdC5JdGVtKSB7XHJcbiAgICAgICAgY29uc29sZS5sb2coYFtBbmFseXNpc01vbml0b3JdIEFuYWx5c2lzIG5vdCBmb3VuZDogJHthbmFseXNpc0lkfWApO1xyXG4gICAgICAgIHJldHVybiBudWxsO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCBpdGVtID0gcmVzdWx0Lkl0ZW07XHJcbiAgICAgIGNvbnN0IG5vdyA9IERhdGUubm93KCk7XHJcbiAgICAgIGNvbnN0IHN0YXJ0VGltZSA9IGl0ZW0uc3RhcnRUaW1lIHx8IGl0ZW0uY3JlYXRlZEF0IHx8IG5vdztcclxuICAgICAgY29uc3QgZWxhcHNlZFRpbWUgPSBub3cgLSBzdGFydFRpbWU7XHJcblxyXG4gICAgICAvLyBDYWxjdWxhdGUgZXN0aW1hdGVkIHRpbWUgcmVtYWluaW5nIGJhc2VkIG9uIHByb2dyZXNzXHJcbiAgICAgIGNvbnN0IGVzdGltYXRlZFRpbWVSZW1haW5pbmcgPSB0aGlzLmNhbGN1bGF0ZUVzdGltYXRlZFRpbWVSZW1haW5pbmcoXHJcbiAgICAgICAgaXRlbS5wcm9ncmVzcyB8fCAwLFxyXG4gICAgICAgIGVsYXBzZWRUaW1lLFxyXG4gICAgICAgIGl0ZW0uZXN0aW1hdGVkRHVyYXRpb24gfHwgMTIwMDAwIC8vIDIgbWludXRlcyBkZWZhdWx0XHJcbiAgICAgICk7XHJcblxyXG4gICAgICAvLyBDYWxjdWxhdGUgcnVsZXMgcHJvY2Vzc2VkIGJhc2VkIG9uIHByb2dyZXNzXHJcbiAgICAgIGNvbnN0IHRvdGFsUnVsZXMgPSBpdGVtLnRvdGFsUnVsZXMgfHwgNTA7IC8vIERlZmF1bHQgdG8gNTAgTUlTUkEgcnVsZXNcclxuICAgICAgY29uc3QgcnVsZXNQcm9jZXNzZWQgPSBNYXRoLmZsb29yKChpdGVtLnByb2dyZXNzIHx8IDApIC8gMTAwICogdG90YWxSdWxlcyk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGFuYWx5c2lzSWQsXHJcbiAgICAgICAgc3RhdHVzOiB0aGlzLm1hcFN0YXR1cyhpdGVtLnN0YXR1cyksXHJcbiAgICAgICAgcHJvZ3Jlc3M6IGl0ZW0ucHJvZ3Jlc3MgfHwgMCxcclxuICAgICAgICBjdXJyZW50U3RlcDogaXRlbS5jdXJyZW50U3RlcCB8fCAnSW5pdGlhbGl6aW5nIGFuYWx5c2lzLi4uJyxcclxuICAgICAgICBlc3RpbWF0ZWRUaW1lUmVtYWluaW5nLFxyXG4gICAgICAgIHJ1bGVzUHJvY2Vzc2VkLFxyXG4gICAgICAgIHRvdGFsUnVsZXMsXHJcbiAgICAgICAgc3RhcnRUaW1lLFxyXG4gICAgICAgIGxhc3RVcGRhdGVUaW1lOiBpdGVtLmxhc3RVcGRhdGVUaW1lIHx8IG5vd1xyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0FuYWx5c2lzTW9uaXRvcl0gRXJyb3IgZ2V0dGluZyBhbmFseXNpcyBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBkYXRlIGFuYWx5c2lzIHByb2dyZXNzIGluIER5bmFtb0RCXHJcbiAgICogVXNlZCBieSB0aGUgYW5hbHlzaXMgZW5naW5lIHRvIHJlcG9ydCBwcm9ncmVzc1xyXG4gICAqL1xyXG4gIGFzeW5jIHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgICBhbmFseXNpc0lkOiBzdHJpbmcsXHJcbiAgICBwcm9ncmVzczogbnVtYmVyLFxyXG4gICAgY3VycmVudFN0ZXA6IHN0cmluZyxcclxuICAgIHN0YXR1cz86ICdxdWV1ZWQnIHwgJ3J1bm5pbmcnIHwgJ2NvbXBsZXRlZCcgfCAnZmFpbGVkJ1xyXG4gICk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3Qgbm93ID0gRGF0ZS5ub3coKTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKG5ldyBVcGRhdGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRoaXMuQU5BTFlTSVNfUkVTVUxUU19UQUJMRSxcclxuICAgICAgICBLZXk6IHsgYW5hbHlzaXNJZCB9LFxyXG4gICAgICAgIFVwZGF0ZUV4cHJlc3Npb246ICdTRVQgcHJvZ3Jlc3MgPSA6cHJvZ3Jlc3MsIGN1cnJlbnRTdGVwID0gOmN1cnJlbnRTdGVwLCBsYXN0VXBkYXRlVGltZSA9IDpsYXN0VXBkYXRlVGltZScgK1xyXG4gICAgICAgICAgKHN0YXR1cyA/ICcsICNzdGF0dXMgPSA6c3RhdHVzJyA6ICcnKSxcclxuICAgICAgICBFeHByZXNzaW9uQXR0cmlidXRlTmFtZXM6IHN0YXR1cyA/IHsgJyNzdGF0dXMnOiAnc3RhdHVzJyB9IDogdW5kZWZpbmVkLFxyXG4gICAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAgICc6cHJvZ3Jlc3MnOiBwcm9ncmVzcyxcclxuICAgICAgICAgICc6Y3VycmVudFN0ZXAnOiBjdXJyZW50U3RlcCxcclxuICAgICAgICAgICc6bGFzdFVwZGF0ZVRpbWUnOiBub3csXHJcbiAgICAgICAgICAuLi4oc3RhdHVzICYmIHsgJzpzdGF0dXMnOiBzdGF0dXMgfSlcclxuICAgICAgICB9XHJcbiAgICAgIH0pKTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNNb25pdG9yXSBVcGRhdGVkIHByb2dyZXNzIGZvciAke2FuYWx5c2lzSWR9OiAke3Byb2dyZXNzfSUgLSAke2N1cnJlbnRTdGVwfWApO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignW0FuYWx5c2lzTW9uaXRvcl0gRXJyb3IgdXBkYXRpbmcgYW5hbHlzaXMgcHJvZ3Jlc3M6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBlcnJvcjtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENhbGN1bGF0ZSBlc3RpbWF0ZWQgdGltZSByZW1haW5pbmcgYmFzZWQgb24gY3VycmVudCBwcm9ncmVzc1xyXG4gICAqIFJlcXVpcmVtZW50IDMuNDogQWRkIGVzdGltYXRlZCB0aW1lIHJlbWFpbmluZyBjYWxjdWxhdGlvbnNcclxuICAgKi9cclxuICBwcml2YXRlIGNhbGN1bGF0ZUVzdGltYXRlZFRpbWVSZW1haW5pbmcoXHJcbiAgICBjdXJyZW50UHJvZ3Jlc3M6IG51bWJlcixcclxuICAgIGVsYXBzZWRUaW1lOiBudW1iZXIsXHJcbiAgICBlc3RpbWF0ZWREdXJhdGlvbjogbnVtYmVyXHJcbiAgKTogbnVtYmVyIHtcclxuICAgIGlmIChjdXJyZW50UHJvZ3Jlc3MgPT09IDApIHtcclxuICAgICAgLy8gTm8gcHJvZ3Jlc3MgeWV0LCB1c2UgZXN0aW1hdGVkIGR1cmF0aW9uXHJcbiAgICAgIHJldHVybiBNYXRoLmZsb29yKGVzdGltYXRlZER1cmF0aW9uIC8gMTAwMCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGN1cnJlbnRQcm9ncmVzcyA+PSAxMDApIHtcclxuICAgICAgLy8gQW5hbHlzaXMgY29tcGxldGVcclxuICAgICAgcmV0dXJuIDA7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2FsY3VsYXRlIGJhc2VkIG9uIGN1cnJlbnQgcHJvZ3Jlc3MgcmF0ZVxyXG4gICAgY29uc3QgcHJvZ3Jlc3NSYXRlID0gY3VycmVudFByb2dyZXNzIC8gZWxhcHNlZFRpbWU7IC8vIHByb2dyZXNzIHBlciBtaWxsaXNlY29uZFxyXG4gICAgY29uc3QgcmVtYWluaW5nUHJvZ3Jlc3MgPSAxMDAgLSBjdXJyZW50UHJvZ3Jlc3M7XHJcbiAgICBjb25zdCBlc3RpbWF0ZWRSZW1haW5pbmdUaW1lID0gcmVtYWluaW5nUHJvZ3Jlc3MgLyBwcm9ncmVzc1JhdGU7XHJcblxyXG4gICAgLy8gUmV0dXJuIGluIHNlY29uZHMsIHdpdGggYSBtaW5pbXVtIG9mIDUgc2Vjb25kc1xyXG4gICAgcmV0dXJuIE1hdGgubWF4KDUsIE1hdGguZmxvb3IoZXN0aW1hdGVkUmVtYWluaW5nVGltZSAvIDEwMDApKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIE1hcCBpbnRlcm5hbCBzdGF0dXMgdG8gZXh0ZXJuYWwgc3RhdHVzIGZvcm1hdFxyXG4gICAqL1xyXG4gIHByaXZhdGUgbWFwU3RhdHVzKGludGVybmFsU3RhdHVzOiBzdHJpbmcpOiAncXVldWVkJyB8ICdydW5uaW5nJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCcge1xyXG4gICAgc3dpdGNoIChpbnRlcm5hbFN0YXR1cz8udG9VcHBlckNhc2UoKSkge1xyXG4gICAgICBjYXNlICdQRU5ESU5HJzpcclxuICAgICAgICByZXR1cm4gJ3F1ZXVlZCc7XHJcbiAgICAgIGNhc2UgJ1BST0NFU1NJTkcnOlxyXG4gICAgICAgIHJldHVybiAncnVubmluZyc7XHJcbiAgICAgIGNhc2UgJ0NPTVBMRVRFRCc6XHJcbiAgICAgICAgcmV0dXJuICdjb21wbGV0ZWQnO1xyXG4gICAgICBjYXNlICdGQUlMRUQnOlxyXG4gICAgICAgIHJldHVybiAnZmFpbGVkJztcclxuICAgICAgZGVmYXVsdDpcclxuICAgICAgICByZXR1cm4gJ3F1ZXVlZCc7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQb2xsIGFuYWx5c2lzIHN0YXR1cyB3aXRoIGNhbGxiYWNrIGZvciB1cGRhdGVzXHJcbiAgICogUmVxdWlyZW1lbnQgMy4zOiBQb2xsIGFuYWx5c2lzIHN0YXR1cyBldmVyeSAyIHNlY29uZHMgZHVyaW5nIGFjdGl2ZSBhbmFseXNpc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBhbmFseXNpc0lkIC0gVGhlIGFuYWx5c2lzIElEIHRvIG1vbml0b3JcclxuICAgKiBAcGFyYW0gb25Qcm9ncmVzcyAtIENhbGxiYWNrIGZ1bmN0aW9uIGNhbGxlZCBvbiBlYWNoIHByb2dyZXNzIHVwZGF0ZVxyXG4gICAqIEBwYXJhbSBvcHRpb25zIC0gUG9sbGluZyBvcHRpb25zIChpbnRlcnZhbCwgdGltZW91dClcclxuICAgKiBAcmV0dXJucyBQcm9taXNlIHRoYXQgcmVzb2x2ZXMgd2hlbiBhbmFseXNpcyBjb21wbGV0ZXMgb3IgZmFpbHNcclxuICAgKi9cclxuICBhc3luYyBwb2xsQW5hbHlzaXNTdGF0dXMoXHJcbiAgICBhbmFseXNpc0lkOiBzdHJpbmcsXHJcbiAgICBvblByb2dyZXNzOiAocHJvZ3Jlc3M6IEFuYWx5c2lzUHJvZ3Jlc3MpID0+IHZvaWQsXHJcbiAgICBvcHRpb25zPzogQW5hbHlzaXNNb25pdG9yT3B0aW9uc1xyXG4gICk6IFByb21pc2U8QW5hbHlzaXNQcm9ncmVzcz4ge1xyXG4gICAgY29uc3QgcG9sbEludGVydmFsID0gb3B0aW9ucz8ucG9sbEludGVydmFsIHx8IHRoaXMuREVGQVVMVF9QT0xMX0lOVEVSVkFMO1xyXG4gICAgY29uc3QgdGltZW91dCA9IG9wdGlvbnM/LnRpbWVvdXQgfHwgdGhpcy5ERUZBVUxUX1RJTUVPVVQ7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG5cclxuICAgIHJldHVybiBuZXcgUHJvbWlzZSgocmVzb2x2ZSwgcmVqZWN0KSA9PiB7XHJcbiAgICAgIGNvbnN0IHBvbGwgPSBhc3luYyAoKSA9PiB7XHJcbiAgICAgICAgdHJ5IHtcclxuICAgICAgICAgIC8vIENoZWNrIHRpbWVvdXRcclxuICAgICAgICAgIGlmIChEYXRlLm5vdygpIC0gc3RhcnRUaW1lID4gdGltZW91dCkge1xyXG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSWQpO1xyXG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdBbmFseXNpcyB0aW1lb3V0IC0gZXhjZWVkZWQgbWF4aW11bSB3YWl0IHRpbWUnKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBHZXQgY3VycmVudCBwcm9ncmVzc1xyXG4gICAgICAgICAgY29uc3QgcHJvZ3Jlc3MgPSBhd2FpdCB0aGlzLmdldEFuYWx5c2lzUHJvZ3Jlc3MoYW5hbHlzaXNJZCk7XHJcblxyXG4gICAgICAgICAgaWYgKCFwcm9ncmVzcykge1xyXG4gICAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSWQpO1xyXG4gICAgICAgICAgICByZWplY3QobmV3IEVycm9yKCdBbmFseXNpcyBub3QgZm91bmQnKSk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBDYWxsIHByb2dyZXNzIGNhbGxiYWNrXHJcbiAgICAgICAgICBvblByb2dyZXNzKHByb2dyZXNzKTtcclxuXHJcbiAgICAgICAgICAvLyBDaGVjayBpZiBhbmFseXNpcyBpcyBjb21wbGV0ZVxyXG4gICAgICAgICAgaWYgKHByb2dyZXNzLnN0YXR1cyA9PT0gJ2NvbXBsZXRlZCcpIHtcclxuICAgICAgICAgICAgY2xlYXJJbnRlcnZhbChpbnRlcnZhbElkKTtcclxuICAgICAgICAgICAgcmVzb2x2ZShwcm9ncmVzcyk7XHJcbiAgICAgICAgICAgIHJldHVybjtcclxuICAgICAgICAgIH1cclxuXHJcbiAgICAgICAgICAvLyBDaGVjayBpZiBhbmFseXNpcyBmYWlsZWRcclxuICAgICAgICAgIGlmIChwcm9ncmVzcy5zdGF0dXMgPT09ICdmYWlsZWQnKSB7XHJcbiAgICAgICAgICAgIGNsZWFySW50ZXJ2YWwoaW50ZXJ2YWxJZCk7XHJcbiAgICAgICAgICAgIHJlamVjdChuZXcgRXJyb3IoJ0FuYWx5c2lzIGZhaWxlZCcpKTtcclxuICAgICAgICAgICAgcmV0dXJuO1xyXG4gICAgICAgICAgfVxyXG5cclxuICAgICAgICAgIC8vIENvbnRpbnVlIHBvbGxpbmcgaWYgc3RhdHVzIGlzICdxdWV1ZWQnIG9yICdydW5uaW5nJ1xyXG4gICAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgICBjbGVhckludGVydmFsKGludGVydmFsSWQpO1xyXG4gICAgICAgICAgcmVqZWN0KGVycm9yKTtcclxuICAgICAgICB9XHJcbiAgICAgIH07XHJcblxyXG4gICAgICAvLyBTdGFydCBwb2xsaW5nXHJcbiAgICAgIGNvbnN0IGludGVydmFsSWQgPSBzZXRJbnRlcnZhbChwb2xsLCBwb2xsSW50ZXJ2YWwpO1xyXG4gICAgICBcclxuICAgICAgLy8gSW5pdGlhbCBwb2xsXHJcbiAgICAgIHBvbGwoKTtcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogU3RhcnQgbW9uaXRvcmluZyBhbiBhbmFseXNpcyB3aXRoIGF1dG9tYXRpYyBwcm9ncmVzcyB1cGRhdGVzXHJcbiAgICogVGhpcyBpcyBhIGNvbnZlbmllbmNlIG1ldGhvZCB0aGF0IGNvbWJpbmVzIHBvbGxpbmcgd2l0aCBwcm9ncmVzcyB0cmFja2luZ1xyXG4gICAqL1xyXG4gIGFzeW5jIHN0YXJ0TW9uaXRvcmluZyhcclxuICAgIGFuYWx5c2lzSWQ6IHN0cmluZyxcclxuICAgIG9uUHJvZ3Jlc3M6IChwcm9ncmVzczogQW5hbHlzaXNQcm9ncmVzcykgPT4gdm9pZCxcclxuICAgIG9wdGlvbnM/OiBBbmFseXNpc01vbml0b3JPcHRpb25zXHJcbiAgKTogUHJvbWlzZTxBbmFseXNpc1Byb2dyZXNzPiB7XHJcbiAgICBjb25zb2xlLmxvZyhgW0FuYWx5c2lzTW9uaXRvcl0gU3RhcnRpbmcgbW9uaXRvcmluZyBmb3IgYW5hbHlzaXM6ICR7YW5hbHlzaXNJZH1gKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgcmVzdWx0ID0gYXdhaXQgdGhpcy5wb2xsQW5hbHlzaXNTdGF0dXMoYW5hbHlzaXNJZCwgb25Qcm9ncmVzcywgb3B0aW9ucyk7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNNb25pdG9yXSBBbmFseXNpcyBjb21wbGV0ZWQ6ICR7YW5hbHlzaXNJZH1gKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoYFtBbmFseXNpc01vbml0b3JdIE1vbml0b3JpbmcgZmFpbGVkIGZvciAke2FuYWx5c2lzSWR9OmAsIGVycm9yKTtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBTdG9wIG1vbml0b3JpbmcgYW4gYW5hbHlzaXMgKGNsZWFudXAgbWV0aG9kKVxyXG4gICAqIE5vdGU6IEFjdHVhbCBwb2xsaW5nIGlzIHN0b3BwZWQgYnkgdGhlIHByb21pc2UgcmVzb2x1dGlvbi9yZWplY3Rpb25cclxuICAgKi9cclxuICBzdG9wTW9uaXRvcmluZyhhbmFseXNpc0lkOiBzdHJpbmcpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUubG9nKGBbQW5hbHlzaXNNb25pdG9yXSBTdG9wcGVkIG1vbml0b3JpbmcgZm9yIGFuYWx5c2lzOiAke2FuYWx5c2lzSWR9YCk7XHJcbiAgICAvLyBDbGVhbnVwIGxvZ2ljIGlmIG5lZWRlZCAoZS5nLiwgY2xlYXIgY2FjaGVkIGRhdGEpXHJcbiAgfVxyXG59XHJcblxyXG4vLyBFeHBvcnQgc2luZ2xldG9uIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBhbmFseXNpc01vbml0b3IgPSBuZXcgQW5hbHlzaXNNb25pdG9yKCk7XHJcbiJdfQ==