"use strict";
/**
 * S3 configuration for file storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3_CONFIG = void 0;
exports.getBucketName = getBucketName;
exports.getUserFileKey = getUserFileKey;
exports.getSampleFileKey = getSampleFileKey;
exports.getCacheKey = getCacheKey;
exports.parseS3Key = parseS3Key;
exports.isValidFileExtension = isValidFileExtension;
exports.isValidFileSize = isValidFileSize;
exports.getPresignedUrlExpiration = getPresignedUrlExpiration;
exports.S3_CONFIG = {
    bucketName: process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev',
    region: process.env.AWS_REGION || 'us-east-1',
    // File size limits (in bytes)
    maxFileSize: {
        default: 50 * 1024 * 1024, // 50MB
        c: 10 * 1024 * 1024, // 10MB for C files
        cpp: 10 * 1024 * 1024, // 10MB for C++ files
        header: 5 * 1024 * 1024, // 5MB for header files
    },
    // Allowed file extensions
    allowedExtensions: ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'],
    // Allowed MIME types
    allowedContentTypes: [
        'text/plain',
        'text/x-c',
        'text/x-c++',
        'application/octet-stream'
    ],
    // Presigned URL expiration times (in seconds)
    urlExpiration: {
        upload: 900, // 15 minutes for security
        download: 3600, // 1 hour
        temporary: 300, // 5 minutes for temporary access
    },
    // S3 key prefixes (aligned with spec requirements)
    keyPrefixes: {
        users: 'users', // User uploaded files: users/{userId}/{fileId}/
        samples: 'samples', // Sample files: samples/{sampleId}.c
        cache: 'cache', // Analysis cache: cache/{contentHash}.json
    },
    // Security settings
    security: {
        enforceSSL: true,
        serverSideEncryption: 'aws:kms', // Use KMS encryption
        blockPublicAccess: true,
    },
    // Lifecycle settings (aligned with CDK configuration)
    lifecycle: {
        transitionToIA: 30, // Days until transition to Infrequent Access
        transitionToGlacier: 90, // Days until transition to Glacier
        expireVersions: 30, // Days to keep old versions
        abortIncompleteUploads: 7, // Days to abort incomplete multipart uploads
    },
    // CORS settings for frontend uploads
    cors: {
        allowedMethods: ['GET', 'POST', 'PUT', 'HEAD'],
        allowedHeaders: [
            'Authorization',
            'Content-Type',
            'Content-Length',
            'Content-MD5',
            'x-amz-date',
            'x-amz-security-token',
            'x-amz-user-agent',
            'x-amz-content-sha256',
        ],
        maxAge: 3600, // 1 hour
    },
};
/**
 * Get S3 bucket name for environment
 */
function getBucketName(environment = 'dev', accountId) {
    return accountId
        ? `misra-platform-files-${environment}-${accountId}`
        : `misra-platform-files-${environment}`;
}
/**
 * Get S3 key for user file upload (spec requirement: userId/fileId/fileName)
 */
function getUserFileKey(userId, fileId, fileName) {
    return `${exports.S3_CONFIG.keyPrefixes.users}/${userId}/${fileId}/${fileName}`;
}
/**
 * Get S3 key for sample file (spec requirement: samples/{sampleId}.ext)
 */
function getSampleFileKey(sampleId, fileName) {
    const extension = fileName.substring(fileName.lastIndexOf('.'));
    return `${exports.S3_CONFIG.keyPrefixes.samples}/${sampleId}${extension}`;
}
/**
 * Get S3 key for analysis cache (spec requirement: cache/{contentHash}.json)
 */
function getCacheKey(contentHash) {
    return `${exports.S3_CONFIG.keyPrefixes.cache}/${contentHash}.json`;
}
/**
 * Parse S3 key to extract metadata
 */
