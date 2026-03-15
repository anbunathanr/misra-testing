/**
 * Event Flow Validator Service
 * 
 * Validates event propagation and handling through EventBridge and SQS.
 * Ensures events are published, routed, delivered, and processed correctly
 * across system boundaries.
 */

import {
  PublicationValidationResult,
  RoutingValidationResult,
  DeliveryValidationResult,
  OrderingValidationResult,
  EventTrace,
  EventTraceStep,
  OrderViolation,
} from '../types';

interface Event {
  eventId: string;
  eventType: string;
  source: string;
  detail: Record<string, any>;
  timestamp?: string;
}

interface EventBridgeEvent {
  id: string;
  source: string;
  'detail-type': string;
  detail: Record<string, any>;
  time: string;
}

interface SQSMessage {
  MessageId: string;
  Body: string;
  ReceiptHandle: string;
  Attributes?: Record<string, string>;
}

export class EventFlowValidator {
  private publishedEvents: Map<string, EventBridgeEvent> = new Map();
  private routedEvents: Map<string, { queue: string; timestamp: Date }> = new Map();
  private deliveredEvents: Map<string, { attempts: number; timestamp: Date }> = new Map();
  private eventTimeline: Map<string, EventTraceStep[]> = new Map();

  /**
   * Validate that an event was successfully published to EventBridge
   */
  async validateEventPublication(event: Event): Promise<PublicationValidationResult> {
    const startTime = Date.now();

    try {
      // In a real implementation, this would query EventBridge or CloudWatch Logs
      // For integration tests, we track published events in memory
      const publishedEvent = this.publishedEvents.get(event.eventId);

      if (!publishedEvent) {
        return {
          published: false,
          timestamp: new Date().toISOString(),
          error: `Event ${event.eventId} not found in EventBridge`,
        };
      }

      // Record trace step
      this.recordTraceStep(event.eventId, {
        component: 'EventBridge',
        action: 'publish',
        timestamp: publishedEvent.time,
        duration: 0,
        status: 'success',
        details: { source: publishedEvent.source, detailType: publishedEvent['detail-type'] },
      });

      return {
        published: true,
        eventBridgeEventId: publishedEvent.id,
        timestamp: publishedEvent.time,
      };
    } catch (error) {
      return {
        published: false,
        timestamp: new Date().toISOString(),
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate that an event was correctly routed to the target queue or Lambda
   */
  async validateEventRouting(event: Event): Promise<RoutingValidationResult> {
    const startTime = Date.now();

    try {
      // Check if event was routed
      const routing = this.routedEvents.get(event.eventId);

      if (!routing) {
        return {
          routed: false,
          routingDelay: Date.now() - startTime,
          error: `Event ${event.eventId} was not routed to any target`,
        };
      }

      // Calculate routing delay
      const publishedEvent = this.publishedEvents.get(event.eventId);
      const routingDelay = publishedEvent
        ? routing.timestamp.getTime() - new Date(publishedEvent.time).getTime()
        : 0;

      // Record trace step
      this.recordTraceStep(event.eventId, {
        component: 'EventBridge',
        action: 'route',
        timestamp: routing.timestamp.toISOString(),
        duration: routingDelay,
        status: 'success',
        details: { targetQueue: routing.queue },
      });

      // Determine target type
      const isQueue = routing.queue.includes('sqs');
      const isLambda = routing.queue.includes('lambda');

      return {
        routed: true,
        targetQueue: isQueue ? routing.queue : undefined,
        targetLambda: isLambda ? routing.queue : undefined,
        routingDelay,
      };
    } catch (error) {
      return {
        routed: false,
        routingDelay: Date.now() - startTime,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate that an event was delivered and processed
   */
  async validateEventDelivery(event: Event): Promise<DeliveryValidationResult> {
    const startTime = Date.now();

    try {
      // Check if event was delivered
      const delivery = this.deliveredEvents.get(event.eventId);

      if (!delivery) {
        return {
          delivered: false,
          deliveryAttempts: 0,
          deliveryDelay: Date.now() - startTime,
          processed: false,
          error: `Event ${event.eventId} was not delivered`,
        };
      }

      // Calculate delivery delay
      const routing = this.routedEvents.get(event.eventId);
      const deliveryDelay = routing
        ? delivery.timestamp.getTime() - routing.timestamp.getTime()
        : 0;

      // Record trace step
      this.recordTraceStep(event.eventId, {
        component: 'Consumer',
        action: 'process',
        timestamp: delivery.timestamp.toISOString(),
        duration: deliveryDelay,
        status: 'success',
        details: { attempts: delivery.attempts },
      });

      return {
        delivered: true,
        deliveryAttempts: delivery.attempts,
        deliveryDelay,
        processed: true,
      };
    } catch (error) {
      return {
        delivered: false,
        deliveryAttempts: 0,
        deliveryDelay: Date.now() - startTime,
        processed: false,
        error: error instanceof Error ? error.message : 'Unknown error',
      };
    }
  }

  /**
   * Validate that events are processed in the expected order
   */
  async validateEventOrdering(events: Event[]): Promise<OrderingValidationResult> {
    try {
      const expectedOrder = events.map((e) => e.eventId);
      const actualOrder: string[] = [];
      const violations: OrderViolation[] = [];

      // Get actual processing order from delivered events
      const deliveredEntries = Array.from(this.deliveredEvents.entries())
        .filter(([eventId]) => expectedOrder.includes(eventId))
        .sort(([, a], [, b]) => a.timestamp.getTime() - b.timestamp.getTime());

      for (const [eventId] of deliveredEntries) {
        actualOrder.push(eventId);
      }

      // Check for ordering violations
      for (let i = 0; i < expectedOrder.length; i++) {
        const expectedEventId = expectedOrder[i];
        const actualIndex = actualOrder.indexOf(expectedEventId);

        if (actualIndex !== -1 && actualIndex !== i) {
          violations.push({
            expectedIndex: i,
            actualIndex,
            eventId: expectedEventId,
          });
        }
      }

      return {
        ordered: violations.length === 0,
        expectedOrder,
        actualOrder,
        violations,
      };
    } catch (error) {
      return {
        ordered: false,
        expectedOrder: events.map((e) => e.eventId),
        actualOrder: [],
        violations: [],
      };
    }
  }

  /**
   * Trace the complete flow of an event through all systems
   */
  async traceEventFlow(eventId: string): Promise<EventTrace> {
    const timeline = this.eventTimeline.get(eventId) || [];

    // Calculate total duration
    const totalDuration =
      timeline.length > 0
        ? new Date(timeline[timeline.length - 1].timestamp).getTime() -
          new Date(timeline[0].timestamp).getTime()
        : 0;

    return {
      eventId,
      timeline,
      totalDuration,
    };
  }

  /**
   * Simulate event publication (for testing)
   */
  simulateEventPublication(event: Event): void {
    const eventBridgeEvent: EventBridgeEvent = {
      id: event.eventId,
      source: event.source,
      'detail-type': event.eventType,
      detail: event.detail,
      time: event.timestamp || new Date().toISOString(),
    };

    this.publishedEvents.set(event.eventId, eventBridgeEvent);
  }

  /**
   * Simulate event routing (for testing)
   */
  simulateEventRouting(eventId: string, targetQueue: string): void {
    this.routedEvents.set(eventId, {
      queue: targetQueue,
      timestamp: new Date(),
    });
  }

  /**
   * Simulate event delivery (for testing)
   */
  simulateEventDelivery(eventId: string, attempts: number = 1): void {
    this.deliveredEvents.set(eventId, {
      attempts,
      timestamp: new Date(),
    });
  }

  /**
   * Record a trace step for an event
   */
  private recordTraceStep(eventId: string, step: EventTraceStep): void {
    const timeline = this.eventTimeline.get(eventId) || [];
    timeline.push(step);
    this.eventTimeline.set(eventId, timeline);
  }

  /**
   * Reset all tracked events (for testing)
   */
  reset(): void {
    this.publishedEvents.clear();
    this.routedEvents.clear();
    this.deliveredEvents.clear();
    this.eventTimeline.clear();
  }

  /**
   * Get all published events (for testing/debugging)
   */
  getPublishedEvents(): EventBridgeEvent[] {
    return Array.from(this.publishedEvents.values());
  }

  /**
   * Get all routed events (for testing/debugging)
   */
  getRoutedEvents(): Array<{ eventId: string; queue: string; timestamp: Date }> {
    return Array.from(this.routedEvents.entries()).map(([eventId, routing]) => ({
      eventId,
      queue: routing.queue,
      timestamp: routing.timestamp,
    }));
  }

  /**
   * Get all delivered events (for testing/debugging)
   */
  getDeliveredEvents(): Array<{ eventId: string; attempts: number; timestamp: Date }> {
    return Array.from(this.deliveredEvents.entries()).map(([eventId, delivery]) => ({
      eventId,
      attempts: delivery.attempts,
      timestamp: delivery.timestamp,
    }));
  }
}
