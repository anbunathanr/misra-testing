/**
 * File Metadata Service implementation
 * Provides CRUD operations for file metadata management
 */

import { 
  FileMetadata, 
  PaginationOptions, 
  PaginatedResult, 
  AnalysisStatus 
} from '../types/file-metadata'
import { MetadataError, ErrorCodes } from '../types/validation'
import { DynamoDBClientWrapper } from '../database/dynamodb-client'
import { FileMetadataValidator } from '../validation/file-metadata-validator'

export interface IFileMetadataService {
  createFileMetadata(metadata: FileMetadata): Promise<FileMetadata>
  getFileMetadata(fileId: string): Promise<FileMetadata | null>
  updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata>
  updateAnalysisStatus(fileId: string, status: AnalysisStatus): Promise<FileMetadata>
  deleteFileMetadata(fileId: string, userId: string): Promise<void>
  getUserFiles(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>
  getFilesByStatus(status: AnalysisStatus, pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>
  getUserFilesByStatus(userId: string, status: AnalysisStatus): Promise<FileMetadata[]>
  batchGetFiles(fileIds: string[]): Promise<FileMetadata[]>
  batchDeleteFiles(fileIds: string[], userId: string): Promise<string[]>
}

export class FileMetadataService implements IFileMetadataService {
  private readonly validator: FileMetadataValidator

  constructor(
    private readonly dbClient: DynamoDBClientWrapper
  ) {
    this.validator = new FileMetadataValidator()
  }

  async createFileMetadata(metadata: FileMetadata): Promise<FileMetadata> {
    const validationResult = this.validator.validateCreate(metadata)
    if (!validationResult.isValid) {
      throw new MetadataError(
        'Validation failed for file metadata creation',
        ErrorCodes.VALIDATION_ERROR,
        400,
        validationResult.errors
      )
    }

    try {
      await this.dbClient.putItem(metadata as Record<string, any>)
      return metadata
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error
      }
      throw new MetadataError(
        'Failed to create file metadata',
        ErrorCodes.DATABASE_ERROR,
        500,
        error instanceof Error ? error : undefined
      )
    }
  }

  async getFileMetadata(fileId: string): Promise<FileMetadata | null> {
    if (!this.validator.validateFileId(fileId)) {
      throw new MetadataError(
        'Invalid file ID format',
        ErrorCodes.VALIDATION_ERROR,
        400,
        [{ field: 'file_id', message: 'Must be a valid UUID v4', code: 'INVALID_UUID' }]
      )
    }

    try {
      const result = await this.dbClient.getItem({ file_id: fileId })

      if (!result) {
        return null
      }

      return result as FileMetadata
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error
      }
      throw new MetadataError(
        'Failed to retrieve file metadata',
        ErrorCodes.DATABASE_ERROR,
        500,
        error instanceof Error ? error : undefined
      )
    }
  }

