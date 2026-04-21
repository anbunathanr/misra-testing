/**
 * X-Ray Tracing Utility for Production Lambda Functions
 * Provides AWS X-Ray integration for distributed tracing
 */
export interface TraceSegment {
    name: string;
    metadata?: {
        [key: string]: any;
    };
    annotations?: {
        [key: string]: string | number | boolean;
    };
}
export declare class XRayTracer {
    private logger;
    private enabled;
    constructor();
    /**
     * Create a new subsegment for tracing a specific operation
     */
    traceOperation<T>(name: string, operation: () => Promise<T>, metadata?: {
        [key: string]: any;
    }, annotations?: {
        [key: string]: string | number | boolean;
    }): Promise<T>;
    /**
     * Trace MISRA analysis operation
     */
    traceAnalysis<T>(analysisId: string, fileType: string, operation: () => Promise<T>): Promise<T>;
    /**
     * Trace file upload operation
     */
    traceFileUpload<T>(fileId: string, fileName: string, fileSize: number, operation: () => Promise<T>): Promise<T>;
    /**
     * Trace DynamoDB operation
     */
    traceDynamoDBOperation<T>(tableName: string, operation: string, operationFn: () => Promise<T>): Promise<T>;
    /**
     * Trace authentication operation
     */
    traceAuth<T>(userId: string, authType: string, operation: () => Promise<T>): Promise<T>;
    /**
     * Add custom annotation to current segment
     */
    addAnnotation(key: string, value: string | number | boolean): void;
    /**
     * Add custom metadata to current segment
     */
    addMetadata(key: string, value: any): void;
    /**
     * Record an error in the current segment
     */
    recordError(error: Error): void;
    /**
     * Get current trace ID for correlation
     */
    getTraceId(): string | undefined;
}
/**
 * Get or create global X-Ray tracer
 */
export declare function getXRayTracer(): XRayTracer;
/**
 * Decorator for automatic X-Ray tracing
 */
export declare function withXRayTracing(operationName: string): (target: any, propertyName: string, descriptor: PropertyDescriptor) => PropertyDescriptor;
/**
 * Trace an async operation with X-Ray
 */
export declare function traceAsync<T>(name: string, operation: () => Promise<T>, metadata?: {
    [key: string]: any;
}): Promise<T>;
