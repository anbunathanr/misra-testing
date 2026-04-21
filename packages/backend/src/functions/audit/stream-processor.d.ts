import { DynamoDBStreamHandler } from 'aws-lambda';
/**
 * Lambda function to process DynamoDB streams for audit logging
 * Triggered by changes to Users, FileMetadata, and AnalysisResults tables
 */
export declare const handler: DynamoDBStreamHandler;
