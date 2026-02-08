"use strict";
/**
 * Lambda function for sending notifications
 * Handles analysis completion, failures, and system alerts
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_service_1 = require("../../services/notification-service");
const region = process.env.AWS_REGION || 'us-east-1';
const notificationService = new notification_service_1.NotificationService(region);
const handler = async (event) => {
    console.log('Notification event received:', JSON.stringify(event, null, 2));
    try {
        const result = await notificationService.sendNotification({
            userId: event.userId,
            type: event.type,
            title: event.title,
            message: event.message,
            data: event.data,
            email: event.email,
            phoneNumber: event.phoneNumber
        });
        if (result.success) {
            console.log(`Notification sent successfully. Message ID: ${result.messageId}`);
            return {
                statusCode: 200,
                message: 'Notification sent successfully',
                messageId: result.messageId
            };
        }
        else {
            console.error(`Notification failed: ${result.error}`);
            return {
                statusCode: 500,
                message: 'Notification failed',
                error: result.error
            };
        }
    }
    catch (error) {
        console.error('Error sending notification:', error);
        return {
            statusCode: 500,
            message: 'Failed to send notification',
            error: error instanceof Error ? error.message : 'Unknown error'
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VuZC1ub3RpZmljYXRpb24uanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJzZW5kLW5vdGlmaWNhdGlvbi50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7OztHQUdHOzs7QUFFSCw4RUFBNEY7QUFFNUYsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0sbUJBQW1CLEdBQUcsSUFBSSwwQ0FBbUIsQ0FBQyxNQUFNLENBQUMsQ0FBQztBQVlyRCxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBd0IsRUFBRSxFQUFFO0lBQ3hELE9BQU8sQ0FBQyxHQUFHLENBQUMsOEJBQThCLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxLQUFLLEVBQUUsSUFBSSxFQUFFLENBQUMsQ0FBQyxDQUFDLENBQUM7SUFFNUUsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsTUFBTSxtQkFBbUIsQ0FBQyxnQkFBZ0IsQ0FBQztZQUN4RCxNQUFNLEVBQUUsS0FBSyxDQUFDLE1BQU07WUFDcEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixPQUFPLEVBQUUsS0FBSyxDQUFDLE9BQU87WUFDdEIsSUFBSSxFQUFFLEtBQUssQ0FBQyxJQUFJO1lBQ2hCLEtBQUssRUFBRSxLQUFLLENBQUMsS0FBSztZQUNsQixXQUFXLEVBQUUsS0FBSyxDQUFDLFdBQVc7U0FDL0IsQ0FBQyxDQUFDO1FBRUgsSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbkIsT0FBTyxDQUFDLEdBQUcsQ0FBQywrQ0FBK0MsTUFBTSxDQUFDLFNBQVMsRUFBRSxDQUFDLENBQUM7WUFDL0UsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsZ0NBQWdDO2dCQUN6QyxTQUFTLEVBQUUsTUFBTSxDQUFDLFNBQVM7YUFDNUIsQ0FBQztRQUNKLENBQUM7YUFBTSxDQUFDO1lBQ04sT0FBTyxDQUFDLEtBQUssQ0FBQyx3QkFBd0IsTUFBTSxDQUFDLEtBQUssRUFBRSxDQUFDLENBQUM7WUFDdEQsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUscUJBQXFCO2dCQUM5QixLQUFLLEVBQUUsTUFBTSxDQUFDLEtBQUs7YUFDcEIsQ0FBQztRQUNKLENBQUM7SUFDSCxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsNkJBQTZCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDcEQsT0FBTztZQUNMLFVBQVUsRUFBRSxHQUFHO1lBQ2YsT0FBTyxFQUFFLDZCQUE2QjtZQUN0QyxLQUFLLEVBQUUsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZTtTQUNoRSxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQXJDVyxRQUFBLE9BQU8sV0FxQ2xCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIExhbWJkYSBmdW5jdGlvbiBmb3Igc2VuZGluZyBub3RpZmljYXRpb25zXHJcbiAqIEhhbmRsZXMgYW5hbHlzaXMgY29tcGxldGlvbiwgZmFpbHVyZXMsIGFuZCBzeXN0ZW0gYWxlcnRzXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uU2VydmljZSwgTm90aWZpY2F0aW9uVHlwZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi1zZXJ2aWNlJztcclxuXHJcbmNvbnN0IHJlZ2lvbiA9IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMSc7XHJcbmNvbnN0IG5vdGlmaWNhdGlvblNlcnZpY2UgPSBuZXcgTm90aWZpY2F0aW9uU2VydmljZShyZWdpb24pO1xyXG5cclxuaW50ZXJmYWNlIE5vdGlmaWNhdGlvbkV2ZW50IHtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICB0eXBlOiBOb3RpZmljYXRpb25UeXBlO1xyXG4gIHRpdGxlOiBzdHJpbmc7XHJcbiAgbWVzc2FnZTogc3RyaW5nO1xyXG4gIGRhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+O1xyXG4gIGVtYWlsPzogc3RyaW5nO1xyXG4gIHBob25lTnVtYmVyPzogc3RyaW5nO1xyXG59XHJcblxyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogTm90aWZpY2F0aW9uRXZlbnQpID0+IHtcclxuICBjb25zb2xlLmxvZygnTm90aWZpY2F0aW9uIGV2ZW50IHJlY2VpdmVkOicsIEpTT04uc3RyaW5naWZ5KGV2ZW50LCBudWxsLCAyKSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBub3RpZmljYXRpb25TZXJ2aWNlLnNlbmROb3RpZmljYXRpb24oe1xyXG4gICAgICB1c2VySWQ6IGV2ZW50LnVzZXJJZCxcclxuICAgICAgdHlwZTogZXZlbnQudHlwZSxcclxuICAgICAgdGl0bGU6IGV2ZW50LnRpdGxlLFxyXG4gICAgICBtZXNzYWdlOiBldmVudC5tZXNzYWdlLFxyXG4gICAgICBkYXRhOiBldmVudC5kYXRhLFxyXG4gICAgICBlbWFpbDogZXZlbnQuZW1haWwsXHJcbiAgICAgIHBob25lTnVtYmVyOiBldmVudC5waG9uZU51bWJlclxyXG4gICAgfSk7XHJcblxyXG4gICAgaWYgKHJlc3VsdC5zdWNjZXNzKSB7XHJcbiAgICAgIGNvbnNvbGUubG9nKGBOb3RpZmljYXRpb24gc2VudCBzdWNjZXNzZnVsbHkuIE1lc3NhZ2UgSUQ6ICR7cmVzdWx0Lm1lc3NhZ2VJZH1gKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgICAgbWVzc2FnZTogJ05vdGlmaWNhdGlvbiBzZW50IHN1Y2Nlc3NmdWxseScsXHJcbiAgICAgICAgbWVzc2FnZUlkOiByZXN1bHQubWVzc2FnZUlkXHJcbiAgICAgIH07XHJcbiAgICB9IGVsc2Uge1xyXG4gICAgICBjb25zb2xlLmVycm9yKGBOb3RpZmljYXRpb24gZmFpbGVkOiAke3Jlc3VsdC5lcnJvcn1gKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA1MDAsXHJcbiAgICAgICAgbWVzc2FnZTogJ05vdGlmaWNhdGlvbiBmYWlsZWQnLFxyXG4gICAgICAgIGVycm9yOiByZXN1bHQuZXJyb3JcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc2VuZGluZyBub3RpZmljYXRpb246JywgZXJyb3IpO1xyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZTogNTAwLFxyXG4gICAgICBtZXNzYWdlOiAnRmFpbGVkIHRvIHNlbmQgbm90aWZpY2F0aW9uJyxcclxuICAgICAgZXJyb3I6IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19