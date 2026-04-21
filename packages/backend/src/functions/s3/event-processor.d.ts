import { S3Handler } from 'aws-lambda';
/**
 * Lambda function to process S3 events for audit logging
 * Triggered by S3 object creation and deletion events
 */
export declare const handler: S3Handler;
