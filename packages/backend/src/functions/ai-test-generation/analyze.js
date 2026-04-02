"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const application_analyzer_1 = require("../../services/ai-test-generation/application-analyzer");
const startup_validator_1 = require("../../services/ai-test-generation/startup-validator");
// Task 10.2: Validate configuration on Lambda cold start
// This runs once when the Lambda container initializes
try {
    (0, startup_validator_1.validateStartupConfiguration)();
}
catch (error) {
    console.error('[Analyze] Failed to initialize Lambda due to invalid configuration:', error);
    // Lambda will fail to initialize, preventing requests from being processed
    throw error;
}
/**
 * POST /api/ai-test-generation/analyze
 *
 * Analyzes a web application to identify testable elements and UI patterns.
 *
 * Request Body:
 * {
 *   url: string;
 *   options?: {
 *     waitForSelector?: string;
 *     timeout?: number;
 *     viewport?: { width: number; height: number };
 *   }
 * }
 *
 * Response:
 * {
 *   analysis: ApplicationAnalysis
 * }
 */
const handler = async (event) => {
    console.log('[Analyze] Received request');
    try {
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Request body is required',
                }),
            };
        }
        const request = JSON.parse(event.body);
        // Validate required fields
        if (!request.url) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'URL is required',
                }),
            };
        }
        // Validate URL format
        try {
            new URL(request.url);
        }
        catch (error) {
            return {
                statusCode: 400,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: 'Invalid URL format',
                }),
            };
        }
        console.log(`[Analyze] Analyzing URL: ${request.url}`);
        // Create analyzer and perform analysis
        const analyzer = application_analyzer_1.ApplicationAnalyzer.getInstance();
        const analysis = await analyzer.analyze(request.url, request.options);
        console.log(`[Analyze] Analysis complete: ${analysis.elements.length} elements found`);
        // Return successful response
        const response = {
            analysis,
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
        console.error('[Analyze] Error:', error);
        // Return error response
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: 'Failed to analyze application',
                message: error instanceof Error ? error.message : 'Unknown error',
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImFuYWx5emUudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6Ijs7O0FBQ0EsaUdBQTZGO0FBRTdGLDJGQUFtRztBQUVuRyx5REFBeUQ7QUFDekQsdURBQXVEO0FBQ3ZELElBQUksQ0FBQztJQUNILElBQUEsZ0RBQTRCLEdBQUUsQ0FBQztBQUNqQyxDQUFDO0FBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztJQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMscUVBQXFFLEVBQUUsS0FBSyxDQUFDLENBQUM7SUFDNUYsMkVBQTJFO0lBQzNFLE1BQU0sS0FBSyxDQUFDO0FBQ2QsQ0FBQztBQUVEOzs7Ozs7Ozs7Ozs7Ozs7Ozs7O0dBbUJHO0FBQ0ksTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUMxQixLQUEyQixFQUNLLEVBQUU7SUFDbEMsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsQ0FBQyxDQUFDO0lBRTFDLElBQUksQ0FBQztRQUNILHFCQUFxQjtRQUNyQixJQUFJLENBQUMsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDO1lBQ2hCLE9BQU87Z0JBQ0wsVUFBVSxFQUFFLEdBQUc7Z0JBQ2YsT0FBTyxFQUFFO29CQUNQLGNBQWMsRUFBRSxrQkFBa0I7b0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7aUJBQ25DO2dCQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO29CQUNuQixLQUFLLEVBQUUsMEJBQTBCO2lCQUNsQyxDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCxNQUFNLE9BQU8sR0FBbUIsSUFBSSxDQUFDLEtBQUssQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLENBQUM7UUFFdkQsMkJBQTJCO1FBQzNCLElBQUksQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRSxpQkFBaUI7aUJBQ3pCLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELHNCQUFzQjtRQUN0QixJQUFJLENBQUM7WUFDSCxJQUFJLEdBQUcsQ0FBQyxPQUFPLENBQUMsR0FBRyxDQUFDLENBQUM7UUFDdkIsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFLG9CQUFvQjtpQkFDNUIsQ0FBQzthQUNILENBQUM7UUFDSixDQUFDO1FBRUQsT0FBTyxDQUFDLEdBQUcsQ0FBQyw0QkFBNEIsT0FBTyxDQUFDLEdBQUcsRUFBRSxDQUFDLENBQUM7UUFFdkQsdUNBQXVDO1FBQ3ZDLE1BQU0sUUFBUSxHQUFHLDBDQUFtQixDQUFDLFdBQVcsRUFBRSxDQUFDO1FBQ25ELE1BQU0sUUFBUSxHQUFHLE1BQU0sUUFBUSxDQUFDLE9BQU8sQ0FBQyxPQUFPLENBQUMsR0FBRyxFQUFFLE9BQU8sQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUV0RSxPQUFPLENBQUMsR0FBRyxDQUFDLGdDQUFnQyxRQUFRLENBQUMsUUFBUSxDQUFDLE1BQU0saUJBQWlCLENBQUMsQ0FBQztRQUV2Riw2QkFBNkI7UUFDN0IsTUFBTSxRQUFRLEdBQW9CO1lBQ2hDLFFBQVE7U0FDVCxDQUFDO1FBRUYsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUM7U0FDL0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxrQkFBa0IsRUFBRSxLQUFLLENBQUMsQ0FBQztRQUV6Qyx3QkFBd0I7UUFDeEIsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFLCtCQUErQjtnQkFDdEMsT0FBTyxFQUFFLEtBQUssWUFBWSxLQUFLLENBQUMsQ0FBQyxDQUFDLEtBQUssQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLGVBQWU7YUFDbEUsQ0FBQztTQUNILENBQUM7SUFDSixDQUFDO0FBQ0gsQ0FBQyxDQUFDO0FBekZXLFFBQUEsT0FBTyxXQXlGbEIiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEFwcGxpY2F0aW9uQW5hbHl6ZXIgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9haS10ZXN0LWdlbmVyYXRpb24vYXBwbGljYXRpb24tYW5hbHl6ZXInO1xyXG5pbXBvcnQgeyBBbmFseXplUmVxdWVzdCwgQW5hbHl6ZVJlc3BvbnNlIH0gZnJvbSAnLi4vLi4vdHlwZXMvYWktdGVzdC1nZW5lcmF0aW9uJztcclxuaW1wb3J0IHsgdmFsaWRhdGVTdGFydHVwQ29uZmlndXJhdGlvbiB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL2FpLXRlc3QtZ2VuZXJhdGlvbi9zdGFydHVwLXZhbGlkYXRvcic7XHJcblxyXG4vLyBUYXNrIDEwLjI6IFZhbGlkYXRlIGNvbmZpZ3VyYXRpb24gb24gTGFtYmRhIGNvbGQgc3RhcnRcclxuLy8gVGhpcyBydW5zIG9uY2Ugd2hlbiB0aGUgTGFtYmRhIGNvbnRhaW5lciBpbml0aWFsaXplc1xyXG50cnkge1xyXG4gIHZhbGlkYXRlU3RhcnR1cENvbmZpZ3VyYXRpb24oKTtcclxufSBjYXRjaCAoZXJyb3IpIHtcclxuICBjb25zb2xlLmVycm9yKCdbQW5hbHl6ZV0gRmFpbGVkIHRvIGluaXRpYWxpemUgTGFtYmRhIGR1ZSB0byBpbnZhbGlkIGNvbmZpZ3VyYXRpb246JywgZXJyb3IpO1xyXG4gIC8vIExhbWJkYSB3aWxsIGZhaWwgdG8gaW5pdGlhbGl6ZSwgcHJldmVudGluZyByZXF1ZXN0cyBmcm9tIGJlaW5nIHByb2Nlc3NlZFxyXG4gIHRocm93IGVycm9yO1xyXG59XHJcblxyXG4vKipcclxuICogUE9TVCAvYXBpL2FpLXRlc3QtZ2VuZXJhdGlvbi9hbmFseXplXHJcbiAqIFxyXG4gKiBBbmFseXplcyBhIHdlYiBhcHBsaWNhdGlvbiB0byBpZGVudGlmeSB0ZXN0YWJsZSBlbGVtZW50cyBhbmQgVUkgcGF0dGVybnMuXHJcbiAqIFxyXG4gKiBSZXF1ZXN0IEJvZHk6XHJcbiAqIHtcclxuICogICB1cmw6IHN0cmluZztcclxuICogICBvcHRpb25zPzoge1xyXG4gKiAgICAgd2FpdEZvclNlbGVjdG9yPzogc3RyaW5nO1xyXG4gKiAgICAgdGltZW91dD86IG51bWJlcjtcclxuICogICAgIHZpZXdwb3J0PzogeyB3aWR0aDogbnVtYmVyOyBoZWlnaHQ6IG51bWJlciB9O1xyXG4gKiAgIH1cclxuICogfVxyXG4gKiBcclxuICogUmVzcG9uc2U6XHJcbiAqIHtcclxuICogICBhbmFseXNpczogQXBwbGljYXRpb25BbmFseXNpc1xyXG4gKiB9XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChcclxuICBldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnRcclxuKTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnW0FuYWx5emVdIFJlY2VpdmVkIHJlcXVlc3QnKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIFBhcnNlIHJlcXVlc3QgYm9keVxyXG4gICAgaWYgKCFldmVudC5ib2R5KSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHtcclxuICAgICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICAgIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgICAgZXJyb3I6ICdSZXF1ZXN0IGJvZHkgaXMgcmVxdWlyZWQnLFxyXG4gICAgICAgIH0pLFxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IHJlcXVlc3Q6IEFuYWx5emVSZXF1ZXN0ID0gSlNPTi5wYXJzZShldmVudC5ib2R5KTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSByZXF1aXJlZCBmaWVsZHNcclxuICAgIGlmICghcmVxdWVzdC51cmwpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjogJ1VSTCBpcyByZXF1aXJlZCcsXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgVVJMIGZvcm1hdFxyXG4gICAgdHJ5IHtcclxuICAgICAgbmV3IFVSTChyZXF1ZXN0LnVybCk7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiAnSW52YWxpZCBVUkwgZm9ybWF0JyxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0FuYWx5emVdIEFuYWx5emluZyBVUkw6ICR7cmVxdWVzdC51cmx9YCk7XHJcblxyXG4gICAgLy8gQ3JlYXRlIGFuYWx5emVyIGFuZCBwZXJmb3JtIGFuYWx5c2lzXHJcbiAgICBjb25zdCBhbmFseXplciA9IEFwcGxpY2F0aW9uQW5hbHl6ZXIuZ2V0SW5zdGFuY2UoKTtcclxuICAgIGNvbnN0IGFuYWx5c2lzID0gYXdhaXQgYW5hbHl6ZXIuYW5hbHl6ZShyZXF1ZXN0LnVybCwgcmVxdWVzdC5vcHRpb25zKTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgW0FuYWx5emVdIEFuYWx5c2lzIGNvbXBsZXRlOiAke2FuYWx5c2lzLmVsZW1lbnRzLmxlbmd0aH0gZWxlbWVudHMgZm91bmRgKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gc3VjY2Vzc2Z1bCByZXNwb25zZVxyXG4gICAgY29uc3QgcmVzcG9uc2U6IEFuYWx5emVSZXNwb25zZSA9IHtcclxuICAgICAgYW5hbHlzaXMsXHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignW0FuYWx5emVdIEVycm9yOicsIGVycm9yKTtcclxuXHJcbiAgICAvLyBSZXR1cm4gZXJyb3IgcmVzcG9uc2VcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiAnRmFpbGVkIHRvIGFuYWx5emUgYXBwbGljYXRpb24nLFxyXG4gICAgICAgIG1lc3NhZ2U6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InLFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=