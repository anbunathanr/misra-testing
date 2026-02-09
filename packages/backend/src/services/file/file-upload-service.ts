import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';

export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  organizationId: string;
  userId: string;
}

export interface FileUploadResponse {
  fileId: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresIn: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileType: 'C' | 'CPP' | 'HEADER' | 'UNKNOWN';
}

export class FileUploadService {
  private s3Client: S3Client;
  private bucketName: string;
  private maxFileSize: number = 50 * 1024 * 1024; // 50MB
  private allowedExtensions: string[] = ['.c', '.cpp', '.cc', '.cxx', '.h', '.hpp', '.hxx'];
  private allowedContentTypes: string[] = [
    'text/plain',
    'text/x-c',
    'text/x-c++',
    'application/octet-stream'
  ];

  constructor() {
    this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  async generatePresignedUploadUrl(request: FileUploadRequest): Promise<FileUploadResponse> {
    // Validate file
    const validation = this.validateFile(request.fileName, request.fileSize, request.contentType);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate unique file ID and S3 key
    const fileId = uuidv4();
    const timestamp = Date.now();
    const sanitizedFileName = this.sanitizeFileName(request.fileName);
    const fileHash = this.generateFileHash(request.fileName, request.userId, timestamp);
    const s3Key = `uploads/${request.organizationId}/${request.userId}/${timestamp}-${fileId}-${sanitizedFileName}`;

    try {
      // Generate presigned URL for upload
      const putCommand = new PutObjectCommand({
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

      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: 3600, // 1 hour
      });

      // Generate presigned URL for download
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: 3600, // 1 hour
      });

      return {
        fileId,
        uploadUrl,
        downloadUrl,
        expiresIn: 3600,
      };
    } catch (error) {
      console.error('Error generating presigned URLs:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  validateFile(fileName: string, fileSize: number, contentType: string): FileValidationResult {
    const errors: string[] = [];
    let fileType: 'C' | 'CPP' | 'HEADER' | 'UNKNOWN' = 'UNKNOWN';

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
    } else {
      // Determine file type based on extension
      if (['.c'].includes(extension)) {
        fileType = 'C';
      } else if (['.cpp', '.cc', '.cxx'].includes(extension)) {
        fileType = 'CPP';
      } else if (['.h', '.hpp', '.hxx'].includes(extension)) {
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

  private getFileExtension(fileName: string): string {
    const lastDotIndex = fileName.lastIndexOf('.');
    return lastDotIndex === -1 ? '' : fileName.substring(lastDotIndex);
  }

  private sanitizeFileName(fileName: string): string {
    // Remove or replace unsafe characters
    return fileName
      .replace(/[^a-zA-Z0-9._-]/g, '_') // Replace unsafe chars with underscore
      .replace(/_{2,}/g, '_') // Replace multiple underscores with single
      .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
      .substring(0, 255); // Limit length
  }

  private containsUnsafeCharacters(fileName: string): boolean {
    // Check for path traversal and other unsafe patterns
    const unsafePatterns = [
      /\.\./,           // Path traversal
      /[<>:"|?*]/,      // Windows reserved characters
      /[\x00-\x1f]/,    // Control characters
      /^(CON|PRN|AUX|NUL|COM[1-9]|LPT[1-9])$/i, // Windows reserved names
    ];

    return unsafePatterns.some(pattern => pattern.test(fileName));
  }

  async getFileMetadata(fileId: string): Promise<any> {
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
  private generateFileHash(fileName: string, userId: string, timestamp: number): string {
    const data = `${fileName}-${userId}-${timestamp}`;
    return crypto.createHash('sha256').update(data).digest('hex').substring(0, 16);
  }

  /**
   * Verify file exists in S3
   */
  async verifyFileExists(s3Key: string): Promise<boolean> {
    try {
      const command = new HeadObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      await this.s3Client.send(command);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Get file size limit based on file type
   */
  getMaxFileSizeForType(fileType: string): number {
    // Different limits for different file types
    const limits: Record<string, number> = {
      'C': 10 * 1024 * 1024,      // 10MB for C files
      'CPP': 10 * 1024 * 1024,    // 10MB for C++ files
      'HEADER': 5 * 1024 * 1024,  // 5MB for header files
    };
    return limits[fileType] || this.maxFileSize;
  }

  /**
   * Check if file extension matches content type
   */
  private validateContentTypeMatch(fileName: string, contentType: string): boolean {
    const extension = this.getFileExtension(fileName).toLowerCase();
    const validMappings: Record<string, string[]> = {
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