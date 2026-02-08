/**
 * File Metadata Validator implementation
 * Provides comprehensive validation for file metadata operations
 */
import { FileMetadata } from '../types/file-metadata';
import { ValidationResult, FileMetadataValidator as IFileMetadataValidator } from '../types/validation';
/**
 * Implementation of FileMetadataValidator interface
 */
export declare class FileMetadataValidator implements IFileMetadataValidator {
    validateCreate(metadata: Partial<FileMetadata>): ValidationResult;
    validateUpdate(updates: Partial<FileMetadata>): ValidationResult;
    validateFileId(fileId: string): boolean;
    validateUserId(userId: string): boolean;
    validateFileType(fileType: string): boolean;
    validateAnalysisStatus(status: string): boolean;
    private validateFilename;
    private validateFileSize;
    private validateTimestamp;
    private validateS3Key;
}
