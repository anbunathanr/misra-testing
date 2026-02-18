/**
 * Test Executor Lambda Function
 * Processes SQS messages to execute test cases with Playwright/HTTP client
 *
 * This Lambda is triggered by SQS messages containing test execution requests.
 * It orchestrates the complete test execution lifecycle:
 * 1. Update execution status to "running"
 * 2. Execute test case using TestExecutorService
 * 3. Update execution record with final results
 * 4. Handle timeouts and errors gracefully
 */
import { SQSEvent, Context } from 'aws-lambda';
/**
 * Lambda handler for test execution
 * Processes SQS messages containing test execution requests
 */
export declare const handler: (event: SQSEvent, context: Context) => Promise<void>;
