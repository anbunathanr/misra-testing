"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileUploadService = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const s3_request_presigner_1 = require("@aws-sdk/s3-request-presigner");
const uuid_1 = require("uuid");
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
        // Mock S3 client for development
        this.s3Client = {};
        this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
        // In production, initialize real S3 client
        if (process.env.NODE_ENV === 'production') {
            this.s3Client = new client_s3_1.S3Client({
                region: process.env.AWS_REGION || 'us-east-1',
            });
        }
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
        const s3Key = `uploads/${request.organizationId}/${request.userId}/${timestamp}-${fileId}-${sanitizedFileName}`;
        // For development, return mock URLs
        if (process.env.NODE_ENV !== 'production') {
            return {
                fileId,
                uploadUrl: `https://mock-s3-upload-url.com/${s3Key}`,
                downloadUrl: `https://mock-s3-download-url.com/${s3Key}`,
                expiresIn: 3600, // 1 hour
            };
        }
        try {
            // Generate presigned URL for upload
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: request.contentType,
                ContentLength: request.fileSize,
                Metadata: {
                    'original-filename': request.fileName,
                    'user-id': request.userId,
                    'organization-id': request.organizationId,
                    'file-id': fileId,
                    'upload-timestamp': timestamp.toString(),
                },
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, putCommand, {
                expiresIn: 3600, // 1 hour
            });
            // Generate presigned URL for download
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
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
}
exports.FileUploadService = FileUploadService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQUEsa0RBQWtGO0FBQ2xGLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUE4QnBDLE1BQWEsaUJBQWlCO0lBQ3BCLFFBQVEsQ0FBVztJQUNuQixVQUFVLENBQVM7SUFDbkIsV0FBVyxHQUFXLEVBQUUsR0FBRyxJQUFJLEdBQUcsSUFBSSxDQUFDLENBQUMsT0FBTztJQUMvQyxpQkFBaUIsR0FBYSxDQUFDLElBQUksRUFBRSxNQUFNLEVBQUUsS0FBSyxFQUFFLE1BQU0sRUFBRSxJQUFJLEVBQUUsTUFBTSxFQUFFLE1BQU0sQ0FBQyxDQUFDO0lBQ2xGLG1CQUFtQixHQUFhO1FBQ3RDLFlBQVk7UUFDWixVQUFVO1FBQ1YsWUFBWTtRQUNaLDBCQUEwQjtLQUMzQixDQUFDO0lBRUY7UUFDRSxpQ0FBaUM7UUFDakMsSUFBSSxDQUFDLFFBQVEsR0FBRyxFQUFjLENBQUM7UUFDL0IsSUFBSSxDQUFDLFVBQVUsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLDBCQUEwQixDQUFDO1FBRXJGLDJDQUEyQztRQUMzQyxJQUFJLE9BQU8sQ0FBQyxHQUFHLENBQUMsUUFBUSxLQUFLLFlBQVksRUFBRSxDQUFDO1lBQzFDLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDO2dCQUMzQixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVzthQUM5QyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztJQUVELEtBQUssQ0FBQywwQkFBMEIsQ0FBQyxPQUEwQjtRQUN6RCxnQkFBZ0I7UUFDaEIsTUFBTSxVQUFVLEdBQUcsSUFBSSxDQUFDLFlBQVksQ0FBQyxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxRQUFRLEVBQUUsT0FBTyxDQUFDLFdB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QUFpQjtZQUNuQyxXQUFXLEVBQU8sOEJBQThCO1lBQ2hELGFBQWEsRUFBSyxxQkFBcUI7WUFDdkMsd0NBQXdDLEVBQUUseUJBQXlCO1NBQ3BFLENBQUM7UUFFRixPQUFPLGNBQWMsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLEVBQUUsQ0FBQyxPQUFPLENBQUMsSUFBSSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDaEUsQ0FBQztJQUVELEtBQUssQ0FBQyxlQUFlLENBQUMsTUFBYztRQUNsQyx3REFBd0Q7UUFDeEQsNEJBQTRCO1FBQzVCLE9BQU87WUFDTCxNQUFNO1lBQ04sUUFBUSxFQUFFLFdBQVc7WUFDckIsUUFBUSxFQUFFLElBQUk7WUFDZCxXQUFXLEVBQUUsVUFBVTtZQUN2QixVQUFVLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7WUFDcEMsTUFBTSxFQUFFLFVBQVU7U0FDbkIsQ0FBQztJQUNKLENBQUM7Q0FDRjtBQWpMRCw4Q0FpTEMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCwgR2V0T2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcblxyXG4vLyBNb2NrIEFXUyBTREsgZm9yIGRldmVsb3BtZW50XHJcbmRlY2xhcmUgY29uc3QgcHJvY2Vzczoge1xyXG4gIGVudjoge1xyXG4gICAgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgdW5kZWZpbmVkO1xyXG4gIH07XHJcbn07XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVVcGxvYWRSZXF1ZXN0IHtcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgY29udGVudFR5cGU6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nO1xyXG4gIHVzZXJJZDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVVcGxvYWRSZXNwb25zZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XHJcbiAgZG93bmxvYWRVcmw6IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVmFsaWRhdGlvblJlc3VsdCB7XHJcbiAgaXNWYWxpZDogYm9vbGVhbjtcclxuICBlcnJvcnM6IHN0cmluZ1tdO1xyXG4gIGZpbGVUeXBlOiAnQycgfCAnQ1BQJyB8ICdIRUFERVInIHwgJ1VOS05PV04nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZVVwbG9hZFNlcnZpY2Uge1xyXG4gIHByaXZhdGUgczNDbGllbnQ6IFMzQ2xpZW50O1xyXG4gIHByaXZhdGUgYnVja2V0TmFtZTogc3RyaW5nO1xyXG4gIHByaXZhdGUgbWF4RmlsZVNpemU6IG51bWJlciA9IDUwICogMTAyNCAqIDEwMjQ7IC8vIDUwTUJcclxuICBwcml2YXRlIGFsbG93ZWRFeHRlbnNpb25zOiBzdHJpbmdbXSA9IFsnLmMnLCAnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaCcsICcuaHBwJywgJy5oeHgnXTtcclxuICBwcml2YXRlIGFsbG93ZWRDb250ZW50VHlwZXM6IHN0cmluZ1tdID0gW1xyXG4gICAgJ3RleHQvcGxhaW4nLFxyXG4gICAgJ3RleHQveC1jJyxcclxuICAgICd0ZXh0L3gtYysrJyxcclxuICAgICdhcHBsaWNhdGlvbi9vY3RldC1zdHJlYW0nXHJcbiAgXTtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICAvLyBNb2NrIFMzIGNsaWVudCBmb3IgZGV2ZWxvcG1lbnRcclxuICAgIHRoaXMuczNDbGllbnQgPSB7fSBhcyBTM0NsaWVudDtcclxuICAgIHRoaXMuYnVja2V0TmFtZSA9IHByb2Nlc3MuZW52LkZJTEVfU1RPUkFHRV9CVUNLRVRfTkFNRSB8fCAnbWlzcmEtcGxhdGZvcm0tZmlsZXMtZGV2JztcclxuICAgIFxyXG4gICAgLy8gSW4gcHJvZHVjdGlvbiwgaW5pdGlhbGl6ZSByZWFsIFMzIGNsaWVudFxyXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WID09PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgdGhpcy5zM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIGFzeW5jIGdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKHJlcXVlc3Q6IEZpbGVVcGxvYWRSZXF1ZXN0KTogUHJvbWlzZTxGaWxlVXBsb2FkUmVzcG9uc2U+IHtcclxuICAgIC8vIFZhbGlkYXRlIGZpbGVcclxuICAgIGNvbnN0IHZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlRmlsZShyZXF1ZXN0LmZpbGVOYW1lLCByZXF1ZXN0LmZpbGVTaXplLCByZXF1ZXN0LmNvbnRlbnRUeXBlKTtcclxuICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSB2YWxpZGF0aW9uIGZhaWxlZDogJHt2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBmaWxlIElEIGFuZCBTMyBrZXlcclxuICAgIGNvbnN0IGZpbGVJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3QgdGltZXN0YW1wID0gRGF0ZS5ub3coKTtcclxuICAgIGNvbnN0IHNhbml0aXplZEZpbGVOYW1lID0gdGhpcy5zYW5pdGl6ZUZpbGVOYW1lKHJlcXVlc3QuZmlsZU5hbWUpO1xyXG4gICAgY29uc3QgczNLZXkgPSBgdXBsb2Fkcy8ke3JlcXVlc3Qub3JnYW5pemF0aW9uSWR9LyR7cmVxdWVzdC51c2VySWR9LyR7dGltZXN0YW1wfS0ke2ZpbGVJZH0tJHtzYW5pdGl6ZWRGaWxlTmFtZX1gO1xyXG5cclxuICAgIC8vIEZvciBkZXZlbG9wbWVudCwgcmV0dXJuIG1vY2sgVVJMc1xyXG4gICAgaWYgKHByb2Nlc3MuZW52Lk5PREVfRU5WICE9PSAncHJvZHVjdGlvbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXBsb2FkVXJsOiBgaHR0cHM6Ly9tb2NrLXMzLXVwbG9hZC11cmwuY29tLyR7czNLZXl9YCxcclxuICAgICAgICBkb3dubG9hZFVybDogYGh0dHBzOi8vbW9jay1zMy1kb3dubG9hZC11cmwuY29tLyR7czNLZXl9YCxcclxuICAgICAgICBleHBpcmVzSW46IDM2MDAsIC8vIDEgaG91clxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCBVUkwgZm9yIHVwbG9hZFxyXG4gICAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgQ29udGVudFR5cGU6IHJlcXVlc3QuY29udGVudFR5cGUsXHJcbiAgICAgICAgQ29udGVudExlbmd0aDogcmVxdWVzdC5maWxlU2l6ZSxcclxuICAgICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICAgJ29yaWdpbmFsLWZpbGVuYW1lJzogcmVxdWVzdC5maWxlTmFtZSxcclxuICAgICAgICAgICd1c2VyLWlkJzogcmVxdWVzdC51c2VySWQsXHJcbiAgICAgICAgICAnb3JnYW5pemF0aW9uLWlkJzogcmVxdWVzdC5vcmdhbml6YXRpb25JZCxcclxuICAgICAgICAgICdmaWxlLWlkJzogZmlsZUlkLFxyXG4gICAgICAgICAgJ3VwbG9hZC10aW1lc3RhbXAnOiB0aW1lc3RhbXAudG9TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybCh0aGlzLnMzQ2xpZW50LCBwdXRDb21tYW5kLCB7XHJcbiAgICAgICAgZXhwaXJlc0luOiAzNjAwLCAvLyAxIGhvdXJcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciBkb3dubG9hZFxyXG4gICAgICBjb25zdCBnZXRDb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgZ2V0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMCwgLy8gMSBob3VyXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgdXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsLFxyXG4gICAgICAgIGV4cGlyZXNJbjogMzYwMCxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdlbmVyYXRpbmcgcHJlc2lnbmVkIFVSTHM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSB1cGxvYWQgVVJMJyk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICB2YWxpZGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgZmlsZVNpemU6IG51bWJlciwgY29udGVudFR5cGU6IHN0cmluZyk6IEZpbGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuICAgIGxldCBmaWxlVHlwZTogJ0MnIHwgJ0NQUCcgfCAnSEVBREVSJyB8ICdVTktOT1dOJyA9ICdVTktOT1dOJztcclxuXHJcbiAgICAvLyBDaGVjayBmaWxlIHNpemVcclxuICAgIGlmIChmaWxlU2l6ZSA+IHRoaXMubWF4RmlsZVNpemUpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYEZpbGUgc2l6ZSAke2ZpbGVTaXplfSBieXRlcyBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mICR7dGhpcy5tYXhGaWxlU2l6ZX0gYnl0ZXNgKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsZVNpemUgPD0gMCkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZSBzaXplIG11c3QgYmUgZ3JlYXRlciB0aGFuIDAnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmaWxlIGV4dGVuc2lvblxyXG4gICAgY29uc3QgZXh0ZW5zaW9uID0gdGhpcy5nZXRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgaWYgKCF0aGlzLmFsbG93ZWRFeHRlbnNpb25zLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYEZpbGUgZXh0ZW5zaW9uICcke2V4dGVuc2lvbn0nIGlzIG5vdCBhbGxvd2VkLiBBbGxvd2VkIGV4dGVuc2lvbnM6ICR7dGhpcy5hbGxvd2VkRXh0ZW5zaW9ucy5qb2luKCcsICcpfWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gRGV0ZXJtaW5lIGZpbGUgdHlwZSBiYXNlZCBvbiBleHRlbnNpb25cclxuICAgICAgaWYgKFsnLmMnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnQyc7XHJcbiAgICAgIH0gZWxzZSBpZiAoWycuY3BwJywgJy5jYycsICcuY3h4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ0NQUCc7XHJcbiAgICAgIH0gZWxzZSBpZiAoWycuaCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnSEVBREVSJztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGNvbnRlbnQgdHlwZVxyXG4gICAgaWYgKCF0aGlzLmFsbG93ZWRDb250ZW50VHlwZXMuaW5jbHVkZXMoY29udGVudFR5cGUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBDb250ZW50IHR5cGUgJyR7Y29udGVudFR5cGV9JyBpcyBub3QgYWxsb3dlZC4gQWxsb3dlZCB0eXBlczogJHt0aGlzLmFsbG93ZWRDb250ZW50VHlwZXMuam9pbignLCAnKX1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmaWxlbmFtZSBmb3Igc2VjdXJpdHlcclxuICAgIGlmICh0aGlzLmNvbnRhaW5zVW5zYWZlQ2hhcmFjdGVycyhmaWxlTmFtZSkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGVuYW1lIGNvbnRhaW5zIHVuc2FmZSBjaGFyYWN0ZXJzJyk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbGVOYW1lLmxlbmd0aCA+IDI1NSkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZW5hbWUgaXMgdG9vIGxvbmcgKG1heGltdW0gMjU1IGNoYXJhY3RlcnMpJyk7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgaXNWYWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgZXJyb3JzLFxyXG4gICAgICBmaWxlVHlwZSxcclxuICAgIH07XHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGdldEZpbGVFeHRlbnNpb24oZmlsZU5hbWU6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICBjb25zdCBsYXN0RG90SW5kZXggPSBmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpO1xyXG4gICAgcmV0dXJuIGxhc3REb3RJbmRleCA9PT0gLTEgPyAnJyA6IGZpbGVOYW1lLnN1YnN0cmluZyhsYXN0RG90SW5kZXgpO1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzYW5pdGl6ZUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgLy8gUmVtb3ZlIG9yIHJlcGxhY2UgdW5zYWZlIGNoYXJhY3RlcnNcclxuICAgIHJldHVybiBmaWxlTmFtZVxyXG4gICAgICAucmVwbGFjZSgvW15hLXpBLVowLTkuXy1dL2csICdfJykgLy8gUmVwbGFjZSB1bnNhZmUgY2hhcnMgd2l0aCB1bmRlcnNjb3JlXHJcbiAgICAgIC5yZXBsYWNlKC9fezIsfS9nLCAnXycpIC8vIFJlcGxhY2UgbXVsdGlwbGUgdW5kZXJzY29yZXMgd2l0aCBzaW5nbGVcclxuICAgICAgLnJlcGxhY2UoL15fK3xfKyQvZywgJycpIC8vIFJlbW92ZSBsZWFkaW5nL3RyYWlsaW5nIHVuZGVyc2NvcmVzXHJcbiAgICAgIC5zdWJzdHJpbmcoMCwgMjU1KTsgLy8gTGltaXQgbGVuZ3RoXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnRhaW5zVW5zYWZlQ2hhcmFjdGVycyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBDaGVjayBmb3IgcGF0aCB0cmF2ZXJzYWwgYW5kIG90aGVyIHVuc2FmZSBwYXR0ZXJuc1xyXG4gICAgY29uc3QgdW5zYWZlUGF0dGVybnMgPSBbXHJcbiAgICAgIC9cXC5cXC4vLCAgICAgICAgICAgLy8gUGF0aCB0cmF2ZXJzYWxcclxuICAgICAgL1s8PjpcInw/Kl0vLCAgICAgIC8vIFdpbmRvd3MgcmVzZXJ2ZWQgY2hhcmFjdGVyc1xyXG4gICAgICAvW1xceDAwLVxceDFmXS8sICAgIC8vIENvbnRyb2wgY2hhcmFjdGVyc1xyXG4gICAgICAvXihDT058UFJOfEFVWHxOVUx8Q09NWzEtOV18TFBUWzEtOV0pJC9pLCAvLyBXaW5kb3dzIHJlc2VydmVkIG5hbWVzXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB1bnNhZmVQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KGZpbGVOYW1lKSk7XHJcbiAgfVxyXG5cclxuICBhc3luYyBnZXRGaWxlTWV0YWRhdGEoZmlsZUlkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gICAgLy8gVGhpcyB3b3VsZCB0eXBpY2FsbHkgcXVlcnkgRHluYW1vREIgZm9yIGZpbGUgbWV0YWRhdGFcclxuICAgIC8vIEZvciBub3csIHJldHVybiBtb2NrIGRhdGFcclxuICAgIHJldHVybiB7XHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgZmlsZU5hbWU6ICdleGFtcGxlLmMnLFxyXG4gICAgICBmaWxlU2l6ZTogMTAyNCxcclxuICAgICAgY29udGVudFR5cGU6ICd0ZXh0L3gtYycsXHJcbiAgICAgIHVwbG9hZGVkQXQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgc3RhdHVzOiAndXBsb2FkZWQnLFxyXG4gICAgfTtcclxuICB9XHJcbn0iXX0=