  async updateFileMetadata(
    fileId: string,
    updates: Partial<FileMetadata>
  ): Promise<FileMetadata> {
    if (!this.validator.validateFileId(fileId)) {
      throw new MetadataError(
        'Invalid file ID format',
        ErrorCodes.VALIDATION_ERROR,
        400,
        [{ field: 'file_id', message: 'Must be a valid UUID v4', code: 'INVALID_UUID' }]
      )
    }

    const validationResult = this.validator.validateUpdate(updates)
    if (!validationResult.isValid) {
      throw new MetadataError(
        'Validation failed for file metadata update',
        ErrorCodes.VALIDATION_ERROR,
        400,
        validationResult.errors
      )
    }

    try {
      const existing = await this.getFileMetadata(fileId)
      if (!existing) {
        throw new MetadataError(
          'File not found',
          ErrorCodes.NOT_FOUND,
          404,
          [{ field: 'file_id', message: `File with ID ${fileId} does not exist`, code: 'NOT_FOUND' }]
        )
      }

      const updatesWithTimestamp = {
        ...updates,
        updated_at: Date.now()
      }

      const updateExpressionParts: string[] = []
      const expressionAttributeNames: Record<string, string> = {}
      const expressionAttributeValues: Record<string, any> = {}

      Object.entries(updatesWithTimestamp).forEach(([key, value], index) => {
        const nameKey = `#attr${index}`
        const valueKey = `:val${index}`
        updateExpressionParts.push(`${nameKey} = ${valueKey}`)
        expressionAttributeNames[nameKey] = key
        expressionAttributeValues[valueKey] = value
      })

      const updateExpression = `SET ${updateExpressionParts.join(', ')}`

      const result = await this.dbClient.updateItem(
        { file_id: fileId },
        updateExpression,
        expressionAttributeNames,
        expressionAttributeValues
      )

      return result as FileMetadata
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error
      }
      throw new MetadataError(
        'Failed to update file metadata',
        ErrorCodes.DATABASE_ERROR,
        500,
        error instanceof Error ? error : undefined
      )
    }
  }

  async updateAnalysisStatus(fileId: string, status: AnalysisStatus): Promise<FileMetadata> {
    return this.updateFileMetadata(fileId, {
      analysis_status: status,
      updated_at: Date.now()
    })
  }

  async deleteFileMetadata(fileId: string, userId: string): Promise<void> {
    if (!this.validator.validateFileId(fileId)) {
      throw new MetadataError(
        'Invalid file ID format',
        ErrorCodes.VALIDATION_ERROR,
        400,
        [{ field: 'file_id', message: 'Must be a valid UUID v4', code: 'INVALID_UUID' }]
      )
    }

    if (!userId || userId.trim().length === 0) {
      throw new MetadataError(
        'User ID is required',
        ErrorCodes.VALIDATION_ERROR,
        400,
        [{ field: 'user_id', message: 'User ID cannot be empty', code: 'REQUIRED_FIELD' }]
      )
    }

    try {
      const existing = await this.getFileMetadata(fileId)
      if (!existing) {
        throw new MetadataError(
          'File not found',
          ErrorCodes.NOT_FOUND,
          404,
          [{ field: 'file_id', message: `File with ID ${fileId} does not exist`, code: 'NOT_FOUND' }]
        )
      }

      if (existing.user_id !== userId) {
        throw new MetadataError(
          'Unauthorized: User does not own this file',
          ErrorCodes.UNAUTHORIZED,
          403,
          [{ field: 'user_id', message: 'Cannot delete files owned by other users', code: 'UNAUTHORIZED' }]
        )
      }

      await this.dbClient.deleteItem({ file_id: fileId })
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error
      }
      throw new MetadataError(
        'Failed to delete file metadata',
        ErrorCodes.DATABASE_ERROR,
        500,
        error instanceof Error ? error : undefined
      )
    }
  }

  async getUserFiles(
    _userId: string,
    _pagination?: PaginationOptions
  ): Promise<PaginatedResult<FileMetadata>> {
    throw new Error('Not implemented yet - will be implemented in Task 7.1')
  }

  async getFilesByStatus(
    _status: AnalysisStatus,
    _pagination?: PaginationOptions
  ): Promise<PaginatedResult<FileMetadata>> {
    throw new Error('Not implemented yet - will be implemented in Task 7.3')
  }

  async getUserFilesByStatus(
    _userId: string,
    _status: AnalysisStatus
  ): Promise<FileMetadata[]> {
    throw new Error('Not implemented yet - will be implemented in Task 7.4')
  }

  async batchGetFiles(fileIds: string[]): Promise<FileMetadata[]> {
    if (!fileIds || fileIds.length === 0) {
      return []
    }

    const invalidIds = fileIds.filter(id => !this.validator.validateFileId(id))
    if (invalidIds.length > 0) {
      throw new MetadataError(
        'Invalid file ID format in batch request',
        ErrorCodes.VALIDATION_ERROR,
        400,
        invalidIds.map(id => ({ 
          field: 'file_id', 
          message: `Invalid UUID: ${id}`, 
          code: 'INVALID_UUID' 
        }))
      )
    }

    try {
      const keys = fileIds.map(fileId => ({ file_id: fileId }))
      const results = await this.dbClient.batchGetItems(keys)
      return results as FileMetadata[]
    } catch (error) {
      if (error instanceof MetadataError) {
        throw error
      }
      throw new MetadataError(
        'Failed to batch retrieve file metadata',
        ErrorCodes.DATABASE_ERROR,
        500,
        error instanceof Error ? error : undefined
      )
    }
  }

  async batchDeleteFiles(_fileIds: string[], _userId: string): Promise<string[]> {
    throw new Error('Not implemented yet - will be implemented in Task 6.3')
  }
}
