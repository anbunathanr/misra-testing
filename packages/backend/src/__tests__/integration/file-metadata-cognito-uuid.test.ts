/**
 * Unit test for FileMetadata with Cognito UUID
 * Tests creating FileMetadata with 36-character Cognito UUID as user_id
 * Validates: Requirements 2.2
 */

import { FileMetadataValidator } from '../../validation/file-metadata-validator'
import { FileMetadata, FileType, AnalysisStatus } from '../../types/file-metadata'
import { v4 as uuidv4 } from 'uuid'

describe('FileMetadata with Cognito UUID Tests', () => {
  let validator: FileMetadataValidator

  beforeEach(() => {
    validator = new FileMetadataValidator()
  })

  /**
   * Test 1: Validator accepts 36-character Cognito UUID
   * Validates: Requirements 2.2
   */
  test('should accept 36-character Cognito UUID in validator', () => {
    const cognitoUUID = '550e8400-e29b-41d4-a716-446655440000'
    
    expect(cognitoUUID.length).toBe(36)
    expect(validator.validateUserId(cognitoUUID)).toBe(true)
  })

  /**
   * Test 2: Validator accepts FileMetadata with Cognito UUID
   * Validates: Requirements 2.2
   */
  test('should validate FileMetadata creation with Cognito UUID', () => {
    const cognitoUUID = '550e8400-e29b-41d4-a716-446655440000'
    const now = Math.floor(Date.now() / 1000)

    const metadata: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: cognitoUUID,
      filename: 'test-file.c',
      file_type: FileType.C,
      file_size: 2048,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${cognitoUUID}/test-file.c`,
      created_at: now,
      updated_at: now
    }

    const result = validator.validateCreate(metadata)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
  })

  /**
   * Test 3: Verify UUID format is preserved in metadata object
   * Validates: Requirements 2.2
   */
  test('should preserve Cognito UUID format in metadata object', () => {
    const cognitoUUID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
    const now = Math.floor(Date.now() / 1000)

    const metadata: FileMetadata = {
      file_id: uuidv4(),
      user_id: cognitoUUID,
      filename: 'test-file.cpp',
      file_type: FileType.CPP,
      file_size: 4096,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${cognitoUUID}/test-file.cpp`,
      created_at: now,
      updated_at: now
    }

    // Verify format is preserved
    expect(metadata.user_id).toBe(cognitoUUID)
    
    // Verify it's still a valid UUID format
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    expect(uuidRegex.test(metadata.user_id)).toBe(true)
  })

  /**
   * Test 4: Multiple files with different Cognito UUIDs
   * Validates: Requirements 2.2
   */
  test('should handle multiple files with different Cognito UUIDs', () => {
    const cognitoUUID1 = '550e8400-e29b-41d4-a716-446655440000'
    const cognitoUUID2 = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
    const now = Math.floor(Date.now() / 1000)

    const metadata1: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: cognitoUUID1,
      filename: 'file1.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${cognitoUUID1}/file1.c`,
      created_at: now,
      updated_at: now
    }

    const metadata2: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: cognitoUUID2,
      filename: 'file2.cpp',
      file_type: FileType.CPP,
      file_size: 2048,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${cognitoUUID2}/file2.cpp`,
      created_at: now,
      updated_at: now
    }

    const result1 = validator.validateCreate(metadata1)
    const result2 = validator.validateCreate(metadata2)

    expect(result1.isValid).toBe(true)
    expect(result2.isValid).toBe(true)
    expect(result1.errors).toHaveLength(0)
    expect(result2.errors).toHaveLength(0)
  })

  /**
   * Test 5: Cognito UUID at maximum length (36 chars)
   * Validates: Requirements 2.2
   */
  test('should accept Cognito UUID at maximum length (36 chars)', () => {
    const cognitoUUID = '550e8400-e29b-41d4-a716-446655440000' // Exactly 36 chars
    const now = Math.floor(Date.now() / 1000)

    expect(cognitoUUID.length).toBe(36)

    const metadata: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: cognitoUUID,
      filename: 'test.h',
      file_type: FileType.H,
      file_size: 512,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${cognitoUUID}/test.h`,
      created_at: now,
      updated_at: now
    }

    const result = validator.validateCreate(metadata)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(metadata.user_id?.length).toBe(36)
  })

  /**
   * Test 6: Validator rejects user_id longer than 128 chars
   * Validates: Requirements 2.2
   */
  test('should reject user_id longer than 128 chars', () => {
    const tooLongUserId = 'a'.repeat(129)
    const now = Math.floor(Date.now() / 1000)

    const metadata: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: tooLongUserId,
      filename: 'test.hpp',
      file_type: FileType.HPP,
      file_size: 256,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${tooLongUserId}/test.hpp`,
      created_at: now,
      updated_at: now
    }

    const result = validator.validateCreate(metadata)
    expect(result.isValid).toBe(false)
    expect(result.errors).toContainEqual(
      expect.objectContaining({
        field: 'user_id'
      })
    )
  })

  /**
   * Test 7: Validator accepts custom user IDs up to 128 chars
   * Validates: Requirements 2.2
   */
  test('should accept custom user IDs up to 128 chars', () => {
    const customUserId = 'a'.repeat(128)
    const now = Math.floor(Date.now() / 1000)

    const metadata: Partial<FileMetadata> = {
      file_id: uuidv4(),
      user_id: customUserId,
      filename: 'test.c',
      file_type: FileType.C,
      file_size: 1024,
      upload_timestamp: now,
      analysis_status: AnalysisStatus.PENDING,
      s3_key: `uploads/${customUserId}/test.c`,
      created_at: now,
      updated_at: now
    }

    const result = validator.validateCreate(metadata)
    expect(result.isValid).toBe(true)
    expect(result.errors).toHaveLength(0)
    expect(metadata.user_id?.length).toBe(128)
  })

  /**
   * Test 8: Validator accepts Cognito UUID with special characters
   * Validates: Requirements 2.2
   */
  test('should accept Cognito UUID with hyphens', () => {
    const cognitoUUID = 'f47ac10b-58cc-4372-a567-0e02b2c3d479'
    
    expect(validator.validateUserId(cognitoUUID)).toBe(true)
  })

  /**
   * Test 9: Validator accepts user IDs with allowed special characters
   * Validates: Requirements 2.2
   */
  test('should accept user IDs with allowed special characters (@, ., -, _)', () => {
    expect(validator.validateUserId('user@example.com')).toBe(true)
    expect(validator.validateUserId('user.name')).toBe(true)
    expect(validator.validateUserId('user-name')).toBe(true)
    expect(validator.validateUserId('user_name')).toBe(true)
    expect(validator.validateUserId('user@domain.com-name_123')).toBe(true)
  })
})
