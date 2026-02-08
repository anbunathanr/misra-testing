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
    grantFullAccess(grantee) {
        return this.table.grantFullAccess(grantee);
    }
}
exports.FileMetadataTable = FileMetadataTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1tZXRhZGF0YS10YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtbWV0YWRhdGEtdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsMkRBQTRGO0FBQzVGLDZDQUEyQztBQUMzQywrREFBc0U7QUFFdEUsTUFBYSxpQkFBa0IsU0FBUSxzQkFBUztJQUM5QixLQUFLLENBQU87SUFFNUIsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFBO1FBRWhCLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksS0FBSyxDQUFBO1FBQy9DLE1BQU0sU0FBUyxHQUFHLEdBQUcsNENBQTBCLENBQUMsU0FBUyxJQUFJLFdBQVcsRUFBRSxDQUFBO1FBRTFFLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxvQkFBSyxDQUFDLElBQUksRUFBRSxtQkFBbUIsRUFBRTtZQUNoRCxTQUFTO1lBQ1QsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxTQUFTO2dCQUNmLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxXQUFXLEVBQUUsMEJBQVcsQ0FBQyxlQUFlO1lBQ3hDLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BGLG1CQUFtQixFQUFFLFdBQVcsS0FBSyxNQUFNO1NBQzVDLENBQUMsQ0FBQTtRQUVGLCtCQUErQjtRQUMvQixJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxXQUFXO1lBQ3RCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxrQkFBa0I7Z0JBQ3hCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxPQUFPLEVBQUU7Z0JBQ1AsSUFBSSxFQUFFLGtCQUFrQjtnQkFDeEIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUUsNEJBQWEsQ0FBQyxNQUFNO2FBQzNCO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxpQkFBaUI7Z0JBQ3ZCLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUseUNBQXlDLENBQUMsQ0FBQTtRQUNqRixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO0lBQ3pELENBQUM7SUFFTSxhQUFhLENBQUMsT0FBWTtRQUMvQixPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzFDLENBQUM7SUFFTSxjQUFjLENBQUMsT0FBWTtRQUNoQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzNDLENBQUM7SUFFTSxlQUFlLENBQUMsT0FBWTtRQUNqQyxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsZUFBZSxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQzVDLENBQUM7Q0FDRjtBQTNFRCw4Q0EyRUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVdTIENESyBpbmZyYXN0cnVjdHVyZSBkZWZpbml0aW9uIGZvciBGaWxlIE1ldGFkYXRhIER5bmFtb0RCIHRhYmxlXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgVGFibGUsIEF0dHJpYnV0ZVR5cGUsIEJpbGxpbmdNb2RlLCBQcm9qZWN0aW9uVHlwZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYidcclxuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJ1xyXG5pbXBvcnQgeyBGSUxFX01FVEFEQVRBX1RBQkxFX0NPTkZJRyB9IGZyb20gJy4uL2NvbmZpZy9keW5hbW9kYi1jb25maWcnXHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZU1ldGFkYXRhVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogVGFibGVcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiB7IGVudmlyb25tZW50Pzogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZClcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAnZGV2J1xyXG4gICAgY29uc3QgdGFibGVOYW1lID0gYCR7RklMRV9NRVRBREFUQV9UQUJMRV9DT05GSUcudGFibGVOYW1lfS0ke2Vudmlyb25tZW50fWBcclxuXHJcbiAgICB0aGlzLnRhYmxlID0gbmV3IFRhYmxlKHRoaXMsICdGaWxlTWV0YWRhdGFUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnZmlsZV9pZCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEFkZCBHbG9iYWwgU2Vjb25kYXJ5IEluZGV4ZXNcclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdVc2VySW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAndXNlcl9pZCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICd1cGxvYWRfdGltZXN0YW1wJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUlxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdTdGF0dXNJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdhbmFseXNpc19zdGF0dXMnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndXBsb2FkX3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVJcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVXNlclN0YXR1c0luZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VzZXJfaWQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAnYW5hbHlzaXNfc3RhdHVzJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdGaWxlIG1ldGFkYXRhIHN0b3JhZ2UgZm9yIE1JU1JBIHRlc3RpbmcnKVxyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50UmVhZERhdGEoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFJlYWREYXRhKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRXcml0ZURhdGEoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFdyaXRlRGF0YShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50RnVsbEFjY2VzcyhncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50RnVsbEFjY2VzcyhncmFudGVlKVxyXG4gIH1cclxufVxyXG4iXX0=