import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { CostTracker } from '../../services/misra-analysis/cost-tracker';
export declare function getCostTracker(): CostTracker;
export declare function setCostTracker(tracker: CostTracker | null): void;
/**
 * Lambda handler for GET /analysis/costs
 * Returns cost breakdown and aggregation for user or organization
 *
 * Query Parameters:
 * - aggregateBy: 'user' | 'organization' (default: 'user')
 * - startDate: ISO date string (optional, default: 30 days ago)
 * - endDate: ISO date string (optional, default: now)
 *
 * Requirements: 14.5, 15.3, 15.4
 */
export declare const handler: (event: APIGatewayProxyEvent) => Promise<APIGatewayProxyResult>;
