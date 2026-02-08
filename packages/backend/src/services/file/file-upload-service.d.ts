export interface FileUploadRequest {
    fileName: string;
    fileSize: number;
    contentType: string;
    organizationId: string;
    userId: string;
}
export interface FileUploadResponse {
    fileId: string;
    uploadUrl: string;
    downloadUrl: string;
    expiresIn: number;
}
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    fileType: 'C' | 'CPP' | 'HEADER' | 'UNKNOWN';
}
export declare class FileUploadService {
    private s3Client;
    private bucketName;
    private maxFileSize;
    private allowedExtensions;
    private allowedContentTypes;
    constructor();
    generatePresignedUploadUrl(request: FileUploadRequest): Promise<FileUploadResponse>;
    validateFile(fileName: string, fileSize: number, contentType: string): FileValidationResult;
    private getFileExtension;
    private sanitizeFileName;
    private containsUnsafeCharacters;
    getFileMetadata(fileId: string): Promise<any>;
    /**
     * Generate a hash for file tracking and integrity
     */
    private generateFileHash;
    /**
     * Verify file exists in S3
     */
    verifyFileExists(s3Key: string): Promise<boolean>;
    /**
     * Get file size limit based on file type
     */
    getMaxFileSizeForType(fileType: string): number;
    /**
     * Check if file extension matches content type
     */
    private validateContentTypeMatch;
}
