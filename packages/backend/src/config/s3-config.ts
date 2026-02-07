/**
 * S3 configuration for file storage
 */

export const S3_CONFIG = {
  bucketName: process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev',
  region: process.env.AWS_REGION || 'us-east-1',
  
  // File size limits (in bytes)
  maxFileSize: {
    default: 50 * 1024 * 1024,  // 50MB
    c: 10 * 1024 * 1024,        // 10MB for C files
    cpp: 10 * 1024 * 1024,      // 10MB for C++ files
    header: 5 * 1024 * 1024,    // 5MB for header files
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
    upload: 3600,      // 1 hour
    download: 3600,    // 1 hour
    temporary: 900,    // 15 minutes
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
    serverSideEncryption: 'AES256' as const,
    blockPublicAccess: true,
  },
  
  // Lifecycle settings
  lifecycle: {
    transitionToIA: 30,        // Days until transition to Infrequent Access
    transitionToGlacier: 90,   // Days until transition to Glacier
    expireVersions: 30,        // Days to keep old versions
    abortIncompleteUploads: 7, // Days to abort incomplete multipart uploads
  },
} as const

/**
 * Get S3 bucket name for environment
 */
export function getBucketName(environment: string = 'dev'): string {
  return `misra-platform-files-${environment}`
}

/**
 * Get S3 key for file upload
 */
export function getUploadKey(
  organizationId: string,
  userId: string,
  fileId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  return `${S3_CONFIG.keyPrefixes.uploads}/${organizationId}/${userId}/${timestamp}-${fileId}-${fileName}`
}

/**
 * Get S3 key for processed file
 */
export function getProcessedKey(
  organizationId: string,
  userId: string,
  fileId: string,
  fileName: string
): string {
  return `${S3_CONFIG.keyPrefixes.processed}/${organizationId}/${userId}/${fileId}-${fileName}`
}

/**
 * Get S3 key for archived file
 */
export function getArchivedKey(
  organizationId: string,
  userId: string,
  fileId: string,
  fileName: string
): string {
  const timestamp = Date.now()
  return `${S3_CONFIG.keyPrefixes.archived}/${organizationId}/${userId}/${timestamp}-${fileId}-${fileName}`
}

/**
 * Parse S3 key to extract metadata
 */
export function parseS3Key(key: string): {
  prefix: string
  organizationId: string
  userId: string
  fileName: string
} | null {
  const parts = key.split('/')
  if (parts.length < 4) {
    return null
  }

  return {
    prefix: parts[0],
    organizationId: parts[1],
    userId: parts[2],
    fileName: parts.slice(3).join('/'),
  }
}
