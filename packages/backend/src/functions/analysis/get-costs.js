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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWNvc3RzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LWNvc3RzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQVlBLHdDQUtDO0FBR0Qsd0NBRUM7QUFyQkQsOERBQTBEO0FBQzFELDZFQUF5RTtBQUN6RSxxREFBMkQ7QUFFM0QsTUFBTSxZQUFZLEdBQUcsSUFBSSxnQ0FBYyxDQUFDO0lBQ3RDLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXO0NBQzlDLENBQUMsQ0FBQztBQUVILHlDQUF5QztBQUN6QyxJQUFJLG1CQUFtQixHQUF1QixJQUFJLENBQUM7QUFFbkQsU0FBZ0IsY0FBYztJQUM1QixJQUFJLENBQUMsbUJBQW1CLEVBQUUsQ0FBQztRQUN6QixtQkFBbUIsR0FBRyxJQUFJLDBCQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7SUFDdEQsQ0FBQztJQUNELE9BQU8sbUJBQW1CLENBQUM7QUFDN0IsQ0FBQztBQUVELHVCQUF1QjtBQUN2QixTQUFnQixjQUFjLENBQUMsT0FBMkI7SUFDeEQsbUJBQW1CLEdBQUcsT0FBTyxDQUFDO0FBQ2hDLENBQUM7QUFFRDs7Ozs7Ozs7OztHQVVHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBQzNDLE9BQU8sQ0FBQyxHQUFHLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLHFCQUFxQixDQUFDLENBQUM7SUFFOUQsSUFBSSxDQUFDO1FBQ0gsaUVBQWlFO1FBQ2pFLE1BQU0sSUFBSSxHQUFHLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDdkMsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPLENBQUMsS0FBSyxDQUFDLHdCQUF3QixDQUFDLENBQUM7WUFDeEMsT0FBTztnQkFDTCxVQUFVLEVB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RSx1QkFBdUI7Z0JBQzlCLE9BQU8sRUFBRSxLQUFLLFlBQVksS0FBSyxDQUFDLENBQUMsQ0FBQyxLQUFLLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxlQUFlO2FBQ2xFLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWxJVyxRQUFBLE9BQU8sV0FrSWxCIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7XHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG59KTtcclxuXHJcbi8vIEFsbG93IGRlcGVuZGVuY3kgaW5qZWN0aW9uIGZvciB0ZXN0aW5nXHJcbmxldCBjb3N0VHJhY2tlckluc3RhbmNlOiBDb3N0VHJhY2tlciB8IG51bGwgPSBudWxsO1xyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIGdldENvc3RUcmFja2VyKCk6IENvc3RUcmFja2VyIHtcclxuICBpZiAoIWNvc3RUcmFja2VySW5zdGFuY2UpIHtcclxuICAgIGNvc3RUcmFja2VySW5zdGFuY2UgPSBuZXcgQ29zdFRyYWNrZXIoZHluYW1vQ2xpZW50KTtcclxuICB9XHJcbiAgcmV0dXJuIGNvc3RUcmFja2VySW5zdGFuY2U7XHJcbn1cclxuXHJcbi8vIEZvciB0ZXN0aW5nIHB1cnBvc2VzXHJcbmV4cG9ydCBmdW5jdGlvbiBzZXRDb3N0VHJhY2tlcih0cmFja2VyOiBDb3N0VHJhY2tlciB8IG51bGwpOiB2b2lkIHtcclxuICBjb3N0VHJhY2tlckluc3RhbmNlID0gdHJhY2tlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBHRVQgL2FuYWx5c2lzL2Nvc3RzXHJcbiAqIFJldHVybnMgY29zdCBicmVha2Rvd24gYW5kIGFnZ3JlZ2F0aW9uIGZvciB1c2VyIG9yIG9yZ2FuaXphdGlvblxyXG4gKiBcclxuICogUXVlcnkgUGFyYW1ldGVyczpcclxuICogLSBhZ2dyZWdhdGVCeTogJ3VzZXInIHwgJ29yZ2FuaXphdGlvbicgKGRlZmF1bHQ6ICd1c2VyJylcclxuICogLSBzdGFydERhdGU6IElTTyBkYXRlIHN0cmluZyAob3B0aW9uYWwsIGRlZmF1bHQ6IDMwIGRheXMgYWdvKVxyXG4gKiAtIGVuZERhdGU6IElTTyBkYXRlIHN0cmluZyAob3B0aW9uYWwsIGRlZmF1bHQ6IG5vdylcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogMTQuNSwgMTUuMywgMTUuNFxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ0dFVCAvYW5hbHlzaXMvY29zdHMgaW52b2tlZCcpO1xyXG4gIGNvbnNvbGUubG9nKCdRdWVyeSBwYXJhbWV0ZXJzOicsIGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSBMYW1iZGEgQXV0aG9yaXplciBjb250ZXh0IChSZXF1aXJlbWVudCAxNS4zKVxyXG4gICAgY29uc3QgdXNlciA9IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBpZiAoIXVzZXIudXNlcklkKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ1VzZXIgbm90IGF1dGhlbnRpY2F0ZWQnKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ0F1dGhlbnRpY2F0aW9uIHJlcXVpcmVkJyxcclxuICAgICAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHVzZXJJZCA9IHVzZXIudXNlcklkO1xyXG4gICAgY29uc3Qgb3JnYW5pemF0aW9uSWQgPSB1c2VyLm9yZ2FuaXphdGlvbklkO1xyXG5cclxuICAgIC8vIFBhcnNlIHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IGFnZ3JlZ2F0ZUJ5ID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzPy5hZ2dyZWdhdGVCeSB8fCAndXNlcic7XHJcbiAgICBjb25zdCBzdGFydERhdGVTdHIgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LnN0YXJ0RGF0ZTtcclxuICAgIGNvbnN0IGVuZERhdGVTdHIgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnM/LmVuZERhdGU7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgYWdncmVnYXRlQnkgcGFyYW1ldGVyXHJcbiAgICBpZiAoYWdncmVnYXRlQnkgIT09ICd1c2VyJyAmJiBhZ2dyZWdhdGVCeSAhPT0gJ29yZ2FuaXphdGlvbicpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgcGFyYW1ldGVyJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdhZ2dyZWdhdGVCeSBtdXN0IGJlIGVpdGhlciBcInVzZXJcIiBvciBcIm9yZ2FuaXphdGlvblwiJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSBkYXRlc1xyXG4gICAgY29uc3Qgc3RhcnREYXRlID0gc3RhcnREYXRlU3RyID8gbmV3IERhdGUoc3RhcnREYXRlU3RyKSA6IHVuZGVmaW5lZDtcclxuICAgIGNvbnN0IGVuZERhdGUgPSBlbmREYXRlU3RyID8gbmV3IERhdGUoZW5kRGF0ZVN0cikgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgZGF0ZXNcclxuICAgIGlmIChzdGFydERhdGUgJiYgaXNOYU4oc3RhcnREYXRlLmdldFRpbWUoKSkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ludmFsaWQgcGFyYW1ldGVyJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdzdGFydERhdGUgbXVzdCBiZSBhIHZhbGlkIElTTyBkYXRlIHN0cmluZycsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGVuZERhdGUgJiYgaXNOYU4oZW5kRGF0ZS5nZXRUaW1lKCkpKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdJbnZhbGlkIHBhcmFtZXRlcicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnZW5kRGF0ZSBtdXN0IGJlIGEgdmFsaWQgSVNPIGRhdGUgc3RyaW5nJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBHZXQgY29zdCB0cmFja2VyIGluc3RhbmNlXHJcbiAgICBjb25zdCBjb3N0VHJhY2tlciA9IGdldENvc3RUcmFja2VyKCk7XHJcblxyXG4gICAgLy8gRW5mb3JjZSBvcmdhbml6YXRpb24gaXNvbGF0aW9uIChSZXF1aXJlbWVudCAxNS40KVxyXG4gICAgLy8gV2hlbiBhZ2dyZWdhdGluZyBieSBvcmdhbml6YXRpb24sIHZlcmlmeSB1c2VyIGJlbG9uZ3MgdG8gdGhhdCBvcmdhbml6YXRpb25cclxuICAgIGlmIChhZ2dyZWdhdGVCeSA9PT0gJ29yZ2FuaXphdGlvbicpIHtcclxuICAgICAgY29uc29sZS5sb2coYFVzZXIgJHt1c2VySWR9IHJlcXVlc3Rpbmcgb3JnYW5pemF0aW9uIGNvc3RzIGZvciAke29yZ2FuaXphdGlvbklkfWApO1xyXG4gICAgICAvLyBVc2VyIGNhbiBvbmx5IHZpZXcgY29zdHMgZm9yIHRoZWlyIG93biBvcmdhbml6YXRpb25cclxuICAgICAgLy8gVGhpcyBpcyBhbHJlYWR5IGVuZm9yY2VkIGJ5IHVzaW5nIG9yZ2FuaXphdGlvbklkIGZyb20gdXNlciBjb250ZXh0XHJcbiAgICB9XHJcblxyXG4gICAgLy8gQWdncmVnYXRlIGNvc3RzXHJcbiAgICBjb25zb2xlLmxvZyhgQWdncmVnYXRpbmcgY29zdHMgYnkgJHthZ2dyZWdhdGVCeX1gKTtcclxuICAgIGNvbnN0IGFnZ3JlZ2F0aW9uID0gYWdncmVnYXRlQnkgPT09ICd1c2VyJ1xyXG4gICAgICA/IGF3YWl0IGNvc3RUcmFja2VyLmFnZ3JlZ2F0ZUNvc3RzQnlVc2VyKHVzZXJJZCwgc3RhcnREYXRlLCBlbmREYXRlKVxyXG4gICAgICA6IGF3YWl0IGNvc3RUcmFja2VyLmFnZ3JlZ2F0ZUNvc3RzQnlPcmdhbml6YXRpb24ob3JnYW5pemF0aW9uSWQsIHN0YXJ0RGF0ZSwgZW5kRGF0ZSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYENvc3QgYWdncmVnYXRpb24gY29tcGxldGVkOiAkJHthZ2dyZWdhdGlvbi50b3RhbENvc3QudG9GaXhlZCg2KX1gKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBhZ2dyZWdhdGVCeSxcclxuICAgICAgICB1c2VySWQ6IGFnZ3JlZ2F0ZUJ5ID09PSAndXNlcicgPyB1c2VySWQgOiB1bmRlZmluZWQsXHJcbiAgICAgICAgb3JnYW5pemF0aW9uSWQ6IGFnZ3JlZ2F0ZUJ5ID09PSAnb3JnYW5pemF0aW9uJyA/IG9yZ2FuaXphdGlvbklkIDogdW5kZWZpbmVkLFxyXG4gICAgICAgIGNvc3RzOiBhZ2dyZWdhdGlvbixcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciByZXRyaWV2aW5nIGNvc3QgZGF0YTonLCBlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdJbnRlcm5hbCBzZXJ2ZXIgZXJyb3InLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=