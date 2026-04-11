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
                s3Key,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXFHO0FBQ3JHLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUFDcEMsK0NBQWlDO0FBd0JqQyxNQUFhLGlCQUFpQjtJQUNwQixRQUFRLENBQVc7SUFDbkIsVUFBVSxDQUFTO0lBQ25CLFdBQVcsR0FBVyxFQUFFLEdBQUcsSUFBSSxHQUFHLElBQUksQ0FBQyxDQUFDLE9BQU87SUFDL0MsaUJBQWlCLEdBQWEsQ0FBQyxJQUFJLEVBQUUsTUFBTSxFQUFFLEtBQUssRUFBRSxNQUFNLEVBQUUsSUFBSSxFQUFFLE1BQU0sRUFBRSxNQUFNLENBQUMsQ0FBQztJQUNsRixtQkFBbUIsR0FBYTtRQUN0QyxZQUFZO1FBQ1osVUFBVTtRQUNWLFlBQVk7UUFDWiwwQkFBMEI7S0FDM0IsQ0FBQztJQUVGO1FBQ0UsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQixDQUFDO1FBRXJGLHVCQUF1QjtRQUN2QixJQUFJLENBQUMsUUFBUSxHQUFHLElBQUksb0JBQVEsQ0FBQztZQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQsS0FBSyxDQUFDLDBCQUEwQixDQUFDLE9BQTBCO1FBQ3pELGdCQUFnQjtRQUNoQixNQUFNLFVBQVUsR0FBRyxJQUFJLENBQUMsWUFBWSxDQUFDLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsV0FBVyxDQUFDLENBQUM7UUFDOUYsSUFBSSxDQUFDLFVBQVUsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixNQUFNLElBQUks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V0FBVyxDQUFDLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQztJQUMvRCxDQUFDO0NBQ0Y7QUEvTkQsOENBK05DIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgUzNDbGllbnQsIFB1dE9iamVjdENvbW1hbmQsIEdldE9iamVjdENvbW1hbmQsIEhlYWRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgZ2V0U2lnbmVkVXJsIH0gZnJvbSAnQGF3cy1zZGsvczMtcmVxdWVzdC1wcmVzaWduZXInO1xyXG5pbXBvcnQgeyB2NCBhcyB1dWlkdjQgfSBmcm9tICd1dWlkJztcclxuaW1wb3J0ICogYXMgY3J5cHRvIGZyb20gJ2NyeXB0byc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVVcGxvYWRSZXF1ZXN0IHtcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgY29udGVudFR5cGU6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVVcGxvYWRSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICB1cGxvYWRVcmw6IHN0cmluZztcclxuICBkb3dubG9hZFVybDogc3RyaW5nO1xyXG4gIGV4cGlyZXNJbjogbnVtYmVyO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICBpc1ZhbGlkOiBib29sZWFuO1xyXG4gIGVycm9yczogc3RyaW5nW107XHJcbiAgZmlsZVR5cGU6ICdDJyB8ICdDUFAnIHwgJ0hFQURFUicgfCAnVU5LTk9XTic7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlVXBsb2FkU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzM0NsaWVudDogUzNDbGllbnQ7XHJcbiAgcHJpdmF0ZSBidWNrZXROYW1lOiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBtYXhGaWxlU2l6ZTogbnVtYmVyID0gNTAgKiAxMDI0ICogMTAyNDsgLy8gNTBNQlxyXG4gIHByaXZhdGUgYWxsb3dlZEV4dGVuc2lvbnM6IHN0cmluZ1tdID0gWycuYycsICcuY3BwJywgJy5jYycsICcuY3h4JywgJy5oJywgJy5ocHAnLCAnLmh4eCddO1xyXG4gIHByaXZhdGUgYWxsb3dlZENvbnRlbnRUeXBlczogc3RyaW5nW10gPSBbXHJcbiAgICAndGV4dC9wbGFpbicsXHJcbiAgICAndGV4dC94LWMnLFxyXG4gICAgJ3RleHQveC1jKysnLFxyXG4gICAgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSdcclxuICBdO1xyXG5cclxuICBjb25zdHJ1Y3RvcigpIHtcclxuICAgIHRoaXMuYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0tZmlsZXMtZGV2JztcclxuICAgIFxyXG4gICAgLy8gSW5pdGlhbGl6ZSBTMyBjbGllbnRcclxuICAgIHRoaXMuczNDbGllbnQgPSBuZXcgUzNDbGllbnQoe1xyXG4gICAgICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIGFzeW5jIGdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKHJlcXVlc3Q6IEZpbGVVcGxvYWRSZXF1ZXN0KTogUHJvbWlzZTxGaWxlVXBsb2FkUmVzcG9uc2U+IHtcclxuICAgIC8vIFZhbGlkYXRlIGZpbGVcclxuICAgIGNvbnN0IHZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlRmlsZShyZXF1ZXN0LmZpbGVOYW1lLCByZXF1ZXN0LmZpbGVTaXplLCByZXF1ZXN0LmNvbnRlbnRUeXBlKTtcclxuICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSB2YWxpZGF0aW9uIGZhaWxlZDogJHt2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBmaWxlIElEIGFuZCBTMyBrZXlcclxuICAgIGNvbnN0IGZpbGVJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHNhbml0aXplZEZpbGVOYW1lID0gdGhpcy5zYW5pdGl6ZUZpbGVOYW1lKHJlcXVlc3QuZmlsZU5hbWUpO1xyXG4gICAgY29uc3QgZmlsZUhhc2ggPSB0aGlzLmdlbmVyYXRlRmlsZUhhc2gocmVxdWVzdC5maWxlTmFtZSwgcmVxdWVzdC51c2VySWQsIHRpbWVzdGFtcCk7XHJcbiAgICBjb25zdCBzM0tleSA9IGB1cGxvYWRzLyR7cmVxdWVzdC5vcmdhbml6YXRpb25JZH0vJHtyZXF1ZXN0LnVzZXJJZH0vJHt0aW1lc3RhbXB9LSR7ZmlsZUlkfS0ke3Nhbml0aXplZEZpbGVOYW1lfWA7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCBmb3IgdXBsb2FkXHJcbiAgICAgIGNvbnN0IHB1dENvbW1hbmQgPSBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgICBDb250ZW50VHlwZTogcmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICAgJ29yaWdpbmFsLWZpbGVuYW1lJzogcmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICAgICd1c2VyLWlkJzogcmVxdWVzdC51c2VySWQsXHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uLWlkJzogcmVxdWVzdC5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgICdmaWxlLWlkJzogZmlsZUlkLFxyXG4gICAgICAgICAgJ3VwbG9hZC10aW1lc3RhbXAnOiB0aW1lc3RhbXAudG9TdHJpbmcoKSxcclxuICAgICAgICAgICdmaWxlLWhhc2gnOiBmaWxlSGFzaCxcclxuICAgICAgICAgICdmaWxlLXR5cGUnOiB2YWxpZGF0aW9uLmZpbGVUeXBlXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybCh0aGlzLnMzQ2xpZW50LCBwdXRDb21tYW5kLCB7XHJcbiAgICAgICAgZXhwaXJlc0luOiAzNjAwLCAvLyAxIGhvdXJcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciBkb3dubG9hZFxyXG4gICAgICBjb25zdCBnZXRDb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgUmVzcG9uc2VDb250ZW50RGlzcG9zaXRpb246IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7c2FuaXRpemVkRmlsZU5hbWV9XCJgLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHRoaXMuczNDbGllbnQsIGdldENvbW1hbmQsIHtcclxuICAgICAgICBleHBpcmVzSW46IDM2MDAsIC8vIDEgaG91clxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHMzS2V5LFxyXG4gICAgICAgIHVwbG9hZFVybCxcclxuICAgICAgICBkb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IDM2MDAsXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZW5lcmF0aW5nIHByZXNpZ25lZCBVUkxzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgdXBsb2FkIFVSTCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgdmFsaWRhdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGZpbGVTaXplOiBudW1iZXIsIGNvbnRlbnRUeXBlOiBzdHJpbmcpOiBGaWxlVmFsaWRhdGlvblJlc3VsdCB7XHJcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBsZXQgZmlsZVR5cGU6ICdDJyB8ICdDUFAnIHwgJ0hFQURFUicgfCAnVU5LTk9XTicgPSAnVU5LTk9XTic7XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZSBzaXplXHJcbiAgICBpZiAoZmlsZVNpemUgPiB0aGlzLm1heEZpbGVTaXplKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBGaWxlIHNpemUgJHtmaWxlU2l6ZX0gYnl0ZXMgZXhjZWVkcyBtYXhpbXVtIGFsbG93ZWQgc2l6ZSBvZiAke3RoaXMubWF4RmlsZVNpemV9IGJ5dGVzYCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbGVTaXplIDw9IDApIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGUgc2l6ZSBtdXN0IGJlIGdyZWF0ZXIgdGhhbiAwJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZSBleHRlbnNpb25cclxuICAgIGNvbnN0IGV4dGVuc2lvbiA9IHRoaXMuZ2V0RmlsZUV4dGVuc2lvbihmaWxlTmFtZSkudG9Mb3dlckNhc2UoKTtcclxuICAgIGlmICghdGhpcy5hbGxvd2VkRXh0ZW5zaW9ucy5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBGaWxlIGV4dGVuc2lvbiAnJHtleHRlbnNpb259JyBpcyBub3QgYWxsb3dlZC4gQWxsb3dlZCBleHRlbnNpb25zOiAke3RoaXMuYWxsb3dlZEV4dGVuc2lvbnMuam9pbignLCAnKX1gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIERldGVybWluZSBmaWxlIHR5cGUgYmFzZWQgb24gZXh0ZW5zaW9uXHJcbiAgICAgIGlmIChbJy5jJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ0MnO1xyXG4gICAgICB9IGVsc2UgaWYgKFsnLmNwcCcsICcuY2MnLCAnLmN4eCddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgICBmaWxlVHlwZSA9ICdDUFAnO1xyXG4gICAgICB9IGVsc2UgaWYgKFsnLmgnLCAnLmhwcCcsICcuaHh4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ0hFQURFUic7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBjb250ZW50IHR5cGVcclxuICAgIGlmICghdGhpcy5hbGxvd2VkQ29udGVudFR5cGVzLmluY2x1ZGVzKGNvbnRlbnRUeXBlKSkge1xyXG4gICAgICBlcnJvcnMucHVzaChgQ29udGVudCB0eXBlICcke2NvbnRlbnRUeXBlfScgaXMgbm90IGFsbG93ZWQuIEFsbG93ZWQgdHlwZXM6ICR7dGhpcy5hbGxvd2VkQ29udGVudFR5cGVzLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZW5hbWUgZm9yIHNlY3VyaXR5XHJcbiAgICBpZiAodGhpcy5jb250YWluc1Vuc2FmZUNoYXJhY3RlcnMoZmlsZU5hbWUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKCdGaWxlbmFtZSBjb250YWlucyB1bnNhZmUgY2hhcmFjdGVycycpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChmaWxlTmFtZS5sZW5ndGggPiAyNTUpIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGVuYW1lIGlzIHRvbyBsb25nIChtYXhpbXVtIDI1NSBjaGFyYWN0ZXJzKScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXHJcbiAgICAgIGVycm9ycyxcclxuICAgICAgZmlsZVR5cGUsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBnZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgbGFzdERvdEluZGV4ID0gZmlsZU5hbWUubGFzdEluZGV4T2YoJy4nKTtcclxuICAgIHJldHVybiBsYXN0RG90SW5kZXggPT09IC0xID8gJycgOiBmaWxlTmFtZS5zdWJzdHJpbmcobGFzdERvdEluZGV4KTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2FuaXRpemVGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIFJlbW92ZSBvciByZXBsYWNlIHVuc2FmZSBjaGFyYWN0ZXJzXHJcbiAgICByZXR1cm4gZmlsZU5hbWVcclxuICAgICAgLnJlcGxhY2UoL1teYS16QS1aMC05Ll8tXS9nLCAnXycpIC8vIFJlcGxhY2UgdW5zYWZlIGNoYXJzIHdpdGggdW5kZXJzY29yZVxyXG4gICAgICAucmVwbGFjZSgvX3syLH0vZywgJ18nKSAvLyBSZXBsYWNlIG11bHRpcGxlIHVuZGVyc2NvcmVzIHdpdGggc2luZ2xlXHJcbiAgICAgIC5yZXBsYWNlKC9eXyt8XyskL2csICcnKSAvLyBSZW1vdmUgbGVhZGluZy90cmFpbGluZyB1bmRlcnNjb3Jlc1xyXG4gICAgICAuc3Vic3RyaW5nKDAsIDI1NSk7IC8vIExpbWl0IGxlbmd0aFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb250YWluc1Vuc2FmZUNoYXJhY3RlcnMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gQ2hlY2sgZm9yIHBhdGggdHJhdmVyc2FsIGFuZCBvdGhlciB1bnNhZmUgcGF0dGVybnNcclxuICAgIGNvbnN0IHVuc2FmZVBhdHRlcm5zID0gW1xyXG4gICAgICAvXFwuXFwuLywgICAgICAgICAgIC8vIFBhdGggdHJhdmVyc2FsXHJcbiAgICAgIC9bPD46XCJ8PypdLywgICAgICAvLyBXaW5kb3dzIHJlc2VydmVkIGNoYXJhY3RlcnNcclxuICAgICAgL1tcXHgwMC1cXHgxZl0vLCAgICAvLyBDb250cm9sIGNoYXJhY3RlcnNcclxuICAgICAgL14oQ09OfFBSTnxBVVh8TlVMfENPTVsxLTldfExQVFsxLTldKSQvaSwgLy8gV2luZG93cyByZXNlcnZlZCBuYW1lc1xyXG4gICAgXTtcclxuXHJcbiAgICByZXR1cm4gdW5zYWZlUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdChmaWxlTmFtZSkpO1xyXG4gIH1cclxuXHJcbiAgYXN5bmMgZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZDogc3RyaW5nKTogUHJvbWlzZTxhbnk+IHtcclxuICAgIC8vIFRoaXMgd291bGQgdHlwaWNhbGx5IHF1ZXJ5IER5bmFtb0RCIGZvciBmaWxlIG1ldGFkYXRhXHJcbiAgICAvLyBGb3Igbm93LCByZXR1cm4gbW9jayBkYXRhXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGZpbGVOYW1lOiAnZXhhbXBsZS5jJyxcclxuICAgICAgZmlsZVNpemU6IDEwMjQsXHJcbiAgICAgIGNvbnRlbnRUeXBlOiAndGV4dC94LWMnLFxyXG4gICAgICB1cGxvYWRlZEF0OiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIHN0YXR1czogJ3VwbG9hZGVkJyxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBhIGhhc2ggZm9yIGZpbGUgdHJhY2tpbmcgYW5kIGludGVncml0eVxyXG4gICAqL1xyXG4gIHByaXZhdGUgZ2VuZXJhdGVGaWxlSGFzaChmaWxlTmFtZTogc3RyaW5nLCB1c2VySWQ6IHN0cmluZywgdGltZXN0YW1wOiBudW1iZXIpOiBzdHJpbmcge1xyXG4gICAgY29uc3QgZGF0YSA9IGAke2ZpbGVOYW1lfS0ke3VzZXJJZH0tJHt0aW1lc3RhbXB9YDtcclxuICAgIHJldHVybiBjcnlwdG8uY3JlYXRlSGFzaCgnc2hhMjU2JykudXBkYXRlKGRhdGEpLmRpZ2VzdCgnaGV4Jykuc3Vic3RyaW5nKDAsIDE2KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZlcmlmeSBmaWxlIGV4aXN0cyBpbiBTM1xyXG4gICAqL1xyXG4gIGFzeW5jIHZlcmlmeUZpbGVFeGlzdHMoczNLZXk6IHN0cmluZyk6IFByb21pc2U8Ym9vbGVhbj4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBIZWFkT2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgfSk7XHJcbiAgICAgIGF3YWl0IHRoaXMuczNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgICAgcmV0dXJuIHRydWU7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4gZmFsc2U7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZXQgZmlsZSBzaXplIGxpbWl0IGJhc2VkIG9uIGZpbGUgdHlwZVxyXG4gICAqL1xyXG4gIGdldE1heEZpbGVTaXplRm9yVHlwZShmaWxlVHlwZTogc3RyaW5nKTogbnVtYmVyIHtcclxuICAgIC8vIERpZmZlcmVudCBsaW1pdHMgZm9yIGRpZmZlcmVudCBmaWxlIHR5cGVzXHJcbiAgICBjb25zdCBsaW1pdHM6IFJlY29yZDxzdHJpbmcsIG51bWJlcj4gPSB7XHJcbiAgICAgICdDJzogMTAgKiAxMDI0ICogMTAyNCwgICAgICAvLyAxME1CIGZvciBDIGZpbGVzXHJcbiAgICAgICdDUFAnOiAxMCAqIDEwMjQgKiAxMDI0LCAgICAvLyAxME1CIGZvciBDKysgZmlsZXNcclxuICAgICAgJ0hFQURFUic6IDUgKiAxMDI0ICogMTAyNCwgIC8vIDVNQiBmb3IgaGVhZGVyIGZpbGVzXHJcbiAgICB9O1xyXG4gICAgcmV0dXJuIGxpbWl0c1tmaWxlVHlwZV0gfHwgdGhpcy5tYXhGaWxlU2l6ZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIGZpbGUgZXh0ZW5zaW9uIG1hdGNoZXMgY29udGVudCB0eXBlXHJcbiAgICovXHJcbiAgcHJpdmF0ZSB2YWxpZGF0ZUNvbnRlbnRUeXBlTWF0Y2goZmlsZU5hbWU6IHN0cmluZywgY29udGVudFR5cGU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgY29uc3QgZXh0ZW5zaW9uID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgY29uc3QgdmFsaWRNYXBwaW5nczogUmVjb3JkPHN0cmluZywgc3RyaW5nW10+ID0ge1xyXG4gICAgICAnLmMnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuY3BwJzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jKysnLCAnYXBwbGljYXRpb24vb2N0ZXQtc3RyZWFtJ10sXHJcbiAgICAgICcuY2MnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMrKycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5jeHgnOiBbJ3RleHQvcGxhaW4nLCAndGV4dC94LWMrKycsICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXSxcclxuICAgICAgJy5oJzogWyd0ZXh0L3BsYWluJywgJ3RleHQveC1jJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmhwcCc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYysrJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgICAnLmh4eCc6IFsndGV4dC9wbGFpbicsICd0ZXh0L3gtYysrJywgJ2FwcGxpY2F0aW9uL29jdGV0LXN0cmVhbSddLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zdCB2YWxpZFR5cGVzID0gdmFsaWRNYXBwaW5nc1tleHRlbnNpb25dO1xyXG4gICAgcmV0dXJuIHZhbGlkVHlwZXMgPyB2YWxpZFR5cGVzLmluY2x1ZGVzKGNvbnRlbnRUeXBlKSA6IGZhbHNlO1xyXG4gIH1cclxufSJdfQ==