/**
 * Jest test setup configuration
 * Sets up global test environment and utilities
 */

process.env.NODE_ENV = 'test'
process.env.AWS_REGION = 'us-east-1'
process.env.DYNAMODB_TABLE_NAME = 'FileMetadata-test'

jest.setTimeout(10000)

jest.mock('@aws-sdk/client-dynamodb')
jest.mock('@aws-sdk/lib-dynamodb')
jest.mock('@aws-sdk/client-s3')
