"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
const auth_util_1 = require("../../utils/auth-util");
/**
 * GET /api/ai-test-generation/usage
 *
 * Retrieves usage statistics and cost estimates.
 *
 * Query Parameters:
 * - userId?: string
 * - projectId?: string
 * - startDate?: string (ISO format)
 * - endDate?: string (ISO format)
 * - provider?: string (OPENAI, BEDROCK, HUGGINGFACE)
 *
 * Response:
 * {
 *   today: { requests, tokens, cost },
 *   thisMonth: { requests, tokens, cost },
 *   limits: { dailyRequests, dailyTokens, dailyCost, monthlyRequests, monthlyTokens, monthlyCost },
 *   stats: UsageStats,
 *   provider?: string (if filtered)
 * }
 */
const handler = async (event) => {
    console.log('[GetUsage] Received request');
    try {
        // Get user ID from authorizer context
        const user = await (0, auth_util_1.getUserFromContext)(event);
        const requestingUserId = user.userId;
        if (!requestingUserId) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Unauthorized',
                }),
            };
        }
        // Parse query parameters
        const queryParams = event.queryStringParameters || {};
        const userId = queryParams.userId || requestingUserId; // Default to requesting user
        const projectId = queryParams.projectId;
        const startDate = queryParams.startDate;
        const endDate = queryParams.endDate;
        const provider = queryParams.provider;
        // Authorization check: users can only view their own stats unless they're admin
        if (userId !== requestingUserId) {
            return {
                statusCode: 403,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Forbidden',
                    message: 'You can only view your own usage statistics',
                }),
            };
        }
        console.log(`[GetUsage] Retrieving stats for user: ${userId}`);
        // Initialize cost tracker
        const tableName = process.env.AI_USAGE_TABLE || 'AIUsage';
        const costTracker = new cost_tracker_1.CostTracker(tableName);
        // Get today's date range
        const today = new Date();
        const startOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate()).toISOString();
        const endOfToday = new Date(today.getFullYear(), today.getMonth(), today.getDate(), 23, 59, 59).toISOString();
        // Get this month's date range
        const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1).toISOString();
        const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0, 23, 59, 59).toISOString();
        // Get usage statistics for today
        const todayStats = await costTracker.getUsageStats(userId, projectId, startOfToday, endOfToday, provider);
        // Get usage statistics for this month
        const monthStats = await costTracker.getUsageStats(userId, projectId, startOfMonth, endOfMonth, provider);
        // Get overall stats if date range provided
        const overallStats = startDate || endDate
            ? await costTracker.getUsageStats(userId, projectId, startDate, endDate, provider)
            : monthStats;
        console.log(`[GetUsage] Today: ${todayStats.totalCalls} calls, $${todayStats.estimatedCost.toFixed(2)}, provider: ${provider || 'all'}`);
        console.log(`[GetUsage] Month: ${monthStats.totalCalls} calls, $${monthStats.estimatedCost.toFixed(2)}, provider: ${provider || 'all'}`);
        // Get limits from config (these should match the limits in cost-tracker.ts)
        const limits = {
            dailyRequests: 100,
            dailyTokens: 100000,
            dailyCost: 10.0,
            monthlyRequests: 3000,
            monthlyTokens: 3000000,
            monthlyCost: 100.0,
        };
        // Build response
        const response = {
            today: {
                requests: todayStats.totalCalls,
                tokens: todayStats.totalTokens,
                cost: todayStats.estimatedCost,
            },
            thisMonth: {
                requests: monthStats.totalCalls,
                tokens: monthStats.totalTokens,
                cost: monthStats.estimatedCost,
            },
            limits,
            stats: {
                totalCalls: overallStats.totalCalls,
                totalTokens: overallStats.totalTokens,
                estimatedCost: overallStats.estimatedCost,
                breakdown: {
                    byUser: Object.fromEntries(overallStats.breakdown.byUser),
                    byProject: Object.fromEntries(overallStats.breakdown.byProject),
                    byDate: Object.fromEntries(overallStats.breakdown.byDate),
                },
            },
        };
        // Add provider filter info if specified
        if (provider) {
            response.provider = provider;
        }
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(response),
        };
    }
    catch (error) {
        console.error('[GetUsage] Error:', error);
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to retrieve usage statistics',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVzYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUE2RTtBQUM3RSxxREFBMkQ7QUFFM0Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFDN0MsTUFBTSxnQkFBZ0IsR0FBRyxJQUFJLENBQUMsTUFBTSxDQUFDO1FBQ3JDLElBQUksQ0FBQyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ3RCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsY0FBYztpQkFDdEIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQseUJBQXlCO1FBQ3pCLE1BQU0sV0FBVyxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7UUFDdEQsTUFBTSxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sSUFBSSxnQkFBZ0IsQ0FBQyxDQUFDLDZCQUE2QjtRQUNwRixNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQ3hDLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDeEMsTUFBTSxPQUFPLEdBQUcsV0FBVyxDQUFDLE9BQU8sQ0FBQztRQUNwQyxNQUFNLFFBQVEsR0FBRyxXQUFXLENBQUMsUUFBNEQsQ0FBQztRQUUxRixnRkFBZ0Y7UUFDaEYsSUFBSSxNQUFNLEtBQUssZ0JBQWdCLEVBQUUsQ0FBQztZQUNoQyxPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLFdBQVc7b0JBQ2xCLE9BQU8sRUFBRSw2Q0FBNkM7aUJBQ3ZELENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELE9BQU8sQ0FBQyxHQUFHLENBQUMseUNBQXlDLE1BQU0sRUFBRSxDQUFDLENBQUM7UUFFL0QsMEJBQTBCO1FBQzFCLE1BQU0sU0FBUyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxJQUFJLFNBQVMsQ0FBQztRQUMxRCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFL0MseUJBQXlCO1FBQ3pCLE1BQU0sS0FBSyxHQUFHLElBQUksSUFBSSxFQUFFLENBQUM7UUFDekIsTUFBTSxZQUFZLEdBQUcsSUFBSSxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsRUFBRSxFQUFFLEtBQUssQ0FBQyxRQUFRLEVBQUUsRUFBRSxLQUFLLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxXQUFXLEVBQUUsQ0FBQztRQUNwRyxNQUFNLFVBQVUsR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLEtBQUssQ0FBQyxPQUFPLEVBQUUsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRTlHLDhCQUE4QjtRQUM5QixNQUFNLFlBQVksR0FBRyxJQUFJLElBQUksQ0FBQyxLQUFLLENBQUMsV0FBVyxFQUFFLEVBQUUsS0FBSyxDQUFDLFFBQVEsRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ3RGLE1BQU0sVUFBVSxHQUFHLElBQUksSUFBSSxDQUFDLEtBQUssQ0FBQyxXQUFXLEVBQUUsRUFBRSxLQUFLLENBQUMsUUFBUSxFQUFFLEdBQUcsQ0FBQyxFQUFFLENBQUMsRUFBRSxFQUFFLEVBQUUsRUFBRSxFQUFFLEVBQUUsQ0FBQyxDQUFDLFdBQVcsRUFBRSxDQUFDO1FBRXBHLGlDQUFpQztRQUNqQyxNQUFNLFVBQVUsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLENBQ2hELE1BQU0sRUFDTixTQUFTLEVBQ1QsWUFBWSxFQUNaLFVBQVUsRUFDVixRQUFRLENBQ1QsQ0FBQztRQUVGLHNDQUFzQztRQUN0QyxNQUFNLFVBQVUsR0FBRyxNQUFNLFdBQVcsQ0FBQyxhQUFhLENBQ2hELE1BQU0sRUFDTixTQUFTLEVBQ1QsWUFBWSxFQUNaLFVBQVUsRUFDVixRQUFRLENBQ1QsQ0FBQztRQUVGLDJDQUEyQztRQUMzQyxNQUFNLFlBQVksR0FBRyxTQUFTLElBQUksT0FBTztZQUN2QyxDQUFDLENBQUMsTUFBTSxXQUFXLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxTQUFTLEVBQUUsU0FBUyxFQUFFLE9BQU8sRUFBRSxRQUFRLENBQUM7WUFDbEYsQ0FBQyxDQUFDLFVBQVUsQ0FBQztRQUVmLE9BQU8sQ0FBQyxHQUFHLENBQUMscUJBQXFCLFVBQVUsQ0FBQyxVQUFVLFlBQVksVUFBVSxDQUFDLGFBQWEsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWUsUUFBUSxJQUFJLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDekksT0FBTyxDQUFDLEdBQUcsQ0FBQyxxQkFBcUIsVUFBVSxDQUFDLFVBQVUsWUFBWSxVQUFVLENBQUMsYUFBYSxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxRQUFRLElBQUksS0FBSyxFQUFFLENBQUMsQ0FBQztRQUV6SSw0RUFBNEU7UUFDNUUsTUFBTSxNQUFNLEdBQUc7WUFDYixhQUFhLEVBQUUsR0FBRztZQUNsQixXQUFXLEVBQUUsTUFBTTtZQUNuQixTQUFTLEVBQUUsSUFBSTtZQUNmLGVBQWUsRUFBRSxJQUFJO1lBQ3JCLGFBQWEsRUFBRSxPQUFPO1lBQ3RCLFdBQVcsRUFBRSxLQUFLO1NBQ25CLENBQUM7UUFFRixpQkFBaUI7UUFDakIsTUFBTSxRQUFRLEdBQVE7WUFDcEIsS0FBSyxFQUFFO2dCQUNMLFFBQVEsRUFBRSxVQUFVLENBQUMsVUFBVTtnQkFDL0IsTUFBTSxFQUFFLFVBQVUsQ0FBQyxXQUFXO2dCQUM5QixJQUFJLEVBQUUsVUFBVSxDQUFDLGFBQWE7YUFDL0I7WUFDRCxTQUFTLEVBQUU7Z0JBQ1QsUUFBUSxFQUFFLFVBQVUsQ0FBQyxVQUFVO2dCQUMvQixNQUFNLEVBQUUsVUFBVSxDQUFDLFdBQVc7Z0JBQzlCLElBQUksRUFBRSxVQUFVLENBQUMsYUFBYTthQUMvQjtZQUNELE1BQU07WUFDTixLQUFLLEVBQUU7Z0JBQ0wsVUFBVSxFQUFFLFlBQVksQ0FBQyxVQUFVO2dCQUNuQyxXQUFXLEVBQUUsWUFBWSxDQUFDLFdBQVc7Z0JBQ3JDLGFBQWEsRUFBRSxZQUFZLENBQUMsYUFBYTtnQkFDekMsU0FBUyxFQUFFO29CQUNULE1BQU0sRUFBRSxNQUFNLENBQUMsV0FBVyxDQUFDLFlBQVksQ0FBQyxTQUFTLENBQUMsTUFBTSxDQUFDO29CQUN6RCxTQUFTLEVBQUUsTUFBTSxDQUFDLFdBQVcsQ0FBQyxZQUFZLENBQUMsU0FBUyxDQUFDLFNBQVMsQ0FBQztvQkFDL0QsTUFBTSxFQUFFLE1BQU0sQ0FBQyxXQUFXLENBQUMsWUFBWSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7aUJBQzFEO2FBQ0Y7U0FDRixDQUFDO1FBRUYsd0NBQXdDO1FBQ3hDLElBQUksUUFBUSxFQUFFLENBQUM7WUFDYixRQUFRLENBQUMsUUFBUSxHQUFHLFFBQVEsQ0FBQztRQUMvQixDQUFDO1FBRUQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxtQkFBbUIsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUUxQyxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUscUNBQXFDO2dCQUM1QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFySlcsUUFBQSxPQUFPLFdBcUpsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vY29zdC10cmFja2VyJztcclxuaW1wb3J0IHsgZ2V0VXNlckZyb21Db250ZXh0IH0gZnJvbSAnLi4vLi4vdXRpbHMvYXV0aC11dGlsJztcclxuXHJcbi8qKlxyXG4gKiBHRVQgL2FwaS9haS10ZXN0LWdlbmVyYXRpb24vdXNhZ2VcclxuICogXHJcbiAqIFJldHJpZXZlcyB1c2FnZSBzdGF0aXN0aWNzIGFuZCBjb3N0IGVzdGltYXRlcy5cclxuICogXHJcbiAqIFF1ZXJ5IFBhcmFtZXRlcnM6XHJcbiAqIC0gdXNlcklkPzogc3RyaW5nXHJcbiAqIC0gcHJvamVjdElkPzogc3RyaW5nXHJcbiAqIC0gc3RhcnREYXRlPzogc3RyaW5nIChJU08gZm9ybWF0KVxyXG4gKiAtIGVuZERhdGU/OiBzdHJpbmcgKElTTyBmb3JtYXQpXHJcbiAqIC0gcHJvdmlkZXI/OiBzdHJpbmcgKE9QRU5BSSwgQkVEUk9DSywgSFVHR0lOR0ZBQ0UpXHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIHRvZGF5OiB7IHJlcXVlc3RzLCB0b2tlbnMsIGNvc3QgfSxcclxuICogICB0aGlzTW9udGg6IHsgcmVxdWVzdHMsIHRva2VucywgY29zdCB9LFxyXG4gKiAgIGxpbWl0czogeyBkYWlseVJlcXVlc3RzLCBkYWlseVRva2VucywgZGFpbHlDb3N0LCBtb250aGx5UmVxdWVzdHMsIG1vbnRobHlUb2tlbnMsIG1vbnRobHlDb3N0IH0sXHJcbiAqICAgc3RhdHM6IFVzYWdlU3RhdHMsXHJcbiAqICAgcHJvdmlkZXI/OiBzdHJpbmcgKGlmIGZpbHRlcmVkKVxyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnW0dldFVzYWdlXSBSZWNlaXZlZCByZXF1ZXN0Jyk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBHZXQgdXNlciBJRCBmcm9tIGF1dGhvcml6ZXIgY29udGV4dFxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcbiAgICBjb25zdCByZXF1ZXN0aW5nVXNlcklkID0gdXNlci51c2VySWQ7XHJcbiAgICBpZiAoIXJlcXVlc3RpbmdVc2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1VuYXV0aG9yaXplZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgcXVlcnlQYXJhbXMgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgfHwge307XHJcbiAgICBjb25zdCB1c2VySWQgPSBxdWVyeVBhcmFtcy51c2VySWQgfHwgcmVxdWVzdGluZ1VzZXJJZDsgLy8gRGVmYXVsdCB0byByZXF1ZXN0aW5nIHVzZXJcclxuICAgIGNvbnN0IHByb2plY3RJZCA9IHF1ZXJ5UGFyYW1zLnByb2plY3RJZDtcclxuICAgIGNvbnN0IHN0YXJ0RGF0ZSA9IHF1ZXJ5UGFyYW1zLnN0YXJ0RGF0ZTtcclxuICAgIGNvbnN0IGVuZERhdGUgPSBxdWVyeVBhcmFtcy5lbmREYXRlO1xyXG4gICAgY29uc3QgcHJvdmlkZXIgPSBxdWVyeVBhcmFtcy5wcm92aWRlciBhcyAnT1BFTkFJJyB8ICdCRURST0NLJyB8ICdIVUdHSU5HRkFDRScgfCB1bmRlZmluZWQ7XHJcblxyXG4gICAgLy8gQXV0aG9yaXphdGlvbiBjaGVjazogdXNlcnMgY2FuIG9ubHkgdmlldyB0aGVpciBvd24gc3RhdHMgdW5sZXNzIHRoZXkncmUgYWRtaW5cclxuICAgIGlmICh1c2VySWQgIT09IHJlcXVlc3RpbmdVc2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ZvcmJpZGRlbicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnWW91IGNhbiBvbmx5IHZpZXcgeW91ciBvd24gdXNhZ2Ugc3RhdGlzdGljcycsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtHZXRVc2FnZV0gUmV0cmlldmluZyBzdGF0cyBmb3IgdXNlcjogJHt1c2VySWR9YCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBjb3N0IHRyYWNrZXJcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkFJX1VTQUdFX1RBQkxFIHx8ICdBSVVzYWdlJztcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKHRhYmxlTmFtZSk7XHJcblxyXG4gICAgLy8gR2V0IHRvZGF5J3MgZGF0ZSByYW5nZVxyXG4gICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgY29uc3Qgc3RhcnRPZlRvZGF5ID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSwgdG9kYXkuZ2V0RGF0ZSgpKS50b0lTT1N0cmluZygpO1xyXG4gICAgY29uc3QgZW5kT2ZUb2RheSA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIHRvZGF5LmdldERhdGUoKSwgMjMsIDU5LCA1OSkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBHZXQgdGhpcyBtb250aCdzIGRhdGUgcmFuZ2VcclxuICAgIGNvbnN0IHN0YXJ0T2ZNb250aCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIDEpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBlbmRPZk1vbnRoID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSArIDEsIDAsIDIzLCA1OSwgNTkpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gR2V0IHVzYWdlIHN0YXRpc3RpY3MgZm9yIHRvZGF5XHJcbiAgICBjb25zdCB0b2RheVN0YXRzID0gYXdhaXQgY29zdFRyYWNrZXIuZ2V0VXNhZ2VTdGF0cyhcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHN0YXJ0T2ZUb2RheSxcclxuICAgICAgZW5kT2ZUb2RheSxcclxuICAgICAgcHJvdmlkZXJcclxuICAgICk7XHJcblxyXG4gICAgLy8gR2V0IHVzYWdlIHN0YXRpc3RpY3MgZm9yIHRoaXMgbW9udGhcclxuICAgIGNvbnN0IG1vbnRoU3RhdHMgPSBhd2FpdCBjb3N0VHJhY2tlci5nZXRVc2FnZVN0YXRzKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHByb2plY3RJZCxcclxuICAgICAgc3RhcnRPZk1vbnRoLFxyXG4gICAgICBlbmRPZk1vbnRoLFxyXG4gICAgICBwcm92aWRlclxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHZXQgb3ZlcmFsbCBzdGF0cyBpZiBkYXRlIHJhbmdlIHByb3ZpZGVkXHJcbiAgICBjb25zdCBvdmVyYWxsU3RhdHMgPSBzdGFydERhdGUgfHwgZW5kRGF0ZVxyXG4gICAgICA/IGF3YWl0IGNvc3RUcmFja2VyLmdldFVzYWdlU3RhdHModXNlcklkLCBwcm9qZWN0SWQsIHN0YXJ0RGF0ZSwgZW5kRGF0ZSwgcHJvdmlkZXIpXHJcbiAgICAgIDogbW9udGhTdGF0cztcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0dldFVzYWdlXSBUb2RheTogJHt0b2RheVN0YXRzLnRvdGFsQ2FsbHN9IGNhbGxzLCAkJHt0b2RheVN0YXRzLmVzdGltYXRlZENvc3QudG9GaXhlZCgyKX0sIHByb3ZpZGVyOiAke3Byb3ZpZGVyIHx8ICdhbGwnfWApO1xyXG4gICAgY29uc29sZS5sb2coYFtHZXRVc2FnZV0gTW9udGg6ICR7bW9udGhTdGF0cy50b3RhbENhbGxzfSBjYWxscywgJCR7bW9udGhTdGF0cy5lc3RpbWF0ZWRDb3N0LnRvRml4ZWQoMil9LCBwcm92aWRlcjogJHtwcm92aWRlciB8fCAnYWxsJ31gKTtcclxuXHJcbiAgICAvLyBHZXQgbGltaXRzIGZyb20gY29uZmlnICh0aGVzZSBzaG91bGQgbWF0Y2ggdGhlIGxpbWl0cyBpbiBjb3N0LXRyYWNrZXIudHMpXHJcbiAgICBjb25zdCBsaW1pdHMgPSB7XHJcbiAgICAgIGRhaWx5UmVxdWVzdHM6IDEwMCxcclxuICAgICAgZGFpbHlUb2tlbnM6IDEwMDAwMCxcclxuICAgICAgZGFpbHlDb3N0OiAxMC4wLFxyXG4gICAgICBtb250aGx5UmVxdWVzdHM6IDMwMDAsXHJcbiAgICAgIG1vbnRobHlUb2tlbnM6IDMwMDAwMDAsXHJcbiAgICAgIG1vbnRobHlDb3N0OiAxMDAuMCxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQnVpbGQgcmVzcG9uc2VcclxuICAgIGNvbnN0IHJlc3BvbnNlOiBhbnkgPSB7XHJcbiAgICAgIHRvZGF5OiB7XHJcbiAgICAgICAgcmVxdWVzdHM6IHRvZGF5U3RhdHMudG90YWxDYWxscyxcclxuICAgICAgICB0b2tlbnM6IHRvZGF5U3RhdHMudG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdDogdG9kYXlTdGF0cy5lc3RpbWF0ZWRDb3N0LFxyXG4gICAgICB9LFxyXG4gICAgICB0aGlzTW9udGg6IHtcclxuICAgICAgICByZXF1ZXN0czogbW9udGhTdGF0cy50b3RhbENhbGxzLFxyXG4gICAgICAgIHRva2VuczogbW9udGhTdGF0cy50b3RhbFRva2VucyxcclxuICAgICAgICBjb3N0OiBtb250aFN0YXRzLmVzdGltYXRlZENvc3QsXHJcbiAgICAgIH0sXHJcbiAgICAgIGxpbWl0cyxcclxuICAgICAgc3RhdHM6IHtcclxuICAgICAgICB0b3RhbENhbGxzOiBvdmVyYWxsU3RhdHMudG90YWxDYWxscyxcclxuICAgICAgICB0b3RhbFRva2Vuczogb3ZlcmFsbFN0YXRzLnRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGVzdGltYXRlZENvc3Q6IG92ZXJhbGxTdGF0cy5lc3RpbWF0ZWRDb3N0LFxyXG4gICAgICAgIGJyZWFrZG93bjoge1xyXG4gICAgICAgICAgYnlVc2VyOiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieVVzZXIpLFxyXG4gICAgICAgICAgYnlQcm9qZWN0OiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieVByb2plY3QpLFxyXG4gICAgICAgICAgYnlEYXRlOiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieURhdGUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEFkZCBwcm92aWRlciBmaWx0ZXIgaW5mbyBpZiBzcGVjaWZpZWRcclxuICAgIGlmIChwcm92aWRlcikge1xyXG4gICAgICByZXNwb25zZS5wcm92aWRlciA9IHByb3ZpZGVyO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0dldFVzYWdlXSBFcnJvcjonLCBlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gcmV0cmlldmUgdXNhZ2Ugc3RhdGlzdGljcycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==