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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiczMtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBMEVILHNDQUlDO0FBS0Qsd0NBTUM7QUFLRCw0Q0FNQztBQUtELGtDQUVDO0FBS0QsZ0NBd0RDO0FBS0Qsb0RBR0M7QUFLRCwwQ0FjQztBQUtELDhEQUVDO0FBeE1ZLFFBQUEsU0FBUyxHQUFHO0lBQ3ZCLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQjtJQUM5RSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUU3Qyw4QkFBOEI7SUFDOUIsV0FBVyxFQUFFO1FBQ1gsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFHLE9BQU87UUFDbkMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFTLG1CQUFtQjtRQUMvQyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEVBQU8scUJBQXFCO1FBQ2pELE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBSyx1QkFBdUI7S0FDcEQ7SUFFRCwwQkFBMEI7SUFDMUIsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFFdEUscUJBQXFCO0lBQ3JCLG1CQUFtQixFQUFFO1FBQ25CLFlBQVk7UUFDWixVQUFVO1FBQ1YsWUFBWTtRQUNaLDBCQUEwQjtLQUMzQjtJQUVELDhDQUE4QztJQUM5QyxhQUFhLEVBQUU7UUFDYixNQUFNLEVBQUUsR0FBRyxFQUFRLDBCQUEwQjtRQUM3QyxRQUFRLEVBQUUsSUFBSSxFQUFLLFNBQVM7UUFDNUIsU0FBUyxFQUFFLEdBQUcsRUFBSyxpQ0FBaUM7S0FDckQ7SUFFRCxtREFB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Z0IsZUFBZSxDQUFDLFFBQWdCLEVBQUUsUUFBZ0I7SUFDaEUsTUFBTSxTQUFTLEdBQUcsUUFBUSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEdBQUcsQ0FBQyxDQUFDLENBQUMsV0FBVyxFQUFFLENBQUE7SUFFN0UsSUFBSSxPQUFPLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFBO0lBRTNDLElBQUksQ0FBQyxJQUFJLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUMvQixPQUFPLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUMsQ0FBQyxDQUFBO0lBQ25DLENBQUM7U0FBTSxJQUFJLENBQUMsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUN2RCxPQUFPLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUMsR0FBRyxDQUFBO0lBQ3JDLENBQUM7U0FBTSxJQUFJLENBQUMsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQyxRQUFRLENBQUMsU0FBUyxDQUFDLEVBQUUsQ0FBQztRQUN0RCxPQUFPLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUMsTUFBTSxDQUFBO0lBQ3hDLENBQUM7SUFFRCxPQUFPLFFBQVEsSUFBSSxPQUFPLENBQUE7QUFDNUIsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IseUJBQXlCLENBQUMsU0FBOEM7SUFDdEYsT0FBTyxpQkFBUyxDQUFDLGFBQWEsQ0FBQyxTQUFTLENBQUMsQ0FBQTtBQUMzQyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFMzIGNvbmZpZ3VyYXRpb24gZm9yIGZpbGUgc3RvcmFnZVxyXG4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBTM19DT05GSUcgPSB7XHJcbiAgYnVja2V0TmFtZTogcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnLFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICBcclxuICAvLyBGaWxlIHNpemUgbGltaXRzIChpbiBieXRlcylcclxuICBtYXhGaWxlU2l6ZToge1xyXG4gICAgZGVmYXVsdDogNTAgKiAxMDI0ICogMTAyNCwgIC8vIDUwTUJcclxuICAgIGM6IDEwICogMTAyNCAqIDEwMjQsICAgICAgICAvLyAxME1CIGZvciBDIGZpbGVzXHJcbiAgICBjcHA6IDEwICogMTAyNCAqIDEwMjQsICAgICAgLy8gMTBNQiBmb3IgQysrIGZpbGVzXHJcbiAgICBoZWFkZXI6IDUgKiAxMDI0ICogMTAyNCwgICAgLy8gNU1CIGZvciBoZWFkZXIgZmlsZXNcclxuICB9LFxyXG4gIFxyXG4gIC8vIEFsbG93ZWQgZmlsZSBleHRlbnNpb25zXHJcbiAgYWxsb3dlZEV4dGVuc2lvbnM6IFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJywgJy5oeHgnXSxcclxuICBcclxuICAvLyBBbGxvd2VkIE1JTUUgdHlwZXNcclxuICBhbGxvd2VkQ29udGVudFR5cGVzOiBbXHJcbiAgICAndGV4dC9wbGFpbicsXHJcbiAgICAndGV4dC94LWMnLFxyXG4gICAgJ3RleHQveC1jKysnLFxyXG4gICAgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcclxuICBdLFxyXG4gIFxyXG4gIC8vIFByZXNpZ25lZCBVUkwgZXhwaXJhdGlvbiB0aW1lcyAoaW4gc2Vjb25kcylcclxuICB1cmxFeHBpcmF0aW9uOiB7XHJcbiAgICB1cGxvYWQ6IDkwMCwgICAgICAgLy8gMTUgbWludXRlcyBmb3Igc2VjdXJpdHlcclxuICAgIGRvd25sb2FkOiAzNjAwLCAgICAvLyAxIGhvdXJcclxuICAgIHRlbXBvcmFyeTogMzAwLCAgICAvLyA1IG1pbnV0ZXMgZm9yIHRlbXBvcmFyeSBhY2Nlc3NcclxuICB9LFxyXG4gIFxyXG4gIC8vIFMzIGtleSBwcmVmaXhlcyAoYWxpZ25lZCB3aXRoIHNwZWMgcmVxdWlyZW1lbnRzKVxyXG4gIGtleVByZWZpeGVzOiB7XHJcbiAgICB1c2VyczogJ3VzZXJzJywgICAgICAgICAgIC8vIFVzZXIgdXBsb2FkZWQgZmlsZXM6IHVzZXJzL3t1c2VySWR9L3tmaWxlSWR9L1xyXG4gICAgc2FtcGxlczogJ3NhbXBsZXMnLCAgICAgICAvLyBTYW1wbGUgZmlsZXM6IHNhbXBsZXMve3NhbXBsZUlkfS5jXHJcbiAgICBjYWNoZTogJ2NhY2hlJywgICAgICAgICAgLy8gQW5hbHlzaXMgY2FjaGU6IGNhY2hlL3tjb250ZW50SGFzaH0uanNvblxyXG4gIH0sXHJcbiAgXHJcbiAgLy8gU2VjdXJpdHkgc2V0dGluZ3NcclxuICBzZWN1cml0eToge1xyXG4gICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgIHNlcnZlclNpZGVFbmNyeXB0aW9uOiAnYXdzOmttcycgYXMgY29uc3QsIC8vIFVzZSBLTVMgZW5jcnlwdGlvblxyXG4gICAgYmxvY2tQdWJsaWNBY2Nlc3M6IHRydWUsXHJcbiAgfSxcclxuICBcclxuICAvLyBMaWZlY3ljbGUgc2V0dGluZ3MgKGFsaWduZWQgd2l0aCBDREsgY29uZmlndXJhdGlvbilcclxuICBsaWZlY3ljbGU6IHtcclxuICAgIHRyYW5zaXRpb25Ub0lBOiAzMCwgICAgICAgIC8vIERheXMgdW50aWwgdHJhbnNpdGlvbiB0byBJbmZyZXF1ZW50IEFjY2Vzc1xyXG4gICAgdHJhbnNpdGlvblRvR2xhY2llcjogOTAsICAgLy8gRGF5cyB1bnRpbCB0cmFuc2l0aW9uIHRvIEdsYWNpZXJcclxuICAgIGV4cGlyZVZlcnNpb25zOiAzMCwgICAgICAgIC8vIERheXMgdG8ga2VlcCBvbGQgdmVyc2lvbnNcclxuICAgIGFib3J0SW5jb21wbGV0ZVVwbG9hZHM6IDcsIC8vIERheXMgdG8gYWJvcnQgaW5jb21wbGV0ZSBtdWx0aXBhcnQgdXBsb2Fkc1xyXG4gIH0sXHJcbiAgXHJcbiAgLy8gQ09SUyBzZXR0aW5ncyBmb3IgZnJvbnRlbmQgdXBsb2Fkc1xyXG4gIGNvcnM6IHtcclxuICAgIGFsbG93ZWRNZXRob2RzOiBbJ0dFVCcsICdQT1NUJywgJ1BVVCcsICdIRUFEJ10sXHJcbiAgICBhbGxvd2VkSGVhZGVyczogW1xyXG4gICAgICAnQXV0aG9yaXphdGlvbicsXHJcbiAgICAgICdDb250ZW50LVR5cGUnLFxyXG4gICAgICAnQ29udGVudC1MZW5ndGgnLFxyXG4gICAgICAnQ29udGVudC1NRDUnLFxyXG4gICAgICAneC1hbXotZGF0ZScsXHJcbiAgICAgICd4LWFtei1zZWN1cml0eS10b2tlbicsXHJcbiAgICAgICd4LWFtei11c2VyLWFnZW50JyxcclxuICAgICAgJ3gtYW16LWNvbnRlbnQtc2hhMjU2JyxcclxuICAgIF0sXHJcbiAgICBtYXhBZ2U6IDM2MDAsIC8vIDEgaG91clxyXG4gIH0sXHJcbn0gYXMgY29uc3RcclxuXHJcbi8qKlxyXG4gKiBHZXQgUzMgYnVja2V0IG5hbWUgZm9yIGVudmlyb25tZW50XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QnVja2V0TmFtZShlbnZpcm9ubWVudDogc3RyaW5nID0gJ2RldicsIGFjY291bnRJZD86IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGFjY291bnRJZCBcclxuICAgID8gYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9LSR7YWNjb3VudElkfWBcclxuICAgIDogYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9YFxyXG59XHJcblxyXG4vKipcclxuICogR2V0IFMzIGtleSBmb3IgdXNlciBmaWxlIHVwbG9hZCAoc3BlYyByZXF1aXJlbWVudDogdXNlcklkL2ZpbGVJZC9maWxlTmFtZSlcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRVc2VyRmlsZUtleShcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nXHJcbik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGAke1MzX0NPTkZJRy5rZXlQcmVmaXhlcy51c2Vyc30vJHt1c2VySWR9LyR7ZmlsZUlkfS8ke2ZpbGVOYW1lfWBcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBTMyBrZXkgZm9yIHNhbXBsZSBmaWxlIChzcGVjIHJlcXVpcmVtZW50OiBzYW1wbGVzL3tzYW1wbGVJZH0uZXh0KVxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFNhbXBsZUZpbGVLZXkoXHJcbiAgc2FtcGxlSWQ6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nXHJcbik6IHN0cmluZyB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZU5hbWUuc3Vic3RyaW5nKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpXHJcbiAgcmV0dXJuIGAke1MzX0NPTkZJRy5rZXlQcmVmaXhlcy5zYW1wbGVzfS8ke3NhbXBsZUlkfSR7ZXh0ZW5zaW9ufWBcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBTMyBrZXkgZm9yIGFuYWx5c2lzIGNhY2hlIChzcGVjIHJlcXVpcmVtZW50OiBjYWNoZS97Y29udGVudEhhc2h9Lmpzb24pXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q2FjaGVLZXkoY29udGVudEhhc2g6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGAke1MzX0NPTkZJRy5rZXlQcmVmaXhlcy5jYWNoZX0vJHtjb250ZW50SGFzaH0uanNvbmBcclxufVxyXG5cclxuLyoqXHJcbiAqIFBhcnNlIFMzIGtleSB0byBleHRyYWN0IG1ldGFkYXRhXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gcGFyc2VTM0tleShrZXk6IHN0cmluZyk6IHtcclxuICBwcmVmaXg6IHN0cmluZ1xyXG4gIHVzZXJJZD86IHN0cmluZ1xyXG4gIGZpbGVJZD86IHN0cmluZ1xyXG4gIGZpbGVOYW1lPzogc3RyaW5nXHJcbiAgc2FtcGxlSWQ/OiBzdHJpbmdcclxuICBjb250ZW50SGFzaD86IHN0cmluZ1xyXG59IHwgbnVsbCB7XHJcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy8nKVxyXG4gIGlmIChwYXJ0cy5sZW5ndGggPCAyKSB7XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgY29uc3QgcHJlZml4ID0gcGFydHNbMF1cclxuICBcclxuICBzd2l0Y2ggKHByZWZpeCkge1xyXG4gICAgY2FzZSBTM19DT05GSUcua2V5UHJlZml4ZXMudXNlcnM6XHJcbiAgICAgIC8vIHVzZXJzL3t1c2VySWR9L3tmaWxlSWR9L3tmaWxlTmFtZX1cclxuICAgICAgaWYgKHBhcnRzLmxlbmd0aCA+PSA0KSB7XHJcbiAgICAgICAgcmV0dXJuIHtcclxuICAgICAgICAgIHByZWZpeCxcclxuICAgICAgICAgIHVzZXJJZDogcGFydHNbMV0sXHJcbiAgICAgICAgICBmaWxlSWQ6IHBhcnRzWzJdLFxyXG4gICAgICAgICAgZmlsZU5hbWU6IHBhcnRzLnNsaWNlKDMpLmpvaW4oJy8nKSxcclxuICAgICAgICB9XHJcbiAgICAgIH1cclxuICAgICAgYnJlYWtcclxuICAgICAgXHJcbiAgICBjYXNlIFMzX0NPTkZJRy5rZXlQcmVmaXhlcy5zYW1wbGVzOlxyXG4gICAgICAvLyBzYW1wbGVzL3tzYW1wbGVJZH0uZXh0XHJcbiAgICAgIGlmIChwYXJ0cy5sZW5ndGggPj0gMikge1xyXG4gICAgICAgIGNvbnN0IGZpbGVOYW1lV2l0aEV4dCA9IHBhcnRzWzFdXHJcbiAgICAgICAgY29uc3Qgc2FtcGxlSWQgPSBmaWxlTmFtZVdpdGhFeHQuc3Vic3RyaW5nKDAsIGZpbGVOYW1lV2l0aEV4dC5sYXN0SW5kZXhPZignLicpKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBwcmVmaXgsXHJcbiAgICAgICAgICBzYW1wbGVJZCxcclxuICAgICAgICAgIGZpbGVOYW1lOiBmaWxlTmFtZVdpdGhFeHQsXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICAgIGJyZWFrXHJcbiAgICAgIFxyXG4gICAgY2FzZSBTM19DT05GSUcua2V5UHJlZml4ZXMuY2FjaGU6XHJcbiAgICAgIC8vIGNhY2hlL3tjb250ZW50SGFzaH0uanNvblxyXG4gICAgICBpZiAocGFydHMubGVuZ3RoID49IDIpIHtcclxuICAgICAgICBjb25zdCBmaWxlTmFtZSA9IHBhcnRzWzFdXHJcbiAgICAgICAgY29uc3QgY29udGVudEhhc2ggPSBmaWxlTmFtZS5yZXBsYWNlKCcuanNvbicsICcnKVxyXG4gICAgICAgIHJldHVybiB7XHJcbiAgICAgICAgICBwcmVmaXgsXHJcbiAgICAgICAgICBjb250ZW50SGFzaCxcclxuICAgICAgICAgIGZpbGVOYW1lLFxyXG4gICAgICAgIH1cclxuICAgICAgfVxyXG4gICAgICBicmVha1xyXG4gIH1cclxuXHJcbiAgcmV0dXJuIG51bGxcclxufVxyXG5cclxuLyoqXHJcbiAqIFZhbGlkYXRlIGZpbGUgZXh0ZW5zaW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gaXNWYWxpZEZpbGVFeHRlbnNpb24oZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVOYW1lLnN1YnN0cmluZyhmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpXHJcbiAgcmV0dXJuIFMzX0NPTkZJRy5hbGxvd2VkRXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0ZSBmaWxlIHNpemVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBpc1ZhbGlkRmlsZVNpemUoZmlsZVNpemU6IG51bWJlciwgZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVOYW1lLnN1YnN0cmluZyhmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpXHJcbiAgXHJcbiAgbGV0IG1heFNpemUgPSBTM19DT05GSUcubWF4RmlsZVNpemUuZGVmYXVsdFxyXG4gIFxyXG4gIGlmIChbJy5jJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgbWF4U2l6ZSA9IFMzX0NPTkZJRy5tYXhGaWxlU2l6ZS5jXHJcbiAgfSBlbHNlIGlmIChbJy5jcHAnLCAnLmNjJywgJy5jeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICBtYXhTaXplID0gUzNfQ09ORklHLm1heEZpbGVTaXplLmNwcFxyXG4gIH0gZWxzZSBpZiAoWycuaCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICBtYXhTaXplID0gUzNfQ09ORklHLm1heEZpbGVTaXplLmhlYWRlclxyXG4gIH1cclxuICBcclxuICByZXR1cm4gZmlsZVNpemUgPD0gbWF4U2l6ZVxyXG59XHJcblxyXG4vKipcclxuICogR2V0IHByZXNpZ25lZCBVUkwgZXhwaXJhdGlvbiB0aW1lIGJhc2VkIG9uIG9wZXJhdGlvblxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGdldFByZXNpZ25lZFVybEV4cGlyYXRpb24ob3BlcmF0aW9uOiAndXBsb2FkJyB8ICdkb3dubG9hZCcgfCAndGVtcG9yYXJ5Jyk6IG51bWJlciB7XHJcbiAgcmV0dXJuIFMzX0NPTkZJRy51cmxFeHBpcmF0aW9uW29wZXJhdGlvbl1cclxufVxyXG4iXX0=