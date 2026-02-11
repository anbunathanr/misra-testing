"use strict";
/**
 * AWS CDK infrastructure definition for File Metadata DynamoDB table
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileMetadataTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
const dynamodb_config_1 = require("../config/dynamodb-config");
class FileMetadataTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `${dynamodb_config_1.FILE_METADATA_TABLE_CONFIG.tableName}-${environment}`;
        this.table = new aws_dynamodb_1.Table(this, 'FileMetadataTable', {
            tableName,
            partitionKey: {
                name: 'file_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            pointInTimeRecovery: environment === 'prod'
        });
        // Add Global Secondary Indexes
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'upload_timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'StatusIndex',
            partitionKey: {
                name: 'analysis_status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'upload_timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserStatusIndex',
            partitionKey: {
                name: 'user_id',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'analysis_status',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.node.addMetadata('Purpose', 'File metadata storage for MISRA testing');
        this.table.node.addMetadata('Environment', environment);
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
    grantWriteData(grantee) {
        return this.table.grantWriteData(grantee);
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    grantFullAccess(grantee) {
        return this.table.grantFullAccess(grantee);
    }
}
exports.FileMetadataTable = FileMetadataTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS10YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtbWV0YWRhdGEtdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsMkRBQTRGO0FBQzVGLDZDQUEyQztBQUMzQywrREFBc0U7QUFFdEUsTUFBYSxpQkFBa0IsU0FBUSxzQkFBUztJQUM5QixLQUFLLENBQU87SUFFNUIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksS0FBSyxDQUFBO1FBQy9DLE1BQU0sU0FBUyxHQUFHLEdBQUcsNENBQTBCLENBQUMsU0FBUyxJQUFJLFdBQVcsRUFBRSxDQUFBO1FBRTFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNoRCxTQUFTO1lBQ1QsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxXQUFXLEVBQUUsMEJBQVcsQ0FBQyxlQUFlO1lBQ3hDLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BGLG1CQUFtQixFQUFFLFdBQVcsS0FBSyxNQUFNO1NBQzVDLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxXQUFXO1lBQ3RCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUseUNBQXlDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTSxhQUFhLENBQUMsT0FBWTtRQUMvQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTSxjQUFjLENBQUMsT0FBWTtRQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxPQUFZO1FBQ3BDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUMvQyxDQUFDO0lBRU0sZUFBZSxDQUFDLE9BQVk7UUFDakMsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGVBQWUsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0NBQ0Y7QUEvRUQsOENBK0VDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEFXUyBDREsgaW5mcmFzdHJ1Y3R1cmUgZGVmaW5pdGlvbiBmb3IgRmlsZSBNZXRhZGF0YSBEeW5hbW9EQiB0YWJsZVxyXG4gKi9cclxuXHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnXHJcbmltcG9ydCB7IFRhYmxlLCBBdHRyaWJ1dGVUeXBlLCBCaWxsaW5nTW9kZSwgUHJvamVjdGlvblR5cGUgfSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInXHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYidcclxuaW1wb3J0IHsgRklMRV9NRVRBREFUQV9UQUJMRV9DT05GSUcgfSBmcm9tICcuLi9jb25maWcvZHluYW1vZGItY29uZmlnJ1xyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVNZXRhZGF0YVRhYmxlIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IFRhYmxlXHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogeyBlbnZpcm9ubWVudD86IHN0cmluZyB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpXHJcblxyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgJ2RldidcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IGAke0ZJTEVfTUVUQURBVEFfVEFCTEVfQ09ORklHLnRhYmxlTmFtZX0tJHtlbnZpcm9ubWVudH1gXHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBUYWJsZSh0aGlzLCAnRmlsZU1ldGFkYXRhVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2ZpbGVfaWQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBCaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgcG9pbnRJblRpbWVSZWNvdmVyeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJ1xyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZGQgR2xvYmFsIFNlY29uZGFyeSBJbmRleGVzXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVXNlckluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VzZXJfaWQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndXBsb2FkX3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVJcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnU3RhdHVzSW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnYW5hbHlzaXNfc3RhdHVzJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VwbG9hZF90aW1lc3RhbXAnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuTlVNQkVSXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTExcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ1VzZXJTdGF0dXNJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICd1c2VyX2lkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2FuYWx5c2lzX3N0YXR1cycsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLnRhYmxlLm5vZGUuYWRkTWV0YWRhdGEoJ1B1cnBvc2UnLCAnRmlsZSBtZXRhZGF0YSBzdG9yYWdlIGZvciBNSVNSQSB0ZXN0aW5nJylcclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudClcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFJlYWREYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50V3JpdGVEYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRXcml0ZURhdGEoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudEZ1bGxBY2Nlc3MoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ3JhbnRlZSlcclxuICB9XHJcbn1cclxuIl19