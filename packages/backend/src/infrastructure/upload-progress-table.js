"use strict";
/**
 * AWS CDK infrastructure definition for Upload Progress DynamoDB Table
 * Task 4.2: Build file upload progress monitoring
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UploadProgressTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class UploadProgressTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `UploadProgress-${environment}`;
        // Create the DynamoDB table for upload progress tracking
        this.table = new aws_dynamodb_1.Table(this, 'UploadProgressTable', {
            tableName,
            // Primary key: file_id (partition key)
            partitionKey: {
                name: 'file_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            // Billing mode - on-demand for variable workloads
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            // Enable point-in-time recovery for production
            pointInTimeRecovery: environment === 'prod',
            // TTL for automatic cleanup of old progress records
            timeToLiveAttribute: 'ttl',
            // DynamoDB Streams for real-time updates (optional)
            stream: aws_dynamodb_1.StreamViewType.NEW_AND_OLD_IMAGES,
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
        });
        // Global Secondary Index for querying by user_id
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'created_at',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        // Global Secondary Index for querying by status
        this.table.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: {
                name: 'status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'updated_at',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL,
        });
        // Add metadata tags
        this.table.node.addMetadata('Purpose', 'Upload progress tracking for MISRA file uploads');
        this.table.node.addMetadata('Environment', environment);
        this.table.node.addMetadata('DataRetention', '7 days (TTL)');
    }
    /**
     * Grant read permissions to a principal
     */
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWriteData(grantee) {
        return this.table.grantWriteData(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
}
exports.UploadProgressTable = UploadProgressTable;
/**
 * Upload Progress Record Schema
 *
 * {
 *   file_id: string,              // Primary key - unique file identifier
 *   user_id: string,              // User who initiated the upload
 *   file_name: string,            // Original filename
 *   file_size: number,            // File size in bytes
 *   progress_percentage: number,  // Upload progress (0-100)
 *   status: string,               // 'starting' | 'uploading' | 'completed' | 'failed'
 *   message: string,              // Current status message
 *   created_at: number,           // Upload start timestamp
 *   updated_at: number,           // Last update timestamp
 *   ttl: number,                  // TTL for automatic cleanup (7 days)
 *   error_message?: string,       // Error details if status is 'failed'
 *   bytes_uploaded?: number,      // Actual bytes uploaded (for detailed progress)
 *   upload_speed?: number,        // Upload speed in bytes/second
 * }
 */ 
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBsb2FkLXByb2dyZXNzLXRhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBsb2FkLXByb2dyZXNzLXRhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILDJDQUFzQztBQUN0QywyREFNaUM7QUFDakMsNkNBQXFEO0FBRXJELE1BQWEsbUJBQW9CLFNBQVEsc0JBQVM7SUFDaEMsS0FBSyxDQUFPO0lBRTVCLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQTtRQUVoQixNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQTtRQUMvQyxNQUFNLFNBQVMsR0FBRyxrQkFBa0IsV0FBVyxFQUFFLENBQUE7UUFFakQseURBQXlEO1FBQ3pELElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxxQkFBcUIsRUFBRTtZQUNsRCxTQUFTO1lBRVQsdUNBQXVDO1lBQ3ZDLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBRUQsa0RBQWtEO1lBQ2xELFdBQVcsRUFBRSwwQkFBVyxDQUFDLGVBQWU7WUFFeEMsK0NBQStDO1lBQy9DLG1CQUFtQixFQUFFLFdBQVcsS0FBSyxNQUFNO1lBRTNDLG9EQUFvRDtZQUNwRCxtQkFBbUIsRUFBRSxLQUFLO1lBRTFCLG9EQUFvRDtZQUNwRCxNQUFNLEVBQUUsNkJBQWMsQ0FBQyxrQkFBa0I7WUFFekMsaUJBQWlCO1lBQ2pCLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQWEsQ0FBQyxPQUFPO1NBQ3JGLENBQUMsQ0FBQTtRQUVGLGlEQUFpRDtRQUNqRCxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxXQUFXO1lBQ3RCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxZQUFZO2dCQUNsQixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsY0FBYyxFQUFFLDZCQUFjLENBQUMsR0FBRztTQUNuQyxDQUFDLENBQUE7UUFFRixnREFBZ0Q7UUFDaEQsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsYUFBYTtZQUN4QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsaURBQWlELENBQUMsQ0FBQTtRQUN6RixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3ZELElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxlQUFlLEVBQUUsY0FBYyxDQUFDLENBQUE7SUFDOUQsQ0FBQztJQUVEOztPQUVHO0lBQ0ksYUFBYSxDQUFDLE9BQVk7UUFDL0IsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMxQyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsT0FBWTtRQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFRDs7T0FFRztJQUNJLGtCQUFrQixDQUFDLE9BQVk7UUFDcEMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQy9DLENBQUM7Q0FDRjtBQXpGRCxrREF5RkM7QUFFRDs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEFXUyBDREsgaW5mcmFzdHJ1Y3R1cmUgZGVmaW5pdGlvbiBmb3IgVXBsb2FkIFByb2dyZXNzIER5bmFtb0RCIFRhYmxlXHJcbiAqIFRhc2sgNC4yOiBCdWlsZCBmaWxlIHVwbG9hZCBwcm9ncmVzcyBtb25pdG9yaW5nXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgXHJcbiAgVGFibGUsIFxyXG4gIEF0dHJpYnV0ZVR5cGUsIFxyXG4gIEJpbGxpbmdNb2RlLFxyXG4gIFByb2plY3Rpb25UeXBlLFxyXG4gIFN0cmVhbVZpZXdUeXBlXHJcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJ1xyXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5LCBEdXJhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliJ1xyXG5cclxuZXhwb3J0IGNsYXNzIFVwbG9hZFByb2dyZXNzVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogVGFibGVcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiB7IGVudmlyb25tZW50Pzogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZClcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAnZGV2J1xyXG4gICAgY29uc3QgdGFibGVOYW1lID0gYFVwbG9hZFByb2dyZXNzLSR7ZW52aXJvbm1lbnR9YFxyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgRHluYW1vREIgdGFibGUgZm9yIHVwbG9hZCBwcm9ncmVzcyB0cmFja2luZ1xyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBUYWJsZSh0aGlzLCAnVXBsb2FkUHJvZ3Jlc3NUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lLFxyXG4gICAgICBcclxuICAgICAgLy8gUHJpbWFyeSBrZXk6IGZpbGVfaWQgKHBhcnRpdGlvbiBrZXkpXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdmaWxlX2lkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBcclxuICAgICAgLy8gQmlsbGluZyBtb2RlIC0gb24tZGVtYW5kIGZvciB2YXJpYWJsZSB3b3JrbG9hZHNcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgXHJcbiAgICAgIC8vIEVuYWJsZSBwb2ludC1pbi10aW1lIHJlY292ZXJ5IGZvciBwcm9kdWN0aW9uXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGVudmlyb25tZW50ID09PSAncHJvZCcsXHJcbiAgICAgIFxyXG4gICAgICAvLyBUVEwgZm9yIGF1dG9tYXRpYyBjbGVhbnVwIG9mIG9sZCBwcm9ncmVzcyByZWNvcmRzXHJcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLFxyXG4gICAgICBcclxuICAgICAgLy8gRHluYW1vREIgU3RyZWFtcyBmb3IgcmVhbC10aW1lIHVwZGF0ZXMgKG9wdGlvbmFsKVxyXG4gICAgICBzdHJlYW06IFN0cmVhbVZpZXdUeXBlLk5FV19BTkRfT0xEX0lNQUdFUyxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92YWwgcG9saWN5XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgIH0pXHJcblxyXG4gICAgLy8gR2xvYmFsIFNlY29uZGFyeSBJbmRleCBmb3IgcXVlcnlpbmcgYnkgdXNlcl9pZFxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICd1c2VyX2lkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRfYXQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuTlVNQkVSXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEdsb2JhbCBTZWNvbmRhcnkgSW5kZXggZm9yIHF1ZXJ5aW5nIGJ5IHN0YXR1c1xyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ1N0YXR1c0luZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3N0YXR1cycsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICd1cGRhdGVkX2F0JyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUlxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdQdXJwb3NlJywgJ1VwbG9hZCBwcm9ncmVzcyB0cmFja2luZyBmb3IgTUlTUkEgZmlsZSB1cGxvYWRzJylcclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudClcclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnRGF0YVJldGVudGlvbicsICc3IGRheXMgKFRUTCknKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZCBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWREYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgd3JpdGUgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRXcml0ZURhdGEoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFdyaXRlRGF0YShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZSlcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGxvYWQgUHJvZ3Jlc3MgUmVjb3JkIFNjaGVtYVxyXG4gKiBcclxuICoge1xyXG4gKiAgIGZpbGVfaWQ6IHN0cmluZywgICAgICAgICAgICAgIC8vIFByaW1hcnkga2V5IC0gdW5pcXVlIGZpbGUgaWRlbnRpZmllclxyXG4gKiAgIHVzZXJfaWQ6IHN0cmluZywgICAgICAgICAgICAgIC8vIFVzZXIgd2hvIGluaXRpYXRlZCB0aGUgdXBsb2FkXHJcbiAqICAgZmlsZV9uYW1lOiBzdHJpbmcsICAgICAgICAgICAgLy8gT3JpZ2luYWwgZmlsZW5hbWVcclxuICogICBmaWxlX3NpemU6IG51bWJlciwgICAgICAgICAgICAvLyBGaWxlIHNpemUgaW4gYnl0ZXNcclxuICogICBwcm9ncmVzc19wZXJjZW50YWdlOiBudW1iZXIsICAvLyBVcGxvYWQgcHJvZ3Jlc3MgKDAtMTAwKVxyXG4gKiAgIHN0YXR1czogc3RyaW5nLCAgICAgICAgICAgICAgIC8vICdzdGFydGluZycgfCAndXBsb2FkaW5nJyB8ICdjb21wbGV0ZWQnIHwgJ2ZhaWxlZCdcclxuICogICBtZXNzYWdlOiBzdHJpbmcsICAgICAgICAgICAgICAvLyBDdXJyZW50IHN0YXR1cyBtZXNzYWdlXHJcbiAqICAgY3JlYXRlZF9hdDogbnVtYmVyLCAgICAgICAgICAgLy8gVXBsb2FkIHN0YXJ0IHRpbWVzdGFtcFxyXG4gKiAgIHVwZGF0ZWRfYXQ6IG51bWJlciwgICAgICAgICAgIC8vIExhc3QgdXBkYXRlIHRpbWVzdGFtcFxyXG4gKiAgIHR0bDogbnVtYmVyLCAgICAgICAgICAgICAgICAgIC8vIFRUTCBmb3IgYXV0b21hdGljIGNsZWFudXAgKDcgZGF5cylcclxuICogICBlcnJvcl9tZXNzYWdlPzogc3RyaW5nLCAgICAgICAvLyBFcnJvciBkZXRhaWxzIGlmIHN0YXR1cyBpcyAnZmFpbGVkJ1xyXG4gKiAgIGJ5dGVzX3VwbG9hZGVkPzogbnVtYmVyLCAgICAgIC8vIEFjdHVhbCBieXRlcyB1cGxvYWRlZCAoZm9yIGRldGFpbGVkIHByb2dyZXNzKVxyXG4gKiAgIHVwbG9hZF9zcGVlZD86IG51bWJlciwgICAgICAgIC8vIFVwbG9hZCBzcGVlZCBpbiBieXRlcy9zZWNvbmRcclxuICogfVxyXG4gKi8iXX0=