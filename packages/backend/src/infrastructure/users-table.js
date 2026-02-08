"use strict";
/**
 * AWS CDK infrastructure definition for Users DynamoDB table
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.UsersTable = void 0;
const constructs_1 = require("constructs");
const aws_dynamodb_1 = require("aws-cdk-lib/aws-dynamodb");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class UsersTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const tableName = `Users-${environment}`;
        this.table = new aws_dynamodb_1.Table(this, 'UsersTable', {
            tableName,
            partitionKey: {
                name: 'userId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            billingMode: aws_dynamodb_1.BillingMode.PAY_PER_REQUEST,
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            pointInTimeRecovery: environment === 'prod',
        });
        // Add Global Secondary Indexes
        this.table.addGlobalSecondaryIndex({
            indexName: 'email-index',
            partitionKey: {
                name: 'email',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'organizationId-index',
            partitionKey: {
                name: 'organizationId',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'createdAt',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.addGlobalSecondaryIndex({
            indexName: 'role-index',
            partitionKey: {
                name: 'role',
                type: aws_dynamodb_1.AttributeType.STRING
            },
            sortKey: {
                name: 'lastLoginAt',
                type: aws_dynamodb_1.AttributeType.NUMBER
            },
            projectionType: aws_dynamodb_1.ProjectionType.ALL
        });
        this.table.node.addMetadata('Purpose', 'User profiles and authentication data');
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
exports.UsersTable = UsersTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXNlcnMtdGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ1c2Vycy10YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7O0dBRUc7OztBQUVILDJDQUFzQztBQUN0QywyREFBNEY7QUFDNUYsNkNBQTJDO0FBRTNDLE1BQWEsVUFBVyxTQUFRLHNCQUFTO0lBQ3ZCLEtBQUssQ0FBTztJQUU1QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxLQUFLLENBQUE7UUFDL0MsTUFBTSxTQUFTLEdBQUcsU0FBUyxXQUFXLEVBQUUsQ0FBQTtRQUV4QyxJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksb0JBQUssQ0FBQyxJQUFJLEVBQUUsWUFBWSxFQUFFO1lBQ3pDLFNBQVM7WUFDVCxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLFFBQVE7Z0JBQ2QsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELFdBQVcsRUFBRSwwQkFBVyxDQUFDLGVBQWU7WUFDeEMsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87WUFDcEYsbUJBQW1CLEVBQUUsV0FBVyxLQUFLLE1BQU07U0FDNUMsQ0FBQyxDQUFBO1FBRUYsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGFBQWE7WUFDeEIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxPQUFPO2dCQUNiLElBQUksRUFBRSw0QkFBYSxDQUFDLE1BQU07YUFDM0I7WUFDRCxjQUFjLEVBQUUsNkJBQWMsQ0FBQyxHQUFHO1NBQ25DLENBQUMsQ0FBQTtRQUVGLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLHNCQUFzQjtZQUNqQyxZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyx1QkFBdUIsQ0FBQztZQUNqQyxTQUFTLEVBQUUsWUFBWTtZQUN2QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLE1BQU07Z0JBQ1osSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsYUFBYTtnQkFDbkIsSUFBSSxFQUFFLDRCQUFhLENBQUMsTUFBTTthQUMzQjtZQUNELGNBQWMsRUFBRSw2QkFBYyxDQUFDLEdBQUc7U0FDbkMsQ0FBQyxDQUFBO1FBRUYsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSx1Q0FBdUMsQ0FBQyxDQUFBO1FBQy9FLElBQUksQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUE7SUFDekQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUFZO1FBQy9CLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxhQUFhLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDMUMsQ0FBQztJQUVNLGNBQWMsQ0FBQyxPQUFZO1FBQ2hDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDM0MsQ0FBQztJQUVNLGVBQWUsQ0FBQyxPQUFZO1FBQ2pDLE9BQU8sSUFBSSxDQUFDLEtBQUssQ0FBQyxlQUFlLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNGO0FBdkVELGdDQXVFQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBV1MgQ0RLIGluZnJhc3RydWN0dXJlIGRlZmluaXRpb24gZm9yIFVzZXJzIER5bmFtb0RCIHRhYmxlXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgVGFibGUsIEF0dHJpYnV0ZVR5cGUsIEJpbGxpbmdNb2RlLCBQcm9qZWN0aW9uVHlwZSB9IGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYidcclxuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSB9IGZyb20gJ2F3cy1jZGstbGliJ1xyXG5cclxuZXhwb3J0IGNsYXNzIFVzZXJzVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogVGFibGVcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiB7IGVudmlyb25tZW50Pzogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZClcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAnZGV2J1xyXG4gICAgY29uc3QgdGFibGVOYW1lID0gYFVzZXJzLSR7ZW52aXJvbm1lbnR9YFxyXG5cclxuICAgIHRoaXMudGFibGUgPSBuZXcgVGFibGUodGhpcywgJ1VzZXJzVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VzZXJJZCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5TVFJJTkdcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IEJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZGQgR2xvYmFsIFNlY29uZGFyeSBJbmRleGVzXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnZW1haWwtaW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnZW1haWwnLFxyXG4gICAgICAgIHR5cGU6IEF0dHJpYnV0ZVR5cGUuU1RSSU5HXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBQcm9qZWN0aW9uVHlwZS5BTExcclxuICAgIH0pXHJcblxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ29yZ2FuaXphdGlvbklkLWluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ29yZ2FuaXphdGlvbklkJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2NyZWF0ZWRBdCcsXHJcbiAgICAgICAgdHlwZTogQXR0cmlidXRlVHlwZS5OVU1CRVJcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IFByb2plY3Rpb25UeXBlLkFMTFxyXG4gICAgfSlcclxuXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAncm9sZS1pbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICdyb2xlJyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLlNUUklOR1xyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ2xhc3RMb2dpbkF0JyxcclxuICAgICAgICB0eXBlOiBBdHRyaWJ1dGVUeXBlLk5VTUJFUlxyXG4gICAgICB9LFxyXG4gICAgICBwcm9qZWN0aW9uVHlwZTogUHJvamVjdGlvblR5cGUuQUxMXHJcbiAgICB9KVxyXG5cclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdVc2VyIHByb2ZpbGVzIGFuZCBhdXRoZW50aWNhdGlvbiBkYXRhJylcclxuICAgIHRoaXMudGFibGUubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudClcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudFJlYWREYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50V3JpdGVEYXRhKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRXcml0ZURhdGEoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIHB1YmxpYyBncmFudEZ1bGxBY2Nlc3MoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudEZ1bGxBY2Nlc3MoZ3JhbnRlZSlcclxuICB9XHJcbn1cclxuIl19