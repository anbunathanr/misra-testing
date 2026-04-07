/**
 * Get Execution Status Lambda
 * Returns current status and progress information for a test execution
 */
import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
export interface ExecutionStatusResponse {
    executionId: string;
    status: string;
    result?: string;
    currentStep?: number;
    totalSteps: number;
    startTime: string;
    duration?: number;
}
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
