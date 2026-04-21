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
        const user = await (0, auth_util_1.getUserFromContext)(event);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBR0gscURBQTJEO0FBQzNELDhGQUF5RjtBQUdsRixNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBMkIsRUFBa0MsRUFBRTtJQUMzRixPQUFPLENBQUMsR0FBRyxDQUFDLGtDQUFrQyxFQUFFLEVBQUUsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQyxDQUFDO0lBRXRFLElBQUksQ0FBQztRQUNILHFFQUFxRTtRQUNyRSxNQUFNLElBQUksR0FBRyxNQUFNLElBQUEsOEJBQWtCLEVBQUMsS0FBSyxDQUFDLENBQUM7UUFFN0MsSUFBSSxDQUFDLElBQUksQ0FBQyxNQUFNLEVBQUUsQ0FBQztZQUNqQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRTtvQkFDUCxjQUFjLEVBQUUsa0JBQWtCO29CQUNsQyw2QkFBNkIsRUFBRSxHQUFHO2lCQUNuQztnQkFDRCxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQztvQkFDbkIsS0FBSyxFQUFFO3dCQUNMLElBQUksRUFBRSxjQUFjO3dCQUNwQixPQUFPLEVBQUUsd0JBQXdCO3dCQUNqQyxTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7cUJBQ3BDO2lCQUNGLENBQUM7YUFDSCxDQUFDO1FBQ0osQ0FBQztRQUVELDJCQUEyQjtRQUMzQixNQUFNLE1BQU0sR0FBRyxLQUFLLENBQUMscUJBQXFCLElBQUksRUFBRSxDQUFDO1FBRWpELHVEQUF1RDtRQUN2RCxNQUFNLEtBQUssR0FBNkI7WUFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxNQUFNO1lBQ25CLFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztZQUMzQixPQUFPLEVBQUUsTUFBTSxDQUFDLE9BQU87WUFDdkIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQzNCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBYztZQUM5QixjQUFjLEVBQUUsTUFBTSxDQUFDLGNBQXFCO1lBQzVDLEtBQUssRUFBRSxNQUFNLENBQUMsS0FBSyxDQUFDLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUMsRUFBRTtZQUNyRCxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7U0FDNUIsQ0FBQztRQUVGLGdCQUFnQjtRQUNoQixNQUFNLE1BQU0sR0FBRyxNQUFNLHlEQUEwQixDQUFDLFlBQVksQ0FBQyxLQUFLLENBQUMsQ0FBQztRQUVwRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLE1BQU0sQ0FBQztTQUM3QixDQUFDO0lBQ0osQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLHFDQUFxQyxFQUFFLEVBQUUsS0FBSyxFQUFFLENBQUMsQ0FBQztRQUNoRSxPQUFPO1lBQ0wsVUFBVSxFQUFFLEdBQUc7WUFDZixPQUFPLEVBQUU7Z0JBQ1AsY0FBYyxFQUFFLGtCQUFrQjtnQkFDbEMsNkJBQTZCLEVBQUUsR0FBRzthQUNuQztZQUNELElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDO2dCQUNuQixLQUFLLEVBQUU7b0JBQ0wsSUFBSSxFQUFFLGdCQUFnQjtvQkFDdEIsT0FBTyxFQUFFLHNDQUFzQztvQkFDL0MsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO2lCQUNwQzthQUNGLENBQUM7U0FDSCxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQW5FVyxRQUFBLE9BQU8sV0FtRWxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEdldCBOb3RpZmljYXRpb24gSGlzdG9yeSBMYW1iZGFcclxuICogXHJcbiAqIFF1ZXJ5IG5vdGlmaWNhdGlvbiBoaXN0b3J5IHdpdGggZmlsdGVycyBhbmQgcGFnaW5hdGlvbi5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IGdldFVzZXJGcm9tQ29udGV4dCB9IGZyb20gJy4uLy4uL3V0aWxzL2F1dGgtdXRpbCc7XHJcbmltcG9ydCB7IG5vdGlmaWNhdGlvbkhpc3RvcnlTZXJ2aWNlIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbm90aWZpY2F0aW9uLWhpc3Rvcnktc2VydmljZSc7XHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvbkhpc3RvcnlRdWVyeSB9IGZyb20gJy4uLy4uL3R5cGVzL25vdGlmaWNhdGlvbic7XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogQVBJR2F0ZXdheVByb3h5RXZlbnQpOiBQcm9taXNlPEFQSUdhdGV3YXlQcm94eVJlc3VsdD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdHZXQgbm90aWZpY2F0aW9uIGhpc3RvcnkgcmVxdWVzdCcsIHsgcGF0aDogZXZlbnQucGF0aCB9KTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIC8vIEV4dHJhY3QgdXNlciBmcm9tIHJlcXVlc3QgY29udGV4dCAocG9wdWxhdGVkIGJ5IExhbWJkYSBBdXRob3JpemVyKVxyXG4gICAgY29uc3QgdXNlciA9IGF3YWl0IGdldFVzZXJGcm9tQ29udGV4dChldmVudCk7XHJcblxyXG4gICAgaWYgKCF1c2VyLnVzZXJJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMSxcclxuICAgICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgICAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nLFxyXG4gICAgICAgICAgJ0FjY2Vzcy1Db250cm9sLUFsbG93LU9yaWdpbic6ICcqJyxcclxuICAgICAgICB9LFxyXG4gICAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHtcclxuICAgICAgICAgIGVycm9yOiB7XHJcbiAgICAgICAgICAgIGNvZGU6ICdVTkFVVEhPUklaRUQnLFxyXG4gICAgICAgICAgICBtZXNzYWdlOiAnVXNlciBjb250ZXh0IG5vdCBmb3VuZCcsXHJcbiAgICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9KSxcclxuICAgICAgfTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBFeHRyYWN0IHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IHBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuXHJcbiAgICAvLyBCdWlsZCBxdWVyeSBvYmplY3QgLSB1c2UgYXV0aGVudGljYXRlZCB1c2VyJ3MgdXNlcklkXHJcbiAgICBjb25zdCBxdWVyeTogTm90aWZpY2F0aW9uSGlzdG9yeVF1ZXJ5ID0ge1xyXG4gICAgICB1c2VySWQ6IHVzZXIudXNlcklkLFxyXG4gICAgICBzdGFydERhdGU6IHBhcmFtcy5zdGFydERhdGUsXHJcbiAgICAgIGVuZERhdGU6IHBhcmFtcy5lbmREYXRlLFxyXG4gICAgICBldmVudFR5cGU6IHBhcmFtcy5ldmVudFR5cGUsXHJcbiAgICAgIGNoYW5uZWw6IHBhcmFtcy5jaGFubmVsIGFzIGFueSxcclxuICAgICAgZGVsaXZlcnlTdGF0dXM6IHBhcmFtcy5kZWxpdmVyeVN0YXR1cyBhcyBhbnksXHJcbiAgICAgIGxpbWl0OiBwYXJhbXMubGltaXQgPyBwYXJzZUludChwYXJhbXMubGltaXQsIDEwKSA6IDUwLFxyXG4gICAgICBuZXh0VG9rZW46IHBhcmFtcy5uZXh0VG9rZW4sXHJcbiAgICB9O1xyXG5cclxuICAgIC8vIFF1ZXJ5IGhpc3RvcnlcclxuICAgIGNvbnN0IHJlc3VsdCA9IGF3YWl0IG5vdGlmaWNhdGlvbkhpc3RvcnlTZXJ2aWNlLnF1ZXJ5SGlzdG9yeShxdWVyeSk7XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogMjAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeShyZXN1bHQpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgcXVlcnlpbmcgbm90aWZpY2F0aW9uIGhpc3RvcnknLCB7IGVycm9yIH0pO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBoZWFkZXJzOiB7XHJcbiAgICAgICAgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyxcclxuICAgICAgICAnQWNjZXNzLUNvbnRyb2wtQWxsb3ctT3JpZ2luJzogJyonLFxyXG4gICAgICB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7XHJcbiAgICAgICAgZXJyb3I6IHtcclxuICAgICAgICAgIGNvZGU6ICdJTlRFUk5BTF9FUlJPUicsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHF1ZXJ5IG5vdGlmaWNhdGlvbiBoaXN0b3J5JyxcclxuICAgICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0pLFxyXG4gICAgfTtcclxuICB9XHJcbn07XHJcbiJdfQ==