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
exports.NotificationPreferencesTable = void 0;
const cdk = __importStar(require("aws-cdk-lib"));
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
class NotificationPreferencesTable extends constructs_1.Construct {
    table;
    constructor(scope, id, props) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'Table', {
            tableName: `misra-platform-notification-preferences-${props.environment}`,
            partitionKey: { name: 'userId', type: dynamodb.AttributeType.STRING },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            encryption: dynamodb.TableEncryption.AWS_MANAGED,
            removalPolicy: cdk.RemovalPolicy.DESTROY, // For development
            pointInTimeRecovery: true,
        });
        // Add CloudFormation output
        new cdk.CfnOutput(this, 'TableName', {
            value: this.table.tableName,
            description: 'DynamoDB table for notification preferences',
        });
    }
    grantReadWriteData(grantee) {
        return this.table.grantReadWriteData(grantee);
    }
    grantReadData(grantee) {
        return this.table.grantReadData(grantee);
    }
}
exports.NotificationPreferencesTable = NotificationPreferencesTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLXRhYmxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLXRhYmxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQUFBLGlEQUFtQztBQUNuQyxtRUFBcUQ7QUFDckQsMkNBQXVDO0FBTXZDLE1BQWEsNEJBQTZCLFNBQVEsc0JBQVM7SUFDekMsS0FBSyxDQUFpQjtJQUV0QyxZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQXdDO1FBQ2hGLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLE9BQU8sRUFBRTtZQUM3QyxTQUFTLEVBQUUsMkNBQTJDLEtBQUssQ0FBQyxXQUFXLEVBQUU7WUFDekUsWUFBWSxFQUFFLEVBQUUsSUFBSSxFQUFFLFFBQVEsRUFBRSxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNLEVBQUU7WUFDckUsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxVQUFVLEVBQUUsUUFBUSxDQUFDLGVBQWUsQ0FBQyxXQUFXO1lBQ2hELGFBQWEsRUFBRSxHQUFHLENBQUMsYUFBYSxDQUFDLE9BQU8sRUFBRSxrQkFBa0I7WUFDNUQsbUJBQW1CLEVBQUUsSUFBSTtTQUMxQixDQUFDLENBQUM7UUFFSCw0QkFBNEI7UUFDNUIsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLElBQUksRUFBRSxXQUFXLEVBQUU7WUFDbkMsS0FBSyxFQUFFLElBQUksQ0FBQyxLQUFLLENBQUMsU0FBUztZQUMzQixXQUFXLEVBQUUsNkNBQTZDO1NBQzNELENBQUMsQ0FBQztJQUNMLENBQUM7SUFFTSxrQkFBa0IsQ0FBQyxPQUErQjtRQUN2RCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsa0JBQWtCLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDaEQsQ0FBQztJQUVNLGFBQWEsQ0FBQyxPQUErQjtRQUNsRCxPQUFPLElBQUksQ0FBQyxLQUFLLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzNDLENBQUM7Q0FDRjtBQTdCRCxvRUE2QkMiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgKiBhcyBjZGsgZnJvbSAnYXdzLWNkay1saWInO1xyXG5pbXBvcnQgKiBhcyBkeW5hbW9kYiBmcm9tICdhd3MtY2RrLWxpYi9hd3MtZHluYW1vZGInO1xyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZVByb3BzIHtcclxuICBlbnZpcm9ubWVudDogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTm90aWZpY2F0aW9uUHJlZmVyZW5jZXNUYWJsZSBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IHRhYmxlOiBkeW5hbW9kYi5UYWJsZTtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM6IE5vdGlmaWNhdGlvblByZWZlcmVuY2VzVGFibGVQcm9wcykge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICB0aGlzLnRhYmxlID0gbmV3IGR5bmFtb2RiLlRhYmxlKHRoaXMsICdUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiBgbWlzcmEtcGxhdGZvcm0tbm90aWZpY2F0aW9uLXByZWZlcmVuY2VzLSR7cHJvcHMuZW52aXJvbm1lbnR9YCxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7IG5hbWU6ICd1c2VySWQnLCB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyB9LFxyXG4gICAgICBiaWxsaW5nTW9kZTogZHluYW1vZGIuQmlsbGluZ01vZGUuUEFZX1BFUl9SRVFVRVNULFxyXG4gICAgICBlbmNyeXB0aW9uOiBkeW5hbW9kYi5UYWJsZUVuY3J5cHRpb24uQVdTX01BTkFHRUQsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGNkay5SZW1vdmFsUG9saWN5LkRFU1RST1ksIC8vIEZvciBkZXZlbG9wbWVudFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIENsb3VkRm9ybWF0aW9uIG91dHB1dFxyXG4gICAgbmV3IGNkay5DZm5PdXRwdXQodGhpcywgJ1RhYmxlTmFtZScsIHtcclxuICAgICAgdmFsdWU6IHRoaXMudGFibGUudGFibGVOYW1lLFxyXG4gICAgICBkZXNjcmlwdGlvbjogJ0R5bmFtb0RCIHRhYmxlIGZvciBub3RpZmljYXRpb24gcHJlZmVyZW5jZXMnLFxyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkV3JpdGVEYXRhKGdyYW50ZWU6IGNkay5hd3NfaWFtLklHcmFudGFibGUpOiBjZGsuYXdzX2lhbS5HcmFudCB7XHJcbiAgICByZXR1cm4gdGhpcy50YWJsZS5ncmFudFJlYWRXcml0ZURhdGEoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICBwdWJsaWMgZ3JhbnRSZWFkRGF0YShncmFudGVlOiBjZGsuYXdzX2lhbS5JR3JhbnRhYmxlKTogY2RrLmF3c19pYW0uR3JhbnQge1xyXG4gICAgcmV0dXJuIHRoaXMudGFibGUuZ3JhbnRSZWFkRGF0YShncmFudGVlKTtcclxuICB9XHJcbn1cclxuIl19