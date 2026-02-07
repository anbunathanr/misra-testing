/**
 * Validation models and error types for File Metadata Management system
 */

/**
 * Validation result containing success status and error details
 */
export interface ValidationResult {
  isValid: boolean
  errors: ValidationError[]
}

/**
 * Individual validation error with field-specific information
 */
export interface ValidationError {
  field: string
  message: string
  code: string
}

/**
 * Error codes for different types of validation and system errors
 */
export enum ErrorCodes {
  VALIDATION_ERROR = 'VALIDATION_ERROR',
  NOT_FOUND = 'NOT_FOUND',
  DUPLICATE_FILE_ID = 'DUPLICATE_FILE_ID',
  UNAUTHORIZED = 'UNAUTHORIZED',
  DATABASE_ERROR = 'DATABASE_ERROR',
  INTEGRATION_ERROR = 'INTEGRATION_ERROR',
  ANALYSIS_FAILED = 'ANALYSIS_FAILED',
  FILE_UPLOAD_FAILED = 'FILE_UPLOAD_FAILED',
  NETWORK_ERROR = 'NETWORK_ERROR',
  RATE_LIMIT_EXCEEDED = 'RATE_LIMIT_EXCEEDED',
  SERVICE_UNAVAILABLE = 'SERVICE_UNAVAILABLE',
  UNKNOWN_ERROR = 'UNKNOWN_ERROR'
}

/**
 * Custom error class for metadata operations
 */
export class MetadataError extends Error {
  public readonly code: string
  public readonly statusCode: number
  public readonly details?: any

  constructor(message: string, code: string, statusCode: number, details?: any) {
    super(message)
    this.name = 'MetadataError'
    this.code = code
    this.statusCode = statusCode
    this.details = details
  }
}

/**
 * File metadata validator interface
 */
export interface FileMetadataValidator {
  validateCreate(metadata: Partial<import('./file-metadata').FileMetadata>): ValidationResult
  validateUpdate(updates: Partial<import('./file-metadata').FileMetadata>): ValidationResult
  validateFileId(fileId: string): boolean
  validateUserId(userId: string): boolean
  validateFileType(fileType: string): boolean
  validateAnalysisStatus(status: string): boolean
}
