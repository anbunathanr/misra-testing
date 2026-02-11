/**
 * File Metadata Service implementation
 * Provides CRUD operations for file metadata management
 */
import { FileMetadata, PaginationOptions, PaginatedResult, AnalysisStatus } from '../types/file-metadata';
import { DynamoDBClientWrapper } from '../database/dynamodb-client';
export interface IFileMetadataService {
    createFileMetadata(metadata: FileMetadata): Promise<FileMetadata>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata>;
    updateAnalysisStatus(fileId: string, status: AnalysisStatus): Promise<FileMetadata>;
    deleteFileMetadata(fileId: string, userId: string): Promise<void>;
    getUserFiles(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>;
    getFilesByStatus(status: AnalysisStatus, pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>;
    getUserFilesByStatus(userId: string, status: AnalysisStatus): Promise<FileMetadata[]>;
    batchGetFiles(fileIds: string[]): Promise<FileMetadata[]>;
    batchDeleteFiles(fileIds: string[], userId: string): Promise<string[]>;
}
export declare class FileMetadataService implements IFileMetadataService {
    private readonly dbClient;
    private readonly validator;
    constructor(dbClient: DynamoDBClientWrapper);
    createFileMetadata(metadata: FileMetadata): Promise<FileMetadata>;
    getFileMetadata(fileId: string): Promise<FileMetadata | null>;
    updateFileMetadata(fileId: string, updates: Partial<FileMetadata>): Promise<FileMetadata>;
    updateAnalysisStatus(fileId: string, status: AnalysisStatus): Promise<FileMetadata>;
    deleteFileMetadata(fileId: string, userId: string): Promise<void>;
    getUserFiles(userId: string, pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>;
    getFilesByUserId(userId: string): Promise<FileMetadata[]>;
    getFilesByStatus(_status: AnalysisStatus, _pagination?: PaginationOptions): Promise<PaginatedResult<FileMetadata>>;
    getUserFilesByStatus(_userId: string, _status: AnalysisStatus): Promise<FileMetadata[]>;
    batchGetFiles(fileIds: string[]): Promise<FileMetadata[]>;
    batchDeleteFiles(_fileIds: string[], _userId: string): Promise<string[]>;
}
