"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
exports.getCostTracker = getCostTracker;
exports.setCostTracker = setCostTracker;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const cost_tracker_1 = require("../../services/misra-analysis/cost-tracker");
const auth_util_1 = require("../../utils/auth-util");
const dynamoClient = new client_dynamodb_1.DynamoDBClient({
    region: process.env.AWS_REGION || 'us-east-1',
});
// Allow dependency injection for testing
let costTrackerInstance = null;
function getCostTracker() {
    if (!costTrackerInstance) {
        costTrackerInstance = new cost_tracker_1.CostTracker(dynamoClient);
    }
    return costTrackerInstance;
}
// For testing purposes
function setCostTracker(tracker) {
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
const handler = async (event) => {
    console.log('GET /analysis/costs invoked');
    console.log('Query parameters:', event.queryStringParameters);
    try {
        // Extract user from Lambda Authorizer context (Requirement 15.3)
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
    }
    catch (error) {
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
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWNvc3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWNvc3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVlBLHdDQUtDO0FBR0Qsd0NBRUM7QUFyQkQsOERBQTBEO0FBQzFELDZFQUF5RTtBQUN6RSxxREFBMkQ7QUFFM0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILHlDQUF5QztBQUN6QyxJQUFJLG1CQUFtQixHQUF1QixJQUFJLENBQUM7QUFFbkQsU0FBZ0IsY0FBYztJQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixtQkFBbUIsR0FBRyxJQUFJLDBCQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNELE9BQU8sbUJBQW1CLENBQUM7QUFDN0IsQ0FBQztBQUVELHVCQUF1QjtBQUN2QixTQUFnQixjQUFjLENBQUMsT0FBMkI7SUFDeEQsbUJBQW1CLEdBQUcsT0FBTyxDQUFDO0FBQ2hDLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFOUQsSUFBSSxDQUFDO1FBQ0gsaUVBQWlFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLE1BQU0sSUFBQSw4QkFBa0IsRUFBQyxLQUFLLENBQUMsQ0FBQztRQUM3QyxJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ2pCLE9BQU8sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztZQUN4QyxPQUFPO2dCQUNMLFVB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SyxFQUFFLHVCQUF1QjtnQkFDOUIsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBbElXLFFBQUEsT0FBTyxXQWtJbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50IH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9taXNyYS1hbmFseXNpcy9jb3N0LXRyYWNrZXInO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5cclxuY29uc3QgZHluYW1vQ2xpZW50ID0gbmV3IER5bmFtb0RCQ2xpZW50KHtcclxuICByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScsXHJcbn0pO1xyXG5cclxuLy8gQWxsb3cgZGVwZW5kZW5jeSBpbmplY3Rpb24gZm9yIHRlc3RpbmdcclxubGV0IGNvc3RUcmFja2VySW5zdGFuY2U6IENvc3RUcmFja2VyIHwgbnVsbCA9IG51bGw7XHJcblxyXG5leHBvcnQgZnVuY3Rpb24gZ2V0Q29zdFRyYWNrZXIoKTogQ29zdFRyYWNrZXIge1xyXG4gIGlmICghY29zdFRyYWNrZXJJbnN0YW5jZSkge1xyXG4gICAgY29zdFRyYWNrZXJJbnN0YW5jZSA9IG5ldyBDb3N0VHJhY2tlcihkeW5hbW9DbGllbnQpO1xyXG4gIH1cclxuICByZXR1cm4gY29zdFRyYWNrZXJJbnN0YW5jZTtcclxufVxyXG5cclxuLy8gRm9yIHRlc3RpbmcgcHVycG9zZXNcclxuZXhwb3J0IGZ1bmN0aW9uIHNldENvc3RUcmFja2VyKHRyYWNrZXI6IENvc3RUcmFja2VyIHwgbnVsbCk6IHZvaWQge1xyXG4gIGNvc3RUcmFja2VySW5zdGFuY2UgPSB0cmFja2VyO1xyXG59XHJcblxyXG4vKipcclxuICogTGFtYmRhIGhhbmRsZXIgZm9yIEdFVCAvYW5hbHlzaXMvY29zdHNcclxuICogUmV0dXJucyBjb3N0IGJyZWFrZG93biBhbmQgYWdncmVnYXRpb24gZm9yIHVzZXIgb3Igb3JnYW5pemF0aW9uXHJcbiAqIFxyXG4gKiBRdWVyeSBQYXJhbWV0ZXJzOlxyXG4gKiAtIGFnZ3JlZ2F0ZUJ5OiAndXNlcicgfCAnb3JnYW5pemF0aW9uJyAoZGVmYXVsdDogJ3VzZXInKVxyXG4gKiAtIHN0YXJ0RGF0ZTogSVNPIGRhdGUgc3RyaW5nIChvcHRpb25hbCwgZGVmYXVsdDogMzAgZGF5cyBhZ28pXHJcbiAqIC0gZW5kRGF0ZTogSVNPIGRhdGUgc3RyaW5nIChvcHRpb25hbCwgZGVmYXVsdDogbm93KVxyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiAxNC41LCAxNS4zLCAxNS40XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR0VUIC9hbmFseXNpcy9jb3N0cyBpbnZva2VkJyk7XHJcbiAgY29uc29sZS5sb2coJ1F1ZXJ5IHBhcmFtZXRlcnM6JywgZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIExhbWJkYSBBdXRob3JpemVyIGNvbnRleHQgKFJlcXVpcmVtZW50IDE1LjMpXHJcbiAgICBjb25zdCB1c2VyID0gYXdhaXQgZ2V0VXNlckZyb21Db250ZXh0KGV2ZW50KTtcclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignVXNlciBub3QgYXV0aGVudGljYXRlZCcpO1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnQXV0aGVudGljYXRpb24gcmVxdWlyZWQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXNlcklkID0gdXNlci51c2VySWQ7XHJcbiAgICBjb25zdCBvcmdhbml6YXRpb25JZCA9IHVzZXIub3JnYW5pemF0aW9uSWQ7XHJcblxyXG4gICAgLy8gUGFyc2UgcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgYWdncmVnYXRlQnkgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmFnZ3JlZ2F0ZUJ5IHx8ICd1c2VyJztcclxuICAgIGNvbnN0IHN0YXJ0RGF0ZVN0ciA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uc3RhcnREYXRlO1xyXG4gICAgY29uc3QgZW5kRGF0ZVN0ciA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycz8uZW5kRGF0ZTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBhZ2dyZWdhdGVCeSBwYXJhbWV0ZXJcclxuICAgIGlmIChhZ2dyZWdhdGVCeSAhPT0gJ3VzZXInICYmIGFnZ3JlZ2F0ZUJ5ICE9PSAnb3JnYW5pemF0aW9uJykge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBwYXJhbWV0ZXInLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ2FnZ3JlZ2F0ZUJ5IG11c3QgYmUgZWl0aGVyIFwidXNlclwiIG9yIFwib3JnYW5pemF0aW9uXCInLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFBhcnNlIGRhdGVzXHJcbiAgICBjb25zdCBzdGFydERhdGUgPSBzdGFydERhdGVTdHIgPyBuZXcgRGF0ZShzdGFydERhdGVTdHIpIDogdW5kZWZpbmVkO1xyXG4gICAgY29uc3QgZW5kRGF0ZSA9IGVuZERhdGVTdHIgPyBuZXcgRGF0ZShlbmREYXRlU3RyKSA6IHVuZGVmaW5lZDtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBkYXRlc1xyXG4gICAgaWYgKHN0YXJ0RGF0ZSAmJiBpc05hTihzdGFydERhdGUuZ2V0VGltZSgpKSkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBwYXJhbWV0ZXInLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ3N0YXJ0RGF0ZSBtdXN0IGJlIGEgdmFsaWQgSVNPIGRhdGUgc3RyaW5nJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoZW5kRGF0ZSAmJiBpc05hTihlbmREYXRlLmdldFRpbWUoKSkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgcGFyYW1ldGVyJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdlbmREYXRlIG11c3QgYmUgYSB2YWxpZCBJU08gZGF0ZSBzdHJpbmcnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCBjb3N0IHRyYWNrZXIgaW5zdGFuY2VcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gZ2V0Q29zdFRyYWNrZXIoKTtcclxuXHJcbiAgICAvLyBFbmZvcmNlIG9yZ2FuaXphdGlvbiBpc29sYXRpb24gKFJlcXVpcmVtZW50IDE1LjQpXHJcbiAgICAvLyBXaGVuIGFnZ3JlZ2F0aW5nIGJ5IG9yZ2FuaXphdGlvbiwgdmVyaWZ5IHVzZXIgYmVsb25ncyB0byB0aGF0IG9yZ2FuaXphdGlvblxyXG4gICAgaWYgKGFnZ3JlZ2F0ZUJ5ID09PSAnb3JnYW5pemF0aW9uJykge1xyXG4gICAgICBjb25zb2xlLmxvZyhgVXNlciAke3VzZXJJZH0gcmVxdWVzdGluZyBvcmdhbml6YXRpb24gY29zdHMgZm9yICR7b3JnYW5pemF0aW9uSWR9YCk7XHJcbiAgICAgIC8vIFVzZXIgY2FuIG9ubHkgdmlldyBjb3N0cyBmb3IgdGhlaXIgb3duIG9yZ2FuaXphdGlvblxyXG4gICAgICAvLyBUaGlzIGlzIGFscmVhZHkgZW5mb3JjZWQgYnkgdXNpbmcgb3JnYW5pemF0aW9uSWQgZnJvbSB1c2VyIGNvbnRleHRcclxuICAgIH1cclxuXHJcbiAgICAvLyBBZ2dyZWdhdGUgY29zdHNcclxuICAgIGNvbnNvbGUubG9nKGBBZ2dyZWdhdGluZyBjb3N0cyBieSAke2FnZ3JlZ2F0ZUJ5fWApO1xyXG4gICAgY29uc3QgYWdncmVnYXRpb24gPSBhZ2dyZWdhdGVCeSA9PT0gJ3VzZXInXHJcbiAgICAgID8gYXdhaXQgY29zdFRyYWNrZXIuYWdncmVnYXRlQ29zdHNCeVVzZXIodXNlcklkLCBzdGFydERhdGUsIGVuZERhdGUpXHJcbiAgICAgIDogYXdhaXQgY29zdFRyYWNrZXIuYWdncmVnYXRlQ29zdHNCeU9yZ2FuaXphdGlvbihvcmdhbml6YXRpb25JZCwgc3RhcnREYXRlLCBlbmREYXRlKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQ29zdCBhZ2dyZWdhdGlvbiBjb21wbGV0ZWQ6ICQke2FnZ3JlZ2F0aW9uLnRvdGFsQ29zdC50b0ZpeGVkKDYpfWApO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGFnZ3JlZ2F0ZUJ5LFxyXG4gICAgICAgIHVzZXJJZDogYWdncmVnYXRlQnkgPT09ICd1c2VyJyA/IHVzZXJJZCA6IHVuZGVmaW5lZCxcclxuICAgICAgICBvcmdhbml6YXRpb25JZDogYWdncmVnYXRlQnkgPT09ICdvcmdhbml6YXRpb24nID8gb3JnYW5pemF0aW9uSWQgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgY29zdHM6IGFnZ3JlZ2F0aW9uLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHJldHJpZXZpbmcgY29zdCBkYXRhOicsIGVycm9yKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ludGVybmFsIHNlcnZlciBlcnJvcicsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==