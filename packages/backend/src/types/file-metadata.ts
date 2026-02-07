/**
 * Core data models for File Metadata Management system
 * Defines TypeScript interfaces and enums for file metadata operations
 */

/**
 * File type enumeration for supported C/C++ file extensions
 */
export enum FileType {
  C = 'c',
  CPP = 'cpp',
  H = 'h',
  HPP = 'hpp'
}

/**
 * Analysis status enumeration for tracking MISRA analysis progress
 */
export enum AnalysisStatus {
  PENDING = 'pending',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  FAILED = 'failed'
}

/**
 * Analysis results structure containing MISRA analysis output
 */
export interface AnalysisResults {
  violations_count: number
  rules_checked: string[]
  completion_timestamp: number
  error_message?: string
}

/**
 * Core file metadata model representing a file record in DynamoDB
 */
export interface FileMetadata {
  file_id: string           // UUID v4 - Primary key
  user_id: string          // User identifier from JWT
  filename: string         // Original filename with extension
  file_type: FileType      // File extension type
  file_size: number        // File size in bytes
  upload_timestamp: number // Unix timestamp (UTC)
  analysis_status: AnalysisStatus // Current analysis state
  analysis_results?: AnalysisResults // Optional analysis output
  s3_key: string          // S3 object key for file retrieval
  created_at: number      // Record creation timestamp
  updated_at: number      // Last modification timestamp
}

/**
 * Pagination options for query operations
 */
export interface PaginationOptions {
  limit?: number           // Max items per page (default: 50)
  exclusiveStartKey?: any  // DynamoDB pagination token
}

/**
 * Paginated result wrapper for query responses
 */
export interface PaginatedResult<T> {
  items: T[]
  lastEvaluatedKey?: any   // Token for next page
  count: number            // Items in current page
  scannedCount?: number    // Total items scanned
}

/**
 * Query filters for advanced file searches
 */
export interface QueryFilters {
  fileType?: FileType
  minFileSize?: number
  maxFileSize?: number
  startDate?: number       // Unix timestamp
  endDate?: number         // Unix timestamp
}
