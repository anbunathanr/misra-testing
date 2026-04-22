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
            console.log('Generating presigned URLs', {
                bucketName: this.bucketName,
                s3Key,
                fileId,
                userId: request.userId
            });
            // Generate presigned URL for upload (spec requirement: 15-minute expiration for security)
            const putCommand = new client_s3_1.PutObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ContentType: request.contentType,
                Metadata: {
                    'original-filename': request.fileName,
                    'user-id': request.userId,
                    'file-id': fileId,
                    'upload-timestamp': Date.now().toString(),
                    'file-type': validation.fileType,
                    'language': validation.fileType,
                }
            });
            console.log('Creating presigned upload URL...');
            const uploadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, putCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('upload'), // 15 minutes for security
            });
            console.log('Upload URL generated successfully');
            // Generate presigned URL for download
            const getCommand = new client_s3_1.GetObjectCommand({
                Bucket: this.bucketName,
                Key: s3Key,
                ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
            });
            console.log('Creating presigned download URL...');
            const downloadUrl = await (0, s3_request_presigner_1.getSignedUrl)(this.s3Client, getCommand, {
                expiresIn: (0, s3_config_1.getPresignedUrlExpiration)('download'), // 1 hour
            });
            console.log('Download URL generated successfully');
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
            const errorMessage = error instanceof Error ? error.message : 'Unknown error';
            console.error('Error details:', {
                errorMessage,
                errorName: error?.name,
                bucketName: this.bucketName,
                s3Key
            });
            throw new Error(`Failed to generate upload URL: ${errorMessage}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS11cGxvYWQtc2VydmljZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtdXBsb2FkLXNlcnZpY2UudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsa0RBQXFHO0FBQ3JHLHdFQUE2RDtBQUM3RCwrQkFBb0M7QUFDcEMsK0NBQWlDO0FBQ2pDLHNEQUF1SjtBQXlCdkosTUFBYSxpQkFBaUI7SUFDcEIsUUFBUSxDQUFXO0lBQ25CLFVBQVUsQ0FBUztJQUUzQjtRQUNFLElBQUksQ0FBQyxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxxQkFBUyxDQUFDLFVBQVUsQ0FBQztRQUUvRSx1QkFBdUI7UUFDdkIsSUFBSSxDQUFDLFFBQVEsR0FBRyxJQUFJLG9CQUFRLENBQUM7WUFDM0IsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLHFCQUFTLENBQUMsTUFBTTtTQUNuRCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsT0FBMEI7UUFDekQsZ0JBQWdCO1FBQ2hCLE1BQU0sVUFBVSxHQUFHLElBQUksQ0FBQyxZQUFZLENBQUMsT0FBTyxDQUFDLFFBQVEsRUFBRSxPQUFPLENBQUMsUUFBUSxFQUFFLE9BQU8sQ0FBQyxXQUFXLENBQUMsQ0FBQztRQUM5RixJQUFJLENBQUMsVUFBVSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3hCLE1BQU0sSUFBSSxLQUFLLENBQUMsMkJBQTJCLFVBQVUsQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUMsQ0FBQztRQUM3RSxDQUFDO1FBRUQsd0ZBQXdGO1FBQ3hGLE1BQU0sTUFBTSxHQUFHLElBQUEsU0FBTSxHQUFFLENBQUM7UUFDeEIsTUFBTSxpQkFBaUIsR0FBRyxJQUFJLENBQUMsZ0JBQWdCLENBQUMs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S0FBSyxDQUFDLGlCQUFpQixDQUFDLEtBQWEsRUFBRSxPQUFlLEVBQUUsV0FBbUIsRUFBRSxXQUFtQyxFQUFFO1FBQ2hILElBQUksQ0FBQztZQUNILE1BQU0sT0FBTyxHQUFHLElBQUksNEJBQWdCLENBQUM7Z0JBQ25DLE1BQU0sRUFBRSxJQUFJLENBQUMsVUFBVTtnQkFDdkIsR0FBRyxFQUFFLEtBQUs7Z0JBQ1YsSUFBSSxFQUFFLE9BQU87Z0JBQ2IsV0FBVyxFQUFFLFdBQVc7Z0JBQ3hCLFFBQVEsRUFBRSxRQUFRO2FBQ25CLENBQUMsQ0FBQztZQUVILE1BQU0sSUFBSSxDQUFDLFFBQVEsQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDcEMsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLCtCQUErQixFQUFFLEtBQUssQ0FBQyxDQUFDO1lBQ3RELE1BQU0sSUFBSSxLQUFLLENBQUMsK0JBQStCLENBQUMsQ0FBQztRQUNuRCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM1JELDhDQTJSQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFMzQ2xpZW50LCBQdXRPYmplY3RDb21tYW5kLCBHZXRPYmplY3RDb21tYW5kLCBIZWFkT2JqZWN0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IGdldFNpZ25lZFVybCB9IGZyb20gJ0Bhd3Mtc2RrL3MzLXJlcXVlc3QtcHJlc2lnbmVyJztcclxuaW1wb3J0IHsgdjQgYXMgdXVpZHY0IH0gZnJvbSAndXVpZCc7XHJcbmltcG9ydCAqIGFzIGNyeXB0byBmcm9tICdjcnlwdG8nO1xyXG5pbXBvcnQgeyBTM19DT05GSUcsIGdldFVzZXJGaWxlS2V5LCBnZXRTYW1wbGVGaWxlS2V5LCBpc1ZhbGlkRmlsZUV4dGVuc2lvbiwgaXNWYWxpZEZpbGVTaXplLCBnZXRQcmVzaWduZWRVcmxFeHBpcmF0aW9uIH0gZnJvbSAnLi4vLi4vY29uZmlnL3MzLWNvbmZpZyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIEZpbGVVcGxvYWRSZXF1ZXN0IHtcclxuICBmaWxlTmFtZTogc3RyaW5nO1xyXG4gIGZpbGVTaXplOiBudW1iZXI7XHJcbiAgY29udGVudFR5cGU6IHN0cmluZztcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBtb2RlPzogJ21hbnVhbCcgfCAnc2FtcGxlJztcclxuICBzYW1wbGVJZD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVXBsb2FkUmVzcG9uc2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIHMzS2V5OiBzdHJpbmc7XHJcbiAgdXBsb2FkVXJsOiBzdHJpbmc7XHJcbiAgZG93bmxvYWRVcmw6IHN0cmluZztcclxuICBleHBpcmVzSW46IG51bWJlcjtcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBGaWxlVmFsaWRhdGlvblJlc3VsdCB7XHJcbiAgaXNWYWxpZDogYm9vbGVhbjtcclxuICBlcnJvcnM6IHN0cmluZ1tdO1xyXG4gIGZpbGVUeXBlOiAnYycgfCAnY3BwJztcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVVcGxvYWRTZXJ2aWNlIHtcclxuICBwcml2YXRlIHMzQ2xpZW50OiBTM0NsaWVudDtcclxuICBwcml2YXRlIGJ1Y2tldE5hbWU6IHN0cmluZztcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmJ1Y2tldE5hbWUgPSBwcm9jZXNzLmVudi5GSUxFX1NUT1JBR0VfQlVDS0VUX05BTUUgfHwgUzNfQ09ORklHLmJ1Y2tldE5hbWU7XHJcbiAgICBcclxuICAgIC8vIEluaXRpYWxpemUgUzMgY2xpZW50XHJcbiAgICB0aGlzLnMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHtcclxuICAgICAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8IFMzX0NPTkZJRy5yZWdpb24sXHJcbiAgICB9KTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIHByZXNpZ25lZCB1cGxvYWQgVVJMIChzcGVjIHJlcXVpcmVtZW50OiBwcmVzaWduZWQgVVJMIHN1cHBvcnQgZm9yIHNlY3VyZSB1cGxvYWRzKVxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlUHJlc2lnbmVkVXBsb2FkVXJsKHJlcXVlc3Q6IEZpbGVVcGxvYWRSZXF1ZXN0KTogUHJvbWlzZTxGaWxlVXBsb2FkUmVzcG9uc2U+IHtcclxuICAgIC8vIFZhbGlkYXRlIGZpbGVcclxuICAgIGNvbnN0IHZhbGlkYXRpb24gPSB0aGlzLnZhbGlkYXRlRmlsZShyZXF1ZXN0LmZpbGVOYW1lLCByZXF1ZXN0LmZpbGVTaXplLCByZXF1ZXN0LmNvbnRlbnRUeXBlKTtcclxuICAgIGlmICghdmFsaWRhdGlvbi5pc1ZhbGlkKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgRmlsZSB2YWxpZGF0aW9uIGZhaWxlZDogJHt2YWxpZGF0aW9uLmVycm9ycy5qb2luKCcsICcpfWApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdlbmVyYXRlIHVuaXF1ZSBmaWxlIElEIGFuZCBTMyBrZXkgKHNwZWMgcmVxdWlyZW1lbnQ6IHVzZXJJZC9maWxlSWQgZm9sZGVyIHN0cnVjdHVyZSlcclxuICAgIGNvbnN0IGZpbGVJZCA9IHV1aWR2NCgpO1xyXG4gICAgY29uc3Qgc2FuaXRpemVkRmlsZU5hbWUgPSB0aGlzLnNhbml0aXplRmlsZU5hbWUocmVxdWVzdC5maWxlTmFtZSk7XHJcbiAgICBjb25zdCBzM0tleSA9IGdldFVzZXJGaWxlS2V5KHJlcXVlc3QudXNlcklkLCBmaWxlSWQsIHNhbml0aXplZEZpbGVOYW1lKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zb2xlLmxvZygnR2VuZXJhdGluZyBwcmVzaWduZWQgVVJMcycsIHtcclxuICAgICAgICBidWNrZXROYW1lOiB0aGlzLmJ1Y2tldE5hbWUsXHJcbiAgICAgICAgczNLZXksXHJcbiAgICAgICAgZmlsZUlkLFxyXG4gICAgICAgIHVzZXJJZDogcmVxdWVzdC51c2VySWRcclxuICAgICAgfSk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciB1cGxvYWQgKHNwZWMgcmVxdWlyZW1lbnQ6IDE1LW1pbnV0ZSBleHBpcmF0aW9uIGZvciBzZWN1cml0eSlcclxuICAgICAgY29uc3QgcHV0Q29tbWFuZCA9IG5ldyBQdXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgICBCdWNrZXQ6IHRoaXMuYnVja2V0TmFtZSxcclxuICAgICAgICBLZXk6IHMzS2V5LFxyXG4gICAgICAgIENvbnRlbnRUeXBlOiByZXF1ZXN0LmNvbnRlbnRUeXBlLFxyXG4gICAgICAgIE1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAnb3JpZ2luYWwtZmlsZW5hbWUnOiByZXF1ZXN0LmZpbGVOYW1lLFxyXG4gICAgICAgICAgJ3VzZXItaWQnOiByZXF1ZXN0LnVzZXJJZCxcclxuICAgICAgICAgICdmaWxlLWlkJzogZmlsZUlkLFxyXG4gICAgICAgICAgJ3VwbG9hZC10aW1lc3RhbXAnOiBEYXRlLm5vdygpLnRvU3RyaW5nKCksXHJcbiAgICAgICAgICAnZmlsZS10eXBlJzogdmFsaWRhdGlvbi5maWxlVHlwZSxcclxuICAgICAgICAgICdsYW5ndWFnZSc6IHZhbGlkYXRpb24uZmlsZVR5cGUsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwcmVzaWduZWQgdXBsb2FkIFVSTC4uLicpO1xyXG4gICAgICBjb25zdCB1cGxvYWRVcmwgPSBhd2FpdCBnZXRTaWduZWRVcmwodGhpcy5zM0NsaWVudCwgcHV0Q29tbWFuZCwge1xyXG4gICAgICAgIGV4cGlyZXNJbjogZ2V0UHJlc2lnbmVkVXJsRXhwaXJhdGlvbigndXBsb2FkJyksIC8vIDE1IG1pbnV0ZXMgZm9yIHNlY3VyaXR5XHJcbiAgICAgIH0pO1xyXG4gICAgICBjb25zb2xlLmxvZygnVXBsb2FkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgICAvLyBHZW5lcmF0ZSBwcmVzaWduZWQgVVJMIGZvciBkb3dubG9hZFxyXG4gICAgICBjb25zdCBnZXRDb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgUmVzcG9uc2VDb250ZW50RGlzcG9zaXRpb246IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7c2FuaXRpemVkRmlsZU5hbWV9XCJgLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnNvbGUubG9nKCdDcmVhdGluZyBwcmVzaWduZWQgZG93bmxvYWQgVVJMLi4uJyk7XHJcbiAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHRoaXMuczNDbGllbnQsIGdldENvbW1hbmQsIHtcclxuICAgICAgICBleHBpcmVzSW46IGdldFByZXNpZ25lZFVybEV4cGlyYXRpb24oJ2Rvd25sb2FkJyksIC8vIDEgaG91clxyXG4gICAgICB9KTtcclxuICAgICAgY29uc29sZS5sb2coJ0Rvd25sb2FkIFVSTCBnZW5lcmF0ZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcblxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBzM0tleSxcclxuICAgICAgICB1cGxvYWRVcmwsXHJcbiAgICAgICAgZG93bmxvYWRVcmwsXHJcbiAgICAgICAgZXhwaXJlc0luOiBnZXRQcmVzaWduZWRVcmxFeHBpcmF0aW9uKCd1cGxvYWQnKSxcclxuICAgICAgfTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIGdlbmVyYXRpbmcgcHJlc2lnbmVkIFVSTHM6JywgZXJyb3IpO1xyXG4gICAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJztcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZGV0YWlsczonLCB7XHJcbiAgICAgICAgZXJyb3JNZXNzYWdlLFxyXG4gICAgICAgIGVycm9yTmFtZTogKGVycm9yIGFzIGFueSk/Lm5hbWUsXHJcbiAgICAgICAgYnVja2V0TmFtZTogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIHMzS2V5XHJcbiAgICAgIH0pO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBnZW5lcmF0ZSB1cGxvYWQgVVJMOiAke2Vycm9yTWVzc2FnZX1gKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdlbmVyYXRlIHByZXNpZ25lZCBVUkwgZm9yIHNhbXBsZSBmaWxlIHVwbG9hZFxyXG4gICAqL1xyXG4gIGFzeW5jIGdlbmVyYXRlU2FtcGxlVXBsb2FkVXJsKHNhbXBsZUlkOiBzdHJpbmcsIGZpbGVOYW1lOiBzdHJpbmcsIGNvbnRlbnRUeXBlOiBzdHJpbmcpOiBQcm9taXNlPEZpbGVVcGxvYWRSZXNwb25zZT4ge1xyXG4gICAgLy8gVmFsaWRhdGUgZmlsZVxyXG4gICAgY29uc3QgdmFsaWRhdGlvbiA9IHRoaXMudmFsaWRhdGVGaWxlKGZpbGVOYW1lLCAwLCBjb250ZW50VHlwZSk7IC8vIFNpemUgdmFsaWRhdGlvbiBza2lwcGVkIGZvciBzYW1wbGVzXHJcbiAgICBpZiAoIXZhbGlkYXRpb24uaXNWYWxpZCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEZpbGUgdmFsaWRhdGlvbiBmYWlsZWQ6ICR7dmFsaWRhdGlvbi5lcnJvcnMuam9pbignLCAnKX1gKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzYW5pdGl6ZWRGaWxlTmFtZSA9IHRoaXMuc2FuaXRpemVGaWxlTmFtZShmaWxlTmFtZSk7XHJcbiAgICBjb25zdCBzM0tleSA9IGdldFNhbXBsZUZpbGVLZXkoc2FtcGxlSWQsIHNhbml0aXplZEZpbGVOYW1lKTtcclxuXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBwdXRDb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgQ29udGVudFR5cGU6IGNvbnRlbnRUeXBlLFxyXG4gICAgICAgIE1ldGFkYXRhOiB7XHJcbiAgICAgICAgICAnc2FtcGxlLWlkJzogc2FtcGxlSWQsXHJcbiAgICAgICAgICAnb3JpZ2luYWwtZmlsZW5hbWUnOiBmaWxlTmFtZSxcclxuICAgICAgICAgICdmaWxlLXR5cGUnOiB2YWxpZGF0aW9uLmZpbGVUeXBlLFxyXG4gICAgICAgICAgJ2xhbmd1YWdlJzogdmFsaWRhdGlvbi5maWxlVHlwZSxcclxuICAgICAgICAgICdpcy1zYW1wbGUnOiAndHJ1ZScsXHJcbiAgICAgICAgfVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IHVwbG9hZFVybCA9IGF3YWl0IGdldFNpZ25lZFVybCh0aGlzLnMzQ2xpZW50LCBwdXRDb21tYW5kLCB7XHJcbiAgICAgICAgZXhwaXJlc0luOiBnZXRQcmVzaWduZWRVcmxFeHBpcmF0aW9uKCd1cGxvYWQnKSxcclxuICAgICAgfSk7XHJcblxyXG4gICAgICBjb25zdCBnZXRDb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgUmVzcG9uc2VDb250ZW50RGlzcG9zaXRpb246IGBhdHRhY2htZW50OyBmaWxlbmFtZT1cIiR7c2FuaXRpemVkRmlsZU5hbWV9XCJgLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGNvbnN0IGRvd25sb2FkVXJsID0gYXdhaXQgZ2V0U2lnbmVkVXJsKHRoaXMuczNDbGllbnQsIGdldENvbW1hbmQsIHtcclxuICAgICAgICBleHBpcmVzSW46IGdldFByZXNpZ25lZFVybEV4cGlyYXRpb24oJ2Rvd25sb2FkJyksXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBmaWxlSWQ6IHNhbXBsZUlkLFxyXG4gICAgICAgIHMzS2V5LFxyXG4gICAgICAgIHVwbG9hZFVybCxcclxuICAgICAgICBkb3dubG9hZFVybCxcclxuICAgICAgICBleHBpcmVzSW46IGdldFByZXNpZ25lZFVybEV4cGlyYXRpb24oJ3VwbG9hZCcpLFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2VuZXJhdGluZyBzYW1wbGUgcHJlc2lnbmVkIFVSTHM6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byBnZW5lcmF0ZSBzYW1wbGUgdXBsb2FkIFVSTCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgZmlsZSBhY2NvcmRpbmcgdG8gc3BlYyByZXF1aXJlbWVudHNcclxuICAgKi9cclxuICB2YWxpZGF0ZUZpbGUoZmlsZU5hbWU6IHN0cmluZywgZmlsZVNpemU6IG51bWJlciwgY29udGVudFR5cGU6IHN0cmluZyk6IEZpbGVWYWxpZGF0aW9uUmVzdWx0IHtcclxuICAgIGNvbnN0IGVycm9yczogc3RyaW5nW10gPSBbXTtcclxuICAgIGxldCBmaWxlVHlwZTogJ2MnIHwgJ2NwcCcgPSAnYyc7XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZSBzaXplIChvbmx5IGZvciBub24tc2FtcGxlIGZpbGVzKVxyXG4gICAgaWYgKGZpbGVTaXplID4gMCAmJiAhaXNWYWxpZEZpbGVTaXplKGZpbGVTaXplLCBmaWxlTmFtZSkpIHtcclxuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZU5hbWUuc3Vic3RyaW5nKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGNvbnN0IG1heFNpemUgPSBTM19DT05GSUcubWF4RmlsZVNpemUuYzsgLy8gRGVmYXVsdCB0byBDIGZpbGUgc2l6ZVxyXG4gICAgICBlcnJvcnMucHVzaChgRmlsZSBzaXplICR7ZmlsZVNpemV9IGJ5dGVzIGV4Y2VlZHMgbWF4aW11bSBhbGxvd2VkIHNpemUgb2YgJHttYXhTaXplfSBieXRlcyBmb3IgJHtleHRlbnNpb259IGZpbGVzYCk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGZpbGVTaXplIDwgMCkge1xyXG4gICAgICBlcnJvcnMucHVzaCgnRmlsZSBzaXplIG11c3QgYmUgZ3JlYXRlciB0aGFuIG9yIGVxdWFsIHRvIDAnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmaWxlIGV4dGVuc2lvbiAoc3BlYyByZXF1aXJlbWVudDogQy9DKysgZmlsZXMgb25seSlcclxuICAgIGlmICghaXNWYWxpZEZpbGVFeHRlbnNpb24oZmlsZU5hbWUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKGBGaWxlIGV4dGVuc2lvbiBpcyBub3QgYWxsb3dlZC4gQWxsb3dlZCBleHRlbnNpb25zOiAke1MzX0NPTkZJRy5hbGxvd2VkRXh0ZW5zaW9ucy5qb2luKCcsICcpfWApO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgLy8gRGV0ZXJtaW5lIGZpbGUgdHlwZSBiYXNlZCBvbiBleHRlbnNpb24gKHNwZWMgcmVxdWlyZW1lbnQ6IGxhbmd1YWdlIGRldGVjdGlvbilcclxuICAgICAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZU5hbWUuc3Vic3RyaW5nKGZpbGVOYW1lLmxhc3RJbmRleE9mKCcuJykpLnRvTG93ZXJDYXNlKCk7XHJcbiAgICAgIGlmIChbJy5jJywgJy5oJ10uaW5jbHVkZXMoZXh0ZW5zaW9uKSkge1xyXG4gICAgICAgIGZpbGVUeXBlID0gJ2MnO1xyXG4gICAgICB9IGVsc2UgaWYgKFsnLmNwcCcsICcuY2MnLCAnLmN4eCcsICcuaHBwJywgJy5oeHgnXS5pbmNsdWRlcyhleHRlbnNpb24pKSB7XHJcbiAgICAgICAgZmlsZVR5cGUgPSAnY3BwJztcclxuICAgICAgfVxyXG4gICAgfVxyXG5cclxuICAgIC8vIENoZWNrIGNvbnRlbnQgdHlwZVxyXG4gICAgaWYgKCFTM19DT05GSUcuYWxsb3dlZENvbnRlbnRUeXBlcy5pbmNsdWRlcyhjb250ZW50VHlwZSBhcyB0eXBlb2YgUzNfQ09ORklHLmFsbG93ZWRDb250ZW50VHlwZXNbbnVtYmVyXSkpIHtcclxuICAgICAgZXJyb3JzLnB1c2goYENvbnRlbnQgdHlwZSAnJHtjb250ZW50VHlwZX0nIGlzIG5vdCBhbGxvd2VkLiBBbGxvd2VkIHR5cGVzOiAke1MzX0NPTkZJRy5hbGxvd2VkQ29udGVudFR5cGVzLmpvaW4oJywgJyl9YCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQ2hlY2sgZmlsZW5hbWUgZm9yIHNlY3VyaXR5XHJcbiAgICBpZiAodGhpcy5jb250YWluc1Vuc2FmZUNoYXJhY3RlcnMoZmlsZU5hbWUpKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKCdGaWxlbmFtZSBjb250YWlucyB1bnNhZmUgY2hhcmFjdGVycycpO1xyXG4gICAgfVxyXG5cclxuICAgIGlmIChmaWxlTmFtZS5sZW5ndGggPiAyNTUpIHtcclxuICAgICAgZXJyb3JzLnB1c2goJ0ZpbGVuYW1lIGlzIHRvbyBsb25nIChtYXhpbXVtIDI1NSBjaGFyYWN0ZXJzKScpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIGlzVmFsaWQ6IGVycm9ycy5sZW5ndGggPT09IDAsXHJcbiAgICAgIGVycm9ycyxcclxuICAgICAgZmlsZVR5cGUsXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgcHJpdmF0ZSBzYW5pdGl6ZUZpbGVOYW1lKGZpbGVOYW1lOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gICAgLy8gUmVtb3ZlIG9yIHJlcGxhY2UgdW5zYWZlIGNoYXJhY3RlcnNcclxuICAgIHJldHVybiBmaWxlTmFtZVxyXG4gICAgICAucmVwbGFjZSgvW15hLXpBLVowLTkuXy1dL2csICdfJykgLy8gUmVwbGFjZSB1bnNhZmUgY2hhcnMgd2l0aCB1bmRlcnNjb3JlXHJcbiAgICAgIC5yZXBsYWNlKC9fezIsfS9nLCAnXycpIC8vIFJlcGxhY2UgbXVsdGlwbGUgdW5kZXJzY29yZXMgd2l0aCBzaW5nbGVcclxuICAgICAgLnJlcGxhY2UoL15fK3xfKyQvZywgJycpIC8vIFJlbW92ZSBsZWFkaW5nL3RyYWlsaW5nIHVuZGVyc2NvcmVzXHJcbiAgICAgIC5zdWJzdHJpbmcoMCwgMjU1KTsgLy8gTGltaXQgbGVuZ3RoXHJcbiAgfVxyXG5cclxuICBwcml2YXRlIGNvbnRhaW5zVW5zYWZlQ2hhcmFjdGVycyhmaWxlTmFtZTogc3RyaW5nKTogYm9vbGVhbiB7XHJcbiAgICAvLyBDaGVjayBmb3IgcGF0aCB0cmF2ZXJzYWwgYW5kIG90aGVyIHVuc2FmZSBwYXR0ZXJuc1xyXG4gICAgY29uc3QgdW5zYWZlUGF0dGVybnMgPSBbXHJcbiAgICAgIC9cXC5cXC4vLCAgICAgICAgICAgLy8gUGF0aCB0cmF2ZXJzYWxcclxuICAgICAgL1s8PjpcInw/Kl0vLCAgICAgIC8vIFdpbmRvd3MgcmVzZXJ2ZWQgY2hhcmFjdGVyc1xyXG4gICAgICAvW1xceDAwLVxceDFmXS8sICAgIC8vIENvbnRyb2wgY2hhcmFjdGVyc1xyXG4gICAgICAvXihDT058UFJOfEFVWHxOVUx8Q09NWzEtOV18TFBUWzEtOV0pJC9pLCAvLyBXaW5kb3dzIHJlc2VydmVkIG5hbWVzXHJcbiAgICBdO1xyXG5cclxuICAgIHJldHVybiB1bnNhZmVQYXR0ZXJucy5zb21lKHBhdHRlcm4gPT4gcGF0dGVybi50ZXN0KGZpbGVOYW1lKSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWZXJpZnkgZmlsZSBleGlzdHMgaW4gUzNcclxuICAgKi9cclxuICBhc3luYyB2ZXJpZnlGaWxlRXhpc3RzKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPGJvb2xlYW4+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgSGVhZE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgIH0pO1xyXG4gICAgICBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2VuZXJhdGUgY29udGVudCBoYXNoIGZvciBjYWNoaW5nIChzcGVjIHJlcXVpcmVtZW50OiBhbmFseXNpcyByZXN1bHQgY2FjaGluZylcclxuICAgKi9cclxuICBnZW5lcmF0ZUNvbnRlbnRIYXNoKGNvbnRlbnQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgICByZXR1cm4gY3J5cHRvLmNyZWF0ZUhhc2goJ3NoYTI1NicpLnVwZGF0ZShjb250ZW50KS5kaWdlc3QoJ2hleCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGZpbGUgY29udGVudCBmcm9tIFMzXHJcbiAgICovXHJcbiAgYXN5bmMgZ2V0RmlsZUNvbnRlbnQoczNLZXk6IHN0cmluZyk6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgIH0pO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCB0aGlzLnMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIGNvbnN0IGNvbnRlbnQgPSBhd2FpdCByZXNwb25zZS5Cb2R5Py50cmFuc2Zvcm1Ub1N0cmluZygpO1xyXG4gICAgICBcclxuICAgICAgaWYgKCFjb250ZW50KSB7XHJcbiAgICAgICAgdGhyb3cgbmV3IEVycm9yKCdGaWxlIGNvbnRlbnQgaXMgZW1wdHknKTtcclxuICAgICAgfVxyXG4gICAgICBcclxuICAgICAgcmV0dXJuIGNvbnRlbnQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBnZXR0aW5nIGZpbGUgY29udGVudDonLCBlcnJvcik7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignRmFpbGVkIHRvIHJldHJpZXZlIGZpbGUgY29udGVudCcpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVXBsb2FkIGZpbGUgY29udGVudCBkaXJlY3RseSAoZm9yIHNhbXBsZSBmaWxlcyBhbmQgYXV0b21hdGljIHVwbG9hZHMpXHJcbiAgICovXHJcbiAgYXN5bmMgdXBsb2FkRmlsZUNvbnRlbnQoczNLZXk6IHN0cmluZywgY29udGVudDogc3RyaW5nLCBjb250ZW50VHlwZTogc3RyaW5nLCBtZXRhZGF0YTogUmVjb3JkPHN0cmluZywgc3RyaW5nPiA9IHt9KTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dE9iamVjdENvbW1hbmQoe1xyXG4gICAgICAgIEJ1Y2tldDogdGhpcy5idWNrZXROYW1lLFxyXG4gICAgICAgIEtleTogczNLZXksXHJcbiAgICAgICAgQm9keTogY29udGVudCxcclxuICAgICAgICBDb250ZW50VHlwZTogY29udGVudFR5cGUsXHJcbiAgICAgICAgTWV0YWRhdGE6IG1ldGFkYXRhLFxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuczNDbGllbnQuc2VuZChjb21tYW5kKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwbG9hZGluZyBmaWxlIGNvbnRlbnQ6JywgZXJyb3IpO1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0ZhaWxlZCB0byB1cGxvYWQgZmlsZSBjb250ZW50Jyk7XHJcbiAgICB9XHJcbiAgfVxyXG59Il19