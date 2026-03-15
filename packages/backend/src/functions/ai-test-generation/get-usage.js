"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const cost_tracker_1 = require("../../services/ai-test-generation/cost-tracker");
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
 *
 * Response:
 * {
 *   today: { requests, tokens, cost },
 *   thisMonth: { requests, tokens, cost },
 *   limits: { dailyRequests, dailyTokens, dailyCost, monthlyRequests, monthlyTokens, monthlyCost },
 *   stats: UsageStats
 * }
 */
const handler = async (event) => {
    console.log('[GetUsage] Received request');
    try {
        // Get user ID from authorizer context
        const requestingUserId = event.requestContext.authorizer?.claims?.sub;
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
        const todayStats = await costTracker.getUsageStats(userId, projectId, startOfToday, endOfToday);
        // Get usage statistics for this month
        const monthStats = await costTracker.getUsageStats(userId, projectId, startOfMonth, endOfMonth);
        // Get overall stats if date range provided
        const overallStats = startDate || endDate
            ? await costTracker.getUsageStats(userId, projectId, startDate, endDate)
            : monthStats;
        console.log(`[GetUsage] Today: ${todayStats.totalCalls} calls, $${todayStats.estimatedCost.toFixed(2)}`);
        console.log(`[GetUsage] Month: ${monthStats.totalCalls} calls, $${monthStats.estimatedCost.toFixed(2)}`);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVzYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUE2RTtBQUU3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBa0JHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw2QkFBNkIsQ0FBQyxDQUFDO0lBRTNDLElBQUksQ0FBQztRQUNILHNDQUFzQztRQUN0QyxNQUFNLGdCQUFnQixHQUFHLEtBQUssQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE1BQU0sRUFBRSxHQUFHLENBQUM7UUFDdEUsSUFBSSxDQUFDLGdCQUFnQixFQUFFLENBQUM7WUFDdEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxjQUFjO2lCQUN0QixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCx5QkFBeUI7UUFDekIsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUN0RCxNQUFNLE1BQU0sR0FBRyxXQUFXLENBQUMsTUFBTSxJQUFJLGdCQUFnQixDQUFDLENBQUMsNkJBQTZCO1FBQ3BGLE1BQU0sU0FBUyxHQUFHLFdBQVcsQ0FBQyxTQUFTLENBQUM7UUFDeEMsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxNQUFNLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDO1FBRXBDLGdGQUFnRjtRQUNoRixJQUFJLE1BQU0sS0FBSyxnQkFBZ0IsRUFBRSxDQUFDO1lBQ2hDLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JB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QztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUscUNBQXFDO2dCQUM1QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUE1SVcsUUFBQSxPQUFPLFdBNElsQiIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IEFQSUdhdGV3YXlQcm94eUV2ZW50LCBBUElHYXRld2F5UHJveHlSZXN1bHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgQ29zdFRyYWNrZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vY29zdC10cmFja2VyJztcclxuXHJcbi8qKlxyXG4gKiBHRVQgL2FwaS9haS10ZXN0LWdlbmVyYXRpb24vdXNhZ2VcclxuICogXHJcbiAqIFJldHJpZXZlcyB1c2FnZSBzdGF0aXN0aWNzIGFuZCBjb3N0IGVzdGltYXRlcy5cclxuICogXHJcbiAqIFF1ZXJ5IFBhcmFtZXRlcnM6XHJcbiAqIC0gdXNlcklkPzogc3RyaW5nXHJcbiAqIC0gcHJvamVjdElkPzogc3RyaW5nXHJcbiAqIC0gc3RhcnREYXRlPzogc3RyaW5nIChJU08gZm9ybWF0KVxyXG4gKiAtIGVuZERhdGU/OiBzdHJpbmcgKElTTyBmb3JtYXQpXHJcbiAqIFxyXG4gKiBSZXNwb25zZTpcclxuICoge1xyXG4gKiAgIHRvZGF5OiB7IHJlcXVlc3RzLCB0b2tlbnMsIGNvc3QgfSxcclxuICogICB0aGlzTW9udGg6IHsgcmVxdWVzdHMsIHRva2VucywgY29zdCB9LFxyXG4gKiAgIGxpbWl0czogeyBkYWlseVJlcXVlc3RzLCBkYWlseVRva2VucywgZGFpbHlDb3N0LCBtb250aGx5UmVxdWVzdHMsIG1vbnRobHlUb2tlbnMsIG1vbnRobHlDb3N0IH0sXHJcbiAqICAgc3RhdHM6IFVzYWdlU3RhdHNcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tHZXRVc2FnZV0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHJlcXVlc3RpbmdVc2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy5jbGFpbXM/LnN1YjtcclxuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSBxdWVyeSBwYXJhbWV0ZXJzXHJcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IHF1ZXJ5UGFyYW1zLnVzZXJJZCB8fCByZXF1ZXN0aW5nVXNlcklkOyAvLyBEZWZhdWx0IHRvIHJlcXVlc3RpbmcgdXNlclxyXG4gICAgY29uc3QgcHJvamVjdElkID0gcXVlcnlQYXJhbXMucHJvamVjdElkO1xyXG4gICAgY29uc3Qgc3RhcnREYXRlID0gcXVlcnlQYXJhbXMuc3RhcnREYXRlO1xyXG4gICAgY29uc3QgZW5kRGF0ZSA9IHF1ZXJ5UGFyYW1zLmVuZERhdGU7XHJcblxyXG4gICAgLy8gQXV0aG9yaXphdGlvbiBjaGVjazogdXNlcnMgY2FuIG9ubHkgdmlldyB0aGVpciBvd24gc3RhdHMgdW5sZXNzIHRoZXkncmUgYWRtaW5cclxuICAgIGlmICh1c2VySWQgIT09IHJlcXVlc3RpbmdVc2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDMsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ0ZvcmJpZGRlbicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnWW91IGNhbiBvbmx5IHZpZXcgeW91ciBvd24gdXNhZ2Ugc3RhdGlzdGljcycsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc29sZS5sb2coYFtHZXRVc2FnZV0gUmV0cmlldmluZyBzdGF0cyBmb3IgdXNlcjogJHt1c2VySWR9YCk7XHJcblxyXG4gICAgLy8gSW5pdGlhbGl6ZSBjb3N0IHRyYWNrZXJcclxuICAgIGNvbnN0IHRhYmxlTmFtZSA9IHByb2Nlc3MuZW52LkFJX1VTQUdFX1RBQkxFIHx8ICdBSVVzYWdlJztcclxuICAgIGNvbnN0IGNvc3RUcmFja2VyID0gbmV3IENvc3RUcmFja2VyKHRhYmxlTmFtZSk7XHJcblxyXG4gICAgLy8gR2V0IHRvZGF5J3MgZGF0ZSByYW5nZVxyXG4gICAgY29uc3QgdG9kYXkgPSBuZXcgRGF0ZSgpO1xyXG4gICAgY29uc3Qgc3RhcnRPZlRvZGF5ID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSwgdG9kYXkuZ2V0RGF0ZSgpKS50b0lTT1N0cmluZygpO1xyXG4gICAgY29uc3QgZW5kT2ZUb2RheSA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIHRvZGF5LmdldERhdGUoKSwgMjMsIDU5LCA1OSkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBHZXQgdGhpcyBtb250aCdzIGRhdGUgcmFuZ2VcclxuICAgIGNvbnN0IHN0YXJ0T2ZNb250aCA9IG5ldyBEYXRlKHRvZGF5LmdldEZ1bGxZZWFyKCksIHRvZGF5LmdldE1vbnRoKCksIDEpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBlbmRPZk1vbnRoID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSArIDEsIDAsIDIzLCA1OSwgNTkpLnRvSVNPU3RyaW5nKCk7XHJcblxyXG4gICAgLy8gR2V0IHVzYWdlIHN0YXRpc3RpY3MgZm9yIHRvZGF5XHJcbiAgICBjb25zdCB0b2RheVN0YXRzID0gYXdhaXQgY29zdFRyYWNrZXIuZ2V0VXNhZ2VTdGF0cyhcclxuICAgICAgdXNlcklkLFxyXG4gICAgICBwcm9qZWN0SWQsXHJcbiAgICAgIHN0YXJ0T2ZUb2RheSxcclxuICAgICAgZW5kT2ZUb2RheVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHZXQgdXNhZ2Ugc3RhdGlzdGljcyBmb3IgdGhpcyBtb250aFxyXG4gICAgY29uc3QgbW9udGhTdGF0cyA9IGF3YWl0IGNvc3RUcmFja2VyLmdldFVzYWdlU3RhdHMoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICBzdGFydE9mTW9udGgsXHJcbiAgICAgIGVuZE9mTW9udGhcclxuICAgICk7XHJcblxyXG4gICAgLy8gR2V0IG92ZXJhbGwgc3RhdHMgaWYgZGF0ZSByYW5nZSBwcm92aWRlZFxyXG4gICAgY29uc3Qgb3ZlcmFsbFN0YXRzID0gc3RhcnREYXRlIHx8IGVuZERhdGVcclxuICAgICAgPyBhd2FpdCBjb3N0VHJhY2tlci5nZXRVc2FnZVN0YXRzKHVzZXJJZCwgcHJvamVjdElkLCBzdGFydERhdGUsIGVuZERhdGUpXHJcbiAgICAgIDogbW9udGhTdGF0cztcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0dldFVzYWdlXSBUb2RheTogJHt0b2RheVN0YXRzLnRvdGFsQ2FsbHN9IGNhbGxzLCAkJHt0b2RheVN0YXRzLmVzdGltYXRlZENvc3QudG9GaXhlZCgyKX1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBbR2V0VXNhZ2VdIE1vbnRoOiAke21vbnRoU3RhdHMudG90YWxDYWxsc30gY2FsbHMsICQke21vbnRoU3RhdHMuZXN0aW1hdGVkQ29zdC50b0ZpeGVkKDIpfWApO1xyXG5cclxuICAgIC8vIEdldCBsaW1pdHMgZnJvbSBjb25maWcgKHRoZXNlIHNob3VsZCBtYXRjaCB0aGUgbGltaXRzIGluIGNvc3QtdHJhY2tlci50cylcclxuICAgIGNvbnN0IGxpbWl0cyA9IHtcclxuICAgICAgZGFpbHlSZXF1ZXN0czogMTAwLFxyXG4gICAgICBkYWlseVRva2VuczogMTAwMDAwLFxyXG4gICAgICBkYWlseUNvc3Q6IDEwLjAsXHJcbiAgICAgIG1vbnRobHlSZXF1ZXN0czogMzAwMCxcclxuICAgICAgbW9udGhseVRva2VuczogMzAwMDAwMCxcclxuICAgICAgbW9udGhseUNvc3Q6IDEwMC4wLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSB7XHJcbiAgICAgIHRvZGF5OiB7XHJcbiAgICAgICAgcmVxdWVzdHM6IHRvZGF5U3RhdHMudG90YWxDYWxscyxcclxuICAgICAgICB0b2tlbnM6IHRvZGF5U3RhdHMudG90YWxUb2tlbnMsXHJcbiAgICAgICAgY29zdDogdG9kYXlTdGF0cy5lc3RpbWF0ZWRDb3N0LFxyXG4gICAgICB9LFxyXG4gICAgICB0aGlzTW9udGg6IHtcclxuICAgICAgICByZXF1ZXN0czogbW9udGhTdGF0cy50b3RhbENhbGxzLFxyXG4gICAgICAgIHRva2VuczogbW9udGhTdGF0cy50b3RhbFRva2VucyxcclxuICAgICAgICBjb3N0OiBtb250aFN0YXRzLmVzdGltYXRlZENvc3QsXHJcbiAgICAgIH0sXHJcbiAgICAgIGxpbWl0cyxcclxuICAgICAgc3RhdHM6IHtcclxuICAgICAgICB0b3RhbENhbGxzOiBvdmVyYWxsU3RhdHMudG90YWxDYWxscyxcclxuICAgICAgICB0b3RhbFRva2Vuczogb3ZlcmFsbFN0YXRzLnRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGVzdGltYXRlZENvc3Q6IG92ZXJhbGxTdGF0cy5lc3RpbWF0ZWRDb3N0LFxyXG4gICAgICAgIGJyZWFrZG93bjoge1xyXG4gICAgICAgICAgYnlVc2VyOiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieVVzZXIpLFxyXG4gICAgICAgICAgYnlQcm9qZWN0OiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieVByb2plY3QpLFxyXG4gICAgICAgICAgYnlEYXRlOiBPYmplY3QuZnJvbUVudHJpZXMob3ZlcmFsbFN0YXRzLmJyZWFrZG93bi5ieURhdGUpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0dldFVzYWdlXSBFcnJvcjonLCBlcnJvcik7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gcmV0cmlldmUgdXNhZ2Ugc3RhdGlzdGljcycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcicsXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==