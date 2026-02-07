/**
 * Property-based tests for CRUD operations
 * Tests Properties 1, 4, and 13 from the design document
 */

import * as fc from 'fast-check'
import { FileMetadataService } from '../../services/file-metadata-service'
import { DynamoDBClientWrapper } from '../../database/dynamodb-client'
import { fileMetadataGenerator } from '../generators/file-metadata-generators'
import { FileMetadata } from '../../types/file-metadata'

describe('CRUD Operations Properties', () => {
  let service: FileMetadataService
  let dbClient: DynamoDBClientWrapper
  const createdFileIds: string[] = []

  beforeAll(() => {
    dbClient = new DynamoDBClientWrapper('test')
    service = new FileMetadataService(dbClient)
  })

  afterEach(async () => {
    for (const fileId of createdFileIds) {
      try {
        const metadata = await service.getFileMetadata(fileId)
        if (metadata) {
          await service.deleteFileMetadata(fileId, metadata.user_id)
        }
      } catch (error) {
        // Ignore errors during cleanup
      }
    }
    createdFileIds.length = 0
  })

  afterAll(async () => {
    await dbClient.close()
  })

  /**
   * **Validates: Requirements 1.1, 1.2, 4.1, 4.4**
   */
  test('Property 1: File metadata storage completeness', async () => {
    await fc.assert(
      fc.asyncProperty(fileMetadataGenerator(), async (metadata: FileMetadata) => {
        createdFileIds.push(metadata.file_id)

        const created = await service.createFileMetadata(metadata)
        const retrieved = await service.getFileMetadata(metadata.file_id)

        expect(retrieved).not.toBeNull()
        expect(retrieved?.file_id).toBe(metadata.file_id)
        expect(retrieved?.user_id).toBe(metadata.user_id)
        expect(retrieved?.filename).toBe(metadata.filename)
        expect(retrieved?.file_type).toBe(metadata.file_type)
        expect(retrieved?.file_size).toBe(metadata.file_size)
        expect(retrieved?.upload_timestamp).toBe(metadata.upload_timestamp)
        expect(retrieved?.analysis_status).toBe(metadata.analysis_status)
        expect(retrieved?.s3_key).toBe(metadata.s3_key)
        expect(retrieved?.created_at).toBe(metadata.created_at)
        expect(retrieved?.updated_at).toBe(metadata.updated_at)

        if (metadata.analysis_results) {
          expect(retrieved?.analysis_results).toEqual(metadata.analysis_results)
        }
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 4.1**
   */
  test('Property 4: Single file retrieval accuracy', async () => {
    await fc.assert(
      fc.asyncProperty(fileMetadataGenerator(), async (metadata: FileMetadata) => {
        createdFileIds.push(metadata.file_id)

        await service.createFileMetadata(metadata)
        const retrieved = await service.getFileMetadata(metadata.file_id)

        expect(retrieved).not.toBeNull()
        expect(retrieved).toEqual(metadata)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 6.1**
   */
  test('Property 13: Complete deletion', async () => {
    await fc.assert(
      fc.asyncProperty(fileMetadataGenerator(), async (metadata: FileMetadata) => {
        await service.createFileMetadata(metadata)

        const beforeDelete = await service.getFileMetadata(metadata.file_id)
        expect(beforeDelete).not.toBeNull()

        await service.deleteFileMetadata(metadata.file_id, metadata.user_id)

        const afterDelete = await service.getFileMetadata(metadata.file_id)
        expect(afterDelete).toBeNull()

        const index = createdFileIds.indexOf(metadata.file_id)
        if (index > -1) {
          createdFileIds.splice(index, 1)
        }
      }),
      { numRuns: 100 }
    )
  })

  test('Property 13 (edge case): Deletion of non-existent file throws error', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (fileId: string, userId: string) => {
          await expect(
            service.deleteFileMetadata(fileId, userId)
          ).rejects.toThrow('File not found')
        }
      ),
      { numRuns: 100 }
    )
  })

  test('Property 13 (edge case): Deletion fails for non-owner', async () => {
    await fc.assert(
      fc.asyncProperty(
        fileMetadataGenerator(),
        fc.string({ minLength: 1, maxLength: 50 }),
        async (metadata: FileMetadata, differentUserId: string) => {
          fc.pre(differentUserId !== metadata.user_id)

          createdFileIds.push(metadata.file_id)

          await service.createFileMetadata(metadata)

          await expect(
            service.deleteFileMetadata(metadata.file_id, differentUserId)
          ).rejects.toThrow('Unauthorized')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 1.4**
   */
  test('Property 2: File ID uniqueness enforcement', async () => {
    await fc.assert(
      fc.asyncProperty(fileMetadataGenerator(), async (metadata: FileMetadata) => {
        createdFileIds.push(metadata.file_id)

        await service.createFileMetadata(metadata)

        await expect(
          service.createFileMetadata(metadata)
        ).rejects.toThrow()
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 1.5**
   */
  test('Property 3: Automatic timestamp generation', async () => {
    await fc.assert(
      fc.asyncProperty(fileMetadataGenerator(), async (metadata: FileMetadata) => {
        createdFileIds.push(metadata.file_id)

        const beforeTimestamp = Math.floor(Date.now() / 1000)

        const created = await service.createFileMetadata(metadata)

        const afterTimestamp = Math.floor(Date.now() / 1000)

        expect(created.upload_timestamp).toBeGreaterThanOrEqual(beforeTimestamp - 1)
        expect(created.upload_timestamp).toBeLessThanOrEqual(afterTimestamp + 1)

        expect(created.created_at).toBeGreaterThanOrEqual(beforeTimestamp * 1000 - 1000)
        expect(created.created_at).toBeLessThanOrEqual(afterTimestamp * 1000 + 1000)
        expect(created.updated_at).toBeGreaterThanOrEqual(beforeTimestamp * 1000 - 1000)
        expect(created.updated_at).toBeLessThanOrEqual(afterTimestamp * 1000 + 1000)
      }),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 4.2, 5.3, 6.3**
   */
  test('Property 5: Non-existent file error handling', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.uuid(),
        async (nonExistentFileId: string) => {
          const result = await service.getFileMetadata(nonExistentFileId)
          expect(result).toBeNull()

          await expect(
            service.updateFileMetadata(nonExistentFileId, { analysis_status: 'completed' as any })
          ).rejects.toThrow('File not found')

          await expect(
            service.deleteFileMetadata(nonExistentFileId, 'some-user-id')
          ).rejects.toThrow('File not found')
        }
      ),
      { numRuns: 100 }
    )
  })

  /**
   * **Validates: Requirements 4.3, 6.4, 6.5**
   */
  test('Property 15: Batch operation consistency', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fileMetadataGenerator(), { minLength: 2, maxLength: 10 }),
        async (metadataArray: FileMetadata[]) => {
          metadataArray.forEach(m => createdFileIds.push(m.file_id))

          await Promise.all(
            metadataArray.map(metadata => service.createFileMetadata(metadata))
          )

          const fileIds = metadataArray.map(m => m.file_id)
          const batchResults = await service.batchGetFiles(fileIds)

          expect(batchResults.length).toBe(metadataArray.length)

          const resultIds = batchResults.map(r => r.file_id)
          fileIds.forEach(id => {
            expect(resultIds).toContain(id)
          })

          batchResults.forEach(result => {
            const original = metadataArray.find(m => m.file_id === result.file_id)
            expect(original).toBeDefined()
            expect(result).toEqual(original)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 15 (edge case): Batch get with non-existent files', async () => {
    await fc.assert(
      fc.asyncProperty(
        fc.array(fileMetadataGenerator(), { minLength: 2, maxLength: 5 }),
        fc.array(fc.uuid(), { minLength: 2, maxLength: 5 }),
        async (existingMetadata: FileMetadata[], nonExistentIds: string[]) => {
          existingMetadata.forEach(m => createdFileIds.push(m.file_id))

          await Promise.all(
            existingMetadata.map(metadata => service.createFileMetadata(metadata))
          )

          const allIds = [
            ...existingMetadata.map(m => m.file_id),
            ...nonExistentIds
          ]

          const results = await service.batchGetFiles(allIds)

          expect(results.length).toBe(existingMetadata.length)

          const existingIds = existingMetadata.map(m => m.file_id)
          results.forEach(result => {
            expect(existingIds).toContain(result.file_id)
          })
        }
      ),
      { numRuns: 50 }
    )
  })

  test('Property 15 (edge case): Batch get with empty array', async () => {
    const results = await service.batchGetFiles([])
    expect(results).toEqual([])
  })
})
