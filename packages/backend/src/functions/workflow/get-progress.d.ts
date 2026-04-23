/**
 * Get Workflow Progress Lambda
 *
 * GET /workflow/progress/{workflowId}
 * Retrieves real-time progress of the autonomous workflow
 *
 * Response:
 * {
 *   "workflowId": "workflow-xxx",
 *   "status": "ANALYSIS_TRIGGERED",
 *   "progress": 75,
 *   "currentStep": "🧠 AI Analysis Triggered (Lambda)",
 *   "timestamp": 1234567890
 * }
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;
