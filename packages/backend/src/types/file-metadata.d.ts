/**
 * Core data models for File Metadata Management system
 * Defines TypeScript interfaces and enums for file metadata operations
 */
/**
 * File type enumeration for supported C/C++ file extensions
 */
export declare enum FileType {
    C = "c",
    CPP = "cpp",
    H = "h",
    HPP = "hpp"
}
/**
 * Analysis status enumeration for tracking MISRA analysis progress
 */
export declare enum AnalysisStatus {
    PENDING = "pending",
    IN_PROGRESS = "in_progress",
    COMPLETED = "completed",
    FAILED = "failed"
}
/**
 * Analysis results structure containing MISRA analysis output
 */
export interface AnalysisResults {
    violations_count: number;
    rules_checked: string[];
    completion_timestamp: number;
    error_message?: string;
}
/**
 * Core file metadata model representing a file record in DynamoDB
 */
export interface FileMetadata {
    file_id: string;
    user_id: string;
    filename: string;
    file_type: FileType;
    file_size: number;
    upload_timestamp: number;
    analysis_status: AnalysisStatus;
    analysis_results?: AnalysisResults;
    s3_key: string;
    created_at: number;
    updated_at: number;
}
/**
 * Pagination options for query operations
 */
export interface PaginationOptions {
    limit?: number;
    exclusiveStartKey?: any;
}
/**
 * Paginated result wrapper for query responses
 */
export interface PaginatedResult<T> {
    items: T[];
    lastEvaluatedKey?: any;
    count: number;
    scannedCount?: number;
}
/**
 * Query filters for advanced file searches
 */
export interface QueryFilters {
    fileType?: FileType;
    minFileSize?: number;
    maxFileSize?: number;
    startDate?: number;
    endDate?: number;
}
