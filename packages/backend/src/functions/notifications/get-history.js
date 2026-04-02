"use strict";
/**
 * Get Notification History Lambda
 *
 * Query notification history with filters and pagination.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const auth_util_1 = require("../../utils/auth-util");
const notification_history_service_1 = require("../../services/notification-history-service");
const handler = async (event) => {
    console.log('Get notification history request', { path: event.path });
    try {
        // Extract user from request context (populated by Lambda Authorizer)
        const user = (0, auth_util_1.getUserFromContext)(event);
        if (!user.userId) {
            return {
                statusCode: 401,
                headers: {
                    'Content-Type': 'application/json',
                    'Access-Control-Allow-Origin': '*',
                },
                body: JSON.stringify({
                    error: {
                        code: 'UNAUTHORIZED',
                        message: 'User context not found',
                        timestamp: new Date().toISOString(),
                    },
                }),
            };
        }
        // Extract query parameters
        const params = event.queryStringParameters || {};
        // Build query object - use authenticated user's userId
        const query = {
            userId: user.userId,
            startDate: params.startDate,
            endDate: params.endDate,
            eventType: params.eventType,
            channel: params.channel,
            deliveryStatus: params.deliveryStatus,
            limit: params.limit ? parseInt(params.limit, 10) : 50,
            nextToken: params.nextToken,
        };
        // Query history
        const result = await notification_history_service_1.notificationHistoryService.queryHistory(query);
        return {
            statusCode: 200,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify(result),
        };
    }
    catch (error) {
        console.error('Error querying notification history', { error });
        return {
            statusCode: 500,
            headers: {
                'Content-Type': 'application/json',
                'Access-Control-Allow-Origin': '*',
            },
            body: JSON.stringify({
                error: {
                    code: 'INTERNAL_ERROR',
                    message: 'Failed to query notification history',
                    timestamp: new Date().toISOString(),
                },
            }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBR0gscURBQTJEO0FBQzNELDhGQUF5RjtBQUdsRixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRXRFLElBQUksQ0FBQztRQUNILHFFQUFxRTtRQUNyRSxNQUFNLElBQUksR0FBRyxJQUFBLDhCQUFrQixFQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXZDLElBQUksQ0FBQyxJQUFJLENBQUMsTUFBTSxFQUFFLENBQUM7WUFDakIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUU7b0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtvQkFDbEMsNkJBQTZCLEVBQUUsR0FBRztpQkFDbkM7Z0JBQ0QsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUM7b0JBQ25CLEtBQUssRUFBRTt3QkFDTCxJQUFJLEVBQUUsY0FBYzt3QkFDcEIsT0FBTyxFQUFFLHdCQUF3Qjt3QkFDakMsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO3FCQUNwQztpQkFDRixDQUFDO2FBQ0gsQ0FBQztRQUNKLENBQUM7UUFFRCwyQkFBMkI7UUFDM0IsTUFBTSxNQUFNLEdBQUcsS0FBSyxDQUFDLHFCQUFxQixJQUFJLEVBQUUsQ0FBQztRQUVqRCx1REFBdUQ7UUFDdkQsTUFBTSxLQUFLLEdBQTZCO1lBQ3RDLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTtZQUNuQixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDM0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFPO1lBQ3ZCLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztZQUMzQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQWM7WUFDOUIsY0FBYyxFQUFFLE1BQU0sQ0FBQyxjQUFxQjtZQUM1QyxLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUssQ0FBQyxDQUFDLENBQUMsUUFBUSxDQUFDLE1BQU0sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUMsQ0FBQyxDQUFDLEVBQUU7WUFDckQsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1NBQzVCLENBQUM7UUFFRixnQkFBZ0I7UUFDaEIsTUFBTSxNQUFNLEdBQUcsTUFBTSx5REFBMEIsQ0FBQyxZQUFZLENBQUMsS0FBSyxDQUFDLENBQUM7UUFFcEUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDN0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDaEUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFO2dCQUNQLGNBQWMsRUFBRSxrQkFBa0I7Z0JBQ2xDLDZCQUE2QixFQUFFLEdBQUc7YUFDbkM7WUFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztnQkFDbkIsS0FBSyxFQUFFO29CQUNMLElBQUksRUFBRSxnQkFBZ0I7b0JBQ3RCLE9BQU8sRUFBRSxzQ0FBc0M7b0JBQy9DLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtpQkFDcEM7YUFDRixDQUFDO1NBQ0gsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFuRVcsUUFBQSxPQUFPLFdBbUVsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgTm90aWZpY2F0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAqIFxyXG4gKiBRdWVyeSBub3RpZmljYXRpb24gaGlzdG9yeSB3aXRoIGZpbHRlcnMgYW5kIHBhZ2luYXRpb24uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBnZXRVc2VyRnJvbUNvbnRleHQgfSBmcm9tICcuLi8uLi91dGlscy9hdXRoLXV0aWwnO1xyXG5pbXBvcnQgeyBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1oaXN0b3J5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25IaXN0b3J5UXVlcnkgfSBmcm9tICcuLi8uLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR2V0IG5vdGlmaWNhdGlvbiBoaXN0b3J5IHJlcXVlc3QnLCB7IHBhdGg6IGV2ZW50LnBhdGggfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHVzZXIgZnJvbSByZXF1ZXN0IGNvbnRleHQgKHBvcHVsYXRlZCBieSBMYW1iZGEgQXV0aG9yaXplcilcclxuICAgIGNvbnN0IHVzZXIgPSBnZXRVc2VyRnJvbUNvbnRleHQoZXZlbnQpO1xyXG5cclxuICAgIGlmICghdXNlci51c2VySWQpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDEsXHJcbiAgICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAgICdBY2Nlc3MtQ29udHJvbC1BbGxvdy1PcmlnaW4nOiAnKicsXHJcbiAgICAgICAgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgICBlcnJvcjoge1xyXG4gICAgICAgICAgICBjb2RlOiAnVU5BVVRIT1JJWkVEJyxcclxuICAgICAgICAgICAgbWVzc2FnZTogJ1VzZXIgY29udGV4dCBub3QgZm91bmQnLFxyXG4gICAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRXh0cmFjdCBxdWVyeSBwYXJhbWV0ZXJzXHJcbiAgICBjb25zdCBwYXJhbXMgPSBldmVudC5xdWVyeVN0cmluZ1BhcmFtZXRlcnMgfHwge307XHJcblxyXG4gICAgLy8gQnVpbGQgcXVlcnkgb2JqZWN0IC0gdXNlIGF1dGhlbnRpY2F0ZWQgdXNlcidzIHVzZXJJZFxyXG4gICAgY29uc3QgcXVlcnk6IE5vdGlmaWNhdGlvbkhpc3RvcnlRdWVyeSA9IHtcclxuICAgICAgdXNlcklkOiB1c2VyLnVzZXJJZCxcclxuICAgICAgc3RhcnREYXRlOiBwYXJhbXMuc3RhcnREYXRlLFxyXG4gICAgICBlbmREYXRlOiBwYXJhbXMuZW5kRGF0ZSxcclxuICAgICAgZXZlbnRUeXBlOiBwYXJhbXMuZXZlbnRUeXBlLFxyXG4gICAgICBjaGFubmVsOiBwYXJhbXMuY2hhbm5lbCBhcyBhbnksXHJcbiAgICAgIGRlbGl2ZXJ5U3RhdHVzOiBwYXJhbXMuZGVsaXZlcnlTdGF0dXMgYXMgYW55LFxyXG4gICAgICBsaW1pdDogcGFyYW1zLmxpbWl0ID8gcGFyc2VJbnQocGFyYW1zLmxpbWl0LCAxMCkgOiA1MCxcclxuICAgICAgbmV4dFRva2VuOiBwYXJhbXMubmV4dFRva2VuLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBRdWVyeSBoaXN0b3J5XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZS5xdWVyeUhpc3RvcnkocXVlcnkpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzdWx0KSxcclxuICAgIH07XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHF1ZXJ5aW5nIG5vdGlmaWNhdGlvbiBoaXN0b3J5JywgeyBlcnJvciB9KTtcclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDUwMCxcclxuICAgICAgaGVhZGVyczoge1xyXG4gICAgICAgICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicsXHJcbiAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgfSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoe1xyXG4gICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICBjb2RlOiAnSU5URVJOQUxfRVJST1InLFxyXG4gICAgICAgICAgbWVzc2FnZTogJ0ZhaWxlZCB0byBxdWVyeSBub3RpZmljYXRpb24gaGlzdG9yeScsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=