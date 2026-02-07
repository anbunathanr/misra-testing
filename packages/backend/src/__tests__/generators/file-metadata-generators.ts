/**
 * Fast-check generators for property-based testing
 * Generates realistic test data for FileMetadata and related types
 */

import * as fc from 'fast-check'
import { v4 as uuidv4 } from 'uuid'
import { FileMetadata, FileType, AnalysisStatus, AnalysisResults } from '../../types/file-metadata'

export const uuidGenerator = (): fc.Arbitrary<string> => 
  fc.constant(uuidv4())

export const fileTypeGenerator = (): fc.Arbitrary<FileType> =>
  fc.constantFrom(FileType.C, FileType.CPP, FileType.H, FileType.HPP)

export const analysisStatusGenerator = (): fc.Arbitrary<AnalysisStatus> =>
  fc.constantFrom(
    AnalysisStatus.PENDING,
    AnalysisStatus.IN_PROGRESS,
    AnalysisStatus.COMPLETED,
    AnalysisStatus.FAILED
  )

export const filenameGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    fc.stringMatching(/^[a-zA-Z0-9_-]{1,50}$/),
    fileTypeGenerator()
  ).map(([name, type]) => `${name}.${type}`)

export const fileSizeGenerator = (): fc.Arbitrary<number> =>
  fc.integer({ min: 1, max: 100 * 1024 * 1024 })

export const timestampGenerator = (): fc.Arbitrary<number> => {
  const now = Date.now()
  const oneYearAgo = now - (365 * 24 * 60 * 60 * 1000)
  return fc.integer({ min: Math.floor(oneYearAgo / 1000), max: Math.floor(now / 1000) })
}

export const userIdGenerator = (): fc.Arbitrary<string> =>
  fc.stringMatching(/^[a-zA-Z0-9]{8,32}$/)

export const s3KeyGenerator = (): fc.Arbitrary<string> =>
  fc.tuple(
    userIdGenerator(),
    uuidGenerator(),
    filenameGenerator()
  ).map(([userId, fileId, filename]) => `uploads/${userId}/${fileId}/${filename}`)

export const analysisResultsGenerator = (): fc.Arbitrary<AnalysisResults> =>
  fc.record({
    violations_count: fc.integer({ min: 0, max: 1000 }),
    rules_checked: fc.array(fc.string({ minLength: 5, maxLength: 20 }), { minLength: 1, maxLength: 50 }),
    completion_timestamp: timestampGenerator(),
    error_message: fc.option(fc.string({ minLength: 10, maxLength: 200 }), { nil: undefined })
  }, { requiredKeys: ['violations_count', 'rules_checked', 'completion_timestamp'] }) as fc.Arbitrary<AnalysisResults>

export const fileMetadataGenerator = (): fc.Arbitrary<FileMetadata> => {
  return fc.record({
    file_id: uuidGenerator(),
    user_id: userIdGenerator(),
    filename: filenameGenerator(),
    file_type: fileTypeGenerator(),
    file_size: fileSizeGenerator(),
    upload_timestamp: timestampGenerator(),
    analysis_status: analysisStatusGenerator(),
    analysis_results: fc.option(analysisResultsGenerator(), { nil: undefined }),
    s3_key: s3KeyGenerator(),
    created_at: timestampGenerator(),
    updated_at: timestampGenerator()
  }, { 
    requiredKeys: [
      'file_id', 
      'user_id', 
      'filename', 
      'file_type', 
      'file_size', 
      'upload_timestamp', 
      'analysis_status', 
      's3_key', 
      'created_at', 
      'updated_at'
    ] 
  }) as fc.Arbitrary<FileMetadata>
}

export const partialFileMetadataGenerator = (): fc.Arbitrary<Partial<FileMetadata>> =>
  fc.record({
    analysis_status: fc.option(analysisStatusGenerator(), { nil: undefined }),
    analysis_results: fc.option(analysisResultsGenerator(), { nil: undefined }),
    updated_at: fc.option(timestampGenerator(), { nil: undefined })
  }, { requiredKeys: [] }) as fc.Arbitrary<Partial<FileMetadata>>

export const invalidFileIdGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(''),
    fc.constant('not-a-uuid'),
    fc.string({ minLength: 1, maxLength: 10 }),
    fc.constant('12345678-1234-1234-1234-123456789012'),
    fc.constant('xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx')
  )

export const invalidFileTypeGenerator = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(''),
    fc.constant('txt'),
    fc.constant('js'),
    fc.constant('py'),
    fc.string({ minLength: 1, maxLength: 10 }).filter(s => !['c', 'cpp', 'h', 'hpp'].includes(s))
  )

export const invalidFileSizeGenerator = (): fc.Arbitrary<number> =>
  fc.oneof(
    fc.constant(0),
    fc.constant(-1),
    fc.integer({ max: -1 })
  )
