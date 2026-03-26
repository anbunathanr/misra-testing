"use strict";
/**
 * S3 configuration for file storage
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.S3_CONFIG = void 0;
exports.getBucketName = getBucketName;
exports.getUploadKey = getUploadKey;
exports.getProcessedKey = getProcessedKey;
exports.getArchivedKey = getArchivedKey;
exports.parseS3Key = parseS3Key;
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
        upload: 3600, // 1 hour
        download: 3600, // 1 hour
        temporary: 900, // 15 minutes
    },
    // S3 key prefixes
    keyPrefixes: {
        uploads: 'uploads',
        processed: 'processed',
        archived: 'archived',
        temp: 'temp',
    },
    // Security settings
    security: {
        enforceSSL: true,
        serverSideEncryption: 'AES256',
        blockPublicAccess: true,
    },
    // Lifecycle settings
    lifecycle: {
        transitionToIA: 30, // Days until transition to Infrequent Access
        transitionToGlacier: 90, // Days until transition to Glacier
        expireVersions: 30, // Days to keep old versions
        abortIncompleteUploads: 7, // Days to abort incomplete multipart uploads
    },
};
/**
 * Get S3 bucket name for environment
 */
function getBucketName(environment = 'dev') {
    return `misra-platform-files-${environment}`;
}
/**
 * Get S3 key for file upload
 */
function getUploadKey(organizationId, userId, fileId, fileName) {
    const timestamp = Date.now();
    return `${exports.S3_CONFIG.keyPrefixes.uploads}/${organizationId}/${userId}/${timestamp}-${fileId}-${fileName}`;
}
/**
 * Get S3 key for processed file
 */
function getProcessedKey(organizationId, userId, fileId, fileName) {
    return `${exports.S3_CONFIG.keyPrefixes.processed}/${organizationId}/${userId}/${fileId}-${fileName}`;
}
/**
 * Get S3 key for archived file
 */
function getArchivedKey(organizationId, userId, fileId, fileName) {
    const timestamp = Date.now();
    return `${exports.S3_CONFIG.keyPrefixes.archived}/${organizationId}/${userId}/${timestamp}-${fileId}-${fileName}`;
}
/**
 * Parse S3 key to extract metadata
 */
