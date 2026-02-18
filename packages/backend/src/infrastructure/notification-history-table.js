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
exports.NotificationHistoryTable = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
class NotificationHistoryTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'Table', {
            tableName: `misra-platform-notification-history-${props.environment}`,
            partitionKey: { name: 'notificationId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
            pointInTimeRecovery: true,
            timeToLiveAttribute: 'ttl', // Enable TTL for automatic deletion after 90 days
        });
        // Add GSI for querying history by user and time
        this.table.addGlobalSecondaryIndex({
            indexName: 'UserTimeIndex',
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
        });
        // Add GSI for querying history by event type and time
        this.table.addGlobalSecondaryIndex({
            indexName: 'EventTypeTimeIndex',
            partitionKey: { name: 'eventType', type: dynamodb.AttributeType.STRING },
            sortKey: { name: 'sentAt', type: dynamodb.AttributeType.STRING },
        });
        // Add CloudFormation output
        new cdk.CfnOutput(this, 'TableName', {
            value: this.table.tableName,
            description: 'DynamoDB table for notification history',
        });
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
}
exports.NotificationHistoryTable = NotificationHistoryTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLWhpc3RvcnktdGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJub3RpZmljYXRpb24taGlzdG9yeS10YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxpREFBbUM7QUFDbkMsbUVBQXFEO0FBQ3JELDJDQUF1QztBQU12QyxNQUFhLHdCQUF5QixTQUFRLHNCQUFTO0lBQ3JDLEtBQUssQ0FBaUI7SUFFdEMsWUFBWSxLQUFnQixFQUFFLEVBQVUsRUFBRSxLQUFvQztRQUM1RSxLQUFLLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDO1FBRWpCLElBQUksQ0FBQyxLQUFLLEdBQUcsSUFBSSxRQUFRLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUU7WUFDN0MsU0FBUyxFQUFFLHVDQUF1QyxLQUFLLENBQUMsV0FBVyxFQUFFO1lBQ3JFLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxnQkFBZ0IsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDN0UsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7WUFDNUQsbUJBQW1CLEVBQUUsSUFBSTtZQUN6QixtQkFBbUIsRUFBRSxLQUFLLEVBQUUsa0RBQWtEO1NBQy9FLENBQUMsQ0FBQztRQUVILGdEQUFnRDtRQUNoRCxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxlQUFlO1lBQzFCLFlBQVksRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1lBQ3JFLE9BQU8sRUFBRSxFQUFFLElBQUksRUFBRSxRQUFRLEVBQUUsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFO1NBQ2pFLENBQUMsQ0FBQztRQUVILHNEQUFzRDtRQUN0RCxJQUFJLENBQUMsS0FBSyxDQUFDLHVCQUF1QixDQUFDO1lBQ2pDLFNBQVMsRUFBRSxvQkFBb0I7WUFDL0IsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDeEUsT0FBTyxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7U0FDakUsQ0FBQyxDQUFDO1FBRUgsNEJBQTRCO1FBQzVCLElBQUksR0FBRyxDQUFDLFNBQVMsQ0FBQyxJQUFJLEVBQUUsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxJQUFJLENBQUMsS0FBSyxDQUFDLFNBQVM7WUFDM0IsV0FBVyxFQUFFLHlDQUF5QztTQUN2RCxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRU0sa0JBQWtCLENBQUMsT0FBK0I7UUFDdkQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQ2hELENBQUM7SUFFTSxhQUFhLENBQUMsT0FBK0I7UUFDbEQsT0FBTyxJQUFJLENBQUMsS0FBSyxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUMzQyxDQUFDO0NBQ0Y7QUE1Q0QsNERBNENDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgY2RrIGZyb20gJ2F3cy1jZGstbGliJztcclxuaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIE5vdGlmaWNhdGlvbkhpc3RvcnlUYWJsZVByb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wczogTm90aWZpY2F0aW9uSGlzdG9yeVRhYmxlUHJvcHMpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnVGFibGUnLCB7XHJcbiAgICAgIHRhYmxlTmFtZTogYG1pc3JhLXBsYXRmb3JtLW5vdGlmaWNhdGlvbi1oaXN0b3J5LSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICdub3RpZmljYXRpb25JZCcsIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIGVuY3J5cHRpb246IGR5bmFtb2RiLlRhYmxlRW5jcnlwdGlvbi5BV1NfTUFOQUdFRCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogY2RrLlJlbW92YWxQb2xpY3kuREVTVFJPWSwgLy8gRm9yIGRldmVsb3BtZW50XHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcbiAgICAgIHRpbWVUb0xpdmVBdHRyaWJ1dGU6ICd0dGwnLCAvLyBFbmFibGUgVFRMIGZvciBhdXRvbWF0aWMgZGVsZXRpb24gYWZ0ZXIgOTAgZGF5c1xyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIEdTSSBmb3IgcXVlcnlpbmcgaGlzdG9yeSBieSB1c2VyIGFuZCB0aW1lXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnVXNlclRpbWVJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAndXNlcklkJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc2VudEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBHU0kgZm9yIHF1ZXJ5aW5nIGhpc3RvcnkgYnkgZXZlbnQgdHlwZSBhbmQgdGltZVxyXG4gICAgdGhpcy50YWJsZS5hZGRHbG9iYWxTZWNvbmRhcnlJbmRleCh7XHJcbiAgICAgIGluZGV4TmFtZTogJ0V2ZW50VHlwZVRpbWVJbmRleCcsXHJcbiAgICAgIHBhcnRpdGlvbktleTogeyBuYW1lOiAnZXZlbnRUeXBlJywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgICAgc29ydEtleTogeyBuYW1lOiAnc2VudEF0JywgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBDbG91ZEZvcm1hdGlvbiBvdXRwdXRcclxuICAgIG5ldyBjZGsuQ2ZuT3V0cHV0KHRoaXMsICdUYWJsZU5hbWUnLCB7XHJcbiAgICAgIHZhbHVlOiB0aGlzLnRhYmxlLnRhYmxlTmFtZSxcclxuICAgICAgZGVzY3JpcHRpb246ICdEeW5hbW9EQiB0YWJsZSBmb3Igbm90aWZpY2F0aW9uIGhpc3RvcnknLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkV3JpdGVEYXRhKGdyYW50ZWU6IGNkay5hd3NfaWFtLklHcmFudGFibGUpOiBjZGsuYXdzX2lhbS5HcmFudCB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkRGF0YShncmFudGVlOiBjZGsuYXdzX2lhbS5JR3JhbnRhYmxlKTogY2RrLmF3c19pYW0uR3JhbnQge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKTtcclxuICB9XHJcbn1cclxuIl19