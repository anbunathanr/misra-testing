/**
 * Tests for FileMetadataValidator
 * Validates user ID validation with Cognito UUIDs and custom formats
 */

import { FileMetadataValidator } from '../file-metadata-validator'
import { FileMetadata, FileType, AnalysisStatus } from '../../types/file-metadata'

describe('FileMetadataValidator', () => {
  let validator: FileMetadataValidator

  beforeEach(() => {
    validator = new FileMetadataValidator()
  })

  describe('validateUserId', () => {
    test('should accept valid Cognito UUID (36 chars)', () => {
      const cognitoUUID = '550e8400-e29b-41d4-a716-446655440000'
      expect(validator.validateUserId(cognitoUUID)).toBe(true)
    })

    test('should accept another valid Cognito UUID', () => {
      const cognitoUUID = 'a1b2c3d4-e5f6-47a8-b9c0-d1e2f3a4b5c6'
      expect(validator.validateUserId(cognitoUUID)).toBe(true)
    })

    test('should accept custom user IDs with 3-32 chars (backward compatibility)', () => {
      expect(validator.validateUserId('user123')).toBe(true)
      expect(validator.validateUserId('abc')).toBe(true)
      expect(validator.validateUserId('user-name_123')).toBe(true)
    })

    test('should accept custom user IDs up to 128 chars', () => {
      const longUserId = 'a'.repeat(128)
      expect(validator.validateUserId(longUserId)).toBe(true)
    })

    test('should accept user IDs with special characters (@, .)', () => {
      expect(validator.validateUserId('user@example.com')).toBe(true)
      expect(validator.validateUserId('user.name@domain')).toBe(true)
    })

    test('should accept user IDs with hyphens and underscores', () => {
      expect(validator.validateUserId('user-name_123')).toBe(true)
      expect(validator.validateUserId('user_name-123')).toBe(true)
    })

    test('should reject user IDs shorter than 3 chars', () => {
      expect(validator.validateUserId('ab')).toBe(false)
      expect(validator.validateUserId('a')).toBe(false)
      expect(validator.validateUserId('')).toBe(false)
    })

    test('should reject user IDs longer than 128 chars', () => {
      const tooLongUserId = 'a'.repeat(129)
      expect(validator.validateUserId(tooLongUserId)).toBe(false)
    })

    test('should reject user IDs with invalid characters', () => {
      expect(validator.validateUserId('user#name')).toBe(false)
      expect(validator.validateUserId('user$name')).toBe(false)
      expect(validator.validateUserId('user name')).toBe(false)
      expect(validator.validateUserId('user/name')).toBe(false)
    })

    test('should reject non-string values', () => {
      expect(validator.validateUserId(null as any)).toBe(false)
      expect(validator.validateUserId(undefined as any)).toBe(false)
      expect(validator.validateUserId(123 as any)).toBe(false)
    })
  })

  describe('validateCreate with Cognito UUID', () => {
    test('should accept file metadata with Cognito UUID user_id', () => {
      const now = Math.floor(Date.now() / 1000)
      const metadata: Partial<FileMetadata> = {
        file_id: '550e8400-e29b-4000-a716-446655440001', // Valid UUID v4
        user_id: '550e8400-e29b-41d4-a716-446655440000',
        filename: 'test.c',
        file_type: FileType.C,
        file_size: 1024,
        upload_timestamp: now,
        analysis_status: AnalysisStatus.PENDING,
        s3_key: 'uploads/test/file.c',
        created_at: now,
        updated_at: now
      }

      const result = validator.validateCreate(metadata)
      expect(result.isValid).toBe(true)
      expect(result.errors).toHaveLength(0)
    })

    test('should reject file metadata with invalid user_id', () => {
      const now = Math.floor(Date.now() / 1000)
      const metadata: Partial<FileMetadata> = {
        file_id: '550e8400-e29b-4000-a716-446655440001', // Valid UUID v4
        user_id: 'ab', // Too short
        filename: 'test.c',
        file_type: FileType.C,
        file_size: 1024,
        upload_timestamp: now,
        analysis_status: AnalysisStatus.PENDING,
        s3_key: 'uploads/test/file.c',
        created_at: now,
        updated_at: now
      }

      const result = validator.validateCreate(metadata)
      expect(result.isValid).toBe(false)
      expect(result.errors).toContainEqual(
        expect.objectContaining({
          field: 'user_id',
          message: expect.stringContaining('3-128 characters')
        })
      )
    })
  })

  describe('error message', () => {
    test('should have descriptive error message for user_id validation', () => {
      const now = Math.floor(Date.now() / 1000)
      const metadata: Partial<FileMetadata> = {
        file_id: '550e8400-e29b-4000-a716-446655440001', // Valid UUID v4
        user_id: 'invalid user id!', // Invalid characters
        filename: 'test.c',
        file_type: FileType.C,
        file_size: 1024,
        upload_timestamp: now,
        analysis_status: AnalysisStatus.PENDING,
        s3_key: 'uploads/test/file.c',
        created_at: now,
        updated_at: now
      }

      const result = validator.validateCreate(metadata)
      expect(result.isValid).toBe(false)
      
      const userIdError = result.errors.find(e => e.field === 'user_id')
      expect(userIdError).toBeDefined()
      expect(userIdError?.message).toContain('3-128 characters')
      expect(userIdError?.message).toContain('alphanumeric')
      expect(userIdError?.message).toContain('hyphen')
      expect(userIdError?.message).toContain('underscore')
    })
  })
})
