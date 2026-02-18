"use strict";
/**
 * Event Publisher Service
 *
 * Publishes events to AWS EventBridge for notification system integration.
 * Handles test execution completion events and routes them to the notification queue.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.eventPublisherService = exports.EventPublisherService = void 0;
const client_eventbridge_1 = require("@aws-sdk/client-eventbridge");
class EventPublisherService {
    eventBridgeClient;
    EVENT_BUS_NAME = 'default'; // Use default event bus
    SOURCE = 'aibts.test-execution';
    constructor() {
        this.eventBridgeClient = new client_eventbridge_1.EventBridgeClient({
            region: process.env.AWS_REGION || 'us-east-1',
        });
    }
    /**
     * Publish test execution completion event to EventBridge
     *
     * @param execution - Test execution record
     * @returns Event ID if successful
     */
    async publishTestCompletionEvent(execution) {
        try {
            // Determine event type based on execution result
            const eventType = this.determineEventType(execution);
            // Create event detail
            const eventDetail = {
                eventType,
                eventId: execution.executionId,
                timestamp: new Date().toISOString(),
                payload: {
                    executionId: execution.executionId,
                    testCaseId: execution.testCaseId,
                    testSuiteId: execution.suiteExecutionId,
                    projectId: execution.projectId,
                    status: execution.status,
                    result: execution.result,
                    duration: execution.duration,
                    errorMessage: execution.errorMessage,
                    screenshots: execution.screenshots,
                    triggeredBy: execution.metadata.triggeredBy,
                },
            };
            return await this.publishEvent(eventDetail);
        }
        catch (error) {
            console.error('Error publishing test completion event', {
                executionId: execution.executionId,
                error,
            });
            return undefined;
        }
    }
    /**
     * Publish generic event to EventBridge
     *
     * @param eventDetail - Event detail object
     * @returns Event ID if successful
     */
    async publishEvent(eventDetail) {
        try {
            // Prepare EventBridge put events command
            const input = {
                Entries: [
                    {
                        Source: this.SOURCE,
                        DetailType: 'Test Execution Completed',
                        Detail: JSON.stringify(eventDetail),
                        EventBusName: this.EVENT_BUS_NAME,
                    },
                ],
            };
            const command = new client_eventbridge_1.PutEventsCommand(input);
            const response = await this.eventBridgeClient.send(command);
            // Check if event was successfully published
            if (response.FailedEntryCount && response.FailedEntryCount > 0) {
                console.error('Failed to publish event to EventBridge', {
                    failedEntries: response.Entries,
                });
                return undefined;
            }
            const eventId = response.Entries?.[0]?.EventId;
            console.log('Successfully published event to EventBridge', {
                eventId,
                eventType: eventDetail.eventType,
            });
            return eventId;
        }
        catch (error) {
            console.error('Error publishing event to EventBridge', {
                eventDetail,
                error,
            });
            // Don't throw - event publishing failure shouldn't fail the operation
            return undefined;
        }
    }
    /**
     * Determine event type based on execution result
     *
     * @param execution - Test execution record
     * @returns Event type for notification system
     */
    determineEventType(execution) {
        // Check for critical failures (error status or multiple consecutive failures)
        if (execution.status === 'error' || execution.result === 'error') {
            return 'critical_alert';
        }
        // Check for test failure
        if (execution.result === 'fail') {
            return 'test_failure';
        }
        // Default to test completion
        return 'test_completion';
    }
}
exports.EventPublisherService = EventPublisherService;
// Export singleton instance
exports.eventPublisherService = new EventPublisherService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXZlbnQtcHVibGlzaGVyLXNlcnZpY2UuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJldmVudC1wdWJsaXNoZXItc2VydmljZS50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiO0FBQUE7Ozs7O0dBS0c7OztBQUVILG9FQUF5RztBQUd6RyxNQUFhLHFCQUFxQjtJQUN4QixpQkFBaUIsQ0FBb0I7SUFDNUIsY0FBYyxHQUFHLFNBQVMsQ0FBQyxDQUFDLHdCQUF3QjtJQUNwRCxNQUFNLEdBQUcsc0JBQXNCLENBQUM7SUFFakQ7UUFDRSxJQUFJLENBQUMsaUJBQWlCLEdBQUcsSUFBSSxzQ0FBaUIsQ0FBQztZQUM3QyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztTQUM5QyxDQUFDLENBQUM7SUFDTCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSCxLQUFLLENBQUMsMEJBQTBCLENBQUMsU0FBd0I7UUFDdkQsSUFBSSxDQUFDO1lBQ0gsaURBQWlEO1lBQ2pELE1BQU0sU0FBUyxHQUFHLElBQUksQ0FBQyxrQkFBa0IsQ0FBQyxTQUFTLENBQUMsQ0FBQztZQUVyRCxzQkFBc0I7WUFDdEIsTUFBTSxXQUFXLEdBQUc7Z0JBQ2xCLFNBQVM7Z0JBQ1QsT0FBTyxFQUFFLFNBQVMsQ0FBQyxXQUFXO2dCQUM5QixTQUFTLEVBQUUsSUFBSSxJQUFJLEVBQUUsQ0FBQyxXQUFXLEVBQUU7Z0JBQ25DLE9BQU8sRUFBRTtvQkFDUCxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVc7b0JBQ2xDLFVBQVUsRUFBRSxTQUFTLENBQUMsVUFBVTtvQkFDaEMsV0FBVyxFQUFFLFNBQVMsQ0FBQyxnQkFBZ0I7b0JBQ3ZDLFNBQVMsRUFBRSxTQUFTLENBQUMsU0FBUztvQkFDOUIsTUFBTSxFQUFFLFNBQVMsQ0FBQyxNQUFNO29CQUN4QixNQUFNLEVBQUUsU0FBUyxDQUFDLE1BQU07b0JBQ3hCLFFBQVEsRUFBRSxTQUFTLENBQUMsUUFBUTtvQkFDNUIsWUFBWSxFQUFFLFNBQVMsQ0FBQyxZQUFZO29CQUNwQyxXQUFXLEVBQUUsU0FBUyxDQUFDLFdBQVc7b0JBQ2xDLFdBQVcsRUFBRSxTQUFTLENBQUMsUUFBUSxDQUFDLFdBQVc7aUJBQzVDO2FBQ0YsQ0FBQztZQUVGLE9BQU8sTUFBTSxJQUFJLENBQUMsWUFBWSxDQUFDLFdBQVcsQ0FBQyxDQUFDO1FBQzlDLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx3Q0FBd0MsRUFBRTtnQkFDdEQsV0FBVyxFQUFFLFNBQVMsQ0FBQyxXQUFXO2dCQUNsQyxLQUFLO2FBQ04sQ0FBQyxDQUFDO1lBQ0gsT0FBTyxTQUFTLENBQUM7UUFDbkIsQ0FBQztJQUNILENBQUM7SUFFRDs7Ozs7T0FLRztJQUNILEtBQUssQ0FBQyxZQUFZLENBQUMsV0FBZ0I7UUFDakMsSUFBSSxDQUFDO1lBQ0gseUNBQXlDO1lBQ3pDLE1BQU0sS0FBSyxHQUEwQjtnQkFDbkMsT0FBTyxFQUFFO29CQUNQO3dCQUNFLE1BQU0sRUFBRSxJQUFJLENBQUMsTUFBTTt3QkFDbkIsVUFBVSxFQUFFLDBCQUEwQjt3QkFDdEMsTUFBTSxFQUFFLElBQUksQ0FBQyxTQUFTLENBQUMsV0FBVyxDQUFDO3dCQUNuQyxZQUFZLEVBQUUsSUFBSSxDQUFDLGNBQWM7cUJBQ2xDO2lCQUNGO2FBQ0YsQ0FBQztZQUVGLE1BQU0sT0FBTyxHQUFHLElBQUkscUNBQWdCLENBQUMsS0FBSyxDQUFDLENBQUM7WUFDNUMsTUFBTSxRQUFRLEdBQUcsTUFBTSxJQUFJLENBQUMsaUJBQWlCLENBQUMsSUFBSSxDQUFDLE9BQU8sQ0FBQyxDQUFDO1lBRTVELDRDQUE0QztZQUM1QyxJQUFJLFFBQVEsQ0FBQyxnQkFBZ0IsSUFBSSxRQUFRLENBQUMsZ0JBQWdCLEdBQUcsQ0FBQyxFQUFFLENBQUM7Z0JBQy9ELE9BQU8sQ0FBQyxLQUFLLENBQUMsd0NBQXdDLEVBQUU7b0JBQ3RELGFBQWEsRUFBRSxRQUFRLENBQUMsT0FBTztpQkFDaEMsQ0FBQyxDQUFDO2dCQUNILE9BQU8sU0FBUyxDQUFDO1lBQ25CLENBQUM7WUFFRCxNQUFNLE9BQU8sR0FBRyxRQUFRLENBQUMsT0FBTyxFQUFFLENBQUMsQ0FBQyxDQUFDLEVBQUUsT0FBTyxDQUFDO1lBQy9DLE9BQU8sQ0FBQyxHQUFHLENBQUMsNkNBQTZDLEVBQUU7Z0JBQ3pELE9BQU87Z0JBQ1AsU0FBUyxFQUFFLFdBQVcsQ0FBQyxTQUFTO2FBQ2pDLENBQUMsQ0FBQztZQUVILE9BQU8sT0FBTyxDQUFDO1FBQ2pCLENBQUM7UUFBQyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxDQUFDLEtBQUssQ0FBQyx1Q0FBdUMsRUFBRTtnQkFDckQsV0FBVztnQkFDWCxLQUFLO2FBQ04sQ0FBQyxDQUFDO1lBQ0gsc0VBQXNFO1lBQ3RFLE9BQU8sU0FBUyxDQUFDO1FBQ25CLENBQUM7SUFDSCxDQUFDO0lBRUQ7Ozs7O09BS0c7SUFDSyxrQkFBa0IsQ0FBQyxTQUF3QjtRQUNqRCw4RUFBOEU7UUFDOUUsSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sSUFBSSxTQUFTLENBQUMsTUFBTSxLQUFLLE9BQU8sRUFBRSxDQUFDO1lBQ2pFLE9BQU8sZ0JBQWdCLENBQUM7UUFDMUIsQ0FBQztRQUVELHlCQUF5QjtRQUN6QixJQUFJLFNBQVMsQ0FBQyxNQUFNLEtBQUssTUFBTSxFQUFFLENBQUM7WUFDaEMsT0FBTyxjQUFjLENBQUM7UUFDeEIsQ0FBQztRQUVELDZCQUE2QjtRQUM3QixPQUFPLGlCQUFpQixDQUFDO0lBQzNCLENBQUM7Q0FDRjtBQXZIRCxzREF1SEM7QUFFRCw0QkFBNEI7QUFDZixRQUFBLHFCQUFxQixHQUFHLElBQUkscUJBQXFCLEVBQUUsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBFdmVudCBQdWJsaXNoZXIgU2VydmljZVxyXG4gKiBcclxuICogUHVibGlzaGVzIGV2ZW50cyB0byBBV1MgRXZlbnRCcmlkZ2UgZm9yIG5vdGlmaWNhdGlvbiBzeXN0ZW0gaW50ZWdyYXRpb24uXHJcbiAqIEhhbmRsZXMgdGVzdCBleGVjdXRpb24gY29tcGxldGlvbiBldmVudHMgYW5kIHJvdXRlcyB0aGVtIHRvIHRoZSBub3RpZmljYXRpb24gcXVldWUuXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgRXZlbnRCcmlkZ2VDbGllbnQsIFB1dEV2ZW50c0NvbW1hbmQsIFB1dEV2ZW50c0NvbW1hbmRJbnB1dCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1ldmVudGJyaWRnZSc7XHJcbmltcG9ydCB7IFRlc3RFeGVjdXRpb24gfSBmcm9tICcuLi90eXBlcy90ZXN0LWV4ZWN1dGlvbic7XHJcblxyXG5leHBvcnQgY2xhc3MgRXZlbnRQdWJsaXNoZXJTZXJ2aWNlIHtcclxuICBwcml2YXRlIGV2ZW50QnJpZGdlQ2xpZW50OiBFdmVudEJyaWRnZUNsaWVudDtcclxuICBwcml2YXRlIHJlYWRvbmx5IEVWRU5UX0JVU19OQU1FID0gJ2RlZmF1bHQnOyAvLyBVc2UgZGVmYXVsdCBldmVudCBidXNcclxuICBwcml2YXRlIHJlYWRvbmx5IFNPVVJDRSA9ICdhaWJ0cy50ZXN0LWV4ZWN1dGlvbic7XHJcblxyXG4gIGNvbnN0cnVjdG9yKCkge1xyXG4gICAgdGhpcy5ldmVudEJyaWRnZUNsaWVudCA9IG5ldyBFdmVudEJyaWRnZUNsaWVudCh7XHJcbiAgICAgIHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyxcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHVibGlzaCB0ZXN0IGV4ZWN1dGlvbiBjb21wbGV0aW9uIGV2ZW50IHRvIEV2ZW50QnJpZGdlXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGV4ZWN1dGlvbiAtIFRlc3QgZXhlY3V0aW9uIHJlY29yZFxyXG4gICAqIEByZXR1cm5zIEV2ZW50IElEIGlmIHN1Y2Nlc3NmdWxcclxuICAgKi9cclxuICBhc3luYyBwdWJsaXNoVGVzdENvbXBsZXRpb25FdmVudChleGVjdXRpb246IFRlc3RFeGVjdXRpb24pOiBQcm9taXNlPHN0cmluZyB8IHVuZGVmaW5lZD4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gRGV0ZXJtaW5lIGV2ZW50IHR5cGUgYmFzZWQgb24gZXhlY3V0aW9uIHJlc3VsdFxyXG4gICAgICBjb25zdCBldmVudFR5cGUgPSB0aGlzLmRldGVybWluZUV2ZW50VHlwZShleGVjdXRpb24pO1xyXG5cclxuICAgICAgLy8gQ3JlYXRlIGV2ZW50IGRldGFpbFxyXG4gICAgICBjb25zdCBldmVudERldGFpbCA9IHtcclxuICAgICAgICBldmVudFR5cGUsXHJcbiAgICAgICAgZXZlbnRJZDogZXhlY3V0aW9uLmV4ZWN1dGlvbklkLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHBheWxvYWQ6IHtcclxuICAgICAgICAgIGV4ZWN1dGlvbklkOiBleGVjdXRpb24uZXhlY3V0aW9uSWQsXHJcbiAgICAgICAgICB0ZXN0Q2FzZUlkOiBleGVjdXRpb24udGVzdENhc2VJZCxcclxuICAgICAgICAgIHRlc3RTdWl0ZUlkOiBleGVjdXRpb24uc3VpdGVFeGVjdXRpb25JZCxcclxuICAgICAgICAgIHByb2plY3RJZDogZXhlY3V0aW9uLnByb2plY3RJZCxcclxuICAgICAgICAgIHN0YXR1czogZXhlY3V0aW9uLnN0YXR1cyxcclxuICAgICAgICAgIHJlc3VsdDogZXhlY3V0aW9uLnJlc3VsdCxcclxuICAgICAgICAgIGR1cmF0aW9uOiBleGVjdXRpb24uZHVyYXRpb24sXHJcbiAgICAgICAgICBlcnJvck1lc3NhZ2U6IGV4ZWN1dGlvbi5lcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgICBzY3JlZW5zaG90czogZXhlY3V0aW9uLnNjcmVlbnNob3RzLFxyXG4gICAgICAgICAgdHJpZ2dlcmVkQnk6IGV4ZWN1dGlvbi5tZXRhZGF0YS50cmlnZ2VyZWRCeSxcclxuICAgICAgICB9LFxyXG4gICAgICB9O1xyXG5cclxuICAgICAgcmV0dXJuIGF3YWl0IHRoaXMucHVibGlzaEV2ZW50KGV2ZW50RGV0YWlsKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHB1Ymxpc2hpbmcgdGVzdCBjb21wbGV0aW9uIGV2ZW50Jywge1xyXG4gICAgICAgIGV4ZWN1dGlvbklkOiBleGVjdXRpb24uZXhlY3V0aW9uSWQsXHJcbiAgICAgICAgZXJyb3IsXHJcbiAgICAgIH0pO1xyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUHVibGlzaCBnZW5lcmljIGV2ZW50IHRvIEV2ZW50QnJpZGdlXHJcbiAgICogXHJcbiAgICogQHBhcmFtIGV2ZW50RGV0YWlsIC0gRXZlbnQgZGV0YWlsIG9iamVjdFxyXG4gICAqIEByZXR1cm5zIEV2ZW50IElEIGlmIHN1Y2Nlc3NmdWxcclxuICAgKi9cclxuICBhc3luYyBwdWJsaXNoRXZlbnQoZXZlbnREZXRhaWw6IGFueSk6IFByb21pc2U8c3RyaW5nIHwgdW5kZWZpbmVkPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBQcmVwYXJlIEV2ZW50QnJpZGdlIHB1dCBldmVudHMgY29tbWFuZFxyXG4gICAgICBjb25zdCBpbnB1dDogUHV0RXZlbnRzQ29tbWFuZElucHV0ID0ge1xyXG4gICAgICAgIEVudHJpZXM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgU291cmNlOiB0aGlzLlNPVVJDRSxcclxuICAgICAgICAgICAgRGV0YWlsVHlwZTogJ1Rlc3QgRXhlY3V0aW9uIENvbXBsZXRlZCcsXHJcbiAgICAgICAgICAgIERldGFpbDogSlNPTi5zdHJpbmdpZnkoZXZlbnREZXRhaWwpLFxyXG4gICAgICAgICAgICBFdmVudEJ1c05hbWU6IHRoaXMuRVZFTlRfQlVTX05BTUUsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH07XHJcblxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IFB1dEV2ZW50c0NvbW1hbmQoaW5wdXQpO1xyXG4gICAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHRoaXMuZXZlbnRCcmlkZ2VDbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgICAgIC8vIENoZWNrIGlmIGV2ZW50IHdhcyBzdWNjZXNzZnVsbHkgcHVibGlzaGVkXHJcbiAgICAgIGlmIChyZXNwb25zZS5GYWlsZWRFbnRyeUNvdW50ICYmIHJlc3BvbnNlLkZhaWxlZEVudHJ5Q291bnQgPiAwKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHB1Ymxpc2ggZXZlbnQgdG8gRXZlbnRCcmlkZ2UnLCB7XHJcbiAgICAgICAgICBmYWlsZWRFbnRyaWVzOiByZXNwb25zZS5FbnRyaWVzLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICAgIHJldHVybiB1bmRlZmluZWQ7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IGV2ZW50SWQgPSByZXNwb25zZS5FbnRyaWVzPy5bMF0/LkV2ZW50SWQ7XHJcbiAgICAgIGNvbnNvbGUubG9nKCdTdWNjZXNzZnVsbHkgcHVibGlzaGVkIGV2ZW50IHRvIEV2ZW50QnJpZGdlJywge1xyXG4gICAgICAgIGV2ZW50SWQsXHJcbiAgICAgICAgZXZlbnRUeXBlOiBldmVudERldGFpbC5ldmVudFR5cGUsXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgcmV0dXJuIGV2ZW50SWQ7XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBjb25zb2xlLmVycm9yKCdFcnJvciBwdWJsaXNoaW5nIGV2ZW50IHRvIEV2ZW50QnJpZGdlJywge1xyXG4gICAgICAgIGV2ZW50RGV0YWlsLFxyXG4gICAgICAgIGVycm9yLFxyXG4gICAgICB9KTtcclxuICAgICAgLy8gRG9uJ3QgdGhyb3cgLSBldmVudCBwdWJsaXNoaW5nIGZhaWx1cmUgc2hvdWxkbid0IGZhaWwgdGhlIG9wZXJhdGlvblxyXG4gICAgICByZXR1cm4gdW5kZWZpbmVkO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lIGV2ZW50IHR5cGUgYmFzZWQgb24gZXhlY3V0aW9uIHJlc3VsdFxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSBleGVjdXRpb24gLSBUZXN0IGV4ZWN1dGlvbiByZWNvcmRcclxuICAgKiBAcmV0dXJucyBFdmVudCB0eXBlIGZvciBub3RpZmljYXRpb24gc3lzdGVtXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBkZXRlcm1pbmVFdmVudFR5cGUoZXhlY3V0aW9uOiBUZXN0RXhlY3V0aW9uKTogc3RyaW5nIHtcclxuICAgIC8vIENoZWNrIGZvciBjcml0aWNhbCBmYWlsdXJlcyAoZXJyb3Igc3RhdHVzIG9yIG11bHRpcGxlIGNvbnNlY3V0aXZlIGZhaWx1cmVzKVxyXG4gICAgaWYgKGV4ZWN1dGlvbi5zdGF0dXMgPT09ICdlcnJvcicgfHwgZXhlY3V0aW9uLnJlc3VsdCA9PT0gJ2Vycm9yJykge1xyXG4gICAgICByZXR1cm4gJ2NyaXRpY2FsX2FsZXJ0JztcclxuICAgIH1cclxuXHJcbiAgICAvLyBDaGVjayBmb3IgdGVzdCBmYWlsdXJlXHJcbiAgICBpZiAoZXhlY3V0aW9uLnJlc3VsdCA9PT0gJ2ZhaWwnKSB7XHJcbiAgICAgIHJldHVybiAndGVzdF9mYWlsdXJlJztcclxuICAgIH1cclxuXHJcbiAgICAvLyBEZWZhdWx0IHRvIHRlc3QgY29tcGxldGlvblxyXG4gICAgcmV0dXJuICd0ZXN0X2NvbXBsZXRpb24nO1xyXG4gIH1cclxufVxyXG5cclxuLy8gRXhwb3J0IHNpbmdsZXRvbiBpbnN0YW5jZVxyXG5leHBvcnQgY29uc3QgZXZlbnRQdWJsaXNoZXJTZXJ2aWNlID0gbmV3IEV2ZW50UHVibGlzaGVyU2VydmljZSgpO1xyXG4iXX0=