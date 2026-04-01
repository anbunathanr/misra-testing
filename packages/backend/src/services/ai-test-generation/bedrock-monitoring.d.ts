/**
 * Bedrock Monitoring Service
 *
 * Provides CloudWatch metrics, X-Ray tracing, and detailed logging for Bedrock operations.
 *
 * **Validates: Requirements 14.1, 14.2, 14.3, 14.4, 14.5, 14.6, 14.7**
 */
export interface MetricData {
    operation: string;
    latency: number;
    tokens: number;
    cost: number;
    success: boolean;
    errorType?: string;
}
export interface LogData {
    timestamp: string;
    operation: string;
    model: string;
    region: string;
    requestTokens?: number;
    responseTokens?: number;
    totalTokens?: number;
    cost?: number;
    latency: number;
    status: 'success' | 'failure';
    error?: string;
    circuitState?: string;
}
export declare class BedrockMonitoring {
    private cloudWatchClient;
    private namespace;
    private enabled;
    constructor(region?: string);
    /**
     * Emit CloudWatch metrics for Bedrock operation
     */
    emitMetrics(data: MetricData): Promise<void>;
    /**
     * Log detailed operation information
     * Logs to CloudWatch Logs via console.log (Lambda automatically captures)
     */
    logOperation(data: LogData): void;
    /**
     * Start X-Ray segment for Bedrock operation
     * Note: X-Ray SDK must be installed and configured separately
     */
    startXRaySegment(operation: string): XRaySegment | null;
    /**
     * Get X-Ray SDK if available
     * Returns null if X-Ray is not installed or not available
     */
    private getXRaySDK;
}
export interface XRaySegment {
    subsegment: any;
    addMetadata: (key: string, value: any) => void;
    addAnnotation: (key: string, value: string | number | boolean) => void;
    close: (error?: Error) => void;
}
export declare function getBedrockMonitoring(region?: string): BedrockMonitoring;
