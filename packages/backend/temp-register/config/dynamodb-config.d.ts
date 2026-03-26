/**
 * DynamoDB table configuration and Global Secondary Index definitions
 * for File Metadata Management system
 */
/**
 * Primary table configuration for FileMetadata
 */
export declare const FILE_METADATA_TABLE_CONFIG: {
    readonly tableName: "FileMetadata";
    readonly partitionKey: "file_id";
    readonly billingMode: "ON_DEMAND";
    readonly globalSecondaryIndexes: {
        readonly UserIndex: {
            readonly indexName: "UserIndex";
            readonly partitionKey: "user_id";
            readonly sortKey: "upload_timestamp";
            readonly projectionType: "ALL";
        };
        readonly StatusIndex: {
            readonly indexName: "StatusIndex";
            readonly partitionKey: "analysis_status";
            readonly sortKey: "upload_timestamp";
            readonly projectionType: "ALL";
        };
        readonly UserStatusIndex: {
            readonly indexName: "UserStatusIndex";
            readonly partitionKey: "user_id";
            readonly sortKey: "analysis_status";
            readonly projectionType: "ALL";
        };
    };
};
/**
 * DynamoDB attribute definitions
 */
export declare const ATTRIBUTE_DEFINITIONS: readonly [{
    readonly AttributeName: "file_id";
    readonly AttributeType: "S";
}, {
    readonly AttributeName: "user_id";
    readonly AttributeType: "S";
}, {
    readonly AttributeName: "upload_timestamp";
    readonly AttributeType: "N";
}, {
    readonly AttributeName: "analysis_status";
    readonly AttributeType: "S";
}];
/**
 * Key schema for primary table
 */
export declare const KEY_SCHEMA: readonly [{
    readonly AttributeName: "file_id";
    readonly KeyType: "HASH";
}];
/**
 * Global Secondary Index configurations for CDK
 */
export declare const GSI_CONFIGURATIONS: readonly [{
    readonly IndexName: "UserIndex";
    readonly KeySchema: readonly [{
        readonly AttributeName: "user_id";
        readonly KeyType: "HASH";
    }, {
        readonly AttributeName: "upload_timestamp";
        readonly KeyType: "RANGE";
    }];
    readonly Projection: {
        readonly ProjectionType: "ALL";
    };
}, {
    readonly IndexName: "StatusIndex";
    readonly KeySchema: readonly [{
        readonly AttributeName: "analysis_status";
        readonly KeyType: "HASH";
    }, {
        readonly AttributeName: "upload_timestamp";
        readonly KeyType: "RANGE";
    }];
    readonly Projection: {
        readonly ProjectionType: "ALL";
    };
}, {
    readonly IndexName: "UserStatusIndex";
    readonly KeySchema: readonly [{
        readonly AttributeName: "user_id";
        readonly KeyType: "HASH";
    }, {
        readonly AttributeName: "analysis_status";
        readonly KeyType: "RANGE";
    }];
    readonly Projection: {
        readonly ProjectionType: "ALL";
    };
}];
/**
 * Environment-specific table names
 */
export declare const getTableName: (environment?: string) => string;
/**
 * DynamoDB client configuration
 */
export declare const DYNAMODB_CONFIG: {
    readonly region: string;
    readonly maxRetries: 3;
    readonly retryDelayOptions: {
        readonly base: 300;
    };
};
