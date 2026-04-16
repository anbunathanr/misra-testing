"use strict";
/**
 * DynamoDB table configuration and Global Secondary Index definitions
 * for File Metadata Management system
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.DYNAMODB_CONFIG = exports.getTableName = exports.GSI_CONFIGURATIONS = exports.KEY_SCHEMA = exports.ATTRIBUTE_DEFINITIONS = exports.FILE_METADATA_TABLE_CONFIG = void 0;
/**
 * Primary table configuration for FileMetadata
 */
exports.FILE_METADATA_TABLE_CONFIG = {
    tableName: 'FileMetadata',
    partitionKey: 'file_id',
    billingMode: 'ON_DEMAND',
    // Global Secondary Indexes
    globalSecondaryIndexes: {
        // UserIndex: Query files by user_id, ordered by upload_timestamp
        UserIndex: {
            indexName: 'UserIndex',
            partitionKey: 'user_id',
            sortKey: 'upload_timestamp',
            projectionType: 'ALL'
        },
        // StatusIndex: Query files by analysis_status, ordered by upload_timestamp
        StatusIndex: {
            indexName: 'StatusIndex',
            partitionKey: 'analysis_status',
            sortKey: 'upload_timestamp',
            projectionType: 'ALL'
        },
        // UserStatusIndex: Combined queries for user's files by status
        UserStatusIndex: {
            indexName: 'UserStatusIndex',
            partitionKey: 'user_id',
            sortKey: 'analysis_status',
            projectionType: 'ALL'
        }
    }
};
/**
 * DynamoDB attribute definitions
 */
exports.ATTRIBUTE_DEFINITIONS = [
    { AttributeName: 'file_id', AttributeType: 'S' },
    { AttributeName: 'user_id', AttributeType: 'S' },
    { AttributeName: 'upload_timestamp', AttributeType: 'N' },
    { AttributeName: 'analysis_status', AttributeType: 'S' }
];
/**
 * Key schema for primary table
 */
exports.KEY_SCHEMA = [
    { AttributeName: 'file_id', KeyType: 'HASH' }
];
/**
 * Global Secondary Index configurations for CDK
 */
exports.GSI_CONFIGURATIONS = [
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
];
/**
 * Environment-specific table names
 */
const getTableName = (environment = 'dev') => {
    return `${exports.FILE_METADATA_TABLE_CONFIG.tableName}-${environment}`;
};
exports.getTableName = getTableName;
/**
 * DynamoDB client configuration
 */
exports.DYNAMODB_CONFIG = {
    region: process.env.AWS_REGION || 'us-east-1',
    maxRetries: 3,
    retryDelayOptions: {
        base: 300
    }
};
