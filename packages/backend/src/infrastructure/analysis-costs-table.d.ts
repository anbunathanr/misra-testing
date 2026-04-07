import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
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
export declare class AnalysisCostsTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string);
}
