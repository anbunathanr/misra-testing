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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVzYWdlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZ2V0LXVzYWdlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGlGQUE2RTtBQUU3RTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7R0FvQkc7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQzFCLEtBQTJCLEVBQ0ssRUFBRTtJQUNsQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixDQUFDLENBQUM7SUFFM0MsSUFBSSxDQUFDO1FBQ0gsc0NBQXNDO1FBQ3RDLE1BQU0sZ0JBQWdCLEdBQUcsS0FBSyxDQUFDLGNBQWMsQ0FBQyxVQUFVLEVBQUUsTUFBTSxFQUFFLEdBQUcsQ0FBQztRQUN0RSxJQUFJLENBQUMsZ0JBQWdCLEVBQUUsQ0FBQztZQUN0QixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLGNBQWM7aUJBQ3RCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHlCQUF5QjtRQUN6QixNQUFNLFdBQVcsR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBQ3RELE1BQU0sTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLElBQUksZ0JBQWdCLENBQUMsQ0FBQyw2QkFBNkI7UUFDcEYsTUFBTSxTQUFTLEdBQUcsV0FBVyxDQUFDLFNBQVMsQ0FBQztRQUN4QyxNQUFNLFNBQVMsR0FBRyxXQUFXLENBQUMsU0FBUyxDQUFDO1FBQ3hDLE1BQU0sT0FBTyxHQUFHLFdBQVcsQ0FBQyxPQUFPLENBQUM7UUFDcEMsTUFBTSxRQUFRLEdBQUcsV0FBVyxDQUFDLFFBQTRELENBQUM7UUFFMUYsZ0ZBQWdGO1FBQ2hGLElBQUksTUFBTSxLQUFLLGdCQUFnQixF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QUFDO1NBQy9CLENBQUM7SUFDSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsbUJBQW1CLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFMUMsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLHFDQUFxQztnQkFDNUMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBcEpXLFFBQUEsT0FBTyxXQW9KbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IENvc3RUcmFja2VyIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvYWktdGVzdC1nZW5lcmF0aW9uL2Nvc3QtdHJhY2tlcic7XHJcblxyXG4vKipcclxuICogR0VUIC9hcGkvYWktdGVzdC1nZW5lcmF0aW9uL3VzYWdlXHJcbiAqIFxyXG4gKiBSZXRyaWV2ZXMgdXNhZ2Ugc3RhdGlzdGljcyBhbmQgY29zdCBlc3RpbWF0ZXMuXHJcbiAqIFxyXG4gKiBRdWVyeSBQYXJhbWV0ZXJzOlxyXG4gKiAtIHVzZXJJZD86IHN0cmluZ1xyXG4gKiAtIHByb2plY3RJZD86IHN0cmluZ1xyXG4gKiAtIHN0YXJ0RGF0ZT86IHN0cmluZyAoSVNPIGZvcm1hdClcclxuICogLSBlbmREYXRlPzogc3RyaW5nIChJU08gZm9ybWF0KVxyXG4gKiAtIHByb3ZpZGVyPzogc3RyaW5nIChPUEVOQUksIEJFRFJPQ0ssIEhVR0dJTkdGQUNFKVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICB0b2RheTogeyByZXF1ZXN0cywgdG9rZW5zLCBjb3N0IH0sXHJcbiAqICAgdGhpc01vbnRoOiB7IHJlcXVlc3RzLCB0b2tlbnMsIGNvc3QgfSxcclxuICogICBsaW1pdHM6IHsgZGFpbHlSZXF1ZXN0cywgZGFpbHlUb2tlbnMsIGRhaWx5Q29zdCwgbW9udGhseVJlcXVlc3RzLCBtb250aGx5VG9rZW5zLCBtb250aGx5Q29zdCB9LFxyXG4gKiAgIHN0YXRzOiBVc2FnZVN0YXRzLFxyXG4gKiAgIHByb3ZpZGVyPzogc3RyaW5nIChpZiBmaWx0ZXJlZClcclxuICogfVxyXG4gKi9cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoXHJcbiAgZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgY29uc29sZS5sb2coJ1tHZXRVc2FnZV0gUmVjZWl2ZWQgcmVxdWVzdCcpO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gR2V0IHVzZXIgSUQgZnJvbSBhdXRob3JpemVyIGNvbnRleHRcclxuICAgIGNvbnN0IHJlcXVlc3RpbmdVc2VySWQgPSBldmVudC5yZXF1ZXN0Q29udGV4dC5hdXRob3JpemVyPy5jbGFpbXM/LnN1YjtcclxuICAgIGlmICghcmVxdWVzdGluZ1VzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnVW5hdXRob3JpemVkJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYXJzZSBxdWVyeSBwYXJhbWV0ZXJzXHJcbiAgICBjb25zdCBxdWVyeVBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuICAgIGNvbnN0IHVzZXJJZCA9IHF1ZXJ5UGFyYW1zLnVzZXJJZCB8fCByZXF1ZXN0aW5nVXNlcklkOyAvLyBEZWZhdWx0IHRvIHJlcXVlc3RpbmcgdXNlclxyXG4gICAgY29uc3QgcHJvamVjdElkID0gcXVlcnlQYXJhbXMucHJvamVjdElkO1xyXG4gICAgY29uc3Qgc3RhcnREYXRlID0gcXVlcnlQYXJhbXMuc3RhcnREYXRlO1xyXG4gICAgY29uc3QgZW5kRGF0ZSA9IHF1ZXJ5UGFyYW1zLmVuZERhdGU7XHJcbiAgICBjb25zdCBwcm92aWRlciA9IHF1ZXJ5UGFyYW1zLnByb3ZpZGVyIGFzICdPUEVOQUknIHwgJ0JFRFJPQ0snIHwgJ0hVR0dJTkdGQUNFJyB8IHVuZGVmaW5lZDtcclxuXHJcbiAgICAvLyBBdXRob3JpemF0aW9uIGNoZWNrOiB1c2VycyBjYW4gb25seSB2aWV3IHRoZWlyIG93biBzdGF0cyB1bmxlc3MgdGhleSdyZSBhZG1pblxyXG4gICAgaWYgKHVzZXJJZCAhPT0gcmVxdWVzdGluZ1VzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMyxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnRm9yYmlkZGVuJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdZb3UgY2FuIG9ubHkgdmlldyB5b3VyIG93biB1c2FnZSBzdGF0aXN0aWNzJyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0dldFVzYWdlXSBSZXRyaWV2aW5nIHN0YXRzIGZvciB1c2VyOiAke3VzZXJJZH1gKTtcclxuXHJcbiAgICAvLyBJbml0aWFsaXplIGNvc3QgdHJhY2tlclxyXG4gICAgY29uc3QgdGFibGVOYW1lID0gcHJvY2Vzcy5lbnYuQUlfVVNBR0VfVEFCTEUgfHwgJ0FJVXNhZ2UnO1xyXG4gICAgY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIodGFibGVOYW1lKTtcclxuXHJcbiAgICAvLyBHZXQgdG9kYXkncyBkYXRlIHJhbmdlXHJcbiAgICBjb25zdCB0b2RheSA9IG5ldyBEYXRlKCk7XHJcbiAgICBjb25zdCBzdGFydE9mVG9kYXkgPSBuZXcgRGF0ZSh0b2RheS5nZXRGdWxsWWVhcigpLCB0b2RheS5nZXRNb250aCgpLCB0b2RheS5nZXREYXRlKCkpLnRvSVNPU3RyaW5nKCk7XHJcbiAgICBjb25zdCBlbmRPZlRvZGF5ID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSwgdG9kYXkuZ2V0RGF0ZSgpLCAyMywgNTksIDU5KS50b0lTT1N0cmluZygpO1xyXG5cclxuICAgIC8vIEdldCB0aGlzIG1vbnRoJ3MgZGF0ZSByYW5nZVxyXG4gICAgY29uc3Qgc3RhcnRPZk1vbnRoID0gbmV3IERhdGUodG9kYXkuZ2V0RnVsbFllYXIoKSwgdG9kYXkuZ2V0TW9udGgoKSwgMSkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IGVuZE9mTW9udGggPSBuZXcgRGF0ZSh0b2RheS5nZXRGdWxsWWVhcigpLCB0b2RheS5nZXRNb250aCgpICsgMSwgMCwgMjMsIDU5LCA1OSkudG9JU09TdHJpbmcoKTtcclxuXHJcbiAgICAvLyBHZXQgdXNhZ2Ugc3RhdGlzdGljcyBmb3IgdG9kYXlcclxuICAgIGNvbnN0IHRvZGF5U3RhdHMgPSBhd2FpdCBjb3N0VHJhY2tlci5nZXRVc2FnZVN0YXRzKFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIHByb2plY3RJZCxcclxuICAgICAgc3RhcnRPZlRvZGF5LFxyXG4gICAgICBlbmRPZlRvZGF5LFxyXG4gICAgICBwcm92aWRlclxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBHZXQgdXNhZ2Ugc3RhdGlzdGljcyBmb3IgdGhpcyBtb250aFxyXG4gICAgY29uc3QgbW9udGhTdGF0cyA9IGF3YWl0IGNvc3RUcmFja2VyLmdldFVzYWdlU3RhdHMoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgcHJvamVjdElkLFxyXG4gICAgICBzdGFydE9mTW9udGgsXHJcbiAgICAgIGVuZE9mTW9udGgsXHJcbiAgICAgIHByb3ZpZGVyXHJcbiAgICApO1xyXG5cclxuICAgIC8vIEdldCBvdmVyYWxsIHN0YXRzIGlmIGRhdGUgcmFuZ2UgcHJvdmlkZWRcclxuICAgIGNvbnN0IG92ZXJhbGxTdGF0cyA9IHN0YXJ0RGF0ZSB8fCBlbmREYXRlXHJcbiAgICAgID8gYXdhaXQgY29zdFRyYWNrZXIuZ2V0VXNhZ2VTdGF0cyh1c2VySWQsIHByb2plY3RJZCwgc3RhcnREYXRlLCBlbmREYXRlLCBwcm92aWRlcilcclxuICAgICAgOiBtb250aFN0YXRzO1xyXG5cclxuICAgIGNvbnNvbGUubG9nKGBbR2V0VXNhZ2VdIFRvZGF5OiAke3RvZGF5U3RhdHMudG90YWxDYWxsc30gY2FsbHMsICQke3RvZGF5U3RhdHMuZXN0aW1hdGVkQ29zdC50b0ZpeGVkKDIpfSwgcHJvdmlkZXI6ICR7cHJvdmlkZXIgfHwgJ2FsbCd9YCk7XHJcbiAgICBjb25zb2xlLmxvZyhgW0dldFVzYWdlXSBNb250aDogJHttb250aFN0YXRzLnRvdGFsQ2FsbHN9IGNhbGxzLCAkJHttb250aFN0YXRzLmVzdGltYXRlZENvc3QudG9GaXhlZCgyKX0sIHByb3ZpZGVyOiAke3Byb3ZpZGVyIHx8ICdhbGwnfWApO1xyXG5cclxuICAgIC8vIEdldCBsaW1pdHMgZnJvbSBjb25maWcgKHRoZXNlIHNob3VsZCBtYXRjaCB0aGUgbGltaXRzIGluIGNvc3QtdHJhY2tlci50cylcclxuICAgIGNvbnN0IGxpbWl0cyA9IHtcclxuICAgICAgZGFpbHlSZXF1ZXN0czogMTAwLFxyXG4gICAgICBkYWlseVRva2VuczogMTAwMDAwLFxyXG4gICAgICBkYWlseUNvc3Q6IDEwLjAsXHJcbiAgICAgIG1vbnRobHlSZXF1ZXN0czogMzAwMCxcclxuICAgICAgbW9udGhseVRva2VuczogMzAwMDAwMCxcclxuICAgICAgbW9udGhseUNvc3Q6IDEwMC4wLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBCdWlsZCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2U6IGFueSA9IHtcclxuICAgICAgdG9kYXk6IHtcclxuICAgICAgICByZXF1ZXN0czogdG9kYXlTdGF0cy50b3RhbENhbGxzLFxyXG4gICAgICAgIHRva2VuczogdG9kYXlTdGF0cy50b3RhbFRva2VucyxcclxuICAgICAgICBjb3N0OiB0b2RheVN0YXRzLmVzdGltYXRlZENvc3QsXHJcbiAgICAgIH0sXHJcbiAgICAgIHRoaXNNb250aDoge1xyXG4gICAgICAgIHJlcXVlc3RzOiBtb250aFN0YXRzLnRvdGFsQ2FsbHMsXHJcbiAgICAgICAgdG9rZW5zOiBtb250aFN0YXRzLnRvdGFsVG9rZW5zLFxyXG4gICAgICAgIGNvc3Q6IG1vbnRoU3RhdHMuZXN0aW1hdGVkQ29zdCxcclxuICAgICAgfSxcclxuICAgICAgbGltaXRzLFxyXG4gICAgICBzdGF0czoge1xyXG4gICAgICAgIHRvdGFsQ2FsbHM6IG92ZXJhbGxTdGF0cy50b3RhbENhbGxzLFxyXG4gICAgICAgIHRvdGFsVG9rZW5zOiBvdmVyYWxsU3RhdHMudG90YWxUb2tlbnMsXHJcbiAgICAgICAgZXN0aW1hdGVkQ29zdDogb3ZlcmFsbFN0YXRzLmVzdGltYXRlZENvc3QsXHJcbiAgICAgICAgYnJlYWtkb3duOiB7XHJcbiAgICAgICAgICBieVVzZXI6IE9iamVjdC5mcm9tRW50cmllcyhvdmVyYWxsU3RhdHMuYnJlYWtkb3duLmJ5VXNlciksXHJcbiAgICAgICAgICBieVByb2plY3Q6IE9iamVjdC5mcm9tRW50cmllcyhvdmVyYWxsU3RhdHMuYnJlYWtkb3duLmJ5UHJvamVjdCksXHJcbiAgICAgICAgICBieURhdGU6IE9iamVjdC5mcm9tRW50cmllcyhvdmVyYWxsU3RhdHMuYnJlYWtkb3duLmJ5RGF0ZSksXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gQWRkIHByb3ZpZGVyIGZpbHRlciBpbmZvIGlmIHNwZWNpZmllZFxyXG4gICAgaWYgKHByb3ZpZGVyKSB7XHJcbiAgICAgIHJlc3BvbnNlLnByb3ZpZGVyID0gcHJvdmlkZXI7XHJcbiAgICB9XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXNwb25zZSksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdbR2V0VXNhZ2VdIEVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICBlcnJvcjogJ0ZhaWxlZCB0byByZXRyaWV2ZSB1c2FnZSBzdGF0aXN0aWNzJyxcclxuICAgICAgICBtZXNzYWdlOiBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJyxcclxuICAgICAgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19