/**
 * Jest test setup configuration
 * Sets up global test environment and utilities
 */

import '@jest/globals'

process.env.NODE_ENV = 'test'
process.env.AWS_REGION = 'us-east-1'
process.env.DYNAMODB_TABLE_NAME = 'FileMetadata-test'

jest.setTimeout(10000)

// Mock AWS SDK clients
jest.mock('@aws-sdk/client-dynamodb', () => {
  const mockSend = jest.fn()
  return {
    DynamoDBClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
      destroy: jest.fn(),
    })),
    mockSend, // Export for test access
  }
})

jest.mock('@aws-sdk/lib-dynamodb', () => {
  const mockSend = jest.fn()
  return {
    DynamoDBDocumentClient: {
      from: jest.fn().mockImplementation(() => ({
        send: mockSend,
        destroy: jest.fn(),
      })),
    },
    GetCommand: jest.fn(),
    PutCommand: jest.fn(),
    UpdateCommand: jest.fn(),
    DeleteCommand: jest.fn(),
    QueryCommand: jest.fn(),
    ScanCommand: jest.fn(),
    BatchGetCommand: jest.fn(),
    BatchWriteCommand: jest.fn(),
    mockSend, // Export for test access
  }
})

jest.mock('@aws-sdk/client-s3', () => {
  const mockSend = jest.fn()
  return {
    S3Client: jest.fn().mockImplementation(() => ({
      send: mockSend,
      destroy: jest.fn(),
    })),
    GetObjectCommand: jest.fn(),
    PutObjectCommand: jest.fn(),
    DeleteObjectCommand: jest.fn(),
    mockSend, // Export for test access
  }
})

jest.mock('@aws-sdk/client-bedrock-runtime', () => {
  const mockSend = jest.fn()
  return {
    BedrockRuntimeClient: jest.fn().mockImplementation(() => ({
      send: mockSend,
      destroy: jest.fn(),
    })),
    InvokeModelCommand: jest.fn(),
    mockSend, // Export for test access
  }
})
