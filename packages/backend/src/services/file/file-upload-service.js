"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
const crypto = __importStar(require("crypto"));
class FileUploadService {
    s3Client;
    bucketName;
    maxFileSize = 50 * 1024 * 1024; // 50MB
    allowedExtensions = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'];
    allowedContentTypes = [
        'text/plain',
        'text/x-c',
        'text/x-c++',
        'application/octet-stream'
    ];
    constructor() {
        this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
        // Initialize S3 client
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    async generatePresignedUploadUrl(request) {
        // Validate file
        const validation = this.validateFile(request.fileName, request.fileSize, request.contentType);
        if (!validation.isValid) {
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
        // Generate unique file ID and S3 key
        const fileId = (0, uuid_1.v4)();
        const timestamp = Date.now();
        const sanitizedFileName = this.sanitizeFileName(request.fileName);
        const fileHash = this.generateFileHash(request.fileName, request.userId, timestamp);
        const s3Key = `uploads/${request.organizationId}/${request.userId}/${timestamp}-${fileId}-${sanitizedFileName}`;
        try {
            // Generate presigned URL for upload with security constraints
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: request.contentType,
                ContentLength: request.fileSize,
                ServerSideEncryption: 'AES256',
                Metadata: {
                    'original-filename': request.fileName,
                    'user-id': request.userId,
                    'organization-id': request.organizationId,
                    'file-id': fileId,
                    'upload-timestamp': timestamp.toString(),
                    'file-hash': fileHash,
                    'file-type': validation.fileType
                },
                // Security: Ensure uploaded file matches expected content type
                ContentDisposition: `attachment; filename="${sanitizedFileName}"`,
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, putCommand, {
                expiresIn: 3600, // 1 hour
            });
            // Generate presigned URL for download
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
            });
            const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, getCommand, {
                expiresIn: 3600, // 1 hour
            });
            return {
                fileId,
                uploadUrl,
                downloadUrl,
                expiresIn: 3600,
            };
        }
        catch (error) {
            console.error('Error generating presigned URLs:', error);
            throw new Error('Failed to generate upload URL');
        }
    }
    validateFile(fileName, fileSize, contentType) {
        const errors = [];
        let fileType = 'UNKNOWN';
        // Check file size
        if (fileSize > this.maxFileSize) {
            errors.push(`File size ${fileSize} bytes exceeds maximum allowed size of ${this.maxFileSize} bytes`);
        }
        if (fileSize <= 0) {
            errors.push('File size must be greater than 0');
        }
        // Check file extension
        const extension = this.getFileExtension(fileName).toLowerCase();
        if (!this.allowedExtensions.includes(extension)) {
            errors.push(`File extension '${extension}' is not allowed. Allowed extensions: ${this.allowedExtensions.join(', ')}`);
        }
        else {
            // Determine file type based on extension
            if (['.c'].includes(extension)) {
                fileType = 'C';
            }
            else if (['.cpp', '.cc', '.cxx'].includes(extension)) {
                fileType = 'CPP';
            }
            else if (['.h', '.hpp', '.hxx'].includes(extension)) {
                fileType = 'HEADER';
            }
        }
        // Check content type
        if (!this.allowedContentTypes.includes(contentType)) {
            errors.push(`Content type '${contentType}' is not allowed. Allowed types: ${this.allowedContentTypes.join(', ')}`);
        }
        // Check filename for security
        if (this.containsUnsafeCharacters(fileName)) {
            errors.push('Filename contains unsafe characters');
        }
        if (fileName.length > 255) {
            errors.push('Filename is too long (maximum 255 characters)');
        }
        return {
            isValid: errors.length === 0,
            errors,
            fileType,
        };
    }
    getFileExtension(fileName) {
        const lastDotIndex = fileName.lastIndexOf('.');
        return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
    }
    sanitizeFileName(fileName) {
        // Remove or replace unsafe characters
        return fileName
            .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
            .replace(/_{2,}/g, '_') // Replace multiple underscores with single
            .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
            .substring(0, 255); // Limit length
    }
    containsUnsafeCharacters(fileName) {
        // Check for path traversal and other unsafe patterns
        const unsafePatterns = [
            /\.\./, // Path traversal
            /[<>:"|?*]/, // Windows reserved characters
            /[\x00-\x1f]/, // Control characters
            /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
        ];
        return unsafePatterns.some(pattern => pattern.test(fileName));
    }
    async getFileMetadata(fileId) {
        // This would typically query DynamoDB for file metadata
        // For now, return mock data
        return {
            fileId,
            fileName: 'example.c',
            fileSize: 1024,
            contentType: 'text/x-c',
            uploadedAt: new Date().toISOString(),
            status: 'uploaded',
        };
    }
    /**
     * Generate a hash for file tracking and integrity
     */
    generateFileHash(fileName, userId, timestamp) {
        const data = `${fileName}-${userId}-${timestamp}`;
        return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
    }
    /**
     * Verify file exists in S3
     */
    async verifyFileExists(s3Key) {
        try {
            const command = new client_s3_1.HeadObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
            });
            await this.s3Client.send(command);
            return true;
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Get file size limit based on file type
     */
    getMaxFileSizeForType(fileType) {
        // Different limits for different file types
        const limits = {
            'C': 10 * 1024 * 1024, // 10MB for C files
            'CPP': 10 * 1024 * 1024, // 10MB for C++ files
            'HEADER': 5 * 1024 * 1024, // 5MB for header files
        };
        return limits[fileType] || this.maxFileSize;
    }
    /**
     * Check if file extension matches content type
     */
    validateContentTypeMatch(fileName, contentType) {
        const extension = this.getFileExtension(fileName).toLowerCase();
        const validMappings = {
            '.c': ['text/plain', 'text/x-c', 'application/octet-stream'],
            '.cpp': ['text/plain', 'text/x-c++', 'application/octet-stream'],
            '.cc': ['text/plain', 'text/x-c++', 'application/octet-stream'],
            '.cxx': ['text/plain', 'text/x-c++', 'application/octet-stream'],
            '.h': ['text/plain', 'text/x-c', 'application/octet-stream'],
            '.hpp': ['text/plain', 'text/x-c++', 'application/octet-stream'],
            '.hxx': ['text/plain', 'text/x-c++', 'application/octet-stream'],
        };
        const validTypes = validMappings[extension];
        return validTypes ? validTypes.includes(contentType) : false;
    }
}
exports.FileUploadService = FileUploadService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXFHO0FBQ3JHLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUFDcEMsK0NBQWlDO0FBdUJqQyxNQUFhLGlCQUFpQjtJQUNwQixRQUFRLENBQVc7SUFDbkIsVUFBVSxDQUFTO0lBQ25CLFdBQVcsR0FBVyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87SUFDL0MsaUJBQWlCLEdBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRixtQkFBbUIsR0FBYTtRQUN0QyxZQUFZO1FBQ1osVUFBVTtRQUNWLFlBQVk7UUFDWiwwQkFBMEI7S0FDM0IsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQixDQUFDO1FBRXJGLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQztZQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE9BQTBCO1FBQ3pELGdCQUFnQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUks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O1FBRUYsTUFBTSxVQUFVLEdBQUcsYUFBYSxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQzVDLE9BQU8sVUFBVSxDQUFDLENBQUMsQ0FBQyxVQUFVLENBQUMsUUFBUSxDQUFDLFdBQVcsQ0FBQyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDL0QsQ0FBQztDQUNGO0FBbE9ELDhDQWtPQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kLCBHZXRPYmplY3RDb21tYW5kLCBIZWFkT2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVxdWVzdCB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICB1c2VySWQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHVwbG9hZFVybDogc3RyaW5nO1xyXG4gIGRvd25sb2FkVXJsOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gIGlzVmFsaWQ6IGJvb2xlYW47XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxuICBmaWxlVHlwZTogJ0MnIHwgJ0NQUCcgfCAnSEVBREVSJyB8ICdVTktOT1dOJztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVVcGxvYWRTZXJ2aWNlIHtcclxuICBwcml2YXRlIHMzQ2xpZW50OiBTM0NsaWVudDtcclxuICBwcml2YXRlIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuICBwcml2YXRlIG1heEZpbGVTaXplOiBudW1iZXIgPSA1MCAqIDEwMjQgKiAxMDI0OyAvLyA1ME1CXHJcbiAgcHJpdmF0ZSBhbGxvd2VkRXh0ZW5zaW9uczogc3RyaW5nW10gPSBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCcsICcuaHh4J107XHJcbiAgcHJpdmF0ZSBhbGxvd2VkQ29udGVudFR5cGVzOiBzdHJpbmdbXSA9IFtcclxuICAgICd0ZXh0L3BsYWluJyxcclxuICAgICd0ZXh0L3gtYycsXHJcbiAgICAndGV4dC94LWMrKycsXHJcbiAgICAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xyXG4gIF07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5idWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIFMzIGNsaWVudFxyXG4gICAgdGhpcy5zM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2VuZXJhdGVQcmVzaWduZWRVcGxvYWRVcmwocmVxdWVzdDogRmlsZVVwbG9hZFJlcXVlc3QpOiBQcm9taXNlPEZpbGVVcGxvYWRSZXNwb25zZT4ge1xyXG4gICAgLy8gVmFsaWRhdGUgZmlsZVxyXG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGVGaWxlKHJlcXVlc3QuZmlsZU5hbWUsIHJlcXVlc3QuZmlsZVNpemUsIHJlcXVlc3QuY29udGVudFR5cGUpO1xyXG4gICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHZhbGlkYXRpb24gZmFpbGVkOiAke3ZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdW5pcXVlIGZpbGUgSUQgYW5kIFMzIGtleVxyXG4gICAgY29uc3QgZmlsZUlkID0gdXVpZHY0KCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3Qgc2FuaXRpemVkRmlsZU5hbWUgPSB0aGlzLnNhbml0aXplRmlsZU5hbWUocmVxdWVzdC5maWxlTmFtZSk7XHJcbiAgICBjb25zdCBmaWxlSGFzaCA9IHRoaXMuZ2VuZXJhdGVGaWxlSGFzaChyZXF1ZXN0LmZpbGVOYW1lLCByZXF1ZXN0LnVzZXJJZCwgdGltZXN0YW1wKTtcclxuICAgIGNvbnN0IHMzS2V5ID0gYHVwbG9hZHMvJHtyZXF1ZXN0Lm9yZ2FuaXphdGlvbklkfS8ke3JlcXVlc3QudXNlcklkfS8ke3RpbWVzdGFtcH0tJHtmaWxlSWR9LSR7c2FuaXRpemVkRmlsZU5hbWV9YDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciB1cGxvYWQgd2l0aCBzZWN1cml0eSBjb25zdHJhaW50c1xyXG4gICAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgQ29udGVudFR5cGU6IHJlcXVlc3QuY29udGVudFR5cGUsXHJcbiAgICAgICAgQ29udGVudExlbmd0aDogcmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbjogJ0FFUzI1NicsXHJcbiAgICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAgICdvcmlnaW5hbC1maWxlbmFtZSc6IHJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgICAndXNlci1pZCc6IHJlcXVlc3QudXNlcklkLFxyXG4gICAgICAgICAgJ29yZ2FuaXphdGlvbi1pZCc6IHJlcXVlc3Qub3JnYW5pemF0aW9uSWQsXHJcbiAgICAgICAgICAnZmlsZS1pZCc6IGZpbGVJZCxcclxuICAgICAgICAgICd1cGxvYWQtdGltZXN0YW1wJzogdGltZXN0YW1wLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAnZmlsZS1oYXNoJzogZmlsZUhhc2gsXHJcbiAgICAgICAgICAnZmlsZS10eXBlJzogdmFsaWRhdGlvbi5maWxlVHlwZVxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgLy8gU2VjdXJpdHk6IEVuc3VyZSB1cGxvYWRlZCBmaWxlIG1hdGNoZXMgZXhwZWN0ZWQgY29udGVudCB0eXBlXHJcbiAgICAgICAgQ29udGVudERpc3Bvc2l0aW9uOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIke3Nhbml0aXplZEZpbGVOYW1lfVwiYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCB1cGxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgcHV0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMCwgLy8gMSBob3VyXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCBmb3IgZG93bmxvYWRcclxuICAgICAgY29uc3QgZ2V0Q29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICAgIFJlc3BvbnNlQ29udGVudERpc3Bvc2l0aW9uOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIke3Nhbml0aXplZEZpbGVOYW1lfVwiYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBkb3dubG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybCh0aGlzLnMzQ2xpZW50LCBnZXRDb21tYW5kLCB7XHJcbiAgICAgICAgZXhwaXJlc0luOiAzNjAwLCAvLyAxIGhvdXJcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICB1cGxvYWRVcmwsXHJcbiAgICAgICAgZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0luOiAzNjAwLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyBwcmVzaWduZWQgVVJMczonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIGdlbmVyYXRlIHVwbG9hZCBVUkwnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIHZhbGlkYXRlRmlsZShmaWxlTmFtZTogc3RyaW5nLCBmaWxlU2l6ZTogbnVtYmVyLCBjb250ZW50VHlwZTogc3RyaW5nKTogRmlsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gICAgY29uc3QgZXJyb3JzOiBzdHJpbmdbXSA9IFtdO1xyXG4gICAgbGV0IGZpbGVUeXBlOiAnQycgfCAnQ1BQJyB8ICdIRUFERVInIHwgJ1VOS05PV04nID0gJ1VOS05PV04nO1xyXG5cclxuICAgIC8vIENoZWNrIGZpbGUgc2l6ZVxyXG4gICAgaWYgKGZpbGVTaXplID4gdGhpcy5tYXhGaWxlU2l6ZSkge1xyXG4gICAgICBlcnJvcnMucHVzaChgRmlsZSBzaXplICR7ZmlsZVNpemV9IGJ5dGVzIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkIHNpemUgb2YgJHt0aGlzLm1heEZpbGVTaXplfSBieXRlc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChmaWxlU2l6ZSA8PSAwKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKCdGaWxlIHNpemUgbXVzdCBiZSBncmVhdGVyIHRoYW4gMCcpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZpbGUgZXh0ZW5zaW9uXHJcbiAgICBjb25zdCBleHRlbnNpb24gPSB0aGlzLmdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWUpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAoIXRoaXMuYWxsb3dlZEV4dGVuc2lvbnMuaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICBlcnJvcnMucHVzaChgRmlsZSBleHRlbnNpb24gJyR7ZXh0ZW5zaW9ufScgaXMgbm90IGFsbG93ZWQuIEFsbG93ZWQgZXh0ZW5zaW9uczogJHt0aGlzLmFsbG93ZWRFeHRlbnNpb25zLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICAvLyBEZXRlcm1pbmUgZmlsZSB0eXBlIGJhc2VkIG9uIGV4dGVuc2lvblxyXG4gICAgICBpZiAoWycuYyddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgICBmaWxlVHlwZSA9ICdDJztcclxuICAgICAgfSBlbHNlIGlmIChbJy5jcHAnLCAnLmNjJywgJy5jeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnQ1BQJztcclxuICAgICAgfSBlbHNlIGlmIChbJy5oJywgJy5ocHAnLCAnLmh4eCddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgICBmaWxlVHlwZSA9ICdIRUFERVInO1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgY29udGVudCB0eXBlXHJcbiAgICBpZiAoIXRoaXMuYWxsb3dlZENvbnRlbnRUeXBlcy5pbmNsdWRlcyhjb250ZW50VHlwZSkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYENvbnRlbnQgdHlwZSAnJHtjb250ZW50VHlwZX0nIGlzIG5vdCBhbGxvd2VkLiBBbGxvd2VkIHR5cGVzOiAke3RoaXMuYWxsb3dlZENvbnRlbnRUeXBlcy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZpbGVuYW1lIGZvciBzZWN1cml0eVxyXG4gICAgaWYgKHRoaXMuY29udGFpbnNVbnNhZmVDaGFyYWN0ZXJzKGZpbGVOYW1lKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZW5hbWUgY29udGFpbnMgdW5zYWZlIGNoYXJhY3RlcnMnKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsZU5hbWUubGVuZ3RoID4gMjU1KSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKCdGaWxlbmFtZSBpcyB0b28gbG9uZyAobWF4aW11bSAyNTUgY2hhcmFjdGVycyknKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpc1ZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxyXG4gICAgICBlcnJvcnMsXHJcbiAgICAgIGZpbGVUeXBlLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGxhc3REb3RJbmRleCA9IGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJyk7XHJcbiAgICByZXR1cm4gbGFzdERvdEluZGV4ID09PSAtMSA/ICcnIDogZmlsZU5hbWUuc3Vic3RyaW5nKGxhc3REb3RJbmRleCk7XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIHNhbml0aXplRmlsZU5hbWUoZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICAvLyBSZW1vdmUgb3IgcmVwbGFjZSB1bnNhZmUgY2hhcmFjdGVyc1xyXG4gICAgcmV0dXJuIGZpbGVOYW1lXHJcbiAgICAgIC5yZXBsYWNlKC9bXmEtekEtWjAtOS5fLV0vZywgJ18nKSAvLyBSZXBsYWNlIHVuc2FmZSBjaGFycyB3aXRoIHVuZGVyc2NvcmVcclxuICAgICAgLnJlcGxhY2UoL197Mix9L2csICdfJykgLy8gUmVwbGFjZSBtdWx0aXBsZSB1bmRlcnNjb3JlcyB3aXRoIHNpbmdsZVxyXG4gICAgICAucmVwbGFjZSgvXl8rfF8rJC9nLCAnJykgLy8gUmVtb3ZlIGxlYWRpbmcvdHJhaWxpbmcgdW5kZXJzY29yZXNcclxuICAgICAgLnN1YnN0cmluZygwLCAyNTUpOyAvLyBMaW1pdCBsZW5ndGhcclxuICB9XHJcblxyXG4gIHByaXZhdGUgY29udGFpbnNVbnNhZmVDaGFyYWN0ZXJzKGZpbGVOYW1lOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIC8vIENoZWNrIGZvciBwYXRoIHRyYXZlcnNhbCBhbmQgb3RoZXIgdW5zYWZlIHBhdHRlcm5zXHJcbiAgICBjb25zdCB1bnNhZmVQYXR0ZXJucyA9IFtcclxuICAgICAgL1xcLlxcLi8sICAgICAgICAgICAvLyBQYXRoIHRyYXZlcnNhbFxyXG4gICAgICAvWzw+OlwifD8qXS8sICAgICAgLy8gV2luZG93cyByZXNlcnZlZCBjaGFyYWN0ZXJzXHJcbiAgICAgIC9bXFx4MDAtXFx4MWZdLywgICAgLy8gQ29udHJvbCBjaGFyYWN0ZXJzXHJcbiAgICAgIC9eKENPTnxQUk58QVVYfE5VTHxDT01bMS05XXxMUFRbMS05XSkkL2ksIC8vIFdpbmRvd3MgcmVzZXJ2ZWQgbmFtZXNcclxuICAgIF07XHJcblxyXG4gICAgcmV0dXJuIHVuc2FmZVBhdHRlcm5zLnNvbWUocGF0dGVybiA9PiBwYXR0ZXJuLnRlc3QoZmlsZU5hbWUpKTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdldEZpbGVNZXRhZGF0YShmaWxlSWQ6IHN0cmluZyk6IFByb21pc2U8YW55PiB7XHJcbiAgICAvLyBUaGlzIHdvdWxkIHR5cGljYWxseSBxdWVyeSBEeW5hbW9EQiBmb3IgZmlsZSBtZXRhZGF0YVxyXG4gICAgLy8gRm9yIG5vdywgcmV0dXJuIG1vY2sgZGF0YVxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBmaWxlTmFtZTogJ2V4YW1wbGUuYycsXHJcbiAgICAgIGZpbGVTaXplOiAxMDI0LFxyXG4gICAgICBjb250ZW50VHlwZTogJ3RleHQveC1jJyxcclxuICAgICAgdXBsb2FkZWRBdDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBzdGF0dXM6ICd1cGxvYWRlZCcsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgYSBoYXNoIGZvciBmaWxlIHRyYWNraW5nIGFuZCBpbnRlZ3JpdHlcclxuICAgKi9cclxuICBwcml2YXRlIGdlbmVyYXRlRmlsZUhhc2goZmlsZU5hbWU6IHN0cmluZywgdXNlcklkOiBzdHJpbmcsIHRpbWVzdGFtcDogbnVtYmVyKTogc3RyaW5nIHtcclxuICAgIGNvbnN0IGRhdGEgPSBgJHtmaWxlTmFtZX0tJHt1c2VySWR9LSR7dGltZXN0YW1wfWA7XHJcbiAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShkYXRhKS5kaWdlc3QoJ2hleCcpLnN1YnN0cmluZygwLCAxNik7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgZmlsZSBleGlzdHMgaW4gUzNcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlGaWxlRXhpc3RzKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgSGVhZE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgIH0pO1xyXG4gICAgICBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGZpbGUgc2l6ZSBsaW1pdCBiYXNlZCBvbiBmaWxlIHR5cGVcclxuICAgKi9cclxuICBnZXRNYXhGaWxlU2l6ZUZvclR5cGUoZmlsZVR5cGU6IHN0cmluZyk6IG51bWJlciB7XHJcbiAgICAvLyBEaWZmZXJlbnQgbGltaXRzIGZvciBkaWZmZXJlbnQgZmlsZSB0eXBlc1xyXG4gICAgY29uc3QgbGltaXRzOiBSZWNvcmQ8c3RyaW5nLCBudW1iZXI+ID0ge1xyXG4gICAgICAnQyc6IDEwICogMTAyNCAqIDEwMjQsICAgICAgLy8gMTBNQiBmb3IgQyBmaWxlc1xyXG4gICAgICAnQ1BQJzogMTAgKiAxMDI0ICogMTAyNCwgICAgLy8gMTBNQiBmb3IgQysrIGZpbGVzXHJcbiAgICAgICdIRUFERVInOiA1ICogMTAyNCAqIDEwMjQsICAvLyA1TUIgZm9yIGhlYWRlciBmaWxlc1xyXG4gICAgfTtcclxuICAgIHJldHVybiBsaW1pdHNbZmlsZVR5cGVdIHx8IHRoaXMubWF4RmlsZVNpemU7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBpZiBmaWxlIGV4dGVuc2lvbiBtYXRjaGVzIGNvbnRlbnQgdHlwZVxyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVDb250ZW50VHlwZU1hdGNoKGZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnRUeXBlOiBzdHJpbmcpOiBib29sZWFuIHtcclxuICAgIGNvbnN0IGV4dGVuc2lvbiA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZSkudG9Mb3dlckNhc2UoKTtcclxuICAgIGNvbnN0IHZhbGlkTWFwcGluZ3M6IFJlY29yZDxzdHJpbmcsIHN0cmluZ1tdPiA9IHtcclxuICAgICAgJy5jJzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmNwcCc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYysrJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmNjJzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuY3h4JzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuaCc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5ocHAnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMrKycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5oeHgnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMrKycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgdmFsaWRUeXBlcyA9IHZhbGlkTWFwcGluZ3NbZXh0ZW5zaW9uXTtcclxuICAgIHJldHVybiB2YWxpZFR5cGVzID8gdmFsaWRUeXBlcy5pbmNsdWRlcyhjb250ZW50VHlwZSkgOiBmYWxzZTtcclxuICB9XHJcbn0iXX0=