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
exports.AIUsageTable = void 0;
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
/**
 * AI Usage Table
 *
 * Stores OpenAI API usage records for cost tracking and limit enforcement.
 *
 * Schema:
 * - PK: userId (Partition Key)
 * - SK: timestamp (Sort Key) - ISO timestamp for chronological ordering
 * - GSI1: projectId (Partition Key) + timestamp (Sort Key) - Query by project
 *
 * Attributes:
 * - operationType: 'analyze' | 'generate' | 'batch'
 * - tokens: { promptTokens, completionTokens, totalTokens }
 * - cost: number (calculated cost in USD)
 * - testCasesGenerated: number
 * - metadata: { model, duration }
 */
class AIUsageTable extends constructs_1.Construct {
    constructor(scope, id) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'AIUsageTable', {
            tableName: 'AIUsage',
            partitionKey: {
                name: 'userId',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp',
                type: dynamodb.AttributeType.STRING,
            },
            billingMode: dynamodb.BillingMode.PAY_PER_REQUEST,
            removalPolicy: aws_cdk_lib_1.RemovalPolicy.RETAIN,
            pointInTimeRecovery: true,
        });
        // GSI1: Query usage by project
        this.table.addGlobalSecondaryIndex({
            indexName: 'ProjectIndex',
            partitionKey: {
                name: 'projectId',
                type: dynamodb.AttributeType.STRING,
            },
            sortKey: {
                name: 'timestamp',
                type: dynamodb.AttributeType.STRING,
            },
            projectionType: dynamodb.ProjectionType.ALL,
        });
    }
}
exports.AIUsageTable = AIUsageTable;
