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
        const user = (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVzYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUE2RTtBQUM3RSxxREFBMkQ7QUFFM0Q7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBb0JHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLElBQUksR0FBRyxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBQ3ZDLE1BQU0sZ0JBQWdCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQztRQUNyQyxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLGNBQWM7aUJBQ3RCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ3RELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyw2QkFBNkI7UUFDcEYsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDcEMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQTRELENBQUM7UUFFMUYs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SUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsUUFBUSxDQUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLHFDQUFxQztnQkFDNUMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBckpXLFFBQUEsT0FBTyxXQXFKbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2Nvc3QtdHJhY2tlcic7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcblxyXG4vKipcclxuICogR0VUIC9hcGkvYWktdGVzdC1nZW5lcmF0aW9uL3VzYWdlXHJcbiAqIFxyXG4gKiBSZXRyaWV2ZXMgdXNhZ2Ugc3RhdGlzdGljcyBhbmQgY29zdCBlc3RpbWF0ZXMuXHJcbiAqIFxyXG4gKiBRdWVyeSBQYXJhbWV0ZXJzOlxyXG4gKiAtIHVzZXJJZD86IHN0cmluZ1xyXG4gKiAtIHByb2plY3RJZD86IHN0cmluZ1xyXG4gKiAtIHN0YXJ0RGF0ZT86IHN0cmluZyAoSVNPIGZvcm1hdClcclxuICogLSBlbmREYXRlPzogc3RyaW5nIChJU08gZm9ybWF0KVxyXG4gKiAtIHByb3ZpZGVyPzogc3RyaW5nIChPUEVOQUksIEJFRFJPQ0ssIEhVR0dJTkdGQUNFKVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICB0b2RheTogeyByZXF1ZXN0cywgdG9rZW5zLCBjb3N0IH0sXHJcbiAqICAgdGhpc01vbnRoOiB7IHJlcXVlc3RzLCB0b2tlbnMsIGNvc3QgfSxcclxuICogICBsaW1pdHM6IHsgZGFpbHlSZXF1ZXN0cywgZGFpbHlUb2tlbnMsIGRhaWx5Q29zdCwgbW9udGhseVJlcXVlc3RzLCBtb250aGx5VG9rZW5zLCBtb250aGx5Q29zdCB9LFxyXG4gKiAgIHN0YXRzOiBVc2FnZVN0YXRzLFxyXG4gKiAgIHByb3ZpZGVyPzogc3RyaW5nIChpZiBmaWx0ZXJlZClcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tHZXRVc2FnZV0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG4gICAgY29uc3QgcmVxdWVzdGluZ1VzZXJJZCA9IHVzZXIudXNlcklkO1xyXG4gICAgaWYgKCFyZXF1ZXN0aW5nVXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAxLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdVbmF1dGhvcml6ZWQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFBhcnNlIHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgY29uc3QgdXNlcklkID0gcXVlcnlQYXJhbXMudXNlcklkIHx8IHJlcXVlc3RpbmdVc2VySWQ7IC8vIERlZmF1bHQgdG8gcmVxdWVzdGluZyB1c2VyXHJcbiAgICBjb25zdCBwcm9qZWN0SWQgPSBxdWVyeVBhcmFtcy5wcm9qZWN0SWQ7XHJcbiAgICBjb25zdCBzdGFydERhdGUgPSBxdWVyeVBhcmFtcy5zdGFydERhdGU7XHJcbiAgICBjb25zdCBlbmREYXRlID0gcXVlcnlQYXJhbXMuZW5kRGF0ZTtcclxuICAgIGNvbnN0IHByb3ZpZGVyID0gcXVlcnlQYXJhbXMucHJvdmlkZXIgYXMgJ09QRU5BSScgfCAnQkVEUk9DSycgfCAnSFVHR0lOR0ZBQ0UnIHwgdW5kZWZpbmVkO1xyXG5cclxuICAgIC8vIEF1dGhvcml6YXRpb24gY2hlY2s6IHVzZXJzIGNhbiBvbmx5IHZpZXcgdGhlaXIgb3duIHN0YXRzIHVubGVzcyB0aGV5J3JlIGFkbWluXHJcbiAgICBpZiAodXNlcklkICE9PSByZXF1ZXN0aW5nVXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAzLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdGb3JiaWRkZW4nLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ1lvdSBjYW4gb25seSB2aWV3IHlvdXIgb3duIHVzYWdlIHN0YXRpc3RpY3MnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2V0VXNhZ2VdIFJldHJpZXZpbmcgc3RhdHMgZm9yIHVzZXI6ICR7dXNlcklkfWApO1xyXG5cclxuICAgIC8vIEluaXRpYWxpemUgY29zdCB0cmFja2VyXHJcbiAgICBjb25zdCB0YWJsZU5hbWUgPSBwcm9jZXNzLmVudi5BSV9VU0FHRV9UQUJMRSB8fCAnQUlVc2FnZSc7XHJcbiAgICBjb25zdCBjb3N0VHJhY2tlciA9IG5ldyBDb3N0VHJhY2tlcih0YWJsZU5hbWUpO1xyXG5cclxuICAgIC8vIEdldCB0b2RheSdzIGRhdGUgcmFuZ2VcclxuICAgIGNvbnN0IHRvZGF5ID0gbmV3IERhdGUoKTtcclxuICAgIGNvbnN0IHN0YXJ0T2ZUb2RheSA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIHRvZGF5LmdldERhdGUoKSkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IGVuZE9mVG9kYXkgPSBuZXcgRGF0ZSh0b2RheS5nZXRGdWxsWWVhcigpLCB0b2RheS5nZXRNb250aCgpLCB0b2RheS5nZXREYXRlKCksIDIzLCA1OSwgNTkpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gR2V0IHRoaXMgbW9udGgncyBkYXRlIHJhbmdlXHJcbiAgICBjb25zdCBzdGFydE9mTW9udGggPSBuZXcgRGF0ZSh0b2RheS5nZXRGdWxsWWVhcigpLCB0b2RheS5nZXRNb250aCgpLCAxKS50b0lTT1N0cmluZygpO1xyXG4gICAgY29uc3QgZW5kT2ZNb250aCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCkgKyAxLCAwLCAyMywgNTksIDU5KS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgIC8vIEdldCB1c2FnZSBzdGF0aXN0aWNzIGZvciB0b2RheVxyXG4gICAgY29uc3QgdG9kYXlTdGF0cyA9IGF3YWl0IGNvc3RUcmFja2VyLmdldFVzYWdlU3RhdHMoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICBzdGFydE9mVG9kYXksXHJcbiAgICAgIGVuZE9mVG9kYXksXHJcbiAgICAgIHByb3ZpZGVyXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdldCB1c2FnZSBzdGF0aXN0aWNzIGZvciB0aGlzIG1vbnRoXHJcbiAgICBjb25zdCBtb250aFN0YXRzID0gYXdhaXQgY29zdFRyYWNrZXIuZ2V0VXNhZ2VTdGF0cyhcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHN0YXJ0T2ZNb250aCxcclxuICAgICAgZW5kT2ZNb250aCxcclxuICAgICAgcHJvdmlkZXJcclxuICAgICk7XHJcblxyXG4gICAgLy8gR2V0IG92ZXJhbGwgc3RhdHMgaWYgZGF0ZSByYW5nZSBwcm92aWRlZFxyXG4gICAgY29uc3Qgb3ZlcmFsbFN0YXRzID0gc3RhcnREYXRlIHx8IGVuZERhdGVcclxuICAgICAgPyBhd2FpdCBjb3N0VHJhY2tlci5nZXRVc2FnZVN0YXRzKHVzZXJJZCwgcHJvamVjdElkLCBzdGFydERhdGUsIGVuZERhdGUsIHByb3ZpZGVyKVxyXG4gICAgICA6IG1vbnRoU3RhdHM7XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtHZXRVc2FnZV0gVG9kYXk6ICR7dG9kYXlTdGF0cy50b3RhbENhbGxzfSBjYWxscywgJCR7dG9kYXlTdGF0cy5lc3RpbWF0ZWRDb3N0LnRvRml4ZWQoMil9LCBwcm92aWRlcjogJHtwcm92aWRlciB8fCAnYWxsJ31gKTtcclxuICAgIGNvbnNvbGUubG9nKGBbR2V0VXNhZ2VdIE1vbnRoOiAke21vbnRoU3RhdHMudG90YWxDYWxsc30gY2FsbHMsICQke21vbnRoU3RhdHMuZXN0aW1hdGVkQ29zdC50b0ZpeGVkKDIpfSwgcHJvdmlkZXI6ICR7cHJvdmlkZXIgfHwgJ2FsbCd9YCk7XHJcblxyXG4gICAgLy8gR2V0IGxpbWl0cyBmcm9tIGNvbmZpZyAodGhlc2Ugc2hvdWxkIG1hdGNoIHRoZSBsaW1pdHMgaW4gY29zdC10cmFja2VyLnRzKVxyXG4gICAgY29uc3QgbGltaXRzID0ge1xyXG4gICAgICBkYWlseVJlcXVlc3RzOiAxMDAsXHJcbiAgICAgIGRhaWx5VG9rZW5zOiAxMDAwMDAsXHJcbiAgICAgIGRhaWx5Q29zdDogMTAuMCxcclxuICAgICAgbW9udGhseVJlcXVlc3RzOiAzMDAwLFxyXG4gICAgICBtb250aGx5VG9rZW5zOiAzMDAwMDAwLFxyXG4gICAgICBtb250aGx5Q29zdDogMTAwLjAsXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIEJ1aWxkIHJlc3BvbnNlXHJcbiAgICBjb25zdCByZXNwb25zZTogYW55ID0ge1xyXG4gICAgICB0b2RheToge1xyXG4gICAgICAgIHJlcXVlc3RzOiB0b2RheVN0YXRzLnRvdGFsQ2FsbHMsXHJcbiAgICAgICAgdG9rZW5zOiB0b2RheVN0YXRzLnRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3Q6IHRvZGF5U3RhdHMuZXN0aW1hdGVkQ29zdCxcclxuICAgICAgfSxcclxuICAgICAgdGhpc01vbnRoOiB7XHJcbiAgICAgICAgcmVxdWVzdHM6IG1vbnRoU3RhdHMudG90YWxDYWxscyxcclxuICAgICAgICB0b2tlbnM6IG1vbnRoU3RhdHMudG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdDogbW9udGhTdGF0cy5lc3RpbWF0ZWRDb3N0LFxyXG4gICAgICB9LFxyXG4gICAgICBsaW1pdHMsXHJcbiAgICAgIHN0YXRzOiB7XHJcbiAgICAgICAgdG90YWxDYWxsczogb3ZlcmFsbFN0YXRzLnRvdGFsQ2FsbHMsXHJcbiAgICAgICAgdG90YWxUb2tlbnM6IG92ZXJhbGxTdGF0cy50b3RhbFRva2VucyxcclxuICAgICAgICBlc3RpbWF0ZWRDb3N0OiBvdmVyYWxsU3RhdHMuZXN0aW1hdGVkQ29zdCxcclxuICAgICAgICBicmVha2Rvd246IHtcclxuICAgICAgICAgIGJ5VXNlcjogT2JqZWN0LmZyb21FbnRyaWVzKG92ZXJhbGxTdGF0cy5icmVha2Rvd24uYnlVc2VyKSxcclxuICAgICAgICAgIGJ5UHJvamVjdDogT2JqZWN0LmZyb21FbnRyaWVzKG92ZXJhbGxTdGF0cy5icmVha2Rvd24uYnlQcm9qZWN0KSxcclxuICAgICAgICAgIGJ5RGF0ZTogT2JqZWN0LmZyb21FbnRyaWVzKG92ZXJhbGxTdGF0cy5icmVha2Rvd24uYnlEYXRlKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBBZGQgcHJvdmlkZXIgZmlsdGVyIGluZm8gaWYgc3BlY2lmaWVkXHJcbiAgICBpZiAocHJvdmlkZXIpIHtcclxuICAgICAgcmVzcG9uc2UucHJvdmlkZXIgPSBwcm92aWRlcjtcclxuICAgIH1cclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3BvbnNlKSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ1tHZXRVc2FnZV0gRXJyb3I6JywgZXJyb3IpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIHJldHJpZXZlIHVzYWdlIHN0YXRpc3RpY3MnLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=