/**
 * Event Publisher Service
 * 
 * Publishes events to AWS EventBridge for notification system integration.
 * Handles test execution completion events and routes them to the notification queue.
 */

import { EventBridgeClient, PutEventsCommand, PutEventsCommandInput } from '@aws-sdk/client-eventbridge';
import { TestExecution } from '../types/test-execution';

export class EventPublisherService {
  private eventBridgeClient: EventBridgeClient;
  private readonly EVENT_BUS_NAME = 'default'; // Use default event bus
  private readonly SOURCE = 'aibts.test-execution';

  constructor() {
    this.eventBridgeClient = new EventBridgeClient({
      region: process.env.AWS_REGION || 'us-east-1',
    });
  }

  /**
   * Publish test execution completion event to EventBridge
   * 
   * @param execution - Test execution record
   * @returns Event ID if successful
   */
  async publishTestCompletionEvent(execution: TestExecution): Promise<string | undefined> {
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
    } catch (error) {
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
  async publishEvent(eventDetail: any): Promise<string | undefined> {
    try {
      // Prepare EventBridge put events command
      const input: PutEventsCommandInput = {
        Entries: [
          {
            Source: this.SOURCE,
            DetailType: 'Test Execution Completed',
            Detail: JSON.stringify(eventDetail),
            EventBusName: this.EVENT_BUS_NAME,
          },
        ],
      };

      const command = new PutEventsCommand(input);
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
    } catch (error) {
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
  private determineEventType(execution: TestExecution): string {
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

// Export singleton instance
export const eventPublisherService = new EventPublisherService();
