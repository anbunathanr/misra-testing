/**
 * Event Publisher Service
 *
 * Publishes events to AWS EventBridge for notification system integration.
 * Handles test execution completion events and routes them to the notification queue.
 */
import { TestExecution } from '../types/test-execution';
export declare class EventPublisherService {
    private eventBridgeClient;
    private readonly EVENT_BUS_NAME;
    private readonly SOURCE;
    constructor();
    /**
     * Publish test execution completion event to EventBridge
     *
     * @param execution - Test execution record
     * @returns Event ID if successful
     */
    publishTestCompletionEvent(execution: TestExecution): Promise<string | undefined>;
    /**
     * Publish generic event to EventBridge
     *
     * @param eventDetail - Event detail object
     * @returns Event ID if successful
     */
    publishEvent(eventDetail: any): Promise<string | undefined>;
    /**
     * Determine event type based on execution result
     *
     * @param execution - Test execution record
     * @returns Event type for notification system
     */
    private determineEventType;
}
export declare const eventPublisherService: EventPublisherService;
