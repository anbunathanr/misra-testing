/**
 * S3 configuration for file storage
 */
export declare const S3_CONFIG: {
    readonly bucketName: string;
    readonly region: string;
    readonly maxFileSize: {
        readonly default: number;
        readonly c: number;
        readonly cpp: number;
        readonly header: number;
    };
    readonly allowedExtensions: readonly [".c", ".cpp", ".cc", ".cxx", ".h", ".hpp", ".hxx"];
    readonly allowedContentTypes: readonly ["text/plain", "text/x-c", "text/x-c++", "application/octet-stream"];
    readonly urlExpiration: {
        readonly upload: 900;
        readonly download: 3600;
        readonly temporary: 300;
    };
    readonly keyPrefixes: {
        readonly users: "users";
        readonly samples: "samples";
        readonly cache: "cache";
    };
    readonly security: {
        readonly enforceSSL: true;
        readonly serverSideEncryption: "aws:kms";
        readonly blockPublicAccess: true;
    };
    readonly lifecycle: {
        readonly transitionToIA: 30;
        readonly transitionToGlacier: 90;
        readonly expireVersions: 30;
        readonly abortIncompleteUploads: 7;
    };
    readonly cors: {
        readonly allowedMethods: readonly ["GET", "POST", "PUT", "HEAD"];
        readonly allowedHeaders: readonly ["Authorization", "Content-Type", "Content-Length", "Content-MD5", "x-amz-date", "x-amz-security-token", "x-amz-user-agent", "x-amz-content-sha256"];
        readonly maxAge: 3600;
    };
};
/**
 * Get S3 bucket name for environment
 */
export declare function getBucketName(environment?: string, accountId?: string): string;
/**
 * Get S3 key for user file upload (spec requirement: userId/fileId/fileName)
 */
export declare function getUserFileKey(userId: string, fileId: string, fileName: string): string;
/**
 * Get S3 key for sample file (spec requirement: samples/{sampleId}.ext)
 */
export declare function getSampleFileKey(sampleId: string, fileName: string): string;
/**
 * Get S3 key for analysis cache (spec requirement: cache/{contentHash}.json)
 */
export declare function getCacheKey(contentHash: string): string;
/**
 * Parse S3 key to extract metadata
 */
export declare function parseS3Key(key: string): {
    prefix: string;
    userId?: string;
    fileId?: string;
    fileName?: string;
    sampleId?: string;
    contentHash?: string;
} | null;
/**
 * Validate file extension
 */
export declare function isValidFileExtension(fileName: string): boolean;
/**
 * Validate file size
 */
export declare function isValidFileSize(fileSize: number, fileName: string): boolean;
/**
 * Get presigned URL expiration time based on operation
 */
export declare function getPresignedUrlExpiration(operation: 'upload' | 'download' | 'temporary'): number;
