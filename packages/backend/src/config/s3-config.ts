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
    upload: 900,       // 15 minutes for security
    download: 3600,    // 1 hour
    temporary: 300,    // 5 minutes for temporary access
  },
  
  // S3 key prefixes (aligned with spec requirements)
  keyPrefixes: {
    users: 'users',           // User uploaded files: users/{userId}/{fileId}/
    samples: 'samples',       // Sample files: samples/{sampleId}.c
    cache: 'cache',          // Analysis cache: cache/{contentHash}.json
  },
  
  // Security settings
  security: {
    enforceSSL: true,
    serverSideEncryption: 'aws:kms' as const, // Use KMS encryption
    blockPublicAccess: true,
  },
  
  // Lifecycle settings (aligned with CDK configuration)
  lifecycle: {
    transitionToIA: 30,        // Days until transition to Infrequent Access
    transitionToGlacier: 90,   // Days until transition to Glacier
    expireVersions: 30,        // Days to keep old versions
    abortIncompleteUploads: 7, // Days to abort incomplete multipart uploads
  },
  
  // CORS settings for frontend uploads
  cors: {
    allowedMethods: ['GET', 'POST', 'PUT', 'HEAD'],
    allowedHeaders: [
      'Authorization',
      'Content-Type',
      'Content-Length',
      'Content-MD5',
      'x-amz-date',
      'x-amz-security-token',
      'x-amz-user-agent',
      'x-amz-content-sha256',
    ],
    maxAge: 3600, // 1 hour
  },
} as const

/**
 * Get S3 bucket name for environment
 */
export function getBucketName(environment: string = 'dev', accountId?: string): string {
  return accountId 
    ? `misra-platform-files-${environment}-${accountId}`
    : `misra-platform-files-${environment}`
}

/**
 * Get S3 key for user file upload (spec requirement: userId/fileId/fileName)
 */
export function getUserFileKey(
  userId: string,
  fileId: string,
  fileName: string
): string {
  return `${S3_CONFIG.keyPrefixes.users}/${userId}/${fileId}/${fileName}`
}

/**
 * Get S3 key for sample file (spec requirement: samples/{sampleId}.ext)
 */
export function getSampleFileKey(
  sampleId: string,
  fileName: string
): string {
  const extension = fileName.substring(fileName.lastIndexOf('.'))
  return `${S3_CONFIG.keyPrefixes.samples}/${sampleId}${extension}`
}

/**
 * Get S3 key for analysis cache (spec requirement: cache/{contentHash}.json)
 */
export function getCacheKey(contentHash: string): string {
  return `${S3_CONFIG.keyPrefixes.cache}/${contentHash}.json`
}

/**
 * Parse S3 key to extract metadata
 */
export function parseS3Key(key: string): {
  prefix: string
  userId?: string
  fileId?: string
  fileName?: string
  sampleId?: string
  contentHash?: string
} | null {
  const parts = key.split('/')
  if (parts.length < 2) {
    return null
  }

  const prefix = parts[0]
  
  switch (prefix) {
    case S3_CONFIG.keyPrefixes.users:
      // users/{userId}/{fileId}/{fileName}
      if (parts.length >= 4) {
        return {
          prefix,
          userId: parts[1],
          fileId: parts[2],
          fileName: parts.slice(3).join('/'),
        }
      }
      break
      
    case S3_CONFIG.keyPrefixes.samples:
      // samples/{sampleId}.ext
      if (parts.length >= 2) {
        const fileNameWithExt = parts[1]
        const sampleId = fileNameWithExt.substring(0, fileNameWithExt.lastIndexOf('.'))
        return {
          prefix,
          sampleId,
          fileName: fileNameWithExt,
        }
      }
      break
      
    case S3_CONFIG.keyPrefixes.cache:
      // cache/{contentHash}.json
      if (parts.length >= 2) {
        const fileName = parts[1]
        const contentHash = fileName.replace('.json', '')
        return {
          prefix,
          contentHash,
          fileName,
        }
      }
      break
  }

  return null
}

/**
 * Validate file extension
 */
export function isValidFileExtension(fileName: string): boolean {
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase() as typeof S3_CONFIG.allowedExtensions[number]
  return S3_CONFIG.allowedExtensions.includes(extension)
}

/**
 * Validate file size
 */
export function isValidFileSize(fileSize: number, fileName: string): boolean {
  const extension = fileName.substring(fileName.lastIndexOf('.')).toLowerCase()
  
  let maxSize = S3_CONFIG.maxFileSize.default
  
  if (['.c'].includes(extension)) {
    maxSize = S3_CONFIG.maxFileSize.c
  } else if (['.cpp', '.cc', '.cxx'].includes(extension)) {
    maxSize = S3_CONFIG.maxFileSize.cpp
  } else if (['.h', '.hpp', '.hxx'].includes(extension)) {
    maxSize = S3_CONFIG.maxFileSize.header
  }
  
  return fileSize <= maxSize
}

/**
 * Get presigned URL expiration time based on operation
 */
export function getPresignedUrlExpiration(operation: 'upload' | 'download' | 'temporary'): number {
  return S3_CONFIG.urlExpiration[operation]
}