function parseS3Key(key) {
    const parts = key.split('/');
    if (parts.length < 2) {
        return null;
    }
    const prefix = parts[0];
    switch (prefix) {
        case exports.S3_CONFIG.keyPrefixes.users:
            // users/{userId}/{fileId}/{fileName}
            if (parts.length >= 4) {
                return {
                    prefix,
                    userId: parts[1],
                    fileId: parts[2],
                    fileName: parts.slice(3).join('/'),
                };
            }
            break;
        case exports.S3_CONFIG.keyPrefixes.samples:
            // samples/{sampleId}.ext
            if (parts.length >= 2) {
                const fileNameWithExt = parts[1];
                const sampleId = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.'));
                return {
                    prefix,
                    sampleId,
                    fileName: fileNameWithExt,
                };
            }
            break;
        case exports.S3_CONFIG.keyPrefixes.cache:
            // cache/{contentHash}.json
            if (parts.length >= 2) {
                const fileName = parts[1];
                const contentHash = fileName.replace('.json', '');
                return {
                    prefix,
                    contentHash,
                    fileName,
                };
            }
            break;
    }
    return null;
}
/**
 * Validate file extension
 */
function isValidFileExtension(fileName) {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    return exports.S3_CONFIG.allowedExtensions.includes(extension);
}
/**
 * Validate file size
 */
function isValidFileSize(fileSize, fileName) {
    const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
    let maxSize = exports.S3_CONFIG.maxFileSize.default;
    if (['.c'].includes(extension)) {
        maxSize = exports.S3_CONFIG.maxFileSize.c;
    }
    else if (['.cpp', '.cc', '.cxx'].includes(extension)) {
        maxSize = exports.S3_CONFIG.maxFileSize.cpp;
    }
    else if (['.h', '.hpp', '.hxx'].includes(extension)) {
        maxSize = exports.S3_CONFIG.maxFileSize.header;
    }
    return fileSize <= maxSize;
}
/**
 * Get presigned URL expiration time based on operation
 */
