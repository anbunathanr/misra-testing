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
