import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
import { Construct } from 'constructs';
export interface AnalysisCacheTableProps {
    environment: string;
}
/**
 * DynamoDB table for caching MISRA analysis results
 *
 * Primary key: fileHash (SHA-256 hash of file content)
 * Stores: analysis results, timestamp, file metadata
 * TTL: configurable expiration (default 30 days)
 *
 * Requirements: 10.7 - Cache analysis results for identical files
 */
export declare class AnalysisCacheTable extends Construct {
    readonly table: dynamodb.Table;
    constructor(scope: Construct, id: string, props: AnalysisCacheTableProps);
}
