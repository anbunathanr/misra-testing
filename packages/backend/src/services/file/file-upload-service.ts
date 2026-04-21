import { S3Client, PutObjectCommand, GetObjectCommand, HeadObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { v4 as uuidv4 } from 'uuid';
import * as crypto from 'crypto';
import { S3_CONFIG, getUserFileKey, getSampleFileKey, isValidFileExtension, isValidFileSize, getPresignedUrlExpiration } from '../../config/s3-config';

export interface FileUploadRequest {
  fileName: string;
  fileSize: number;
  contentType: string;
  userId: string;
  mode?: 'manual' | 'sample';
  sampleId?: string;
}

export interface FileUploadResponse {
  fileId: string;
  s3Key: string;
  uploadUrl: string;
  downloadUrl: string;
  expiresIn: number;
}

export interface FileValidationResult {
  isValid: boolean;
  errors: string[];
  fileType: 'c' | 'cpp';
}

export class FileUploadService {
  private s3Client: S3Client;
  private bucketName: string;

  constructor() {
    this.bucketName = process.env.FILE_STORAGE_BUCKET_NAME || S3_CONFIG.bucketName;
    
    // Initialize S3 client
    this.s3Client = new S3Client({
      region: process.env.AWS_REGION || S3_CONFIG.region,
    });
  }

  /**
   * Generate presigned upload URL (spec requirement: presigned URL support for secure uploads)
   */
  async generatePresignedUploadUrl(request: FileUploadRequest): Promise<FileUploadResponse> {
    // Validate file
    const validation = this.validateFile(request.fileName, request.fileSize, request.contentType);
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    // Generate unique file ID and S3 key (spec requirement: userId/fileId folder structure)
    const fileId = uuidv4();
    const sanitizedFileName = this.sanitizeFileName(request.fileName);
    const s3Key = getUserFileKey(request.userId, fileId, sanitizedFileName);

    try {
      // Generate presigned URL for upload (spec requirement: 15-minute expiration for security)
      const putCommand = new PutObjectCommand({
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

      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: getPresignedUrlExpiration('upload'), // 15 minutes for security
      });

      // Generate presigned URL for download
      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: getPresignedUrlExpiration('download'), // 1 hour
      });

      return {
        fileId,
        s3Key,
        uploadUrl,
        downloadUrl,
        expiresIn: getPresignedUrlExpiration('upload'),
      };
    } catch (error) {
      console.error('Error generating presigned URLs:', error);
      throw new Error('Failed to generate upload URL');
    }
  }

  /**
   * Generate presigned URL for sample file upload
   */
  async generateSampleUploadUrl(sampleId: string, fileName: string, contentType: string): Promise<FileUploadResponse> {
    // Validate file
    const validation = this.validateFile(fileName, 0, contentType); // Size validation skipped for samples
    if (!validation.isValid) {
      throw new Error(`File validation failed: ${validation.errors.join(', ')}`);
    }

    const sanitizedFileName = this.sanitizeFileName(fileName);
    const s3Key = getSampleFileKey(sampleId, sanitizedFileName);

    try {
      const putCommand = new PutObjectCommand({
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

      const uploadUrl = await getSignedUrl(this.s3Client, putCommand, {
        expiresIn: getPresignedUrlExpiration('upload'),
      });

      const getCommand = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        ResponseContentDisposition: `attachment; filename="${sanitizedFileName}"`,
      });

      const downloadUrl = await getSignedUrl(this.s3Client, getCommand, {
        expiresIn: getPresignedUrlExpiration('download'),
      });

      return {
        fileId: sampleId,
        s3Key,
        uploadUrl,
        downloadUrl,
        expiresIn: getPresignedUrlExpiration('upload'),
      };
    } catch (error) {
      console.error('Error generating sample presigned URLs:', error);
      throw new Error('Failed to generate sample upload URL');
    }
  }

  /**
   * Validate file according to spec requirements
   */
  validateFile(fileName: string, fileSize: number, contentType: string): FileValidationResult {
    const errors: string[] = [];
    let fileType: 'c' | 'cpp' = 'c';

    // Check file size (only for non-sample files)
    if (fileSize > 0 && !isValidFileSize(fileSize, fileName)) {
      const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      const maxSize = S3_CONFIG.maxFileSize.c; // Default to C file size
      errors.push(`File size ${fileSize} bytes exceeds maximum allowed size of ${maxSize} bytes for ${extension} files`);
    }

    if (fileSize < 0) {
      errors.push('File size must be greater than or equal to 0');
    }

    // Check file extension (spec requirement: C/C++ files only)
    if (!isValidFileExtension(fileName)) {
      errors.push(`File extension is not allowed. Allowed extensions: ${S3_CONFIG.allowedExtensions.join(', ')}`);
    } else {
      // Determine file type based on extension (spec requirement: language detection)
      const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase();
      if (['.c', '.h'].includes(extension)) {
        fileType = 'c';
      } else if (['.cpp', '.cc', '.cxx', '.hpp', '.hxx'].includes(extension)) {
        fileType = 'cpp';
      }
    }

    // Check content type
    if (!S3_CONFIG.allowedContentTypes.includes(contentType as typeof S3_CONFIG.allowedContentTypes[number])) {
      errors.push(`Content type '${contentType}' is not allowed. Allowed types: ${S3_CONFIG.allowedContentTypes.join(', ')}`);
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
   * Generate content hash for caching (spec requirement: analysis result caching)
   */
  generateContentHash(content: string): string {
    return crypto.createHash('sha256').update(content).digest('hex');
  }

  /**
   * Get file content from S3
   */
  async getFileContent(s3Key: string): Promise<string> {
    try {
      const command = new GetObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
      });
      
      const response = await this.s3Client.send(command);
      const content = await response.Body?.transformToString();
      
      if (!content) {
        throw new Error('File content is empty');
      }
      
      return content;
    } catch (error) {
      console.error('Error getting file content:', error);
      throw new Error('Failed to retrieve file content');
    }
  }

  /**
   * Upload file content directly (for sample files and automatic uploads)
   */
  async uploadFileContent(s3Key: string, content: string, contentType: string, metadata: Record<string, string> = {}): Promise<void> {
    try {
      const command = new PutObjectCommand({
        Bucket: this.bucketName,
        Key: s3Key,
        Body: content,
        ContentType: contentType,
        ServerSideEncryption: 'aws:kms',
        Metadata: metadata,
      });

      await this.s3Client.send(command);
    } catch (error) {
      console.error('Error uploading file content:', error);
      throw new Error('Failed to upload file content');
    }
  }
}