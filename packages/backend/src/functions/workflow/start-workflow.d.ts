/**
 * Start Workflow Lambda
 *
 * POST /workflow/start
 * Initiates the autonomous one-click workflow
 *
 * Request body:
 * {
 *   "email": "user@example.com"
 * }
 *
 * Response:
 * {
 *   "workflowId": "workflow-xxx",
 *   "status": "INITIATED",
 *   "progress": 0
 * }
 */
import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEventV2) => Promise<APIGatewayProxyResultV2>;
