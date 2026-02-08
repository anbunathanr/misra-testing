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
        readonly upload: 3600;
        readonly download: 3600;
        readonly temporary: 900;
    };
    readonly keyPrefixes: {
        readonly uploads: "uploads";
        readonly processed: "processed";
        readonly archived: "archived";
        readonly temp: "temp";
    };
    readonly security: {
        readonly enforceSSL: true;
        readonly serverSideEncryption: "AES256";
        readonly blockPublicAccess: true;
    };
    readonly lifecycle: {
        readonly transitionToIA: 30;
        readonly transitionToGlacier: 90;
        readonly expireVersions: 30;
        readonly abortIncompleteUploads: 7;
    };
};
/**
 * Get S3 bucket name for environment
 */
export declare function getBucketName(environment?: string): string;
/**
 * Get S3 key for file upload
 */
export declare function getUploadKey(organizationId: string, userId: string, fileId: string, fileName: string): string;
/**
 * Get S3 key for processed file
 */
export declare function getProcessedKey(organizationId: string, userId: string, fileId: string, fileName: string): string;
/**
 * Get S3 key for archived file
 */
export declare function getArchivedKey(organizationId: string, userId: string, fileId: string, fileName: string): string;
/**
 * Parse S3 key to extract metadata
 */
export declare function parseS3Key(key: string): {
    prefix: string;
    organizationId: string;
    userId: string;
    fileName: string;
} | null;
