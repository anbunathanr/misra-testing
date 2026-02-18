"use strict";
/**
 * Get Notification History Lambda
 *
 * Query notification history with filters and pagination.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_history_service_1 = require("../../services/notification-history-service");
const handler = async (event) => {
    console.log('Get notification history request', { path: event.path });
    try {
        // Extract query parameters
        const params = event.queryStringParameters || {};
        // Build query object
        const query = {
            userId: params.userId,
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
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(result),
        };
    }
    catch (error) {
        console.error('Error querying notification history', { error });
        return {
            statusCode: 500,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: 'Failed to query notification history' }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZ2V0LWhpc3RvcnkuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJnZXQtaGlzdG9yeS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7R0FJRzs7O0FBR0gsOEZBQXlGO0FBR2xGLE1BQU0sT0FBTyxHQUFHLEtBQUssRUFBRSxLQUEyQixFQUFrQyxFQUFFO0lBQzNGLE9BQU8sQ0FBQyxHQUFHLENBQUMsa0NBQWtDLEVBQUUsRUFBRSxJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUksRUFBRSxDQUFDLENBQUM7SUFFdEUsSUFBSSxDQUFDO1FBQ0gsMkJBQTJCO1FBQzNCLE1BQU0sTUFBTSxHQUFHLEtBQUssQ0FBQyxxQkFBcUIsSUFBSSxFQUFFLENBQUM7UUFFakQscUJBQXFCO1FBQ3JCLE1BQU0sS0FBSyxHQUE2QjtZQUN0QyxNQUFNLEVBQUUsTUFBTSxDQUFDLE1BQU07WUFDckIsU0FBUyxFQUFFLE1BQU0sQ0FBQyxTQUFTO1lBQzNCLE9BQU8sRUFBRSxNQUFNLENBQUMsT0FBTztZQUN2QixTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7WUFDM0IsT0FBTyxFQUFFLE1BQU0sQ0FBQyxPQUFjO1lBQzlCLGNBQWMsRUFBRSxNQUFNLENBQUMsY0FBcUI7WUFDNUMsS0FBSyxFQUFFLE1BQU0sQ0FBQyxLQUFLLENBQUMsQ0FBQyxDQUFDLFFBQVEsQ0FBQyxNQUFNLENBQUMsS0FBSyxFQUFFLEVBQUUsQ0FBQyxDQUFDLENBQUMsQ0FBQyxFQUFFO1lBQ3JELFNBQVMsRUFBRSxNQUFNLENBQUMsU0FBUztTQUM1QixDQUFDO1FBRUYsZ0JBQWdCO1FBQ2hCLE1BQU0sTUFBTSxHQUFHLE1BQU0seURBQTBCLENBQUMsWUFBWSxDQUFDLEtBQUssQ0FBQyxDQUFDO1FBRXBFLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxNQUFNLENBQUM7U0FDN0IsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyxxQ0FBcUMsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFDaEUsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLEVBQUUsY0FBYyxFQUFFLGtCQUFrQixFQUFFO1lBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHNDQUFzQyxFQUFFLENBQUM7U0FDeEUsQ0FBQztJQUNKLENBQUM7QUFDSCxDQUFDLENBQUM7QUFuQ1csUUFBQSxPQUFPLFdBbUNsQiIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBHZXQgTm90aWZpY2F0aW9uIEhpc3RvcnkgTGFtYmRhXHJcbiAqIFxyXG4gKiBRdWVyeSBub3RpZmljYXRpb24gaGlzdG9yeSB3aXRoIGZpbHRlcnMgYW5kIHBhZ2luYXRpb24uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQVBJR2F0ZXdheVByb3h5RXZlbnQsIEFQSUdhdGV3YXlQcm94eVJlc3VsdCB9IGZyb20gJ2F3cy1sYW1iZGEnO1xyXG5pbXBvcnQgeyBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1oaXN0b3J5LXNlcnZpY2UnO1xyXG5pbXBvcnQgeyBOb3RpZmljYXRpb25IaXN0b3J5UXVlcnkgfSBmcm9tICcuLi8uLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnR2V0IG5vdGlmaWNhdGlvbiBoaXN0b3J5IHJlcXVlc3QnLCB7IHBhdGg6IGV2ZW50LnBhdGggfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBFeHRyYWN0IHF1ZXJ5IHBhcmFtZXRlcnNcclxuICAgIGNvbnN0IHBhcmFtcyA9IGV2ZW50LnF1ZXJ5U3RyaW5nUGFyYW1ldGVycyB8fCB7fTtcclxuXHJcbiAgICAvLyBCdWlsZCBxdWVyeSBvYmplY3RcclxuICAgIGNvbnN0IHF1ZXJ5OiBOb3RpZmljYXRpb25IaXN0b3J5UXVlcnkgPSB7XHJcbiAgICAgIHVzZXJJZDogcGFyYW1zLnVzZXJJZCxcclxuICAgICAgc3RhcnREYXRlOiBwYXJhbXMuc3RhcnREYXRlLFxyXG4gICAgICBlbmREYXRlOiBwYXJhbXMuZW5kRGF0ZSxcclxuICAgICAgZXZlbnRUeXBlOiBwYXJhbXMuZXZlbnRUeXBlLFxyXG4gICAgICBjaGFubmVsOiBwYXJhbXMuY2hhbm5lbCBhcyBhbnksXHJcbiAgICAgIGRlbGl2ZXJ5U3RhdHVzOiBwYXJhbXMuZGVsaXZlcnlTdGF0dXMgYXMgYW55LFxyXG4gICAgICBsaW1pdDogcGFyYW1zLmxpbWl0ID8gcGFyc2VJbnQocGFyYW1zLmxpbWl0LCAxMCkgOiA1MCxcclxuICAgICAgbmV4dFRva2VuOiBwYXJhbXMubmV4dFRva2VuLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBRdWVyeSBoaXN0b3J5XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBub3RpZmljYXRpb25IaXN0b3J5U2VydmljZS5xdWVyeUhpc3RvcnkocXVlcnkpO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGU6IDIwMCxcclxuICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgIGJvZHk6IEpTT04uc3RyaW5naWZ5KHJlc3VsdCksXHJcbiAgICB9O1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBxdWVyeWluZyBub3RpZmljYXRpb24gaGlzdG9yeScsIHsgZXJyb3IgfSk7XHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAnRmFpbGVkIHRvIHF1ZXJ5IG5vdGlmaWNhdGlvbiBoaXN0b3J5JyB9KSxcclxuICAgIH07XHJcbiAgfVxyXG59O1xyXG4iXX0=