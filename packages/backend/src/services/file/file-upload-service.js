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
const s3_config_1 = require("../../config/s3-config");
class FileUploadService {
    s3Client;
    bucketName;
    constructor() {
        this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || s3_config_1.S3_CONFIG.bucketName;
        // Initialize S3 client
        this.s3Client = new client_s3_1.S3Client({
            region: process.env.AWS_REGION || s3_config_1.S3_CONFIG.region,
        });
    }
    /**
     * Generate presigned upload URL (spec requirement: presigned URL support for secure uploads)
     */
    async generatePresignedUploadUrl(request) {
        // Validate file
        const validation = this.validateFile(request.fileName, request.fileSize, request.contentType);
        if (!validation.isValid) {
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
        // Generate unique file ID and S3 key (spec requirement: userId/fileId folder structure)
        const fileId = (0, uuid_1.v4)();
        const sanitizedFileName = this.sanitizeFileName(request.fileName);
        const s3Key = (0, s3_config_1.getUserFileKey)(request.userId, fileId, sanitizedFileName);
        try {
            // Generate presigned URL for upload (spec requirement: 15-minute expiration for security)
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: request.contentType,
                ServerSideEncryption: 'aws:kms', // Use KMS encryption (spec requirement)
                Metadata: {
                    'original-filename': request.fileName,
                    'user-id': request.userId,
                    'file-id': fileId,
                    'upload-timestamp': Date.now().toString(),
                    'file-type': validation.fileType,
                    'language': validation.fileType,
                }
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, putCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('upload'), // 15 minutes for security
            });
            // Generate presigned URL for download
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
            });
            const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, getCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('download'), // 1 hour
            });
            return {
                fileId,
                s3Key,
                uploadUrl,
                downloadUrl,
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('upload'),
            };
        }
        catch (error) {
            console.error('Error generating presigned URLs:', error);
            throw new Error('Failed to generate upload URL');
        }
    }
    /**
     * Generate presigned URL for sample file upload
     */
    async generateSampleUploadUrl(sampleId, fileName, contentType) {
        // Validate file
        const validation = this.validateFile(fileName, 0, contentType); // Size validation skipped for samples
        if (!validation.isValid) {
            throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
        }
        const sanitizedFileName = this.sanitizeFileName(fileName);
        const s3Key = (0, s3_config_1.getSampleFileKey)(sampleId, sanitizedFileName);
        try {
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: contentType,
                ServerSideEncryption: 'aws:kms',
                Metadata: {
                    'sample-id': sampleId,
                    'original-filename': fileName,
                    'file-type': validation.fileType,
                    'language': validation.fileType,
                    'is-sample': 'true',
                }
            });
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, putCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('upload'),
            });
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
            });
            const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, getCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('download'),
            });
            return {
                fileId: sampleId,
                s3Key,
                uploadUrl,
                downloadUrl,
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('upload'),
            };
        }
        catch (error) {
            console.error('Error generating sample presigned URLs:', error);
            throw new Error('Failed to generate sample upload URL');
        }
    }
    /**
     * Validate file according to spec requirements
     */
    validateFile(fileName, fileSize, contentType) {
        const errors = [];
        let fileType = 'c';
        // Check file size (only for non-sample files)
        if (fileSize > 0 && !(0, s3_config_1.isValidFileSize)(fileSize, fileName)) {
            const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            const maxSize = s3_config_1.S3_CONFIG.maxFileSize.c; // Default to C file size
            errors.push(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes for ${extension} files`);
        }
        if (fileSize < 0) {
            errors.push('File size must be greater than or equal to 0');
        }
        // Check file extension (spec requirement: C/C++ files only)
        if (!(0, s3_config_1.isValidFileExtension)(fileName)) {
            errors.push(`File extension is not allowed. Allowed extensions: ${s3_config_1.S3_CONFIG.allowedExtensions.join(', ')}`);
        }
        else {
            // Determine file type based on extension (spec requirement: language detection)
            const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
            if (['.c', '.h'].includes(extension)) {
                fileType = 'c';
            }
            else if (['.cpp', '.cc', '.cxx', '.hpp', '.hxx'].includes(extension)) {
                fileType = 'cpp';
            }
        }
        // Check content type
        if (!s3_config_1.S3_CONFIG.allowedContentTypes.includes(contentType)) {
            errors.push(`Content type '${contentType}' is not allowed. Allowed types: ${s3_config_1.S3_CONFIG.allowedContentTypes.join(', ')}`);
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
     * Generate content hash for caching (spec requirement: analysis result caching)
     */
    generateContentHash(content) {
        return crypto.createHash('sha256').update(content).digest('hex');
    }
    /**
     * Get file content from S3
     */
    async getFileContent(s3Key) {
        try {
            const command = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
            });
            const response = await this.s3Client.send(command);
            const content = await response.Body?.transformToString();
            if (!content) {
                throw new Error('File content is empty');
            }
            return content;
        }
        catch (error) {
            console.error('Error getting file content:', error);
            throw new Error('Failed to retrieve file content');
        }
    }
    /**
     * Upload file content directly (for sample files and automatic uploads)
     */
    async uploadFileContent(s3Key, content, contentType, metadata = {}) {
        try {
            const command = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                Body: content,
                ContentType: contentType,
                ServerSideEncryption: 'aws:kms',
                Metadata: metadata,
            });
            await this.s3Client.send(command);
        }
        catch (error) {
            console.error('Error uploading file content:', error);
            throw new Error('Failed to upload file content');
        }
    }
}
exports.FileUploadService = FileUploadService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXFHO0FBQ3JHLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUFDcEMsK0NBQWlDO0FBQ2pDLHNEQUF1SjtBQXlCdkosTUFBYSxpQkFBaUI7SUFDcEIsUUFBUSxDQUFXO0lBQ25CLFVBQVUsQ0FBUztJQUUzQjtRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxxQkFBUyxDQUFDLFVBQVUsQ0FBQztRQUUvRSx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUM7WUFDM0IsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLHFCQUFTLENBQUMsTUFBTTtTQUNuRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsT0FBMEI7UUFDekQsZ0JBQWdCO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLE1BQU0sTUFBTSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMs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RCw4Q0E0UUMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBTM0NsaWVudCwgUHV0T2JqZWN0Q29tbWFuZCwgR2V0T2JqZWN0Q29tbWFuZCwgSGVhZE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBnZXRTaWduZWRVcmwgfSBmcm9tICdAYXdzLXNkay9zMy1yZXF1ZXN0LXByZXNpZ25lcic7XHJcbmltcG9ydCB7IHY0IGFzIHV1aWR2NCB9IGZyb20gJ3V1aWQnO1xyXG5pbXBvcnQgKiBhcyBjcnlwdG8gZnJvbSAnY3J5cHRvJztcclxuaW1wb3J0IHsgUzNfQ09ORklHLCBnZXRVc2VyRmlsZUtleSwgZ2V0U2FtcGxlRmlsZUtleSwgaXNWYWxpZEZpbGVFeHRlbnNpb24sIGlzVmFsaWRGaWxlU2l6ZSwgZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbiB9IGZyb20gJy4uLy4uL2NvbmZpZy9zMy1jb25maWcnO1xyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVxdWVzdCB7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBmaWxlU2l6ZTogbnVtYmVyO1xyXG4gIGNvbnRlbnRUeXBlOiBzdHJpbmc7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgbW9kZT86ICdtYW51YWwnIHwgJ3NhbXBsZSc7XHJcbiAgc2FtcGxlSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVVwbG9hZFJlc3BvbnNlIHtcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBzM0tleTogc3RyaW5nO1xyXG4gIHVwbG9hZFVybDogc3RyaW5nO1xyXG4gIGRvd25sb2FkVXJsOiBzdHJpbmc7XHJcbiAgZXhwaXJlc0luOiBudW1iZXI7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVZhbGlkYXRpb25SZXN1bHQge1xyXG4gIGlzVmFsaWQ6IGJvb2xlYW47XHJcbiAgZXJyb3JzOiBzdHJpbmdbXTtcclxuICBmaWxlVHlwZTogJ2MnIHwgJ2NwcCc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlVXBsb2FkU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBzM0NsaWVudDogUzNDbGllbnQ7XHJcbiAgcHJpdmF0ZSBidWNrZXROYW1lOiBzdHJpbmc7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5idWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8IFMzX0NPTkZJRy5idWNrZXROYW1lO1xyXG4gICAgXHJcbiAgICAvLyBJbml0aWFsaXplIFMzIGNsaWVudFxyXG4gICAgdGhpcy5zM0NsaWVudCA9IG5ldyBTM0NsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCBTM19DT05GSUcucmVnaW9uLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSBwcmVzaWduZWQgdXBsb2FkIFVSTCAoc3BlYyByZXF1aXJlbWVudDogcHJlc2lnbmVkIFVSTCBzdXBwb3J0IGZvciBzZWN1cmUgdXBsb2FkcylcclxuICAgKi9cclxuICBhc3luYyBnZW5lcmF0ZVByZXNpZ25lZFVwbG9hZFVybChyZXF1ZXN0OiBGaWxlVXBsb2FkUmVxdWVzdCk6IFByb21pc2U8RmlsZVVwbG9hZFJlc3BvbnNlPiB7XHJcbiAgICAvLyBWYWxpZGF0ZSBmaWxlXHJcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUZpbGUocmVxdWVzdC5maWxlTmFtZSwgcmVxdWVzdC5maWxlU2l6ZSwgcmVxdWVzdC5jb250ZW50VHlwZSk7XHJcbiAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgdmFsaWRhdGlvbiBmYWlsZWQ6ICR7dmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKX1gKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZW5lcmF0ZSB1bmlxdWUgZmlsZSBJRCBhbmQgUzMga2V5IChzcGVjIHJlcXVpcmVtZW50OiB1c2VySWQvZmlsZUlkIGZvbGRlciBzdHJ1Y3R1cmUpXHJcbiAgICBjb25zdCBmaWxlSWQgPSB1dWlkdjQoKTtcclxuICAgIGNvbnN0IHNhbml0aXplZEZpbGVOYW1lID0gdGhpcy5zYW5pdGl6ZUZpbGVOYW1lKHJlcXVlc3QuZmlsZU5hbWUpO1xyXG4gICAgY29uc3QgczNLZXkgPSBnZXRVc2VyRmlsZUtleShyZXF1ZXN0LnVzZXJJZCwgZmlsZUlkLCBzYW5pdGl6ZWRGaWxlTmFtZSk7XHJcblxyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCBmb3IgdXBsb2FkIChzcGVjIHJlcXVpcmVtZW50OiAxNS1taW51dGUgZXhwaXJhdGlvbiBmb3Igc2VjdXJpdHkpXHJcbiAgICAgIGNvbnN0IHB1dENvbW1hbmQgPSBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgICBDb250ZW50VHlwZTogcmVxdWVzdC5jb250ZW50VHlwZSxcclxuICAgICAgICBTZXJ2ZXJTaWRlRW5jcnlwdGlvbjogJ2F3czprbXMnLCAvLyBVc2UgS01TIGVuY3J5cHRpb24gKHNwZWMgcmVxdWlyZW1lbnQpXHJcbiAgICAgICAgTWV0YWRhdGE6IHtcclxuICAgICAgICAgICdvcmlnaW5hbC1maWxlbmFtZSc6IHJlcXVlc3QuZmlsZU5hbWUsXHJcbiAgICAgICAgICAndXNlci1pZCc6IHJlcXVlc3QudXNlcklkLFxyXG4gICAgICAgICAgJ2ZpbGUtaWQnOiBmaWxlSWQsXHJcbiAgICAgICAgICAndXBsb2FkLXRpbWVzdGFtcCc6IERhdGUubm93KCkudG9TdHJpbmcoKSxcclxuICAgICAgICAgICdmaWxlLXR5cGUnOiB2YWxpZGF0aW9uLmZpbGVUeXBlLFxyXG4gICAgICAgICAgJ2xhbmd1YWdlJzogdmFsaWRhdGlvbi5maWxlVHlwZSxcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgdXBsb2FkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHRoaXMuczNDbGllbnQsIHB1dENvbW1hbmQsIHtcclxuICAgICAgICBleHBpcmVzSW46IGdldFByZXNpZ25lZFVybEV4cGlyYXRpb24oJ3VwbG9hZCcpLCAvLyAxNSBtaW51dGVzIGZvciBzZWN1cml0eVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIC8vIEdlbmVyYXRlIHByZXNpZ25lZCBVUkwgZm9yIGRvd25sb2FkXHJcbiAgICAgIGNvbnN0IGdldENvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgICBSZXNwb25zZUNvbnRlbnREaXNwb3NpdGlvbjogYGF0dGFjaG1lbnQ7IGZpbGVuYW1lPVwiJHtzYW5pdGl6ZWRGaWxlTmFtZX1cImAsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZG93bmxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgZ2V0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbignZG93bmxvYWQnKSwgLy8gMSBob3VyXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmaWxlSWQsXHJcbiAgICAgICAgczNLZXksXHJcbiAgICAgICAgdXBsb2FkVXJsLFxyXG4gICAgICAgIGRvd25sb2FkVXJsLFxyXG4gICAgICAgIGV4cGlyZXNJbjogZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbigndXBsb2FkJyksXHJcbiAgICAgIH07XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZW5lcmF0aW5nIHByZXNpZ25lZCBVUkxzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgdXBsb2FkIFVSTCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgcHJlc2lnbmVkIFVSTCBmb3Igc2FtcGxlIGZpbGUgdXBsb2FkXHJcbiAgICovXHJcbiAgYXN5bmMgZ2VuZXJhdGVTYW1wbGVVcGxvYWRVcmwoc2FtcGxlSWQ6IHN0cmluZywgZmlsZU5hbWU6IHN0cmluZywgY29udGVudFR5cGU6IHN0cmluZyk6IFByb21pc2U8RmlsZVVwbG9hZFJlc3BvbnNlPiB7XHJcbiAgICAvLyBWYWxpZGF0ZSBmaWxlXHJcbiAgICBjb25zdCB2YWxpZGF0aW9uID0gdGhpcy52YWxpZGF0ZUZpbGUoZmlsZU5hbWUsIDAsIGNvbnRlbnRUeXBlKTsgLy8gU2l6ZSB2YWxpZGF0aW9uIHNraXBwZWQgZm9yIHNhbXBsZXNcclxuICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSB2YWxpZGF0aW9uIGZhaWxlZDogJHt2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHNhbml0aXplZEZpbGVOYW1lID0gdGhpcy5zYW5pdGl6ZUZpbGVOYW1lKGZpbGVOYW1lKTtcclxuICAgIGNvbnN0IHMzS2V5ID0gZ2V0U2FtcGxlRmlsZUtleShzYW1wbGVJZCwgc2FuaXRpemVkRmlsZU5hbWUpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IHB1dENvbW1hbmQgPSBuZXcgUHV0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgS2V5OiBzM0tleSxcclxuICAgICAgICBDb250ZW50VHlwZTogY29udGVudFR5cGUsXHJcbiAgICAgICAgU2VydmVyU2lkZUVuY3J5cHRpb246ICdhd3M6a21zJyxcclxuICAgICAgICBNZXRhZGF0YToge1xyXG4gICAgICAgICAgJ3NhbXBsZS1pZCc6IHNhbXBsZUlkLFxyXG4gICAgICAgICAgJ29yaWdpbmFsLWZpbGVuYW1lJzogZmlsZU5hbWUsXHJcbiAgICAgICAgICAnZmlsZS10eXBlJzogdmFsaWRhdGlvbi5maWxlVHlwZSxcclxuICAgICAgICAgICdsYW5ndWFnZSc6IHZhbGlkYXRpb24uZmlsZVR5cGUsXHJcbiAgICAgICAgICAnaXMtc2FtcGxlJzogJ3RydWUnLFxyXG4gICAgICAgIH1cclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCB1cGxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgcHV0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbigndXBsb2FkJyksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgY29uc3QgZ2V0Q29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICAgIFJlc3BvbnNlQ29udGVudERpc3Bvc2l0aW9uOiBgYXR0YWNobWVudDsgZmlsZW5hbWU9XCIke3Nhbml0aXplZEZpbGVOYW1lfVwiYCxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBkb3dubG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybCh0aGlzLnMzQ2xpZW50LCBnZXRDb21tYW5kLCB7XHJcbiAgICAgICAgZXhwaXJlc0luOiBnZXRQcmVzaWduZWRVcmxFeHBpcmF0aW9uKCdkb3dubG9hZCcpLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgZmlsZUlkOiBzYW1wbGVJZCxcclxuICAgICAgICBzM0tleSxcclxuICAgICAgICB1cGxvYWRVcmwsXHJcbiAgICAgICAgZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0luOiBnZXRQcmVzaWduZWRVcmxFeHBpcmF0aW9uKCd1cGxvYWQnKSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdlbmVyYXRpbmcgc2FtcGxlIHByZXNpZ25lZCBVUkxzOicsIGVycm9yKTtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdGYWlsZWQgdG8gZ2VuZXJhdGUgc2FtcGxlIHVwbG9hZCBVUkwnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGZpbGUgYWNjb3JkaW5nIHRvIHNwZWMgcmVxdWlyZW1lbnRzXHJcbiAgICovXHJcbiAgdmFsaWRhdGVGaWxlKGZpbGVOYW1lOiBzdHJpbmcsIGZpbGVTaXplOiBudW1iZXIsIGNvbnRlbnRUeXBlOiBzdHJpbmcpOiBGaWxlVmFsaWRhdGlvblJlc3VsdCB7XHJcbiAgICBjb25zdCBlcnJvcnM6IHN0cmluZ1tdID0gW107XHJcbiAgICBsZXQgZmlsZVR5cGU6ICdjJyB8ICdjcHAnID0gJ2MnO1xyXG5cclxuICAgIC8vIENoZWNrIGZpbGUgc2l6ZSAob25seSBmb3Igbm9uLXNhbXBsZSBmaWxlcylcclxuICAgIGlmIChmaWxlU2l6ZSA+IDAgJiYgIWlzVmFsaWRGaWxlU2l6ZShmaWxlU2l6ZSwgZmlsZU5hbWUpKSB7XHJcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVOYW1lLnN1YnN0cmluZyhmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICBjb25zdCBtYXhTaXplID0gUzNfQ09ORklHLm1heEZpbGVTaXplLmM7IC8vIERlZmF1bHQgdG8gQyBmaWxlIHNpemVcclxuICAgICAgZXJyb3JzLnB1c2goYEZpbGUgc2l6ZSAke2ZpbGVTaXplfSBieXRlcyBleGNlZWRzIG1heGltdW0gYWxsb3dlZCBzaXplIG9mICR7bWF4U2l6ZX0gYnl0ZXMgZm9yICR7ZXh0ZW5zaW9ufSBmaWxlc2ApO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChmaWxlU2l6ZSA8IDApIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGUgc2l6ZSBtdXN0IGJlIGdyZWF0ZXIgdGhhbiBvciBlcXVhbCB0byAwJyk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZSBleHRlbnNpb24gKHNwZWMgcmVxdWlyZW1lbnQ6IEMvQysrIGZpbGVzIG9ubHkpXHJcbiAgICBpZiAoIWlzVmFsaWRGaWxlRXh0ZW5zaW9uKGZpbGVOYW1lKSkge1xyXG4gICAgICBlcnJvcnMucHVzaChgRmlsZSBleHRlbnNpb24gaXMgbm90IGFsbG93ZWQuIEFsbG93ZWQgZXh0ZW5zaW9uczogJHtTM19DT05GSUcuYWxsb3dlZEV4dGVuc2lvbnMuam9pbignLCAnKX1gKTtcclxuICAgIH0gZWxzZSB7XHJcbiAgICAgIC8vIERldGVybWluZSBmaWxlIHR5cGUgYmFzZWQgb24gZXh0ZW5zaW9uIChzcGVjIHJlcXVpcmVtZW50OiBsYW5ndWFnZSBkZXRlY3Rpb24pXHJcbiAgICAgIGNvbnN0IGV4dGVuc2lvbiA9IGZpbGVOYW1lLnN1YnN0cmluZyhmaWxlTmFtZS5sYXN0SW5kZXhPZignLicpKS50b0xvd2VyQ2FzZSgpO1xyXG4gICAgICBpZiAoWycuYycsICcuaCddLmluY2x1ZGVzKGV4dGVuc2lvbikpIHtcclxuICAgICAgICBmaWxlVHlwZSA9ICdjJztcclxuICAgICAgfSBlbHNlIGlmIChbJy5jcHAnLCAnLmNjJywgJy5jeHgnLCAnLmhwcCcsICcuaHh4J10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ2NwcCc7XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBjb250ZW50IHR5cGVcclxuICAgIGlmICghUzNfQ09ORklHLmFsbG93ZWRDb250ZW50VHlwZXMuaW5jbHVkZXMoY29udGVudFR5cGUgYXMgdHlwZW9mIFMzX0NPTkZJRy5hbGxvd2VkQ29udGVudFR5cGVzW251bWJlcl0pKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBDb250ZW50IHR5cGUgJyR7Y29udGVudFR5cGV9JyBpcyBub3QgYWxsb3dlZC4gQWxsb3dlZCB0eXBlczogJHtTM19DT05GSUcuYWxsb3dlZENvbnRlbnRUeXBlcy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGZpbGVuYW1lIGZvciBzZWN1cml0eVxyXG4gICAgaWYgKHRoaXMuY29udGFpbnNVbnNhZmVDaGFyYWN0ZXJzKGZpbGVOYW1lKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZW5hbWUgY29udGFpbnMgdW5zYWZlIGNoYXJhY3RlcnMnKTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZmlsZU5hbWUubGVuZ3RoID4gMjU1KSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKCdGaWxlbmFtZSBpcyB0b28gbG9uZyAobWF4aW11bSAyNTUgY2hhcmFjdGVycyknKTtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBpc1ZhbGlkOiBlcnJvcnMubGVuZ3RoID09PSAwLFxyXG4gICAgICBlcnJvcnMsXHJcbiAgICAgIGZpbGVUeXBlLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIHByaXZhdGUgc2FuaXRpemVGaWxlTmFtZShmaWxlTmFtZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICAgIC8vIFJlbW92ZSBvciByZXBsYWNlIHVuc2FmZSBjaGFyYWN0ZXJzXHJcbiAgICByZXR1cm4gZmlsZU5hbWVcclxuICAgICAgLnJlcGxhY2UoL1teYS16QS1aMC05Ll8tXS9nLCAnXycpIC8vIFJlcGxhY2UgdW5zYWZlIGNoYXJzIHdpdGggdW5kZXJzY29yZVxyXG4gICAgICAucmVwbGFjZSgvX3syLH0vZywgJ18nKSAvLyBSZXBsYWNlIG11bHRpcGxlIHVuZGVyc2NvcmVzIHdpdGggc2luZ2xlXHJcbiAgICAgIC5yZXBsYWNlKC9eXyt8XyskL2csICcnKSAvLyBSZW1vdmUgbGVhZGluZy90cmFpbGluZyB1bmRlcnNjb3Jlc1xyXG4gICAgICAuc3Vic3RyaW5nKDAsIDI1NSk7IC8vIExpbWl0IGxlbmd0aFxyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBjb250YWluc1Vuc2FmZUNoYXJhY3RlcnMoZmlsZU5hbWU6IHN0cmluZyk6IGJvb2xlYW4ge1xyXG4gICAgLy8gQ2hlY2sgZm9yIHBhdGggdHJhdmVyc2FsIGFuZCBvdGhlciB1bnNhZmUgcGF0dGVybnNcclxuICAgIGNvbnN0IHVuc2FmZVBhdHRlcm5zID0gW1xyXG4gICAgICAvXFwuXFwuLywgICAgICAgICAgIC8vIFBhdGggdHJhdmVyc2FsXHJcbiAgICAgIC9bPD46XCJ8PypdLywgICAgICAvLyBXaW5kb3dzIHJlc2VydmVkIGNoYXJhY3RlcnNcclxuICAgICAgL1tcXHgwMC1cXHgxZl0vLCAgICAvLyBDb250cm9sIGNoYXJhY3RlcnNcclxuICAgICAgL14oQ09OfFBSTnxBVVh8TlVMfENPTVsxLTldfExQVFsxLTldKSQvaSwgLy8gV2luZG93cyByZXNlcnZlZCBuYW1lc1xyXG4gICAgXTtcclxuXHJcbiAgICByZXR1cm4gdW5zYWZlUGF0dGVybnMuc29tZShwYXR0ZXJuID0+IHBhdHRlcm4udGVzdChmaWxlTmFtZSkpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmVyaWZ5IGZpbGUgZXhpc3RzIGluIFMzXHJcbiAgICovXHJcbiAgYXN5bmMgdmVyaWZ5RmlsZUV4aXN0cyhzM0tleTogc3RyaW5nKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEhlYWRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICB9KTtcclxuICAgICAgYXdhaXQgdGhpcy5zM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICByZXR1cm4gdHJ1ZTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHJldHVybiBmYWxzZTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIGNvbnRlbnQgaGFzaCBmb3IgY2FjaGluZyAoc3BlYyByZXF1aXJlbWVudDogYW5hbHlzaXMgcmVzdWx0IGNhY2hpbmcpXHJcbiAgICovXHJcbiAgZ2VuZXJhdGVDb250ZW50SGFzaChjb250ZW50OiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgcmV0dXJuIGNyeXB0by5jcmVhdGVIYXNoKCdzaGEyNTYnKS51cGRhdGUoY29udGVudCkuZGlnZXN0KCdoZXgnKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBmaWxlIGNvbnRlbnQgZnJvbSBTM1xyXG4gICAqL1xyXG4gIGFzeW5jIGdldEZpbGVDb250ZW50KHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHJlc3BvbnNlID0gYXdhaXQgdGhpcy5zM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBjb25zdCBjb250ZW50ID0gYXdhaXQgcmVzcG9uc2UuQm9keT8udHJhbnNmb3JtVG9TdHJpbmcoKTtcclxuICAgICAgXHJcbiAgICAgIGlmICghY29udGVudCkge1xyXG4gICAgICAgIHRocm93IG5ldyBFcnJvcignRmlsZSBjb250ZW50IGlzIGVtcHR5Jyk7XHJcbiAgICAgIH1cclxuICAgICAgXHJcbiAgICAgIHJldHVybiBjb250ZW50O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyBmaWxlIGNvbnRlbnQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byByZXRyaWV2ZSBmaWxlIGNvbnRlbnQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFVwbG9hZCBmaWxlIGNvbnRlbnQgZGlyZWN0bHkgKGZvciBzYW1wbGUgZmlsZXMgYW5kIGF1dG9tYXRpYyB1cGxvYWRzKVxyXG4gICAqL1xyXG4gIGFzeW5jIHVwbG9hZEZpbGVDb250ZW50KHMzS2V5OiBzdHJpbmcsIGNvbnRlbnQ6IHN0cmluZywgY29udGVudFR5cGU6IHN0cmluZywgbWV0YWRhdGE6IFJlY29yZDxzdHJpbmcsIHN0cmluZz4gPSB7fSk6IFByb21pc2U8dm9pZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICAgIEJvZHk6IGNvbnRlbnQsXHJcbiAgICAgICAgQ29udGVudFR5cGU6IGNvbnRlbnRUeXBlLFxyXG4gICAgICAgIFNlcnZlclNpZGVFbmNyeXB0aW9uOiAnYXdzOmttcycsXHJcbiAgICAgICAgTWV0YWRhdGE6IG1ldGFkYXRhLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuczNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwbG9hZGluZyBmaWxlIGNvbnRlbnQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byB1cGxvYWQgZmlsZSBjb250ZW50Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG59Il19