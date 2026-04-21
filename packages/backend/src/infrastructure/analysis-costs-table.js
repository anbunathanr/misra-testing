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
exports.AnalysisCostsTable = void 0;
const dynamodb = __importStar(require("aws-cdk-lib/aws-dynamodb"));
const constructs_1 = require("constructs");
const aws_cdk_lib_1 = require("aws-cdk-lib");
/**
 * Analysis Costs Table
 *
 * Stores cost tracking data for MISRA analysis operations.
 * Tracks Lambda execution time, S3 storage, and DynamoDB operations.
 *
 * Schema:
 * - PK: userId (Partition Key)
 * - SK: timestamp (Sort Key) - ISO timestamp for chronological ordering
 * - GSI1: organizationId (Partition Key) + timestamp (Sort Key) - Query by organization
 *
 * Attributes:
 * - analysisId: string - Reference to analysis result
 * - fileId: string - Reference to analyzed file
 * - costs: {
 *     lambdaExecutionTime: number (milliseconds)
 *     lambdaCost: number (USD)
 *     s3StorageCost: number (USD)
 *     dynamoDbWriteCost: number (USD)
 *     totalCost: number (USD)
 *   }
 * - metadata: {
 *     fileSize: number (bytes)
 *     duration: number (milliseconds)
 *   }
 *
 * Requirements: 14.1, 14.2, 14.3, 14.4
 */
