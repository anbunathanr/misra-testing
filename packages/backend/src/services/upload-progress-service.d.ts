/**
 * Service for managing file upload progress tracking
 * Task 4.2: Build file upload progress monitoring
 */
export interface UploadProgressRecord {
    file_id: string;
    user_id: string;
    file_name: string;
    file_size: number;
    progress_percentage: number;
    status: 'starting' | 'uploading' | 'completed' | 'failed';
    message: string;
    created_at: number;
    updated_at: number;
    ttl: number;
    error_message?: string;
    bytes_uploaded?: number;
    upload_speed?: number;
}
export interface UploadProgressUpdate {
    progress_percentage: number;
    status: 'starting' | 'uploading' | 'completed' | 'failed';
    message: string;
    error_message?: string;
    bytes_uploaded?: number;
    upload_speed?: number;
}
export declare class UploadProgressService {
    private readonly dynamoClient;
    private readonly tableName;
    constructor();
    /**
     * Create a new upload progress record
     */
    createUploadProgress(fileId: string, userId: string, fileName: string, fileSize: number): Promise<void>;
    /**
     * Update upload progress
     */
    updateUploadProgress(fileId: string, update: UploadProgressUpdate): Promise<void>;
    /**
     * Get upload progress by file ID
     */
    getUploadProgress(fileId: string): Promise<UploadProgressRecord | null>;
    /**
     * Get all upload progress records for a user
     */
    getUserUploadProgress(userId: string, limit?: number): Promise<UploadProgressRecord[]>;
    /**
     * Get upload progress records by status
     */
    getUploadProgressByStatus(status: 'starting' | 'uploading' | 'completed' | 'failed', limit?: number): Promise<UploadProgressRecord[]>;
    /**
     * Mark upload as completed
     */
    markUploadCompleted(fileId: string, message?: string): Promise<void>;
    /**
     * Mark upload as failed
     */
    markUploadFailed(fileId: string, errorMessage: string): Promise<void>;
    /**
     * Calculate upload speed based on progress
     */
    calculateUploadSpeed(bytesUploaded: number, elapsedTimeMs: number): number;
    /**
     * Estimate time remaining based on current progress
     */
    estimateTimeRemaining(progressPercentage: number, elapsedTimeMs: number, fileSize: number): number;
    /**
     * Clean up old completed/failed uploads (for maintenance)
     */
    cleanupOldUploads(olderThanDays?: number): Promise<number>;
}
