/**
 * Get File Status Lambda Function
 *
 * Returns the current status of a file and its associated analysis
 * Used by the frontend to poll for analysis completion
 *
 * Request:
 * GET /files/{fileId}/status
 *
 * Response:
 * {
 *   "fileId": "file-123",
 *   "fileName": "sample.c",
 *   "uploadedAt": 1234567890,
 *   "analysisId": "analysis-456",
 *   "analysisStatus": "completed|pending|failed",
 *   "analysisProgress": 75,
 *   "analysisMessage": "Analyzing...",
 *   "errorMessage": null
 * }
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
