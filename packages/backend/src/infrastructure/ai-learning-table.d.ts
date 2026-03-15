import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
/**
 * AI Learning Table
 *
 * Stores learning data from test execution results to improve future test generation.
 * Uses domain-based partitioning to group learning by application domain.
 */
export declare class AILearningTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string);
}
