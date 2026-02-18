"use strict";
/**
 * Update Notification Template Lambda
 *
 * Update existing notification template (admin only).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const notification_template_service_1 = require("../../services/notification-template-service");
const handler = async (event) => {
    console.log('Update template request', { path: event.path });
    try {
        // TODO: Add admin role check from JWT token
        // For now, assuming authorized
        // Extract templateId from path parameters
        const templateId = event.pathParameters?.templateId;
        if (!templateId) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'templateId is required' }),
            };
        }
        // Parse request body
        if (!event.body) {
            return {
                statusCode: 400,
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ error: 'Request body is required' }),
            };
        }
        const updates = JSON.parse(event.body);
        // Update template (service handles validation)
        const updatedTemplate = await notification_template_service_1.notificationTemplateService.updateTemplate(templateId, updates);
        return {
            statusCode: 200,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(updatedTemplate),
        };
    }
    catch (error) {
        console.error('Error updating template', { error });
        const errorMessage = error instanceof Error ? error.message : 'Failed to update template';
        const statusCode = errorMessage.includes('Invalid') || errorMessage.includes('syntax') ? 400 : 500;
        return {
            statusCode,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ error: errorMessage }),
        };
    }
};
exports.handler = handler;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidXBkYXRlLXRlbXBsYXRlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsidXBkYXRlLXRlbXBsYXRlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7OztHQUlHOzs7QUFHSCxnR0FBMkY7QUFHcEYsTUFBTSxPQUFPLEdBQUcsS0FBSyxFQUFFLEtBQTJCLEVBQWtDLEVBQUU7SUFDM0YsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSSxFQUFFLENBQUMsQ0FBQztJQUU3RCxJQUFJLENBQUM7UUFDSCw0Q0FBNEM7UUFDNUMsK0JBQStCO1FBRS9CLDBDQUEwQztRQUMxQyxNQUFNLFVBQVUsR0FBRyxLQUFLLENBQUMsY0FBYyxFQUFFLFVBQVUsQ0FBQztRQUVwRCxJQUFJLENBQUMsVUFBVSxFQUFFLENBQUM7WUFDaEIsT0FBTztnQkFDTCxVQUFVLEVBQUUsR0FBRztnQkFDZixPQUFPLEVBQUUsRUFBRSxjQUFjLEVBQUUsa0JBQWtCLEVBQUU7Z0JBQy9DLElBQUksRUFBRSxJQUFJLENBQUMsU0FBUyxDQUFDLEVBQUUsS0FBSyxFQUFFLHdCQUF3QixFQUFFLENBQUM7YUFDMUQsQ0FBQztRQUNKLENBQUM7UUFFRCxxQkFBcUI7UUFDckIsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLEVBQUUsQ0FBQztZQUNoQixPQUFPO2dCQUNMLFVBQVUsRUFBRSxHQUFHO2dCQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtnQkFDL0MsSUFBSSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsRUFBRSxLQUFLLEVBQUUsMEJBQTBCLEVBQUUsQ0FBQzthQUM1RCxDQUFDO1FBQ0osQ0FBQztRQUVELE1BQU0sT0FBTyxHQUFHLElBQUksQ0FBQyxLQUFLLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBa0MsQ0FBQztRQUV4RSwrQ0FBK0M7UUFDL0MsTUFBTSxlQUFlLEdBQUcsTUFBTSwyREFBMkIsQ0FBQyxjQUFjLENBQUMsVUFBVSxFQUFFLE9BQU8sQ0FBQyxDQUFDO1FBRTlGLE9BQU87WUFDTCxVQUFVLEVBQUUsR0FBRztZQUNmLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxlQUFlLENBQUM7U0FDdEMsQ0FBQztJQUNKLENBQUM7SUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1FBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx5QkFBeUIsRUFBRSxFQUFFLEtBQUssRUFBRSxDQUFDLENBQUM7UUFFcEQsTUFBTSxZQUFZLEdBQUcsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsMkJBQTJCLENBQUM7UUFDMUYsTUFBTSxVQUFVLEdBQUcsWUFBWSxDQUFDLFFBQVEsQ0FBQyxTQUFTLENBQUMsSUFBSSxZQUFZLENBQUMsUUFBUSxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUMsQ0FBQyxHQUFHLENBQUMsQ0FBQyxDQUFDLEdBQUcsQ0FBQztRQUVuRyxPQUFPO1lBQ0wsVUFBVTtZQUNWLE9BQU8sRUFBRSxFQUFFLGNBQWMsRUFBRSxrQkFBa0IsRUFBRTtZQUMvQyxJQUFJLEVBQUUsSUFBSSxDQUFDLFNBQVMsQ0FBQyxFQUFFLEtBQUssRUFBRSxZQUFZLEVBQUUsQ0FBQztTQUM5QyxDQUFDO0lBQ0osQ0FBQztBQUNILENBQUMsQ0FBQztBQWpEVyxRQUFBLE9BQU8sV0FpRGxCIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFVwZGF0ZSBOb3RpZmljYXRpb24gVGVtcGxhdGUgTGFtYmRhXHJcbiAqIFxyXG4gKiBVcGRhdGUgZXhpc3Rpbmcgbm90aWZpY2F0aW9uIHRlbXBsYXRlIChhZG1pbiBvbmx5KS5cclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IG5vdGlmaWNhdGlvblRlbXBsYXRlU2VydmljZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL25vdGlmaWNhdGlvbi10ZW1wbGF0ZS1zZXJ2aWNlJztcclxuaW1wb3J0IHsgTm90aWZpY2F0aW9uVGVtcGxhdGUgfSBmcm9tICcuLi8uLi90eXBlcy9ub3RpZmljYXRpb24nO1xyXG5cclxuZXhwb3J0IGNvbnN0IGhhbmRsZXIgPSBhc3luYyAoZXZlbnQ6IEFQSUdhdGV3YXlQcm94eUV2ZW50KTogUHJvbWlzZTxBUElHYXRld2F5UHJveHlSZXN1bHQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnVXBkYXRlIHRlbXBsYXRlIHJlcXVlc3QnLCB7IHBhdGg6IGV2ZW50LnBhdGggfSk7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBUT0RPOiBBZGQgYWRtaW4gcm9sZSBjaGVjayBmcm9tIEpXVCB0b2tlblxyXG4gICAgLy8gRm9yIG5vdywgYXNzdW1pbmcgYXV0aG9yaXplZFxyXG5cclxuICAgIC8vIEV4dHJhY3QgdGVtcGxhdGVJZCBmcm9tIHBhdGggcGFyYW1ldGVyc1xyXG4gICAgY29uc3QgdGVtcGxhdGVJZCA9IGV2ZW50LnBhdGhQYXJhbWV0ZXJzPy50ZW1wbGF0ZUlkO1xyXG5cclxuICAgIGlmICghdGVtcGxhdGVJZCkge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHN0YXR1c0NvZGU6IDQwMCxcclxuICAgICAgICBoZWFkZXJzOiB7ICdDb250ZW50LVR5cGUnOiAnYXBwbGljYXRpb24vanNvbicgfSxcclxuICAgICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiAndGVtcGxhdGVJZCBpcyByZXF1aXJlZCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgcmVxdWVzdCBib2R5XHJcbiAgICBpZiAoIWV2ZW50LmJvZHkpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXNDb2RlOiA0MDAsXHJcbiAgICAgICAgaGVhZGVyczogeyAnQ29udGVudC1UeXBlJzogJ2FwcGxpY2F0aW9uL2pzb24nIH0sXHJcbiAgICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkoeyBlcnJvcjogJ1JlcXVlc3QgYm9keSBpcyByZXF1aXJlZCcgfSksXHJcbiAgICAgIH07XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgdXBkYXRlcyA9IEpTT04ucGFyc2UoZXZlbnQuYm9keSkgYXMgUGFydGlhbDxOb3RpZmljYXRpb25UZW1wbGF0ZT47XHJcblxyXG4gICAgLy8gVXBkYXRlIHRlbXBsYXRlIChzZXJ2aWNlIGhhbmRsZXMgdmFsaWRhdGlvbilcclxuICAgIGNvbnN0IHVwZGF0ZWRUZW1wbGF0ZSA9IGF3YWl0IG5vdGlmaWNhdGlvblRlbXBsYXRlU2VydmljZS51cGRhdGVUZW1wbGF0ZSh0ZW1wbGF0ZUlkLCB1cGRhdGVzKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICBzdGF0dXNDb2RlOiAyMDAsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh1cGRhdGVkVGVtcGxhdGUpLFxyXG4gICAgfTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgdGVtcGxhdGUnLCB7IGVycm9yIH0pO1xyXG4gICAgXHJcbiAgICBjb25zdCBlcnJvck1lc3NhZ2UgPSBlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdGYWlsZWQgdG8gdXBkYXRlIHRlbXBsYXRlJztcclxuICAgIGNvbnN0IHN0YXR1c0NvZGUgPSBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ0ludmFsaWQnKSB8fCBlcnJvck1lc3NhZ2UuaW5jbHVkZXMoJ3N5bnRheCcpID8gNDAwIDogNTAwO1xyXG5cclxuICAgIHJldHVybiB7XHJcbiAgICAgIHN0YXR1c0NvZGUsXHJcbiAgICAgIGhlYWRlcnM6IHsgJ0NvbnRlbnQtVHlwZSc6ICdhcHBsaWNhdGlvbi9qc29uJyB9LFxyXG4gICAgICBib2R5OiBKU09OLnN0cmluZ2lmeSh7IGVycm9yOiBlcnJvck1lc3NhZ2UgfSksXHJcbiAgICB9O1xyXG4gIH1cclxufTtcclxuIl19