/**
 * Processing Queue Service
 * Manages SQS queue operations for file processing jobs
 */
export interface ProcessingJob {
    jobId: string;
    fileId: string;
    fileName: string;
    fileSize: number;
    s3Key: string;
    userId: string;
    organizationId: string;
    jobType: 'misra-analysis' | 'regression-test' | 'both';
    priority: 'high' | 'normal' | 'low';
    metadata?: Record<string, any>;
    createdAt: number;
}
export interface QueueMessage {
    messageId: string;
    receiptHandle: string;
    body: ProcessingJob;
    attributes?: Record<string, string>;
}
export declare class ProcessingQueueService {
    private sqsClient;
    private queueUrl;
    constructor();
    /**
     * Send a processing job to the queue
     */
    sendJob(job: ProcessingJob): Promise<string>;
    /**
     * Send multiple jobs in batch (up to 10 at a time)
     */
    sendJobBatch(jobs: ProcessingJob[]): Promise<string[]>;
    /**
     * Receive messages from the queue
     */
    receiveJobs(maxMessages?: number): Promise<QueueMessage[]>;
    /**
     * Delete a message from the queue after successful processing
     */
    deleteJob(receiptHandle: string): Promise<void>;
    /**
     * Create a processing job from file upload
     */
    createJobFromUpload(fileId: string, fileName: string, fileSize: number, s3Key: string, userId: string, organizationId: string, jobType?: ProcessingJob['jobType'], priority?: ProcessingJob['priority']): ProcessingJob;
    /**
     * Get queue URL
     */
    getQueueUrl(): string;
    /**
     * Check if queue is configured
     */
    isConfigured(): boolean;
}
