import * as cdk from 'aws-cdk-lib';
import * as dynamodb from 'aws-cdk-lib/aws-dynamodb';
/**
 * Production MISRA Platform Stack
 *
 * Complete production-ready infrastructure for MISRA analysis:
 * - Authentication (Cognito)
 * - File upload/retrieval (S3 + Lambda)
 * - MISRA analysis (Lambda)
 * - Results storage (DynamoDB)
 * - API Gateway with CORS
 */
export declare class ProductionMisraStack extends cdk.Stack {
    usersTable: dynamodb.Table;
    fileMetadataTable: dynamodb.Table;
    analysisResultsTable: dynamodb.Table;
    sampleFilesTable: dynamodb.Table;
    progressTable: dynamodb.Table;
    constructor(scope: cdk.App, id: string, props?: cdk.StackProps);
}
