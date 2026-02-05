import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';

// Mock AWS SDK for development
declare const process: {
  env: {
    [key: string]: string | undefined;
  };
};

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
    // Mock S3 client for development
    this.s3Client = {} as S3Client;
    this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
    
    // In production, initialize real S3 client
    if (process.env.NODE_ENV === 'production') {
      this.s3Client = new S3Client({
        region: process.env.AWS_REGION || 'us-east-1',
      });
    }
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
      const putCommand = new PutObjectCommand({
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

      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: 3600, // 1 hour
      });

      // Generate presigned URL for download
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
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
}