function getPresignedUrlExpiration(operation) {
    return exports.S3_CONFIG.urlExpiration[operation];
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiczMtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBMEVILHNDQUlDO0FBS0Qsd0NBTUM7QUFLRCw0Q0FNQztBQUtELGtDQUVDO0FBS0QsZ0NBd0RDO0FBS0Qsb0RBR0M7QUFLRCwwQ0FjQztBQUtELDhEQUVDO0FBeE1ZLFFBQUEsU0FBUyxHQUFHO0lBQ3ZCLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQjtJQUM5RSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUU3Qyw4QkFBOEI7SUFDOUIsV0FBVyxFQUFFO1FBQ1gsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFHLE9BQU87UUFDbkMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFTLG1CQUFtQjtRQUMvQyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEVBQU8scUJBQXFCO1FBQ2pELE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBSyx1QkFBdUI7S0FDcEQ7SUFFRCwwQkFBMEI7SUFDMUIsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFFdEUscUJBQXFCO0lBQ3JCLG1CQUFtQixFQUFFO1FBQ25CLFlBQVk7UUFDWixVQUFVO1FBQ1YsWUFBWTtRQUNaLDBCQUEwQjtLQUMzQjtJQUVELDhDQUE4QztJQUM5QyxhQUFhLEVBQUU7UUFDYixNQUFNLEVBQUUsR0FBRyxFQUFRLDBCQUEwQjtRQUM3QyxRQUFRLEVBQUUsSUFBSSxFQUFLLFNBQVM7UUFDNUIsU0FBUyxFQUFFLEdBQUcsRUFBSyxpQ0FBaUM7S0FDckQ7SUFFRCxtREFB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QWdCLGVBQWUsQ0FBQyxRQUFnQixFQUFFLFFBQWdCO0lBQ2hFLE1BQU0sU0FBUyxHQUFHLFFBQVEsQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFBO0lBRTdFLElBQUksT0FBTyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDLE9BQU8sQ0FBQTtJQUUzQyxJQUFJLENBQUMsSUFBSSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDL0IsT0FBTyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDLENBQUMsQ0FBQTtJQUNuQyxDQUFDO1NBQU0sSUFBSSxDQUFDLE1BQU0sRUFBRSxLQUFLLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDdkQsT0FBTyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQTtJQUNyQyxDQUFDO1NBQU0sSUFBSSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsTUFBTSxDQUFDLENBQUMsUUFBUSxDQUFDLFNBQVMsQ0FBQyxFQUFFLENBQUM7UUFDdEQsT0FBTyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDLE1BQU0sQ0FBQTtJQUN4QyxDQUFDO0lBRUQsT0FBTyxRQUFRLElBQUksT0FBTyxDQUFBO0FBQzVCLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLHlCQUF5QixDQUFDLFNBQThDO0lBQ3RGLE9BQU8saUJBQVMsQ0FBQyxhQUFhLENBQUMsU0FBUyxDQUFDLENBQUE7QUFDM0MsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBTMyBjb25maWd1cmF0aW9uIGZvciBmaWxlIHN0b3JhZ2VcclxuICovXHJcblxyXG5leHBvcnQgY29uc3QgUzNfQ09ORklHID0ge1xyXG4gIGJ1Y2tldE5hbWU6IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0tZmlsZXMtZGV2JyxcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgXHJcbiAgLy8gRmlsZSBzaXplIGxpbWl0cyAoaW4gYnl0ZXMpXHJcbiAgbWF4RmlsZVNpemU6IHtcclxuICAgIGRlZmF1bHQ6IDUwICogMTAyNCAqIDEwMjQsICAvLyA1ME1CXHJcbiAgICBjOiAxMCAqIDEwMjQgKiAxMDI0LCAgICAgICAgLy8gMTBNQiBmb3IgQyBmaWxlc1xyXG4gICAgY3BwOiAxMCAqIDEwMjQgKiAxMDI0LCAgICAgIC8vIDEwTUIgZm9yIEMrKyBmaWxlc1xyXG4gICAgaGVhZGVyOiA1ICogMTAyNCAqIDEwMjQsICAgIC8vIDVNQiBmb3IgaGVhZGVyIGZpbGVzXHJcbiAgfSxcclxuICBcclxuICAvLyBBbGxvd2VkIGZpbGUgZXh0ZW5zaW9uc1xyXG4gIGFsbG93ZWRFeHRlbnNpb25zOiBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCcsICcuaHh4J10sXHJcbiAgXHJcbiAgLy8gQWxsb3dlZCBNSU1FIHR5cGVzXHJcbiAgYWxsb3dlZENvbnRlbnRUeXBlczogW1xyXG4gICAgJ3RleHQvcGxhaW4nLFxyXG4gICAgJ3RleHQveC1jJyxcclxuICAgICd0ZXh0L3gtYysrJyxcclxuICAgICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXHJcbiAgXSxcclxuICBcclxuICAvLyBQcmVzaWduZWQgVVJMIGV4cGlyYXRpb24gdGltZXMgKGluIHNlY29uZHMpXHJcbiAgdXJsRXhwaXJhdGlvbjoge1xyXG4gICAgdXBsb2FkOiA5MDAsICAgICAgIC8vIDE1IG1pbnV0ZXMgZm9yIHNlY3VyaXR5XHJcbiAgICBkb3dubG9hZDogMzYwMCwgICAgLy8gMSBob3VyXHJcbiAgICB0ZW1wb3Jhcnk6IDMwMCwgICAgLy8gNSBtaW51dGVzIGZvciB0ZW1wb3JhcnkgYWNjZXNzXHJcbiAgfSxcclxuICBcclxuICAvLyBTMyBrZXkgcHJlZml4ZXMgKGFsaWduZWQgd2l0aCBzcGVjIHJlcXVpcmVtZW50cylcclxuICBrZXlQcmVmaXhlczoge1xyXG4gICAgdXNlcnM6ICd1c2VycycsICAgICAgICAgICAvLyBVc2VyIHVwbG9hZGVkIGZpbGVzOiB1c2Vycy97dXNlcklkfS97ZmlsZUlkfS9cclxuICAgIHNhbXBsZXM6ICdzYW1wbGVzJywgICAgICAgLy8gU2FtcGxlIGZpbGVzOiBzYW1wbGVzL3tzYW1wbGVJZH0uY1xyXG4gICAgY2FjaGU6ICdjYWNoZScsICAgICAgICAgIC8vIEFuYWx5c2lzIGNhY2hlOiBjYWNoZS97Y29udGVudEhhc2h9Lmpzb25cclxuICB9LFxyXG4gIFxyXG4gIC8vIFNlY3VyaXR5IHNldHRpbmdzXHJcbiAgc2VjdXJpdHk6IHtcclxuICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICBzZXJ2ZXJTaWRlRW5jcnlwdGlvbjogJ2F3czprbXMnIGFzIGNvbnN0LCAvLyBVc2UgS01TIGVuY3J5cHRpb25cclxuICAgIGJsb2NrUHVibGljQWNjZXNzOiB0cnVlLFxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gTGlmZWN5Y2xlIHNldHRpbmdzIChhbGlnbmVkIHdpdGggQ0RLIGNvbmZpZ3VyYXRpb24pXHJcbiAgbGlmZWN5Y2xlOiB7XHJcbiAgICB0cmFuc2l0aW9uVG9JQTogMzAsICAgICAgICAvLyBEYXlzIHVudGlsIHRyYW5zaXRpb24gdG8gSW5mcmVxdWVudCBBY2Nlc3NcclxuICAgIHRyYW5zaXRpb25Ub0dsYWNpZXI6IDkwLCAgIC8vIERheXMgdW50aWwgdHJhbnNpdGlvbiB0byBHbGFjaWVyXHJcbiAgICBleHBpcmVWZXJzaW9uczogMzAsICAgICAgICAvLyBEYXlzIHRvIGtlZXAgb2xkIHZlcnNpb25zXHJcbiAgICBhYm9ydEluY29tcGxldGVVcGxvYWRzOiA3LCAvLyBEYXlzIHRvIGFib3J0IGluY29tcGxldGUgbXVsdGlwYXJ0IHVwbG9hZHNcclxuICB9LFxyXG4gIFxyXG4gIC8vIENPUlMgc2V0dGluZ3MgZm9yIGZyb250ZW5kIHVwbG9hZHNcclxuICBjb3JzOiB7XHJcbiAgICBhbGxvd2VkTWV0aG9kczogWydHRVQnLCAnUE9TVCcsICdQVVQnLCAnSEVBRCddLFxyXG4gICAgYWxsb3dlZEhlYWRlcnM6IFtcclxuICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgJ0NvbnRlbnQtTGVuZ3RoJyxcclxuICAgICAgJ0NvbnRlbnQtTUQ1JyxcclxuICAgICAgJ3gtYW16LWRhdGUnLFxyXG4gICAgICAneC1hbXotc2VjdXJpdHktdG9rZW4nLFxyXG4gICAgICAneC1hbXotdXNlci1hZ2VudCcsXHJcbiAgICAgICd4LWFtei1jb250ZW50LXNoYTI1NicsXHJcbiAgICBdLFxyXG4gICAgbWF4QWdlOiAzNjAwLCAvLyAxIGhvdXJcclxuICB9LFxyXG59IGFzIGNvbnN0XHJcblxyXG4vKipcclxuICogR2V0IFMzIGJ1Y2tldCBuYW1lIGZvciBlbnZpcm9ubWVudFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldEJ1Y2tldE5hbWUoZW52aXJvbm1lbnQ6IHN0cmluZyA9ICdkZXYnLCBhY2NvdW50SWQ/OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBhY2NvdW50SWQgXHJcbiAgICA/IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fS0ke2FjY291bnRJZH1gXHJcbiAgICA6IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fWBcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBTMyBrZXkgZm9yIHVzZXIgZmlsZSB1cGxvYWQgKHNwZWMgcmVxdWlyZW1lbnQ6IHVzZXJJZC9maWxlSWQvZmlsZU5hbWUpXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXNlckZpbGVLZXkoXHJcbiAgdXNlcklkOiBzdHJpbmcsXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgZmlsZU5hbWU6IHN0cmluZ1xyXG4pOiBzdHJpbmcge1xyXG4gIHJldHVybiBgJHtTM19DT05GSUcua2V5UHJlZml4ZXMudXNlcnN9LyR7dXNlcklkfS8ke2ZpbGVJZH0vJHtmaWxlTmFtZX1gXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgUzMga2V5IGZvciBzYW1wbGUgZmlsZSAoc3BlYyByZXF1aXJlbWVudDogc2FtcGxlcy97c2FtcGxlSWR9LmV4dClcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRTYW1wbGVGaWxlS2V5KFxyXG4gIHNhbXBsZUlkOiBzdHJpbmcsXHJcbiAgZmlsZU5hbWU6IHN0cmluZ1xyXG4pOiBzdHJpbmcge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVOYW1lLnN1YnN0cmluZyhmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKVxyXG4gIHJldHVybiBgJHtTM19DT05GSUcua2V5UHJlZml4ZXMuc2FtcGxlc30vJHtzYW1wbGVJZH0ke2V4dGVuc2lvbn1gXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgUzMga2V5IGZvciBhbmFseXNpcyBjYWNoZSAoc3BlYyByZXF1aXJlbWVudDogY2FjaGUve2NvbnRlbnRIYXNofS5qc29uKVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENhY2hlS2V5KGNvbnRlbnRIYXNoOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIHJldHVybiBgJHtTM19DT05GSUcua2V5UHJlZml4ZXMuY2FjaGV9LyR7Y29udGVudEhhc2h9Lmpzb25gXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBQYXJzZSBTMyBrZXkgdG8gZXh0cmFjdCBtZXRhZGF0YVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIHBhcnNlUzNLZXkoa2V5OiBzdHJpbmcpOiB7XHJcbiAgcHJlZml4OiBzdHJpbmdcclxuICB1c2VySWQ/OiBzdHJpbmdcclxuICBmaWxlSWQ/OiBzdHJpbmdcclxuICBmaWxlTmFtZT86IHN0cmluZ1xyXG4gIHNhbXBsZUlkPzogc3RyaW5nXHJcbiAgY29udGVudEhhc2g/OiBzdHJpbmdcclxufSB8IG51bGwge1xyXG4gIGNvbnN0IHBhcnRzID0ga2V5LnNwbGl0KCcvJylcclxuICBpZiAocGFydHMubGVuZ3RoIDwgMikge1xyXG4gICAgcmV0dXJuIG51bGxcclxuICB9XHJcblxyXG4gIGNvbnN0IHByZWZpeCA9IHBhcnRzWzBdXHJcbiAgXHJcbiAgc3dpdGNoIChwcmVmaXgpIHtcclxuICAgIGNhc2UgUzNfQ09ORklHLmtleVByZWZpeGVzLnVzZXJzOlxyXG4gICAgICAvLyB1c2Vycy97dXNlcklkfS97ZmlsZUlkfS97ZmlsZU5hbWV9XHJcbiAgICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gNCkge1xyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBwcmVmaXgsXHJcbiAgICAgICAgICB1c2VySWQ6IHBhcnRzWzFdLFxyXG4gICAgICAgICAgZmlsZUlkOiBwYXJ0c1syXSxcclxuICAgICAgICAgIGZpbGVOYW1lOiBwYXJ0cy5zbGljZSgzKS5qb2luKCcvJyksXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrXHJcbiAgICAgIFxyXG4gICAgY2FzZSBTM19DT05GSUcua2V5UHJlZml4ZXMuc2FtcGxlczpcclxuICAgICAgLy8gc2FtcGxlcy97c2FtcGxlSWR9LmV4dFxyXG4gICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcclxuICAgICAgICBjb25zdCBmaWxlTmFtZVdpdGhFeHQgPSBwYXJ0c1sxXVxyXG4gICAgICAgIGNvbnN0IHNhbXBsZUlkID0gZmlsZU5hbWVXaXRoRXh0LnN1YnN0cmluZygwLCBmaWxlTmFtZVdpdGhFeHQubGFzdEluZGV4T2YoJy4nKSlcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgcHJlZml4LFxyXG4gICAgICAgICAgc2FtcGxlSWQsXHJcbiAgICAgICAgICBmaWxlTmFtZTogZmlsZU5hbWVXaXRoRXh0LFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBicmVha1xyXG4gICAgICBcclxuICAgIGNhc2UgUzNfQ09ORklHLmtleVByZWZpeGVzLmNhY2hlOlxyXG4gICAgICAvLyBjYWNoZS97Y29udGVudEhhc2h9Lmpzb25cclxuICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSAyKSB7XHJcbiAgICAgICAgY29uc3QgZmlsZU5hbWUgPSBwYXJ0c1sxXVxyXG4gICAgICAgIGNvbnN0IGNvbnRlbnRIYXNoID0gZmlsZU5hbWUucmVwbGFjZSgnLmpzb24nLCAnJylcclxuICAgICAgICByZXR1cm4ge1xyXG4gICAgICAgICAgcHJlZml4LFxyXG4gICAgICAgICAgY29udGVudEhhc2gsXHJcbiAgICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgYnJlYWtcclxuICB9XHJcblxyXG4gIHJldHVybiBudWxsXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBmaWxlIGV4dGVuc2lvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICBjb25zdCBleHRlbnNpb24gPSBmaWxlTmFtZS5zdWJzdHJpbmcoZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKSkudG9Mb3dlckNhc2UoKSBhcyB0eXBlb2YgUzNfQ09ORklHLmFsbG93ZWRFeHRlbnNpb25zW251bWJlcl1cclxuICByZXR1cm4gUzNfQ09ORklHLmFsbG93ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbilcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIGZpbGUgc2l6ZVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGlzVmFsaWRGaWxlU2l6ZShmaWxlU2l6ZTogbnVtYmVyLCBmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZU5hbWUuc3Vic3RyaW5nKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKClcclxuICBcclxuICBsZXQgbWF4U2l6ZSA9IFMzX0NPTkZJRy5tYXhGaWxlU2l6ZS5kZWZhdWx0XHJcbiAgXHJcbiAgaWYgKFsnLmMnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICBtYXhTaXplID0gUzNfQ09ORklHLm1heEZpbGVTaXplLmNcclxuICB9IGVsc2UgaWYgKFsnLmNwcCcsICcuY2MnLCAnLmN4eCddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgIG1heFNpemUgPSBTM19DT05GSUcubWF4RmlsZVNpemUuY3BwXHJcbiAgfSBlbHNlIGlmIChbJy5oJywgJy5ocHAnLCAnLmh4eCddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgIG1heFNpemUgPSBTM19DT05GSUcubWF4RmlsZVNpemUuaGVhZGVyXHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBmaWxlU2l6ZSA8PSBtYXhTaXplXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgcHJlc2lnbmVkIFVSTCBleHBpcmF0aW9uIHRpbWUgYmFzZWQgb24gb3BlcmF0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbihvcGVyYXRpb246ICd1cGxvYWQnIHwgJ2Rvd25sb2FkJyB8ICd0ZW1wb3JhcnknKTogbnVtYmVyIHtcclxuICByZXR1cm4gUzNfQ09ORklHLnVybEV4cGlyYXRpb25bb3BlcmF0aW9uXVxyXG59XHJcbiJdfQ==