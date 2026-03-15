import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
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
export declare class AIUsageTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string);
}
