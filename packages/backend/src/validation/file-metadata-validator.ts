/**
 * File Metadata Validator implementation
 * Provides comprehensive validation for file metadata operations
 */

import { FileMetadata, FileType, AnalysisStatus } from '../types/file-metadata'
import { 
  ValidationResult, 
  ValidationError, 
  FileMetadataValidator as IFileMetadataValidator,
  ErrorCodes 
} from '../types/validation'

/**
 * Implementation of FileMetadataValidator interface
 */
export class FileMetadataValidator implements IFileMetadataValidator {
  
  validateCreate(metadata: Partial<FileMetadata>): ValidationResult {
    const errors: ValidationError[] = []

    const requiredFields = [
      'file_id', 'user_id', 'filename', 'file_type', 
      'file_size', 'upload_timestamp', 'analysis_status', 's3_key'
    ]

    for (const field of requiredFields) {
      if (!(field in metadata) || metadata[field as keyof FileMetadata] === undefined) {
        errors.push({
          field,
          message: `${field} is required for file creation`,
          code: ErrorCodes.VALIDATION_ERROR
        })
      }
    }

    if (metadata.file_id !== undefined && !this.validateFileId(metadata.file_id)) {
      errors.push({
        field: 'file_id',
        message: 'file_id must be a valid UUID v4 format',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.user_id !== undefined && !this.validateUserId(metadata.user_id)) {
      errors.push({
        field: 'user_id',
        message: 'user_id must be a valid user identifier',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.filename !== undefined && !this.validateFilename(metadata.filename)) {
      errors.push({
        field: 'filename',
        message: 'filename must be a non-empty string with valid characters',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.file_type !== undefined && !this.validateFileType(metadata.file_type)) {
      errors.push({
        field: 'file_type',
        message: 'file_type must be one of: c, cpp, h, hpp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.file_size !== undefined && !this.validateFileSize(metadata.file_size)) {
      errors.push({
        field: 'file_size',
        message: 'file_size must be a positive integer',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.upload_timestamp !== undefined && !this.validateTimestamp(metadata.upload_timestamp)) {
      errors.push({
        field: 'upload_timestamp',
        message: 'upload_timestamp must be a valid Unix timestamp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.analysis_status !== undefined && !this.validateAnalysisStatus(metadata.analysis_status)) {
      errors.push({
        field: 'analysis_status',
        message: 'analysis_status must be one of: pending, in_progress, completed, failed',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.s3_key !== undefined && !this.validateS3Key(metadata.s3_key)) {
      errors.push({
        field: 's3_key',
        message: 's3_key must be a valid S3 object key',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.created_at !== undefined && !this.validateTimestamp(metadata.created_at)) {
      errors.push({
        field: 'created_at',
        message: 'created_at must be a valid Unix timestamp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (metadata.updated_at !== undefined && !this.validateTimestamp(metadata.updated_at)) {
      errors.push({
        field: 'updated_at',
        message: 'updated_at must be a valid Unix timestamp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateUpdate(updates: Partial<FileMetadata>): ValidationResult {
    const errors: ValidationError[] = []

    const immutableFields = ['file_id', 'user_id', 'upload_timestamp']
    for (const field of immutableFields) {
      if (field in updates) {
        errors.push({
          field,
          message: `${field} is immutable and cannot be updated`,
          code: ErrorCodes.VALIDATION_ERROR
        })
      }
    }

    if (updates.filename !== undefined && !this.validateFilename(updates.filename)) {
      errors.push({
        field: 'filename',
        message: 'filename must be a non-empty string with valid characters',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.file_type !== undefined && !this.validateFileType(updates.file_type)) {
      errors.push({
        field: 'file_type',
        message: 'file_type must be one of: c, cpp, h, hpp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.file_size !== undefined && !this.validateFileSize(updates.file_size)) {
      errors.push({
        field: 'file_size',
        message: 'file_size must be a positive integer',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.analysis_status !== undefined && !this.validateAnalysisStatus(updates.analysis_status)) {
      errors.push({
        field: 'analysis_status',
        message: 'analysis_status must be one of: pending, in_progress, completed, failed',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.s3_key !== undefined && !this.validateS3Key(updates.s3_key)) {
      errors.push({
        field: 's3_key',
        message: 's3_key must be a valid S3 object key',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.created_at !== undefined && !this.validateTimestamp(updates.created_at)) {
      errors.push({
        field: 'created_at',
        message: 'created_at must be a valid Unix timestamp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    if (updates.updated_at !== undefined && !this.validateTimestamp(updates.updated_at)) {
      errors.push({
        field: 'updated_at',
        message: 'updated_at must be a valid Unix timestamp',
        code: ErrorCodes.VALIDATION_ERROR
      })
    }

    return {
      isValid: errors.length === 0,
      errors
    }
  }

  validateFileId(fileId: string): boolean {
    if (typeof fileId !== 'string' || fileId.length === 0) {
      return false
    }

    const uuidV4Regex = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i
    return uuidV4Regex.test(fileId)
  }

  validateUserId(userId: string): boolean {
    if (typeof userId !== 'string' || userId.length === 0) {
      return false
    }

    const userIdRegex = /^[a-zA-Z0-9]{8,32}$/
    return userIdRegex.test(userId)
  }

  validateFileType(fileType: string): boolean {
    if (typeof fileType !== 'string') {
      return false
    }

    return Object.values(FileType).includes(fileType as FileType)
  }

  validateAnalysisStatus(status: string): boolean {
    if (typeof status !== 'string') {
      return false
    }

    return Object.values(AnalysisStatus).includes(status as AnalysisStatus)
  }

  private validateFilename(filename: string): boolean {
    if (typeof filename !== 'string' || filename.length === 0) {
      return false
    }

    const invalidChars = /[<>:"/\\|?*\x00-\x1f]/
    return !invalidChars.test(filename) && filename.length <= 255
  }

  private validateFileSize(fileSize: number): boolean {
    return typeof fileSize === 'number' && 
           Number.isInteger(fileSize) && 
           fileSize > 0 && 
           fileSize <= 1024 * 1024 * 1024
  }

  private validateTimestamp(timestamp: number): boolean {
    if (typeof timestamp !== 'number' || !Number.isInteger(timestamp)) {
      return false
    }

    const minTimestamp = 946684800
    const maxTimestamp = 4102444800
    return timestamp >= minTimestamp && timestamp <= maxTimestamp
  }

  private validateS3Key(s3Key: string): boolean {
    if (typeof s3Key !== 'string' || s3Key.length === 0) {
      return false
    }

    return !s3Key.startsWith('/') && 
           s3Key.length <= 1024 && 
           s3Key.length > 0
  }
}