class AnalysisCostsTable extends constructs_1.Construct {
    table;
    constructor(scope, id) {
        super(scope, id);
        this.table = new dynamodb.Table(this, 'AnalysisCostsTable', {
            tableName: 'AnalysisCosts',
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
        // GSI1: Query costs by organization
        this.table.addGlobalSecondaryIndex({
            indexName: 'OrganizationIndex',
            partitionKey: {
                name: 'organizationId',
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
exports.AnalysisCostsTable = AnalysisCostsTable;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHlzaXMtY29zdHMtdGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhbmFseXNpcy1jb3N0cy10YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtRUFBcUQ7QUFDckQsMkNBQXVDO0FBQ3ZDLDZDQUE0QztBQUU1Qzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBMkJHO0FBQ0gsTUFBYSxrQkFBbUIsU0FBUSxzQkFBUztJQUMvQixLQUFLLENBQWlCO0lBRXRDLFlBQVksS0FBZ0IsRUFBRSxFQUFVO1FBQ3RDLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7UUFFakIsSUFBSSxDQUFDLEtBQUssR0FBRyxJQUFJLFFBQVEsQ0FBQyxLQUFLLENBQUMsSUFBSSxFQUFFLG9CQUFvQixFQUFFO1lBQzFELFNBQVMsRUFBRSxlQUFlO1lBQzFCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxNQUFNO1lBQ25DLG1CQUFtQixFQUFFLElBQUk7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsb0NBQW9DO1FBQ3BDLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLG1CQUFtQjtZQUM5QixZQUFZLEVBQUU7Z0JBQ1osSUFBSSxFQUFFLGdCQUFnQjtnQkFDdEIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELE9BQU8sRUFBRTtnQkFDUCxJQUFJLEVBQUUsV0FBVztnQkFDakIsSUFBSSxFQUFFLFFBQVEsQ0FBQyxhQUFhLENBQUMsTUFBTTthQUNwQztZQUNELGNBQWMsRUFBRSxRQUFRLENBQUMsY0FBYyxDQUFDLEdBQUc7U0FDNUMsQ0FBQyxDQUFDO0lBQ0wsQ0FBQztDQUNGO0FBbkNELGdEQW1DQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCAqIGFzIGR5bmFtb2RiIGZyb20gJ2F3cy1jZGstbGliL2F3cy1keW5hbW9kYic7XHJcbmltcG9ydCB7IENvbnN0cnVjdCB9IGZyb20gJ2NvbnN0cnVjdHMnO1xyXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5IH0gZnJvbSAnYXdzLWNkay1saWInO1xyXG5cclxuLyoqXHJcbiAqIEFuYWx5c2lzIENvc3RzIFRhYmxlXHJcbiAqIFxyXG4gKiBTdG9yZXMgY29zdCB0cmFja2luZyBkYXRhIGZvciBNSVNSQSBhbmFseXNpcyBvcGVyYXRpb25zLlxyXG4gKiBUcmFja3MgTGFtYmRhIGV4ZWN1dGlvbiB0aW1lLCBTMyBzdG9yYWdlLCBhbmQgRHluYW1vREIgb3BlcmF0aW9ucy5cclxuICogXHJcbiAqIFNjaGVtYTpcclxuICogLSBQSzogdXNlcklkIChQYXJ0aXRpb24gS2V5KVxyXG4gKiAtIFNLOiB0aW1lc3RhbXAgKFNvcnQgS2V5KSAtIElTTyB0aW1lc3RhbXAgZm9yIGNocm9ub2xvZ2ljYWwgb3JkZXJpbmdcclxuICogLSBHU0kxOiBvcmdhbml6YXRpb25JZCAoUGFydGl0aW9uIEtleSkgKyB0aW1lc3RhbXAgKFNvcnQgS2V5KSAtIFF1ZXJ5IGJ5IG9yZ2FuaXphdGlvblxyXG4gKiBcclxuICogQXR0cmlidXRlczpcclxuICogLSBhbmFseXNpc0lkOiBzdHJpbmcgLSBSZWZlcmVuY2UgdG8gYW5hbHlzaXMgcmVzdWx0XHJcbiAqIC0gZmlsZUlkOiBzdHJpbmcgLSBSZWZlcmVuY2UgdG8gYW5hbHl6ZWQgZmlsZVxyXG4gKiAtIGNvc3RzOiB7XHJcbiAqICAgICBsYW1iZGFFeGVjdXRpb25UaW1lOiBudW1iZXIgKG1pbGxpc2Vjb25kcylcclxuICogICAgIGxhbWJkYUNvc3Q6IG51bWJlciAoVVNEKVxyXG4gKiAgICAgczNTdG9yYWdlQ29zdDogbnVtYmVyIChVU0QpXHJcbiAqICAgICBkeW5hbW9EYldyaXRlQ29zdDogbnVtYmVyIChVU0QpXHJcbiAqICAgICB0b3RhbENvc3Q6IG51bWJlciAoVVNEKVxyXG4gKiAgIH1cclxuICogLSBtZXRhZGF0YToge1xyXG4gKiAgICAgZmlsZVNpemU6IG51bWJlciAoYnl0ZXMpXHJcbiAqICAgICBkdXJhdGlvbjogbnVtYmVyIChtaWxsaXNlY29uZHMpXHJcbiAqICAgfVxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiAxNC4xLCAxNC4yLCAxNC4zLCAxNC40XHJcbiAqL1xyXG5leHBvcnQgY2xhc3MgQW5hbHlzaXNDb3N0c1RhYmxlIGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgdGFibGU6IGR5bmFtb2RiLlRhYmxlO1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpO1xyXG5cclxuICAgIHRoaXMudGFibGUgPSBuZXcgZHluYW1vZGIuVGFibGUodGhpcywgJ0FuYWx5c2lzQ29zdHNUYWJsZScsIHtcclxuICAgICAgdGFibGVOYW1lOiAnQW5hbHlzaXNDb3N0cycsXHJcbiAgICAgIHBhcnRpdGlvbktleToge1xyXG4gICAgICAgIG5hbWU6ICd1c2VySWQnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJpbGxpbmdNb2RlOiBkeW5hbW9kYi5CaWxsaW5nTW9kZS5QQVlfUEVSX1JFUVVFU1QsXHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IFJlbW92YWxQb2xpY3kuUkVUQUlOLFxyXG4gICAgICBwb2ludEluVGltZVJlY292ZXJ5OiB0cnVlLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gR1NJMTogUXVlcnkgY29zdHMgYnkgb3JnYW5pemF0aW9uXHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnT3JnYW5pemF0aW9uSW5kZXgnLFxyXG4gICAgICBwYXJ0aXRpb25LZXk6IHtcclxuICAgICAgICBuYW1lOiAnb3JnYW5pemF0aW9uSWQnLFxyXG4gICAgICAgIHR5cGU6IGR5bmFtb2RiLkF0dHJpYnV0ZVR5cGUuU1RSSU5HLFxyXG4gICAgICB9LFxyXG4gICAgICBzb3J0S2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3RpbWVzdGFtcCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHByb2plY3Rpb25UeXBlOiBkeW5hbW9kYi5Qcm9qZWN0aW9uVHlwZS5BTEwsXHJcbiAgICB9KTtcclxuICB9XHJcbn1cclxuIl19