export interface FileUploadRequest {
    fileName: string;
    fileSize: number;
    contentType: string;
    userId: string;
    mode?: 'manual' | 'sample';
    sampleId?: string;
}
export interface FileUploadResponse {
    fileId: string;
    s3Key: string;
    uploadUrl: string;
    downloadUrl: string;
    expiresIn: number;
}
export interface FileValidationResult {
    isValid: boolean;
    errors: string[];
    fileType: 'c' | 'cpp';
}
export declare class FileUploadService {
    private s3Client;
    private bucketName;
    constructor();
    /**
     * Generate presigned upload URL (spec requirement: presigned URL support for secure uploads)
     */
    generatePresignedUploadUrl(request: FileUploadRequest): Promise<FileUploadResponse>;
    /**
     * Generate presigned URL for sample file upload
     */
    generateSampleUploadUrl(sampleId: string, fileName: string, contentType: string): Promise<FileUploadResponse>;
    /**
     * Validate file according to spec requirements
     */
    validateFile(fileName: string, fileSize: number, contentType: string): FileValidationResult;
    private sanitizeFileName;
    private containsUnsafeCharacters;
    /**
     * Verify file exists in S3
     */
    verifyFileExists(s3Key: string): Promise<boolean>;
    /**
     * Generate content hash for caching (spec requirement: analysis result caching)
     */
    generateContentHash(content: string): string;
    /**
     * Get file content from S3
     */
    getFileContent(s3Key: string): Promise<string>;
    /**
     * Upload file content directly (for sample files and automatic uploads)
     */
    uploadFileContent(s3Key: string, content: string, contentType: string, metadata?: Record<string, string>): Promise<void>;
}