function parseS3Key(key) {
    const parts = key.split('/');
    if (parts.length < 4) {
        return null;
    }
    return {
        prefix: parts[0],
        organizationId: parts[1],
        userId: parts[2],
        fileName: parts.slice(3).join('/'),
    };
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiczMtY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiczMtY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7R0FFRzs7O0FBMkRILHNDQUVDO0FBS0Qsb0NBUUM7QUFLRCwwQ0FPQztBQUtELHdDQVFDO0FBS0QsZ0NBaUJDO0FBdkhZLFFBQUEsU0FBUyxHQUFHO0lBQ3ZCLFVBQVUsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQjtJQUM5RSxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUU3Qyw4QkFBOEI7SUFDOUIsV0FBVyxFQUFFO1FBQ1gsT0FBTyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFHLE9BQU87UUFDbkMsQ0FBQyxFQUFFLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxFQUFTLG1CQUFtQjtRQUMvQyxHQUFHLEVBQUUsRUFBRSxHQUFHLElBQUksR0FBRyxJQUFJLEVBQU8scUJBQXFCO1FBQ2pELE1BQU0sRUFBRSxDQUFDLEdBQUcsSUFBSSxHQUFHLElBQUksRUFBSyx1QkFBdUI7S0FDcEQ7SUFFRCwwQkFBMEI7SUFDMUIsaUJBQWlCLEVBQUUsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUM7SUFFdEUscUJBQXFCO0lBQ3JCLG1CQUFtQixFQUFFO1FBQ25CLFlBQVk7UUFDWixVQUFVO1FBQ1YsWUFBWTtRQUNaLDBCQUEwQjtLQUMzQjtJQUVELDhDQUE4QztJQUM5QyxhQUFhLEVBQUU7UUFDYixNQUFNLEVBQUUsSUFBSSxFQUFPLFNBQVM7UUFDNUIsUUFBUSxFQUFFLElBQUksRUFBSyxTQUFTO1FBQzVCLFNBQVMsRUFBRSxHQUFHLEVBQUssYUFBYTtLQUNqQztJQUVELGtCQUFrQjtJQUNsQixXQUFXLEVBQUU7UUFDWCxPQUFPLEVBQUUsU0FBUztRQUNsQixTQUFTLEVBQUUsV0FBVztRQUN0QixRQUFRLEVBQUUsVUFBVTtRQUNwQixJQUFJLEVBQUUsTUFBTTtLQUNiO0lBRUQsb0JBQW9CO0lBQ3BCLFFBQVEsRUFBRTtRQUNSLFVBQVUsRUFBRSxJQUFJO1FBQ2hCLG9CQUFvQixFQUFFLFFBQWlCO1FBQ3ZDLGlCQUFpQixFQUFFLElBQUk7S0FDeEI7SUFFRCxxQkFBcUI7SUFDckIsU0FBUyxFQUFFO1FBQ1QsY0FBYyxFQUFFLEVBQUUsRUFBUyw2Q0FBNkM7UUFDeEUsbUJBQW1CLEVBQUUsRUFBRSxFQUFJLG1DQUFtQztRQUM5RCxjQUFjLEVBQUUsRUFBRSxFQUFTLDRCQUE0QjtRQUN2RCxzQkFBc0IsRUFBRSxDQUFDLEVBQUUsNkNBQTZDO0tBQ3pFO0NBQ08sQ0FBQTtBQUVWOztHQUVHO0FBQ0gsU0FBZ0IsYUFBYSxDQUFDLGNBQXNCLEtBQUs7SUFDdkQsT0FBTyx3QkFBd0IsV0FBVyxFQUFFLENBQUE7QUFDOUMsQ0FBQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUMxQixjQUFzQixFQUN0QixNQUFjLEVBQ2QsTUFBYyxFQUNkLFFBQWdCO0lBRWhCLE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQTtJQUM1QixPQUFPLEdBQUcsaUJBQVMsQ0FBQyxXQUFXLENBQUMsT0FBTyxJQUFJLGNBQWMsSUFBSSxNQUFNLElBQUksU0FBUyxJQUFJLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUMxRyxDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixlQUFlLENBQzdCLGNBQXNCLEVBQ3RCLE1BQWMsRUFDZCxNQUFjLEVBQ2QsUUFBZ0I7SUFFaEIsT0FBTyxHQUFHLGlCQUFTLENBQUMsV0FBVyxDQUFDLFNBQVMsSUFBSSxjQUFjLElBQUksTUFBTSxJQUFJLE1BQU0sSUFBSSxRQUFRLEVBQUUsQ0FBQTtBQUMvRixDQUFDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixjQUFjLENBQzVCLGNBQXNCLEVBQ3RCLE1BQWMsRUFDZCxNQUFjLEVBQ2QsUUFBZ0I7SUFFaEIsTUFBTSxTQUFTLEdBQUcsSUFBSSxDQUFDLEdBQUcsRUFBRSxDQUFBO0lBQzVCLE9BQU8sR0FBRyxpQkFBUyxDQUFDLFdBQVcsQ0FBQyxRQUFRLElBQUksY0FBYyxJQUFJLE1BQU0sSUFBSSxTQUFTLElBQUksTUFBTSxJQUFJLFFBQVEsRUFBRSxDQUFBO0FBQzNHLENBQUM7QUFFRDs7R0FFRztBQUNILFNBQWdCLFVBQVUsQ0FBQyxHQUFXO0lBTXBDLE1BQU0sS0FBSyxHQUFHLEdBQUcsQ0FBQyxLQUFLLENBQUMsR0FBRyxDQUFDLENBQUE7SUFDNUIsSUFBSSxLQUFLLENBQUMsTUFBTSxHQUFHLENBQUMsRUFBRSxDQUFDO1FBQ3JCLE9BQU8sSUFBSSxDQUFBO0lBQ2IsQ0FBQztJQUVELE9BQU87UUFDTCxNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoQixjQUFjLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUN4QixNQUFNLEVBQUUsS0FBSyxDQUFDLENBQUMsQ0FBQztRQUNoQixRQUFRLEVBQUUsS0FBSyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsR0FBRyxDQUFDO0tBQ25DLENBQUE7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFMzIGNvbmZpZ3VyYXRpb24gZm9yIGZpbGUgc3RvcmFnZVxyXG4gKi9cclxuXHJcbmV4cG9ydCBjb25zdCBTM19DT05GSUcgPSB7XHJcbiAgYnVja2V0TmFtZTogcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnLFxyXG4gIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICBcclxuICAvLyBGaWxlIHNpemUgbGltaXRzIChpbiBieXRlcylcclxuICBtYXhGaWxlU2l6ZToge1xyXG4gICAgZGVmYXVsdDogNTAgKiAxMDI0ICogMTAyNCwgIC8vIDUwTUJcclxuICAgIGM6IDEwICogMTAyNCAqIDEwMjQsICAgICAgICAvLyAxME1CIGZvciBDIGZpbGVzXHJcbiAgICBjcHA6IDEwICogMTAyNCAqIDEwMjQsICAgICAgLy8gMTBNQiBmb3IgQysrIGZpbGVzXHJcbiAgICBoZWFkZXI6IDUgKiAxMDI0ICogMTAyNCwgICAgLy8gNU1CIGZvciBoZWFkZXIgZmlsZXNcclxuICB9LFxyXG4gIFxyXG4gIC8vIEFsbG93ZWQgZmlsZSBleHRlbnNpb25zXHJcbiAgYWxsb3dlZEV4dGVuc2lvbnM6IFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJywgJy5oeHgnXSxcclxuICBcclxuICAvLyBBbGxvd2VkIE1JTUUgdHlwZXNcclxuICBhbGxvd2VkQ29udGVudFR5cGVzOiBbXHJcbiAgICAndGV4dC9wbGFpbicsXHJcbiAgICAndGV4dC94LWMnLFxyXG4gICAgJ3RleHQveC1jKysnLFxyXG4gICAgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcclxuICBdLFxyXG4gIFxyXG4gIC8vIFByZXNpZ25lZCBVUkwgZXhwaXJhdGlvbiB0aW1lcyAoaW4gc2Vjb25kcylcclxuICB1cmxFeHBpcmF0aW9uOiB7XHJcbiAgICB1cGxvYWQ6IDM2MDAsICAgICAgLy8gMSBob3VyXHJcbiAgICBkb3dubG9hZDogMzYwMCwgICAgLy8gMSBob3VyXHJcbiAgICB0ZW1wb3Jhcnk6IDkwMCwgICAgLy8gMTUgbWludXRlc1xyXG4gIH0sXHJcbiAgXHJcbiAgLy8gUzMga2V5IHByZWZpeGVzXHJcbiAga2V5UHJlZml4ZXM6IHtcclxuICAgIHVwbG9hZHM6ICd1cGxvYWRzJyxcclxuICAgIHByb2Nlc3NlZDogJ3Byb2Nlc3NlZCcsXHJcbiAgICBhcmNoaXZlZDogJ2FyY2hpdmVkJyxcclxuICAgIHRlbXA6ICd0ZW1wJyxcclxuICB9LFxyXG4gIFxyXG4gIC8vIFNlY3VyaXR5IHNldHRpbmdzXHJcbiAgc2VjdXJpdHk6IHtcclxuICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICBzZXJ2ZXJTaWRlRW5jcnlwdGlvbjogJ0FFUzI1NicgYXMgY29uc3QsXHJcbiAgICBibG9ja1B1YmxpY0FjY2VzczogdHJ1ZSxcclxuICB9LFxyXG4gIFxyXG4gIC8vIExpZmVjeWNsZSBzZXR0aW5nc1xyXG4gIGxpZmVjeWNsZToge1xyXG4gICAgdHJhbnNpdGlvblRvSUE6IDMwLCAgICAgICAgLy8gRGF5cyB1bnRpbCB0cmFuc2l0aW9uIHRvIEluZnJlcXVlbnQgQWNjZXNzXHJcbiAgICB0cmFuc2l0aW9uVG9HbGFjaWVyOiA5MCwgICAvLyBEYXlzIHVudGlsIHRyYW5zaXRpb24gdG8gR2xhY2llclxyXG4gICAgZXhwaXJlVmVyc2lvbnM6IDMwLCAgICAgICAgLy8gRGF5cyB0byBrZWVwIG9sZCB2ZXJzaW9uc1xyXG4gICAgYWJvcnRJbmNvbXBsZXRlVXBsb2FkczogNywgLy8gRGF5cyB0byBhYm9ydCBpbmNvbXBsZXRlIG11bHRpcGFydCB1cGxvYWRzXHJcbiAgfSxcclxufSBhcyBjb25zdFxyXG5cclxuLyoqXHJcbiAqIEdldCBTMyBidWNrZXQgbmFtZSBmb3IgZW52aXJvbm1lbnRcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRCdWNrZXROYW1lKGVudmlyb25tZW50OiBzdHJpbmcgPSAnZGV2Jyk6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fWBcclxufVxyXG5cclxuLyoqXHJcbiAqIEdldCBTMyBrZXkgZm9yIGZpbGUgdXBsb2FkXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0VXBsb2FkS2V5KFxyXG4gIG9yZ2FuaXphdGlvbklkOiBzdHJpbmcsXHJcbiAgdXNlcklkOiBzdHJpbmcsXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgZmlsZU5hbWU6IHN0cmluZ1xyXG4pOiBzdHJpbmcge1xyXG4gIGNvbnN0IHRpbWVzdGFtcCA9IERhdGUubm93KClcclxuICByZXR1cm4gYCR7UzNfQ09ORklHLmtleVByZWZpeGVzLnVwbG9hZHN9LyR7b3JnYW5pemF0aW9uSWR9LyR7dXNlcklkfS8ke3RpbWVzdGFtcH0tJHtmaWxlSWR9LSR7ZmlsZU5hbWV9YFxyXG59XHJcblxyXG4vKipcclxuICogR2V0IFMzIGtleSBmb3IgcHJvY2Vzc2VkIGZpbGVcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBnZXRQcm9jZXNzZWRLZXkoXHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZyxcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nXHJcbik6IHN0cmluZyB7XHJcbiAgcmV0dXJuIGAke1MzX0NPTkZJRy5rZXlQcmVmaXhlcy5wcm9jZXNzZWR9LyR7b3JnYW5pemF0aW9uSWR9LyR7dXNlcklkfS8ke2ZpbGVJZH0tJHtmaWxlTmFtZX1gXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBHZXQgUzMga2V5IGZvciBhcmNoaXZlZCBmaWxlXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0QXJjaGl2ZWRLZXkoXHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZyxcclxuICB1c2VySWQ6IHN0cmluZyxcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBmaWxlTmFtZTogc3RyaW5nXHJcbik6IHN0cmluZyB7XHJcbiAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKVxyXG4gIHJldHVybiBgJHtTM19DT05GSUcua2V5UHJlZml4ZXMuYXJjaGl2ZWR9LyR7b3JnYW5pemF0aW9uSWR9LyR7dXNlcklkfS8ke3RpbWVzdGFtcH0tJHtmaWxlSWR9LSR7ZmlsZU5hbWV9YFxyXG59XHJcblxyXG4vKipcclxuICogUGFyc2UgUzMga2V5IHRvIGV4dHJhY3QgbWV0YWRhdGFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBwYXJzZVMzS2V5KGtleTogc3RyaW5nKToge1xyXG4gIHByZWZpeDogc3RyaW5nXHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZ1xyXG4gIHVzZXJJZDogc3RyaW5nXHJcbiAgZmlsZU5hbWU6IHN0cmluZ1xyXG59IHwgbnVsbCB7XHJcbiAgY29uc3QgcGFydHMgPSBrZXkuc3BsaXQoJy8nKVxyXG4gIGlmIChwYXJ0cy5sZW5ndGggPCA0KSB7XHJcbiAgICByZXR1cm4gbnVsbFxyXG4gIH1cclxuXHJcbiAgcmV0dXJuIHtcclxuICAgIHByZWZpeDogcGFydHNbMF0sXHJcbiAgICBvcmdhbml6YXRpb25JZDogcGFydHNbMV0sXHJcbiAgICB1c2VySWQ6IHBhcnRzWzJdLFxyXG4gICAgZmlsZU5hbWU6IHBhcnRzLnNsaWNlKDMpLmpvaW4oJy8nKSxcclxuICB9XHJcbn1cclxuIl19