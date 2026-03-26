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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZHluYW1vZGItY29uZmlnLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZHluYW1vZGItY29uZmlnLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVIOztHQUVHO0FBQ1UsUUFBQSwwQkFBMEIsR0FBRztJQUN4QyxTQUFTLEVBQUUsY0FBYztJQUN6QixZQUFZLEVBQUUsU0FBUztJQUN2QixXQUFXLEVBQUUsV0FBb0I7SUFFakMsMkJBQTJCO0lBQzNCLHNCQUFzQixFQUFFO1FBQ3RCLGlFQUFpRTtRQUNqRSxTQUFTLEVBQUU7WUFDVCxTQUFTLEVBQUUsV0FBVztZQUN0QixZQUFZLEVBQUUsU0FBUztZQUN2QixPQUFPLEVBQUUsa0JBQWtCO1lBQzNCLGNBQWMsRUFBRSxLQUFjO1NBQy9CO1FBRUQsMkVBQTJFO1FBQzNFLFdBQVcsRUFBRTtZQUNYLFNBQVMsRUFBRSxhQUFhO1lBQ3hCLFlBQVksRUFBRSxpQkFBaUI7WUFDL0IsT0FBTyxFQUFFLGtCQUFrQjtZQUMzQixjQUFjLEVBQUUsS0FBYztTQUMvQjtRQUVELCtEQUErRDtRQUMvRCxlQUFlLEVBQUU7WUFDZixTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLFlBQVksRUFBRSxTQUFTO1lBQ3ZCLE9BQU8sRUFBRSxpQkFBaUI7WUFDMUIsY0FBYyxFQUFFLEtBQWM7U0FDL0I7S0FDRjtDQUNPLENBQUE7QUFFVjs7R0FFRztBQUNVLFFBQUEscUJBQXFCLEdBQUc7SUFDbkMsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDaEQsRUFBRSxhQUFhLEVBQUUsU0FBUyxFQUFFLGFBQWEsRUFBRSxHQUFHLEVBQUU7SUFDaEQsRUFBRSxhQUFhLEVBQUUsa0JBQWtCLEVBQUUsYUFBYSxFQUFFLEdBQUcsRUFBRTtJQUN6RCxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxhQUFhLEVBQUUsR0FBRyxFQUFFO0NBQ2hELENBQUE7QUFFVjs7R0FFRztBQUNVLFFBQUEsVUFBVSxHQUFHO0lBQ3hCLEVBQUUsYUFBYSxFQUFFLFNBQVMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFO0NBQ3JDLENBQUE7QUFFVjs7R0FFRztBQUNVLFFBQUEsa0JBQWtCLEdBQUc7SUFDaEM7UUFDRSxTQUFTLEVBQUUsV0FBVztRQUN0QixTQUFTLEVBQUU7WUFDVCxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtZQUM3QyxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO1NBQ3hEO1FBQ0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTtLQUN0QztJQUNEO1FBQ0UsU0FBUyxFQUFFLGFBQWE7UUFDeEIsU0FBUyxFQUFFO1lBQ1QsRUFBRSxhQUFhLEVBQUUsaUJBQWlCLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtZQUNyRCxFQUFFLGFBQWEsRUFBRSxrQkFBa0IsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO1NBQ3hEO1FBQ0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTtLQUN0QztJQUNEO1FBQ0UsU0FBUyxFQUFFLGlCQUFpQjtRQUM1QixTQUFTLEVBQUU7WUFDVCxFQUFFLGFBQWEsRUFBRSxTQUFTLEVBQUUsT0FBTyxFQUFFLE1BQU0sRUFBRTtZQUM3QyxFQUFFLGFBQWEsRUFBRSxpQkFBaUIsRUFBRSxPQUFPLEVBQUUsT0FBTyxFQUFFO1NBQ3ZEO1FBQ0QsVUFBVSxFQUFFLEVBQUUsY0FBYyxFQUFFLEtBQUssRUFBRTtLQUN0QztDQUNPLENBQUE7QUFFVjs7R0FFRztBQUNJLE1BQU0sWUFBWSxHQUFHLENBQUMsY0FBc0IsS0FBSyxFQUFVLEVBQUU7SUFDbEUsT0FBTyxHQUFHLGtDQUEwQixDQUFDLFNBQVMsSUFBSSxXQUFXLEVBQUUsQ0FBQTtBQUNqRSxDQUFDLENBQUE7QUFGWSxRQUFBLFlBQVksZ0JBRXhCO0FBRUQ7O0dBRUc7QUFDVSxRQUFBLGVBQWUsR0FBRztJQUM3QixNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUM3QyxVQUFVLEVBQUUsQ0FBQztJQUNiLGlCQUFpQixFQUFFO1FBQ2pCLElBQUksRUFBRSxHQUFHO0tBQ1Y7Q0FDTyxDQUFBIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIER5bmFtb0RCIHRhYmxlIGNvbmZpZ3VyYXRpb24gYW5kIEdsb2JhbCBTZWNvbmRhcnkgSW5kZXggZGVmaW5pdGlvbnNcclxuICogZm9yIEZpbGUgTWV0YWRhdGEgTWFuYWdlbWVudCBzeXN0ZW1cclxuICovXHJcblxyXG4vKipcclxuICogUHJpbWFyeSB0YWJsZSBjb25maWd1cmF0aW9uIGZvciBGaWxlTWV0YWRhdGFcclxuICovXHJcbmV4cG9ydCBjb25zdCBGSUxFX01FVEFEQVRBX1RBQkxFX0NPTkZJRyA9IHtcclxuICB0YWJsZU5hbWU6ICdGaWxlTWV0YWRhdGEnLFxyXG4gIHBhcnRpdGlvbktleTogJ2ZpbGVfaWQnLFxyXG4gIGJpbGxpbmdNb2RlOiAnT05fREVNQU5EJyBhcyBjb25zdCxcclxuICBcclxuICAvLyBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4ZXNcclxuICBnbG9iYWxTZWNvbmRhcnlJbmRleGVzOiB7XHJcbiAgICAvLyBVc2VySW5kZXg6IFF1ZXJ5IGZpbGVzIGJ5IHVzZXJfaWQsIG9yZGVyZWQgYnkgdXBsb2FkX3RpbWVzdGFtcFxyXG4gICAgVXNlckluZGV4OiB7XHJcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogJ3VzZXJfaWQnLFxyXG4gICAgICBzb3J0S2V5OiAndXBsb2FkX3RpbWVzdGFtcCcsXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiAnQUxMJyBhcyBjb25zdFxyXG4gICAgfSxcclxuICAgIFxyXG4gICAgLy8gU3RhdHVzSW5kZXg6IFF1ZXJ5IGZpbGVzIGJ5IGFuYWx5c2lzX3N0YXR1cywgb3JkZXJlZCBieSB1cGxvYWRfdGltZXN0YW1wXHJcbiAgICBTdGF0dXNJbmRleDoge1xyXG4gICAgICBpbmRleE5hbWU6ICdTdGF0dXNJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogJ2FuYWx5c2lzX3N0YXR1cycsXHJcbiAgICAgIHNvcnRLZXk6ICd1cGxvYWRfdGltZXN0YW1wJyxcclxuICAgICAgcHJvamVjdGlvblR5cGU6ICdBTEwnIGFzIGNvbnN0XHJcbiAgICB9LFxyXG4gICAgXHJcbiAgICAvLyBVc2VyU3RhdHVzSW5kZXg6IENvbWJpbmVkIHF1ZXJpZXMgZm9yIHVzZXIncyBmaWxlcyBieSBzdGF0dXNcclxuICAgIFVzZXJTdGF0dXNJbmRleDoge1xyXG4gICAgICBpbmRleE5hbWU6ICdVc2VyU3RhdHVzSW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6ICd1c2VyX2lkJyxcclxuICAgICAgc29ydEtleTogJ2FuYWx5c2lzX3N0YXR1cycsXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiAnQUxMJyBhcyBjb25zdFxyXG4gICAgfVxyXG4gIH1cclxufSBhcyBjb25zdFxyXG5cclxuLyoqXHJcbiAqIER5bmFtb0RCIGF0dHJpYnV0ZSBkZWZpbml0aW9uc1xyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEFUVFJJQlVURV9ERUZJTklUSU9OUyA9IFtcclxuICB7IEF0dHJpYnV0ZU5hbWU6ICdmaWxlX2lkJywgQXR0cmlidXRlVHlwZTogJ1MnIH0sXHJcbiAgeyBBdHRyaWJ1dGVOYW1lOiAndXNlcl9pZCcsIEF0dHJpYnV0ZVR5cGU6ICdTJyB9LFxyXG4gIHsgQXR0cmlidXRlTmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLCBBdHRyaWJ1dGVUeXBlOiAnTicgfSxcclxuICB7IEF0dHJpYnV0ZU5hbWU6ICdhbmFseXNpc19zdGF0dXMnLCBBdHRyaWJ1dGVUeXBlOiAnUycgfVxyXG5dIGFzIGNvbnN0XHJcblxyXG4vKipcclxuICogS2V5IHNjaGVtYSBmb3IgcHJpbWFyeSB0YWJsZVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IEtFWV9TQ0hFTUEgPSBbXHJcbiAgeyBBdHRyaWJ1dGVOYW1lOiAnZmlsZV9pZCcsIEtleVR5cGU6ICdIQVNIJyB9XHJcbl0gYXMgY29uc3RcclxuXHJcbi8qKlxyXG4gKiBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4IGNvbmZpZ3VyYXRpb25zIGZvciBDREtcclxuICovXHJcbmV4cG9ydCBjb25zdCBHU0lfQ09ORklHVVJBVElPTlMgPSBbXHJcbiAge1xyXG4gICAgSW5kZXhOYW1lOiAnVXNlckluZGV4JyxcclxuICAgIEtleVNjaGVtYTogW1xyXG4gICAgICB7IEF0dHJpYnV0ZU5hbWU6ICd1c2VyX2lkJywgS2V5VHlwZTogJ0hBU0gnIH0sXHJcbiAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLCBLZXlUeXBlOiAnUkFOR0UnIH1cclxuICAgIF0sXHJcbiAgICBQcm9qZWN0aW9uOiB7IFByb2plY3Rpb25UeXBlOiAnQUxMJyB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBJbmRleE5hbWU6ICdTdGF0dXNJbmRleCcsXHJcbiAgICBLZXlTY2hlbWE6IFtcclxuICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnYW5hbHlzaXNfc3RhdHVzJywgS2V5VHlwZTogJ0hBU0gnIH0sXHJcbiAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLCBLZXlUeXBlOiAnUkFOR0UnIH1cclxuICAgIF0sXHJcbiAgICBQcm9qZWN0aW9uOiB7IFByb2plY3Rpb25UeXBlOiAnQUxMJyB9XHJcbiAgfSxcclxuICB7XHJcbiAgICBJbmRleE5hbWU6ICdVc2VyU3RhdHVzSW5kZXgnLFxyXG4gICAgS2V5U2NoZW1hOiBbXHJcbiAgICAgIHsgQXR0cmlidXRlTmFtZTogJ3VzZXJfaWQnLCBLZXlUeXBlOiAnSEFTSCcgfSxcclxuICAgICAgeyBBdHRyaWJ1dGVOYW1lOiAnYW5hbHlzaXNfc3RhdHVzJywgS2V5VHlwZTogJ1JBTkdFJyB9XHJcbiAgICBdLFxyXG4gICAgUHJvamVjdGlvbjogeyBQcm9qZWN0aW9uVHlwZTogJ0FMTCcgfVxyXG4gIH1cclxuXSBhcyBjb25zdFxyXG5cclxuLyoqXHJcbiAqIEVudmlyb25tZW50LXNwZWNpZmljIHRhYmxlIG5hbWVzXHJcbiAqL1xyXG5leHBvcnQgY29uc3QgZ2V0VGFibGVOYW1lID0gKGVudmlyb25tZW50OiBzdHJpbmcgPSAnZGV2Jyk6IHN0cmluZyA9PiB7XHJcbiAgcmV0dXJuIGAke0ZJTEVfTUVUQURBVEFfVEFCTEVfQ09ORklHLnRhYmxlTmFtZX0tJHtlbnZpcm9ubWVudH1gXHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEeW5hbW9EQiBjbGllbnQgY29uZmlndXJhdGlvblxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IERZTkFNT0RCX0NPTkZJRyA9IHtcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbiAgbWF4UmV0cmllczogMyxcclxuICByZXRyeURlbGF5T3B0aW9uczoge1xyXG4gICAgYmFzZTogMzAwXHJcbiAgfVxyXG59IGFzIGNvbnN0XHJcbiJdfQ==