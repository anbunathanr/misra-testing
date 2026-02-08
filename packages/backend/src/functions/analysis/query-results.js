"use strict";
/**
 * Lambda function to query analysis results
 * Provides filtering and pagination for analysis history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const analysis_results_service_1 = require("../../services/analysis-results-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const resultsService = new analysis_results_service_1.AnalysisResultsService(dbClient);
const handler = async (event) => {
    console.log('Query analysis results request:', JSON.stringify(event, null, 2));
    try {
        const queryParams = event.queryStringParameters || {};
        // Build filters from query parameters
        const filters = {};
        if (queryParams.fileId) {
            filters.fileId = queryParams.fileId;
        }
        if (queryParams.userId) {
            filters.userId = queryParams.userId;
        }
        if (queryParams.ruleSet) {
            filters.ruleSet = queryParams.ruleSet;
        }
        if (queryParams.startDate) {
            filters.startDate = parseInt(queryParams.startDate);
        }
        if (queryParams.endDate) {
            filters.endDate = parseInt(queryParams.endDate);
        }
        if (queryParams.minViolations) {
            filters.minViolations = parseInt(queryParams.minViolations);
        }
        if (queryParams.maxViolations) {
            filters.maxViolations = parseInt(queryParams.maxViolations);
        }
        if (queryParams.successOnly === 'true') {
            filters.successOnly = true;
        }
        // Pagination options
        const limit = queryParams.limit ? parseInt(queryParams.limit) : 50;
        const exclusiveStartKey = queryParams.lastKey ? JSON.parse(queryParams.lastKey) : undefined;
        // Query results
        const results = await resultsService.queryAnalysisResults(filters, {
            limit,
            exclusiveStartKey
        });
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                results: results.items,
                count: results.count,
                scannedCount: results.scannedCount,
                lastEvaluatedKey: results.lastEvaluatedKey
            })
        };
    }
    catch (error) {
        console.error('Error querying analysis results:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to query analysis results',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicXVlcnktcmVzdWx0cy5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInF1ZXJ5LXJlc3VsdHMudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7R0FHRzs7O0FBR0gsc0ZBQWlGO0FBQ2pGLG9FQUF1RTtBQUl2RSxNQUFNLFdBQVcsR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLFdBQVcsSUFBSSxLQUFLLENBQUM7QUFDckQsTUFBTSxRQUFRLEdBQUcsSUFBSSx1Q0FBcUIsQ0FBQyxXQUFXLENBQUMsQ0FBQztBQUN4RCxNQUFNLGNBQWMsR0FBRyxJQUFJLGlEQUFzQixDQUFDLFFBQVEsQ0FBQyxDQUFDO0FBRXJELE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUNBQWlDLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFL0UsSUFBSSxDQUFDO1FBQ0gsTUFBTSxXQUFXLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUV0RCxzQ0FBc0M7UUFDdEMsTUFBTSxPQUFPLEdBQXlCLEVBQUUsQ0FBQztRQUV6QyxJQUFJLFdBQVcsQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUN2QixPQUFPLENBQUMsTUFBTSxHQUFHLFdBQVcsQ0FBQyxNQUFNLENBQUM7UUFDdEMsQ0FBQztRQUVELElBQUksV0FBVyxDQUFDLE1BQU0sRUFBRSxDQUFDO1lBQ3ZCLE9BQU8sQ0FBQyxNQUFNLEdBQUcsV0FBVyxDQUFDLE1BQU0sQ0FBQztRQUN0QyxDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDeEIsT0FBTyxDQUFDLE9BQU8sR0FBRyxXQUFXLENBQUMsT0FBdUIsQ0FBQztRQUN4RCxDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsU0FBUyxFQUFFLENBQUM7WUFDMUIsT0FBTyxDQUFDLFNBQVMsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLFNBQVMsQ0FBQyxDQUFDO1FBQ3RELENBQUM7UUFFRCxJQUFJLFdBQVcsQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUN4QixPQUFPLENBQUMsT0FBTyxHQUFHLFFBQVEsQ0FBQyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUM7UUFDbEQsQ0FBQztRQUVELElBQUksV0FBVyxDQUFDLGFBQWEsRUFBRSxDQUFDO1lBQzlCLE9BQU8sQ0FBQyxhQUFhLEdBQUcsUUFBUSxDQUFDLFdBQVcsQ0FBQyxhQUFhLENBQUMsQ0FBQztRQUM5RCxDQUFDO1FBRUQsSUFBSSxXQUFXLENBQUMsYUFBYSxFQUFFLENBQUM7WUFDOUIsT0FBTyxDQUFDLGFBQWEsR0FBRyxRQUFRLENBQUMsV0FBVyxDQUFDLGFBQWEsQ0FBQyxDQUFDO1FBQzlELENBQUM7UUFFRCxJQUFJLFdBQVcsQ0FBQyxXQUFXLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDdkMsT0FBTyxDQUFDLFdBQVcsR0FBRyxJQUFJLENBQUM7UUFDN0IsQ0FBQztRQUVELHFCQUFxQjtRQUNyQixNQUFNLEtBQUssR0FBRyxXQUFXLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsV0FBVyxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDbkUsTUFBTSxpQkFBaUIsR0FBRyxXQUFXLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQyxJQUFJLENBQUMsS0FBSyxDQUFDLFdBQVcsQ0FBQyxPQUFPLENBQUMsQ0FBQyxDQUFDLENBQUMsU0FBUyxDQUFDO1FBRTVGLGdCQUFnQjtRQUNoQixNQUFNLE9BQU8sR0FBRyxNQUFNLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxPQUFPLEVBQUU7WUFDakUsS0FBSztZQUNMLGlCQUFpQjtTQUNsQixDQUFDLENBQUM7UUFFSCxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE9BQU8sRUFBRSxPQUFPLENBQUMsS0FBSztnQkFDdEIsS0FBSyxFQUFFLE9BQU8sQ0FBQyxLQUFLO2dCQUNwQixZQUFZLEVBQUUsT0FBTyxDQUFDLFlBQVk7Z0JBQ2xDLGdCQUFnQixFQUFFLE9BQU8sQ0FBQyxnQkFBZ0I7YUFDM0MsQ0FBQztTQUNILENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsa0NBQWtDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFekQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsa0NBQWtDO2dCQUN6QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUExRVcsUUFBQSxPQUFPLFdBMEVsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gcXVlcnkgYW5hbHlzaXMgcmVzdWx0c1xyXG4gKiBQcm92aWRlcyBmaWx0ZXJpbmcgYW5kIHBhZ2luYXRpb24gZm9yIGFuYWx5c2lzIGhpc3RvcnlcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0c1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hbmFseXNpcy1yZXN1bHRzLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5pbXBvcnQgeyBBbmFseXNpc1F1ZXJ5RmlsdGVycyB9IGZyb20gJy4uLy4uL3R5cGVzL2FuYWx5c2lzLXBlcnNpc3RlbmNlJztcclxuaW1wb3J0IHsgTWlzcmFSdWxlU2V0IH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtcnVsZXMnO1xyXG5cclxuY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKGVudmlyb25tZW50KTtcclxuY29uc3QgcmVzdWx0c1NlcnZpY2UgPSBuZXcgQW5hbHlzaXNSZXN1bHRzU2VydmljZShkYkNsaWVudCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdRdWVyeSBhbmFseXNpcyByZXN1bHRzIHJlcXVlc3Q6JywgSlNPTi5zdHJpbmdpZnkoZXZlbnQsIG51bGwsIDIpKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHF1ZXJ5UGFyYW1zID0gZXZlbnQucXVlcnlTdHJpbmdQYXJhbWV0ZXJzIHx8IHt9O1xyXG4gICAgXHJcbiAgICAvLyBCdWlsZCBmaWx0ZXJzIGZyb20gcXVlcnkgcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgZmlsdGVyczogQW5hbHlzaXNRdWVyeUZpbHRlcnMgPSB7fTtcclxuICAgIFxyXG4gICAgaWYgKHF1ZXJ5UGFyYW1zLmZpbGVJZCkge1xyXG4gICAgICBmaWx0ZXJzLmZpbGVJZCA9IHF1ZXJ5UGFyYW1zLmZpbGVJZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHF1ZXJ5UGFyYW1zLnVzZXJJZCkge1xyXG4gICAgICBmaWx0ZXJzLnVzZXJJZCA9IHF1ZXJ5UGFyYW1zLnVzZXJJZDtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHF1ZXJ5UGFyYW1zLnJ1bGVTZXQpIHtcclxuICAgICAgZmlsdGVycy5ydWxlU2V0ID0gcXVlcnlQYXJhbXMucnVsZVNldCBhcyBNaXNyYVJ1bGVTZXQ7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmIChxdWVyeVBhcmFtcy5zdGFydERhdGUpIHtcclxuICAgICAgZmlsdGVycy5zdGFydERhdGUgPSBwYXJzZUludChxdWVyeVBhcmFtcy5zdGFydERhdGUpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAocXVlcnlQYXJhbXMuZW5kRGF0ZSkge1xyXG4gICAgICBmaWx0ZXJzLmVuZERhdGUgPSBwYXJzZUludChxdWVyeVBhcmFtcy5lbmREYXRlKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgaWYgKHF1ZXJ5UGFyYW1zLm1pblZpb2xhdGlvbnMpIHtcclxuICAgICAgZmlsdGVycy5taW5WaW9sYXRpb25zID0gcGFyc2VJbnQocXVlcnlQYXJhbXMubWluVmlvbGF0aW9ucyk7XHJcbiAgICB9XHJcbiAgICBcclxuICAgIGlmIChxdWVyeVBhcmFtcy5tYXhWaW9sYXRpb25zKSB7XHJcbiAgICAgIGZpbHRlcnMubWF4VmlvbGF0aW9ucyA9IHBhcnNlSW50KHF1ZXJ5UGFyYW1zLm1heFZpb2xhdGlvbnMpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBpZiAocXVlcnlQYXJhbXMuc3VjY2Vzc09ubHkgPT09ICd0cnVlJykge1xyXG4gICAgICBmaWx0ZXJzLnN1Y2Nlc3NPbmx5ID0gdHJ1ZTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBQYWdpbmF0aW9uIG9wdGlvbnNcclxuICAgIGNvbnN0IGxpbWl0ID0gcXVlcnlQYXJhbXMubGltaXQgPyBwYXJzZUludChxdWVyeVBhcmFtcy5saW1pdCkgOiA1MDtcclxuICAgIGNvbnN0IGV4Y2x1c2l2ZVN0YXJ0S2V5ID0gcXVlcnlQYXJhbXMubGFzdEtleSA/IEpTT04ucGFyc2UocXVlcnlQYXJhbXMubGFzdEtleSkgOiB1bmRlZmluZWQ7XHJcblxyXG4gICAgLy8gUXVlcnkgcmVzdWx0c1xyXG4gICAgY29uc3QgcmVzdWx0cyA9IGF3YWl0IHJlc3VsdHNTZXJ2aWNlLnF1ZXJ5QW5hbHlzaXNSZXN1bHRzKGZpbHRlcnMsIHtcclxuICAgICAgbGltaXQsXHJcbiAgICAgIGV4Y2x1c2l2ZVN0YXJ0S2V5XHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgcmVzdWx0czogcmVzdWx0cy5pdGVtcyxcclxuICAgICAgICBjb3VudDogcmVzdWx0cy5jb3VudCxcclxuICAgICAgICBzY2FubmVkQ291bnQ6IHJlc3VsdHMuc2Nhbm5lZENvdW50LFxyXG4gICAgICAgIGxhc3RFdmFsdWF0ZWRLZXk6IHJlc3VsdHMubGFzdEV2YWx1YXRlZEtleVxyXG4gICAgICB9KVxyXG4gICAgfTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHF1ZXJ5aW5nIGFuYWx5c2lzIHJlc3VsdHM6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gcXVlcnkgYW5hbHlzaXMgcmVzdWx0cycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=