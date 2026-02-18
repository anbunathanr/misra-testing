import { SQSEvent, Context } from 'aws-lambda';
/**
 * Notification Processor Lambda Handler
 *
 * Processes notification events from SQS queue:
 * 1. Parse notification event
 * 2. Check user preferences and filter if disabled
 * 3. Check quiet hours and suppress if applicable
 * 4. Check frequency limits and batch if exceeded
 * 5. Get appropriate template for event type and channel
 * 6. Render template with event context
 * 7. Route to n8n webhook if enabled, otherwise SNS
 * 8. Handle n8n fallback to SNS on failure
 * 9. Record notification attempt in history
 * 10. Update delivery status based on result
 * 11. Handle critical alert preference override
 */
export declare const handler: (event: SQSEvent, context: Context) => Promise<void>;
