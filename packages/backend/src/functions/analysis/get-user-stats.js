"use strict";
/**
 * Lambda function to get user analysis statistics
 * Provides summary statistics for a user's analysis history
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const analysis_results_service_1 = require("../../services/analysis-results-service");
const dynamodb_client_1 = require("../../database/dynamodb-client");
const environment = process.env.ENVIRONMENT || 'dev';
const dbClient = new dynamodb_client_1.DynamoDBClientWrapper(environment);
const resultsService = new analysis_results_service_1.AnalysisResultsService(dbClient);
const handler = async (event) => {
    console.log('Get user stats request:', JSON.stringify(event, null, 2));
    try {
        const userId = event.pathParameters?.userId;
        if (!userId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'User ID is required' })
            };
        }
        // Get user statistics
        const stats = await resultsService.getUserAnalysisStats(userId);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                userId,
                statistics: stats
            })
        };
    }
    catch (error) {
        console.error('Error getting user statistics:', error);
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                error: 'Failed to get user statistics',
                message: error instanceof Error ? error.message : 'Unknown error'
            })
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LXVzZXItc3RhdHMuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtdXNlci1zdGF0cy50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFHSCxzRkFBaUY7QUFDakYsb0VBQXVFO0FBRXZFLE1BQU0sV0FBVyxHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsV0FBVyxJQUFJLEtBQUssQ0FBQztBQUNyRCxNQUFNLFFBQVEsR0FBRyxJQUFJLHVDQUFxQixDQUFDLFdBQVcsQ0FBQyxDQUFDO0FBQ3hELE1BQU0sY0FBYyxHQUFHLElBQUksaURBQXNCLENBQUMsUUFBUSxDQUFDLENBQUM7QUFFckQsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEtBQUssRUFBRSxJQUFJLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQztJQUV2RSxJQUFJLENBQUM7UUFDSCxNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLE1BQU0sQ0FBQztRQUU1QyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDWixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUscUJBQXFCLEVBQUUsQ0FBQzthQUN2RCxDQUFDO1FBQ0osQ0FBQztRQUVELHNCQUFzQjtRQUN0QixNQUFNLEtBQUssR0FBRyxNQUFNLGNBQWMsQ0FBQyxvQkFBb0IsQ0FBQyxNQUFNLENBQUMsQ0FBQztRQUVoRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7WUFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7Z0JBQ25CLE1BQU07Z0JBQ04sVUFBVSxFQUFFLEtBQUs7YUFDbEIsQ0FBQztTQUNILENBQUM7SUFFSixDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsZ0NBQWdDLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFdkQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUUsK0JBQStCO2dCQUN0QyxPQUFPLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTthQUNsRSxDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUF0Q1csUUFBQSxPQUFPLFdBc0NsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBMYW1iZGEgZnVuY3Rpb24gdG8gZ2V0IHVzZXIgYW5hbHlzaXMgc3RhdGlzdGljc1xyXG4gKiBQcm92aWRlcyBzdW1tYXJ5IHN0YXRpc3RpY3MgZm9yIGEgdXNlcidzIGFuYWx5c2lzIGhpc3RvcnlcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IEFuYWx5c2lzUmVzdWx0c1NlcnZpY2UgfSBmcm9tICcuLi8uLi9zZXJ2aWNlcy9hbmFseXNpcy1yZXN1bHRzLXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudFdyYXBwZXIgfSBmcm9tICcuLi8uLi9kYXRhYmFzZS9keW5hbW9kYi1jbGllbnQnO1xyXG5cclxuY29uc3QgZW52aXJvbm1lbnQgPSBwcm9jZXNzLmVudi5FTlZJUk9OTUVOVCB8fCAnZGV2JztcclxuY29uc3QgZGJDbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnRXcmFwcGVyKGVudmlyb25tZW50KTtcclxuY29uc3QgcmVzdWx0c1NlcnZpY2UgPSBuZXcgQW5hbHlzaXNSZXN1bHRzU2VydmljZShkYkNsaWVudCk7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHZXQgdXNlciBzdGF0cyByZXF1ZXN0OicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB1c2VySWQgPSBldmVudC5wYXRoUGFyYW1ldGVycz8udXNlcklkO1xyXG5cclxuICAgIGlmICghdXNlcklkKSB7XHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc3RhdHVzQ29kZTogNDAwLFxyXG4gICAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHsgZXJyb3I6ICdVc2VyIElEIGlzIHJlcXVpcmVkJyB9KVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG5cclxuICAgIC8vIEdldCB1c2VyIHN0YXRpc3RpY3NcclxuICAgIGNvbnN0IHN0YXRzID0gYXdhaXQgcmVzdWx0c1NlcnZpY2UuZ2V0VXNlckFuYWx5c2lzU3RhdHModXNlcklkKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgdXNlcklkLFxyXG4gICAgICAgIHN0YXRpc3RpY3M6IHN0YXRzXHJcbiAgICAgIH0pXHJcbiAgICB9O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZ2V0dGluZyB1c2VyIHN0YXRpc3RpY3M6JywgZXJyb3IpO1xyXG4gICAgXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6ICdGYWlsZWQgdG8gZ2V0IHVzZXIgc3RhdGlzdGljcycsXHJcbiAgICAgICAgbWVzc2FnZTogZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcidcclxuICAgICAgfSlcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=