/**
 * OTP Webhook Lambda Function
 *
 * Receives OTP emails from SES and stores them in DynamoDB
 * This enables automatic OTP extraction without accessing user's email
 *
 * Triggered by: SES receipt rule (email forwarding)
 * Stores OTP in DynamoDB with TTL for automatic cleanup
 */
import { S3Event } from 'aws-lambda';
export declare const handler: (event: S3Event) => Promise<void>;
