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
            // Generate presigned URL for upload
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: request.contentType,
                Metadata: {
                    'original-filename': request.fileName,
                    'user-id': request.userId,
                    'organization-id': request.organizationId,
                    'file-id': fileId,
                    'upload-timestamp': timestamp.toString(),
                    'file-hash': fileHash,
                    'file-type': validation.fileType
                }
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXFHO0FBQ3JHLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUFDcEMsK0NBQWlDO0FBdUJqQyxNQUFhLGlCQUFpQjtJQUNwQixRQUFRLENBQVc7SUFDbkIsVUFBVSxDQUFTO0lBQ25CLFdBQVcsR0FBVyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87SUFDL0MsaUJBQWlCLEdBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRixtQkFBbUIsR0FBYTtRQUN0QyxZQUFZO1FBQ1osVUFBVTtRQUNWLFlBQVk7UUFDWiwwQkFBMEI7S0FDM0IsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQixDQUFDO1FBRXJGLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQztZQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE9BQTBCO1FBQ3pELGdCQUFnQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUks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QUFDLENBQUMsQ0FBQyxLQUFLLENBQUM7SUFDL0QsQ0FBQztDQUNGO0FBOU5ELDhDQThOQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kLCBHZXRPYmplY3RDb21tYW5kLCBIZWFkT2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVxdWVzdCB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ6IHN0cmluZztcclxuICB1c2VySWQ6IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHVwbG9hZFVybDogc3RyaW5nO1xyXG4gIGRvd25sb2FkVXJsOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gIGlzVmFsaWQ6IGJvb2xlYW47XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxuICBmaWxlVHlwZTogJ0MnIHwgJ0NQUCcgfCAnSEVBREVSJyB8ICdVTktOT1dOJztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVVcGxvYWRTZXJ2aWNlIHtcclxuICBwcml2YXRlIHMzQ2xpZW50OiBTM0NsaWVudDtcclxuICBwcml2YXRlIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuICBwcml2YXRlIG1heEZpbGVTaXplOiBudW1iZXIgPSA1MCAqIDEwMjQgKiAxMDI0OyAvLyA1ME1CXHJcbiAgcHJpdmF0ZSBhbGxvd2VkRXh0ZW5zaW9uczogc3RyaW5nW10gPSBbJy5jJywgJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmgnLCAnLmhwcCcsICcuaHh4J107XHJcbiAgcHJpdmF0ZSBhbGxvd2VkQ29udGVudFR5cGVzOiBzdHJpbmdbXSA9IFtcclxuICAgICd0ZXh0L3BsYWluJyxcclxuICAgICd0ZXh0L3gtYycsXHJcbiAgICAndGV4dC94LWMrKycsXHJcbiAgICAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ1xyXG4gIF07XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5idWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIFMzIGNsaWVudFxyXG4gICAgdGhpcy5zM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2VuZXJhdGVQcmVzaWduZWRVcGxvYWRVcmwocmVxdWVzdDogRmlsZVVwbG9hZFJlcXVlc3QpOiBQcm9taXNlPEZpbGVVcGxvYWRSZXNwb25zZT4ge1xyXG4gICAgLy8gVmFsaWRhdGUgZmlsZVxyXG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGVGaWxlKHJlcXVlc3QuZmlsZU5hbWUsIHJlcXVlc3QuZmlsZVNpemUsIHJlcXVlc3QuY29udGVudFR5cGUpO1xyXG4gICAgaWYgKCF2YWxpZGF0aW9uLmlzVmFsaWQpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBGaWxlIHZhbGlkYXRpb24gZmFpbGVkOiAke3ZhbGlkYXRpb24uZXJyb3JzLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gR2VuZXJhdGUgdW5pcXVlIGZpbGUgSUQgYW5kIFMzIGtleVxyXG4gICAgY29uc3QgZmlsZUlkID0gdXVpZHY0KCk7XHJcbiAgICBjb25zdCB0aW1lc3RhbXAgPSBEYXRlLm5vdygpO1xyXG4gICAgY29uc3Qgc2FuaXRpemVkRmlsZU5hbWUgPSB0aGlzLnNhbml0aXplRmlsZU5hbWUocmVxdWVzdC5maWxlTmFtZSk7XHJcbiAgICBjb25zdCBmaWxlSGFzaCA9IHRoaXMuZ2VuZXJhdGVGaWxlSGFzaChyZXF1ZXN0LmZpbGVOYW1lLCByZXF1ZXN0LnVzZXJJZCwgdGltZXN0YW1wKTtcclxuICAgIGNvbnN0IHMzS2V5ID0gYHVwbG9hZHMvJHtyZXF1ZXN0Lm9yZ2FuaXphdGlvbklkfS8ke3JlcXVlc3QudXNlcklkfS8ke3RpbWVzdGFtcH0tJHtmaWxlSWR9LSR7c2FuaXRpemVkRmlsZU5hbWV9YDtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciB1cGxvYWRcclxuICAgICAgY29uc3QgcHV0Q29tbWFuZCA9IG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICAgIENvbnRlbnRUeXBlOiByZXF1ZXN0LmNvbnRlbnRUeXBlLFxyXG4gICAgICAgIE1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAnb3JpZ2luYWwtZmlsZW5hbWUnOiByZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgJ3VzZXItaWQnOiByZXF1ZXN0LnVzZXJJZCxcclxuICAgICAgICAgICdvcmdhbml6YXRpb24taWQnOiByZXF1ZXN0Lm9yZ2FuaXphdGlvbklkLFxyXG4gICAgICAgICAgJ2ZpbGUtaWQnOiBmaWxlSWQsXHJcbiAgICAgICAgICAndXBsb2FkLXRpbWVzdGFtcCc6IHRpbWVzdGFtcC50b1N0cmluZygpLFxyXG4gICAgICAgICAgJ2ZpbGUtaGFzaCc6IGZpbGVIYXNoLFxyXG4gICAgICAgICAgJ2ZpbGUtdHlwZSc6IHZhbGlkYXRpb24uZmlsZVR5cGVcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgdXBsb2FkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHRoaXMuczNDbGllbnQsIHB1dENvbW1hbmQsIHtcclxuICAgICAgICBleHBpcmVzSW46IDM2MDAsIC8vIDEgaG91clxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCBVUkwgZm9yIGRvd25sb2FkXHJcbiAgICAgIGNvbnN0IGdldENvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgICBSZXNwb25zZUNvbnRlbnREaXNwb3NpdGlvbjogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiJHtzYW5pdGl6ZWRGaWxlTmFtZX1cImAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgZ2V0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMCwgLy8gMSBob3VyXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsLFxyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMCxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdlbmVyYXRpbmcgcHJlc2lnbmVkIFVSTHM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSB1cGxvYWQgVVJMJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YWxpZGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgZmlsZVNpemU6IG51bWJlciwgY29udGVudFR5cGU6IHN0cmluZyk6IEZpbGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuICAgIGxldCBmaWxlVHlwZTogJ0MnIHwgJ0NQUCcgfCAnSEVBREVSJyB8ICdVTktOT1dOJyA9ICdVTktOT1dOJztcclxuXHJcbiAgICAvLyBDaGVjayBmaWxlIHNpemVcclxuICAgIGlmIChmaWxlU2l6ZSA+IHRoaXMubWF4RmlsZVNpemUpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYEZpbGUgc2l6ZSAke2ZpbGVTaXplfSBieXRlcyBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mICR7dGhpcy5tYXhGaWxlU2l6ZX0gYnl0ZXNgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsZVNpemUgPD0gMCkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZSBzaXplIG11c3QgYmUgZ3JlYXRlciB0aGFuIDAnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmaWxlIGV4dGVuc2lvblxyXG4gICAgY29uc3QgZXh0ZW5zaW9uID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKCF0aGlzLmFsbG93ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYEZpbGUgZXh0ZW5zaW9uICcke2V4dGVuc2lvbn0nIGlzIG5vdCBhbGxvd2VkLiBBbGxvd2VkIGV4dGVuc2lvbnM6ICR7dGhpcy5hbGxvd2VkRXh0ZW5zaW9ucy5qb2luKCcsICcpfWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gRGV0ZXJtaW5lIGZpbGUgdHlwZSBiYXNlZCBvbiBleHRlbnNpb25cclxuICAgICAgaWYgKFsnLmMnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnQyc7XHJcbiAgICAgIH0gZWxzZSBpZiAoWycuY3BwJywgJy5jYycsICcuY3h4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ0NQUCc7XHJcbiAgICAgIH0gZWxzZSBpZiAoWycuaCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnSEVBREVSJztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGNvbnRlbnQgdHlwZVxyXG4gICAgaWYgKCF0aGlzLmFsbG93ZWRDb250ZW50VHlwZXMuaW5jbHVkZXMoY29udGVudFR5cGUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBDb250ZW50IHR5cGUgJyR7Y29udGVudFR5cGV9JyBpcyBub3QgYWxsb3dlZC4gQWxsb3dlZCB0eXBlczogJHt0aGlzLmFsbG93ZWRDb250ZW50VHlwZXMuam9pbignLCAnKX1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmaWxlbmFtZSBmb3Igc2VjdXJpdHlcclxuICAgIGlmICh0aGlzLmNvbnRhaW5zVW5zYWZlQ2hhcmFjdGVycyhmaWxlTmFtZSkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGVuYW1lIGNvbnRhaW5zIHVuc2FmZSBjaGFyYWN0ZXJzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbGVOYW1lLmxlbmd0aCA+IDI1NSkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZW5hbWUgaXMgdG9vIGxvbmcgKG1heGltdW0gMjU1IGNoYXJhY3RlcnMpJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXNWYWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgZXJyb3JzLFxyXG4gICAgICBmaWxlVHlwZSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBsYXN0RG90SW5kZXggPSBmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpO1xyXG4gICAgcmV0dXJuIGxhc3REb3RJbmRleCA9PT0gLTEgPyAnJyA6IGZpbGVOYW1lLnN1YnN0cmluZyhsYXN0RG90SW5kZXgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzYW5pdGl6ZUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgLy8gUmVtb3ZlIG9yIHJlcGxhY2UgdW5zYWZlIGNoYXJhY3RlcnNcclxuICAgIHJldHVybiBmaWxlTmFtZVxyXG4gICAgICAucmVwbGFjZSgvW15hLXpBLVowLTkuXy1dL2csICdfJykgLy8gUmVwbGFjZSB1bnNhZmUgY2hhcnMgd2l0aCB1bmRlcnNjb3JlXHJcbiAgICAgIC5yZXBsYWNlKC9fezIsfS9nLCAnXycpIC8vIFJlcGxhY2UgbXVsdGlwbGUgdW5kZXJzY29yZXMgd2l0aCBzaW5nbGVcclxuICAgICAgLnJlcGxhY2UoL15fK3xfKyQvZywgJycpIC8vIFJlbW92ZSBsZWFkaW5nL3RyYWlsaW5nIHVuZGVyc2NvcmVzXHJcbiAgICAgIC5zdWJzdHJpbmcoMCwgMjU1KTsgLy8gTGltaXQgbGVuZ3RoXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnRhaW5zVW5zYWZlQ2hhcmFjdGVycyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBDaGVjayBmb3IgcGF0aCB0cmF2ZXJzYWwgYW5kIG90aGVyIHVuc2FmZSBwYXR0ZXJuc1xyXG4gICAgY29uc3QgdW5zYWZlUGF0dGVybnMgPSBbXHJcbiAgICAgIC9cXC5cXC4vLCAgICAgICAgICAgLy8gUGF0aCB0cmF2ZXJzYWxcclxuICAgICAgL1s8PjpcInw/Kl0vLCAgICAgIC8vIFdpbmRvd3MgcmVzZXJ2ZWQgY2hhcmFjdGVyc1xyXG4gICAgICAvW1xceDAwLVxceDFmXS8sICAgIC8vIENvbnRyb2wgY2hhcmFjdGVyc1xyXG4gICAgICAvXihDT058UFJOfEFVWHxOVUx8Q09NWzEtOV18TFBUWzEtOV0pJC9pLCAvLyBXaW5kb3dzIHJlc2VydmVkIG5hbWVzXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB1bnNhZmVQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KGZpbGVOYW1lKSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gVGhpcyB3b3VsZCB0eXBpY2FsbHkgcXVlcnkgRHluYW1vREIgZm9yIGZpbGUgbWV0YWRhdGFcclxuICAgIC8vIEZvciBub3csIHJldHVybiBtb2NrIGRhdGFcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6ICdleGFtcGxlLmMnLFxyXG4gICAgICBmaWxlU2l6ZTogMTAyNCxcclxuICAgICAgY29udGVudFR5cGU6ICd0ZXh0L3gtYycsXHJcbiAgICAgIHVwbG9hZGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgc3RhdHVzOiAndXBsb2FkZWQnLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGEgaGFzaCBmb3IgZmlsZSB0cmFja2luZyBhbmQgaW50ZWdyaXR5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBnZW5lcmF0ZUZpbGVIYXNoKGZpbGVOYW1lOiBzdHJpbmcsIHVzZXJJZDogc3RyaW5nLCB0aW1lc3RhbXA6IG51bWJlcik6IHN0cmluZyB7XHJcbiAgICBjb25zdCBkYXRhID0gYCR7ZmlsZU5hbWV9LSR7dXNlcklkfS0ke3RpbWVzdGFtcH1gO1xyXG4gICAgcmV0dXJuIGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoZGF0YSkuZGlnZXN0KCdoZXgnKS5zdWJzdHJpbmcoMCwgMTYpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmVyaWZ5IGZpbGUgZXhpc3RzIGluIFMzXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5RmlsZUV4aXN0cyhzM0tleTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEhlYWRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICB9KTtcclxuICAgICAgYXdhaXQgdGhpcy5zM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBmaWxlIHNpemUgbGltaXQgYmFzZWQgb24gZmlsZSB0eXBlXHJcbiAgICovXHJcbiAgZ2V0TWF4RmlsZVNpemVGb3JUeXBlKGZpbGVUeXBlOiBzdHJpbmcpOiBudW1iZXIge1xyXG4gICAgLy8gRGlmZmVyZW50IGxpbWl0cyBmb3IgZGlmZmVyZW50IGZpbGUgdHlwZXNcclxuICAgIGNvbnN0IGxpbWl0czogUmVjb3JkPHN0cmluZywgbnVtYmVyPiA9IHtcclxuICAgICAgJ0MnOiAxMCAqIDEwMjQgKiAxMDI0LCAgICAgIC8vIDEwTUIgZm9yIEMgZmlsZXNcclxuICAgICAgJ0NQUCc6IDEwICogMTAyNCAqIDEwMjQsICAgIC8vIDEwTUIgZm9yIEMrKyBmaWxlc1xyXG4gICAgICAnSEVBREVSJzogNSAqIDEwMjQgKiAxMDI0LCAgLy8gNU1CIGZvciBoZWFkZXIgZmlsZXNcclxuICAgIH07XHJcbiAgICByZXR1cm4gbGltaXRzW2ZpbGVUeXBlXSB8fCB0aGlzLm1heEZpbGVTaXplO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgZmlsZSBleHRlbnNpb24gbWF0Y2hlcyBjb250ZW50IHR5cGVcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlQ29udGVudFR5cGVNYXRjaChmaWxlTmFtZTogc3RyaW5nLCBjb250ZW50VHlwZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICBjb25zdCBleHRlbnNpb24gPSB0aGlzLmdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWUpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBjb25zdCB2YWxpZE1hcHBpbmdzOiBSZWNvcmQ8c3RyaW5nLCBzdHJpbmdbXT4gPSB7XHJcbiAgICAgICcuYyc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5jcHAnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMrKycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5jYyc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYysrJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmN4eCc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYysrJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmgnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuaHBwJzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuaHh4JzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IHZhbGlkVHlwZXMgPSB2YWxpZE1hcHBpbmdzW2V4dGVuc2lvbl07XHJcbiAgICByZXR1cm4gdmFsaWRUeXBlcyA/IHZhbGlkVHlwZXMuaW5jbHVkZXMoY29udGVudFR5cGUpIDogZmFsc2U7XHJcbiAgfVxyXG59Il19