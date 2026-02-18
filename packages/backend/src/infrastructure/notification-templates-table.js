"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.NotificationTemplatesTable = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
class NotificationTemplatesTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'Table', {
            tableName: `misra-platform-notification-templates-${props.environment}`,
            partitionKey: { name: 'templateId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
            pointInTimeRecovery: true,
        });
        // Add GSI for querying templates by event type and channel
        this.table.addGlobalSecondaryIndex({
            indexName: 'EventTypeChannelIndex',
            partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'channel', type: dynamodb.AttributeType.STRING },
        });
        // Add CloudFormation output
        new cdk.CfnOutput(this, 'TableName', {
            value: this.table.tableName,
            description: 'DynamoDB table for notification templates',
        });
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
}
exports.NotificationTemplatesTable = NotificationTemplatesTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXRlbXBsYXRlcy10YWJsZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbIm5vdGlmaWNhdGlvbi10ZW1wbGF0ZXMtdGFibGUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0FBQUEsaURBQW1DO0FBQ25DLG1FQUFxRDtBQUNyRCwyQ0FBdUM7QUFNdkMsTUFBYSwwQkFBMkIsU0FBUSxzQkFBUztJQUN2QyxLQUFLLENBQWlCO0lBRXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBc0M7UUFDOUUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFO1lBQzdDLFNBQVMsRUFBRSx5Q0FBeUMsS0FBSyxDQUFDLFdBQVcsRUFBRTtZQUN2RSxZQUFZLEVBQUUsRUFBRSxJQUFJLEVBQUUsWUFBWSxFQUFFLElBQUksRUFBRSxRQUFRLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRTtZQUN6RSxXQUFXLEVBQUUsUUFBUSxDQUFDLFdBQVcsQ0FBQyxlQUFlO1lBQ2pELFVBQVUsRUFBRSxRQUFRLENBQUMsZUFBZSxDQUFDLFdBQVc7WUFDaEQsYUFBYSxFQUFFLEdBQUcsQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLGtCQUFrQjtZQUM1RCxtQkFBbUIsRUFBRSxJQUFJO1NBQzFCLENBQUMsQ0FBQztRQUVILDJEQUEyRDtRQUMzRCxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSx1QkFBdUI7WUFDbEMsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFNBQVMsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDbEUsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDM0IsV0FBVyxFQUFFLDJDQUEyQztTQUN6RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsT0FBK0I7UUFDdkQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxhQUFhLENBQUMsT0FBK0I7UUFDbEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUFwQ0QsZ0VBb0NDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlUHJvcHMge1xyXG4gIGVudmlyb25tZW50OiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBOb3RpZmljYXRpb25UZW1wbGF0ZXNUYWJsZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5vdGlmaWNhdGlvblRlbXBsYXRlc1RhYmxlUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLW5vdGlmaWNhdGlvbi10ZW1wbGF0ZXMtJHtwcm9wcy5lbnZpcm9ubWVudH1gLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ3RlbXBsYXRlSWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgcXVlcnlpbmcgdGVtcGxhdGVzIGJ5IGV2ZW50IHR5cGUgYW5kIGNoYW5uZWxcclxuICAgIHRoaXMudGFibGUuYWRkR2xvYmFsU2Vjb25kYXJ5SW5kZXgoe1xyXG4gICAgICBpbmRleE5hbWU6ICdFdmVudFR5cGVDaGFubmVsSW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHsgbmFtZTogJ2V2ZW50VHlwZScsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIHNvcnRLZXk6IHsgbmFtZTogJ2NoYW5uZWwnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIENsb3VkRm9ybWF0aW9uIG91dHB1dFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBub3RpZmljYXRpb24gdGVtcGxhdGVzJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50UmVhZFdyaXRlRGF0YShncmFudGVlOiBjZGsuYXdzX2lhbS5JR3JhbnRhYmxlKTogY2RrLmF3c19pYW0uR3JhbnQge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkV3JpdGVEYXRhKGdyYW50ZWUpO1xyXG4gIH1cclxuXHJcbiAgcHVibGljIGdyYW50UmVhZERhdGEoZ3JhbnRlZTogY2RrLmF3c19pYW0uSUdyYW50YWJsZSk6IGNkay5hd3NfaWFtLkdyYW50IHtcclxuICAgIHJldHVybiB0aGlzLnRhYmxlLmdyYW50UmVhZERhdGEoZ3JhbnRlZSk7XHJcbiAgfVxyXG59XHJcbiJdfQ==