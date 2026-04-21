import { APIGatewayProxyEvent, APIGatewayProxyResult } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import { CostTracker } from '../../services/misra-analysis/cost-tracker';
import { getUserFromContext } from '../../utils/auth-util';

const dynamoClient = new DynamoDBClient({
  region: process.env.AWS_REGION || 'us-east-1',
});

// Allow dependency injection for testing
let costTrackerInstance: CostTracker | null = null;

export function getCostTracker(): CostTracker {
  if (!costTrackerInstance) {
    costTrackerInstance = new CostTracker(dynamoClient);
  }
  return costTrackerInstance;
}

// For testing purposes
export function setCostTracker(tracker: CostTracker | null): void {
  costTrackerInstance = tracker;
}

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
export const handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  console.log('GET /analysis/costs invoked');
  console.log('Query parameters:', event.queryStringParameters);

  try {
    // Extract user from Lambda Authorizer context (Requirement 15.3)
    const user = await getUserFromContext(event);
    if (!user.userId) {
      console.error('User not authenticated');
      return {
        statusCode: 401,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: {
            code: 'UNAUTHORIZED',
            message: 'Authentication required',
            timestamp: new Date().toISOString(),
          },
        }),
      };
    }

    const userId = user.userId;
    const organizationId = user.organizationId;

    // Parse query parameters
    const aggregateBy = event.queryStringParameters?.aggregateBy || 'user';
    const startDateStr = event.queryStringParameters?.startDate;
    const endDateStr = event.queryStringParameters?.endDate;

    // Validate aggregateBy parameter
    if (aggregateBy !== 'user' && aggregateBy !== 'organization') {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid parameter',
          message: 'aggregateBy must be either "user" or "organization"',
        }),
      };
    }

    // Parse dates
    const startDate = startDateStr ? new Date(startDateStr) : undefined;
    const endDate = endDateStr ? new Date(endDateStr) : undefined;

    // Validate dates
    if (startDate && isNaN(startDate.getTime())) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid parameter',
          message: 'startDate must be a valid ISO date string',
        }),
      };
    }

    if (endDate && isNaN(endDate.getTime())) {
      return {
        statusCode: 400,
        headers: {
          'Content-Type': 'application/json',
          'Access-Control-Allow-Origin': '*',
        },
        body: JSON.stringify({
          error: 'Invalid parameter',
          message: 'endDate must be a valid ISO date string',
        }),
      };
    }

    // Get cost tracker instance
    const costTracker = getCostTracker();

    // Enforce organization isolation (Requirement 15.4)
    // When aggregating by organization, verify user belongs to that organization
    if (aggregateBy === 'organization') {
      console.log(`User ${userId} requesting organization costs for ${organizationId}`);
      // User can only view costs for their own organization
      // This is already enforced by using organizationId from user context
    }

    // Aggregate costs
    console.log(`Aggregating costs by ${aggregateBy}`);
    const aggregation = aggregateBy === 'user'
      ? await costTracker.aggregateCostsByUser(userId, startDate, endDate)
      : await costTracker.aggregateCostsByOrganization(organizationId, startDate, endDate);

    console.log(`Cost aggregation completed: $${aggregation.totalCost.toFixed(6)}`);

    return {
      statusCode: 200,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        aggregateBy,
        userId: aggregateBy === 'user' ? userId : undefined,
        organizationId: aggregateBy === 'organization' ? organizationId : undefined,
        costs: aggregation,
      }),
    };
  } catch (error) {
    console.error('Error retrieving cost data:', error);

    return {
      statusCode: 500,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
      },
      body: JSON.stringify({
        error: 'Internal server error',
        message: error instanceof Error ? error.message : 'Unknown error',
      }),
    };
  }
};
