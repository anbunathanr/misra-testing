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
    table;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYWktdXNhZ2UtdGFibGUuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJhaS11c2FnZS10YWJsZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7QUFBQSxtRUFBcUQ7QUFDckQsMkNBQXVDO0FBQ3ZDLDZDQUE0QztBQUU1Qzs7Ozs7Ozs7Ozs7Ozs7OztHQWdCRztBQUNILE1BQWEsWUFBYSxTQUFRLHNCQUFTO0lBQ3pCLEtBQUssQ0FBaUI7SUFFdEMsWUFBWSxLQUFnQixFQUFFLEVBQVU7UUFDdEMsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixJQUFJLENBQUMsS0FBSyxHQUFHLElBQUksUUFBUSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsY0FBYyxFQUFFO1lBQ3BELFNBQVMsRUFBRSxTQUFTO1lBQ3BCLFlBQVksRUFBRTtnQkFDWixJQUFJLEVBQUUsUUFBUTtnQkFDZCxJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsV0FBVyxFQUFFLFFBQVEsQ0FBQyxXQUFXLENBQUMsZUFBZTtZQUNqRCxhQUFhLEVBQUUsMkJBQWEsQ0FBQyxNQUFNO1lBQ25DLG1CQUFtQixFQUFFLElBQUk7U0FDMUIsQ0FBQyxDQUFDO1FBRUgsK0JBQStCO1FBQy9CLElBQUksQ0FBQyxLQUFLLENBQUMsdUJBQXVCLENBQUM7WUFDakMsU0FBUyxFQUFFLGNBQWM7WUFDekIsWUFBWSxFQUFFO2dCQUNaLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsT0FBTyxFQUFFO2dCQUNQLElBQUksRUFBRSxXQUFXO2dCQUNqQixJQUFJLEVBQUUsUUFBUSxDQUFDLGFBQWEsQ0FBQyxNQUFNO2FBQ3BDO1lBQ0QsY0FBYyxFQUFFLFFBQVEsQ0FBQyxjQUFjLENBQUMsR0FBRztTQUM1QyxDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUFuQ0Qsb0NBbUNDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0ICogYXMgZHluYW1vZGIgZnJvbSAnYXdzLWNkay1saWIvYXdzLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cyc7XHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3kgfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcblxyXG4vKipcclxuICogQUkgVXNhZ2UgVGFibGVcclxuICogXHJcbiAqIFN0b3JlcyBPcGVuQUkgQVBJIHVzYWdlIHJlY29yZHMgZm9yIGNvc3QgdHJhY2tpbmcgYW5kIGxpbWl0IGVuZm9yY2VtZW50LlxyXG4gKiBcclxuICogU2NoZW1hOlxyXG4gKiAtIFBLOiB1c2VySWQgKFBhcnRpdGlvbiBLZXkpXHJcbiAqIC0gU0s6IHRpbWVzdGFtcCAoU29ydCBLZXkpIC0gSVNPIHRpbWVzdGFtcCBmb3IgY2hyb25vbG9naWNhbCBvcmRlcmluZ1xyXG4gKiAtIEdTSTE6IHByb2plY3RJZCAoUGFydGl0aW9uIEtleSkgKyB0aW1lc3RhbXAgKFNvcnQgS2V5KSAtIFF1ZXJ5IGJ5IHByb2plY3RcclxuICogXHJcbiAqIEF0dHJpYnV0ZXM6XHJcbiAqIC0gb3BlcmF0aW9uVHlwZTogJ2FuYWx5emUnIHwgJ2dlbmVyYXRlJyB8ICdiYXRjaCdcclxuICogLSB0b2tlbnM6IHsgcHJvbXB0VG9rZW5zLCBjb21wbGV0aW9uVG9rZW5zLCB0b3RhbFRva2VucyB9XHJcbiAqIC0gY29zdDogbnVtYmVyIChjYWxjdWxhdGVkIGNvc3QgaW4gVVNEKVxyXG4gKiAtIHRlc3RDYXNlc0dlbmVyYXRlZDogbnVtYmVyXHJcbiAqIC0gbWV0YWRhdGE6IHsgbW9kZWwsIGR1cmF0aW9uIH1cclxuICovXHJcbmV4cG9ydCBjbGFzcyBBSVVzYWdlVGFibGUgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSB0YWJsZTogZHluYW1vZGIuVGFibGU7XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcpIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgdGhpcy50YWJsZSA9IG5ldyBkeW5hbW9kYi5UYWJsZSh0aGlzLCAnQUlVc2FnZVRhYmxlJywge1xyXG4gICAgICB0YWJsZU5hbWU6ICdBSVVzYWdlJyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3VzZXJJZCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndGltZXN0YW1wJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgYmlsbGluZ01vZGU6IGR5bmFtb2RiLkJpbGxpbmdNb2RlLlBBWV9QRVJfUkVRVUVTVCxcclxuICAgICAgcmVtb3ZhbFBvbGljeTogUmVtb3ZhbFBvbGljeS5SRVRBSU4sXHJcbiAgICAgIHBvaW50SW5UaW1lUmVjb3Zlcnk6IHRydWUsXHJcbiAgICB9KTtcclxuXHJcbiAgICAvLyBHU0kxOiBRdWVyeSB1c2FnZSBieSBwcm9qZWN0XHJcbiAgICB0aGlzLnRhYmxlLmFkZEdsb2JhbFNlY29uZGFyeUluZGV4KHtcclxuICAgICAgaW5kZXhOYW1lOiAnUHJvamVjdEluZGV4JyxcclxuICAgICAgcGFydGl0aW9uS2V5OiB7XHJcbiAgICAgICAgbmFtZTogJ3Byb2plY3RJZCcsXHJcbiAgICAgICAgdHlwZTogZHluYW1vZGIuQXR0cmlidXRlVHlwZS5TVFJJTkcsXHJcbiAgICAgIH0sXHJcbiAgICAgIHNvcnRLZXk6IHtcclxuICAgICAgICBuYW1lOiAndGltZXN0YW1wJyxcclxuICAgICAgICB0eXBlOiBkeW5hbW9kYi5BdHRyaWJ1dGVUeXBlLlNUUklORyxcclxuICAgICAgfSxcclxuICAgICAgcHJvamVjdGlvblR5cGU6IGR5bmFtb2RiLlByb2plY3Rpb25UeXBlLkFMTCxcclxuICAgIH0pO1xyXG4gIH1cclxufVxyXG4iXX0=