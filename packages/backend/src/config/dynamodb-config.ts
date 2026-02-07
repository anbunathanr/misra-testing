/**
 * DynamoDB table configuration and Global Secondary Index definitions
 * for File Metadata Management system
 */

/**
 * Primary table configuration for FileMetadata
 */
export const FILE_METADATA_TABLE_CONFIG = {
  tableName: 'FileMetadata',
  partitionKey: 'file_id',
  billingMode: 'ON_DEMAND' as const,
  
  // Global Secondary Indexes
  globalSecondaryIndexes: {
    // UserIndex: Query files by user_id, ordered by upload_timestamp
    UserIndex: {
      indexName: 'UserIndex',
      partitionKey: 'user_id',
      sortKey: 'upload_timestamp',
      projectionType: 'ALL' as const
    },
    
    // StatusIndex: Query files by analysis_status, ordered by upload_timestamp
    StatusIndex: {
      indexName: 'StatusIndex',
      partitionKey: 'analysis_status',
      sortKey: 'upload_timestamp',
      projectionType: 'ALL' as const
    },
    
    // UserStatusIndex: Combined queries for user's files by status
    UserStatusIndex: {
      indexName: 'UserStatusIndex',
      partitionKey: 'user_id',
      sortKey: 'analysis_status',
      projectionType: 'ALL' as const
    }
  }
} as const

/**
 * DynamoDB attribute definitions
 */
export const ATTRIBUTE_DEFINITIONS = [
  { AttributeName: 'file_id', AttributeType: 'S' },
  { AttributeName: 'user_id', AttributeType: 'S' },
  { AttributeName: 'upload_timestamp', AttributeType: 'N' },
  { AttributeName: 'analysis_status', AttributeType: 'S' }
] as const

/**
 * Key schema for primary table
 */
export const KEY_SCHEMA = [
  { AttributeName: 'file_id', KeyType: 'HASH' }
] as const

/**
 * Global Secondary Index configurations for CDK
 */
export const GSI_CONFIGURATIONS = [
  {
    IndexName: 'UserIndex',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'upload_timestamp', KeyType: 'RANGE' }
    ],
    Projection: { ProjectionType: 'ALL' }
  },
  {
    IndexName: 'StatusIndex',
    KeySchema: [
      { AttributeName: 'analysis_status', KeyType: 'HASH' },
      { AttributeName: 'upload_timestamp', KeyType: 'RANGE' }
    ],
    Projection: { ProjectionType: 'ALL' }
  },
  {
    IndexName: 'UserStatusIndex',
    KeySchema: [
      { AttributeName: 'user_id', KeyType: 'HASH' },
      { AttributeName: 'analysis_status', KeyType: 'RANGE' }
    ],
    Projection: { ProjectionType: 'ALL' }
  }
] as const

/**
 * Environment-specific table names
 */
export const getTableName = (environment: string = 'dev'): string => {
  return `${FILE_METADATA_TABLE_CONFIG.tableName}-${environment}`
}

/**
 * DynamoDB client configuration
 */
export const DYNAMODB_CONFIG = {
  region: process.env.AWS_REGION || 'us-east-1',
  maxRetries: 3,
  retryDelayOptions: {
    base: 300
  }
} as const
