"use strict";
/**
 * AWS CDK infrastructure definition for Analysis Results DynamoDB table
 * Stores detailed MISRA analysis results and violations
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AnalysisResultsTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class AnalysisResultsTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `AnalysisResults-${environment}`;
        this.table = new aws_dynamodb_1.Table(this, 'AnalysisResultsTable', {
            tableName,
            partitionKey: {
                name: 'analysisId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            pointInTimeRecovery: environment === 'prod',
        });
        // GSI for querying by file ID
        this.table.addGlobalSecondaryIndex({
            indexName: 'fileId-timestamp-index',
            partitionKey: {
                name: 'fileId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        // GSI for querying by user ID
        this.table.addGlobalSecondaryIndex({
            indexName: 'userId-timestamp-index',
            partitionKey: {
                name: 'userId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        // GSI for querying by rule set
        this.table.addGlobalSecondaryIndex({
            indexName: 'ruleSet-timestamp-index',
            partitionKey: {
                name: 'ruleSet',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'timestamp',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.node.addMetadata('Purpose', 'MISRA analysis results and violations');
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
exports.AnalysisResultsTable = AnalysisResultsTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtcmVzdWx0cy10YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFuYWx5c2lzLXJlc3VsdHMtdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBRUgsMkNBQXVDO0FBQ3ZDLDJEQUE2RjtBQUM3Riw2Q0FBNEM7QUFFNUMsTUFBYSxvQkFBcUIsU0FBUSxzQkFBUztJQUNqQyxLQUFLLENBQVE7SUFFN0IsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFnQztRQUN4RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLE1BQU0sV0FBVyxHQUFHLEtBQUssRUFBRSxXQUFXLElBQUksS0FBSyxDQUFDO1FBQ2hELE1BQU0sU0FBUyxHQUFHLG1CQUFtQixXQUFXLEVBQUUsQ0FBQztRQUVuRCxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksb0JBQUssQ0FBQyxJQUFJLEVBQUUsc0JBQXNCLEVBQUU7WUFDbkQsU0FBUztZQUNULFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsWUFBWTtnQkFDbEIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELFdBQVcsRUFBRSwwQkFBVyxDQUFDLGVBQWU7WUFDeEMsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87WUFDcEYsbUJBQW1CLEVBQUUsV0FBVyxLQUFLLE1BQU07U0FDNUMsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsOEJBQThCO1FBQzlCLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLHdCQUF3QjtZQUNuQyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLHlCQUF5QjtZQUNwQyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFDO1FBRUgsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFDO1FBQ2hGLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7SUFDMUQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUFZO1FBQy9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDM0MsQ0FBQztJQUVNLGNBQWMsQ0FBQyxPQUFZO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDNUMsQ0FBQztJQUVNLGVBQWUsQ0FBQyxPQUFZO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDN0MsQ0FBQztDQUNGO0FBakZELG9EQWlGQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBV1MgQ0RLIGluZnJhc3RydWN0dXJlIGRlZmluaXRpb24gZm9yIEFuYWx5c2lzIFJlc3VsdHMgRHluYW1vREIgdGFibGVcclxuICogU3RvcmVzIGRldGFpbGVkIE1JU1JBIGFuYWx5c2lzIHJlc3VsdHMgYW5kIHZpb2xhdGlvbnNcclxuICovXHJcblxyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgVGFibGUsIEF0dHJpYnV0ZVR5cGUsIEJpbGxpbmdNb2RlLCBQcm9qZWN0aW9uVHlwZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcblxyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNSZXN1bHRzVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogeyBlbnZpcm9ubWVudD86IHN0cmluZyB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvcHM/LmVudmlyb25tZW50IHx8ICdkZXYnO1xyXG4gICAgY29uc3QgdGFibGVOYW1lID0gYEFuYWx5c2lzUmVzdWx0cy0ke2Vudmlyb25tZW50fWA7XHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBUYWJsZSh0aGlzLCAnQW5hbHlzaXNSZXN1bHRzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2FuYWx5c2lzSWQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndGltZXN0YW1wJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUlxyXG4gICAgICB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IGVudmlyb25tZW50ID09PSAncHJvZCcsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHU0kgZm9yIHF1ZXJ5aW5nIGJ5IGZpbGUgSURcclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdmaWxlSWQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2ZpbGVJZCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgc29ydEtleToge1xyXG4gICAgICAgIG5hbWU6ICd0aW1lc3RhbXAnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuTlVNQkVSXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTExcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEdTSSBmb3IgcXVlcnlpbmcgYnkgdXNlciBJRFxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3VzZXJJZC10aW1lc3RhbXAtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAndXNlcklkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVJcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR1NJIGZvciBxdWVyeWluZyBieSBydWxlIHNldFxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ3J1bGVTZXQtdGltZXN0YW1wLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3J1bGVTZXQnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndGltZXN0YW1wJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUlxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICB9KTtcclxuXHJcbiAgICB0aGlzLnRhYmxlLm5vZGUuYWRkTWV0YWRhdGEoJ1B1cnBvc2UnLCAnTUlTUkEgYW5hbHlzaXMgcmVzdWx0cyBhbmQgdmlvbGF0aW9ucycpO1xyXG4gICAgdGhpcy50YWJsZS5ub2RlLmFkZE1ldGFkYXRhKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFJlYWREYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKTtcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFdyaXRlRGF0YShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50V3JpdGVEYXRhKGdyYW50ZWUpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50RnVsbEFjY2VzcyhncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50RnVsbEFjY2VzcyhncmFudGVlKTtcclxuICB9XHJcbn1cclxuIl19