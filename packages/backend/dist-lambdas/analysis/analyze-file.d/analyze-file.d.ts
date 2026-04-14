import { SQSEvent, Context } from 'aws-lambda';
/**
 * Lambda handler for MISRA file analysis
 * Processes SQS messages containing analysis requests
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
export declare const handler: (event: SQSEvent, context: Context) => Promise<void>;
