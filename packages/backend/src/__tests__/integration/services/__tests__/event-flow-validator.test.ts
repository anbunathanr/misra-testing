/**
 * Event Flow Validator Tests
 * 
 * Unit tests for the EventFlowValidator service.
 */

import { EventFlowValidator } from '../event-flow-validator';

describe('EventFlowValidator', () => {
  let validator: EventFlowValidator;

  beforeEach(() => {
    validator = new EventFlowValidator();
  });

  afterEach(() => {
    validator.reset();
  });

  describe('validateEventPublication', () => {
    it('should validate successfully published event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-123',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-123', status: 'completed' },
        timestamp: new Date().toISOString(),
      };

      validator.simulateEventPublication(event);

      // Act
      const result = await validator.validateEventPublication(event);

      // Assert
      expect(result.published).toBe(true);
      expect(result.eventBridgeEventId).toBe('evt-123');
      expect(result.timestamp).toBeDefined();
      expect(result.error).toBeUndefined();
    });

    it('should detect unpublished event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-456',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-456' },
      };

      // Act (don't simulate publication)
      const result = await validator.validateEventPublication(event);

      // Assert
      expect(result.published).toBe(false);
      expect(result.error).toContain('not found in EventBridge');
    });

    it('should record trace step for published event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-789',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-789' },
        timestamp: new Date().toISOString(),
      };

      validator.simulateEventPublication(event);

      // Act
      await validator.validateEventPublication(event);
      const trace = await validator.traceEventFlow('evt-789');

      // Assert
      expect(trace.timeline).toHaveLength(1);
      expect(trace.timeline[0].component).toBe('EventBridge');
      expect(trace.timeline[0].action).toBe('publish');
      expect(trace.timeline[0].status).toBe('success');
    });
  });

  describe('validateEventRouting', () => {
    it('should validate successfully routed event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-123',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-123' },
        timestamp: new Date().toISOString(),
      };

      validator.simulateEventPublication(event);
      validator.simulateEventRouting('evt-123', 'notification-queue-sqs');

      // Act
      const result = await validator.validateEventRouting(event);

      // Assert
      expect(result.routed).toBe(true);
      expect(result.targetQueue).toBe('notification-queue-sqs');
      expect(result.routingDelay).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should detect unrouted event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-456',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-456' },
      };

      // Act (don't simulate routing)
      const result = await validator.validateEventRouting(event);

      // Assert
      expect(result.routed).toBe(false);
      expect(result.error).toContain('was not routed');
    });

    it('should identify Lambda target', async () => {
      // Arrange
      const event = {
        eventId: 'evt-789',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-789' },
      };

      validator.simulateEventRouting('evt-789', 'notification-processor-lambda');

      // Act
      const result = await validator.validateEventRouting(event);

      // Assert
      expect(result.routed).toBe(true);
      expect(result.targetLambda).toBe('notification-processor-lambda');
      expect(result.targetQueue).toBeUndefined();
    });

    it('should calculate routing delay', async () => {
      // Arrange
      const event = {
        eventId: 'evt-delay',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-delay' },
        timestamp: new Date(Date.now() - 1000).toISOString(), // 1 second ago
      };

      validator.simulateEventPublication(event);
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      validator.simulateEventRouting('evt-delay', 'notification-queue-sqs');

      // Act
      const result = await validator.validateEventRouting(event);

      // Assert
      expect(result.routed).toBe(true);
      expect(result.routingDelay).toBeGreaterThan(0);
    });

    it('should record trace step for routed event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-trace',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-trace' },
      };

      validator.simulateEventRouting('evt-trace', 'notification-queue-sqs');

      // Act
      await validator.validateEventRouting(event);
      const trace = await validator.traceEventFlow('evt-trace');

      // Assert
      expect(trace.timeline).toHaveLength(1);
      expect(trace.timeline[0].component).toBe('EventBridge');
      expect(trace.timeline[0].action).toBe('route');
      expect(trace.timeline[0].status).toBe('success');
    });
  });

  describe('validateEventDelivery', () => {
    it('should validate successfully delivered event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-123',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-123' },
      };

      validator.simulateEventRouting('evt-123', 'notification-queue-sqs');
      validator.simulateEventDelivery('evt-123', 1);

      // Act
      const result = await validator.validateEventDelivery(event);

      // Assert
      expect(result.delivered).toBe(true);
      expect(result.deliveryAttempts).toBe(1);
      expect(result.processed).toBe(true);
      expect(result.deliveryDelay).toBeGreaterThanOrEqual(0);
      expect(result.error).toBeUndefined();
    });

    it('should detect undelivered event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-456',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-456' },
      };

      // Act (don't simulate delivery)
      const result = await validator.validateEventDelivery(event);

      // Assert
      expect(result.delivered).toBe(false);
      expect(result.deliveryAttempts).toBe(0);
      expect(result.processed).toBe(false);
      expect(result.error).toContain('was not delivered');
    });

    it('should track multiple delivery attempts', async () => {
      // Arrange
      const event = {
        eventId: 'evt-retry',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-retry' },
      };

      validator.simulateEventDelivery('evt-retry', 3);

      // Act
      const result = await validator.validateEventDelivery(event);

      // Assert
      expect(result.delivered).toBe(true);
      expect(result.deliveryAttempts).toBe(3);
    });

    it('should calculate delivery delay', async () => {
      // Arrange
      const event = {
        eventId: 'evt-delay',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-delay' },
      };

      validator.simulateEventRouting('evt-delay', 'notification-queue-sqs');
      await new Promise((resolve) => setTimeout(resolve, 100)); // Wait 100ms
      validator.simulateEventDelivery('evt-delay', 1);

      // Act
      const result = await validator.validateEventDelivery(event);

      // Assert
      expect(result.delivered).toBe(true);
      expect(result.deliveryDelay).toBeGreaterThan(0);
    });

    it('should record trace step for delivered event', async () => {
      // Arrange
      const event = {
        eventId: 'evt-trace',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-trace' },
      };

      validator.simulateEventDelivery('evt-trace', 1);

      // Act
      await validator.validateEventDelivery(event);
      const trace = await validator.traceEventFlow('evt-trace');

      // Assert
      expect(trace.timeline).toHaveLength(1);
      expect(trace.timeline[0].component).toBe('Consumer');
      expect(trace.timeline[0].action).toBe('process');
      expect(trace.timeline[0].status).toBe('success');
    });
  });

  describe('validateEventOrdering', () => {
    it('should validate correct event ordering', async () => {
      // Arrange
      const events = [
        { eventId: 'evt-1', eventType: 'test.started', source: 'test', detail: {} },
        { eventId: 'evt-2', eventType: 'test.running', source: 'test', detail: {} },
        { eventId: 'evt-3', eventType: 'test.completed', source: 'test', detail: {} },
      ];

      // Simulate delivery in correct order
      for (const event of events) {
        await new Promise((resolve) => setTimeout(resolve, 10));
        validator.simulateEventDelivery(event.eventId, 1);
      }

      // Act
      const result = await validator.validateEventOrdering(events);

      // Assert
      expect(result.ordered).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.expectedOrder).toEqual(['evt-1', 'evt-2', 'evt-3']);
      expect(result.actualOrder).toEqual(['evt-1', 'evt-2', 'evt-3']);
    });

    it('should detect ordering violations', async () => {
      // Arrange
      const events = [
        { eventId: 'evt-1', eventType: 'test.started', source: 'test', detail: {} },
        { eventId: 'evt-2', eventType: 'test.running', source: 'test', detail: {} },
        { eventId: 'evt-3', eventType: 'test.completed', source: 'test', detail: {} },
      ];

      // Simulate delivery in wrong order (3, 1, 2)
      validator.simulateEventDelivery('evt-3', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      validator.simulateEventDelivery('evt-1', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      validator.simulateEventDelivery('evt-2', 1);

      // Act
      const result = await validator.validateEventOrdering(events);

      // Assert
      expect(result.ordered).toBe(false);
      expect(result.violations.length).toBeGreaterThan(0);
      expect(result.expectedOrder).toEqual(['evt-1', 'evt-2', 'evt-3']);
      expect(result.actualOrder).toEqual(['evt-3', 'evt-1', 'evt-2']);
    });

    it('should identify specific ordering violations', async () => {
      // Arrange
      const events = [
        { eventId: 'evt-1', eventType: 'test.started', source: 'test', detail: {} },
        { eventId: 'evt-2', eventType: 'test.running', source: 'test', detail: {} },
      ];

      // Simulate delivery in reverse order
      validator.simulateEventDelivery('evt-2', 1);
      await new Promise((resolve) => setTimeout(resolve, 10));
      validator.simulateEventDelivery('evt-1', 1);

      // Act
      const result = await validator.validateEventOrdering(events);

      // Assert
      expect(result.ordered).toBe(false);
      expect(result.violations).toHaveLength(2);
      expect(result.violations[0]).toEqual({
        expectedIndex: 0,
        actualIndex: 1,
        eventId: 'evt-1',
      });
      expect(result.violations[1]).toEqual({
        expectedIndex: 1,
        actualIndex: 0,
        eventId: 'evt-2',
      });
    });

    it('should handle empty event list', async () => {
      // Act
      const result = await validator.validateEventOrdering([]);

      // Assert
      expect(result.ordered).toBe(true);
      expect(result.violations).toHaveLength(0);
      expect(result.expectedOrder).toEqual([]);
      expect(result.actualOrder).toEqual([]);
    });
  });

  describe('traceEventFlow', () => {
    it('should trace complete event flow', async () => {
      // Arrange
      const event = {
        eventId: 'evt-trace',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-trace' },
        timestamp: new Date().toISOString(),
      };

      validator.simulateEventPublication(event);
      await validator.validateEventPublication(event);

      validator.simulateEventRouting('evt-trace', 'notification-queue-sqs');
      await validator.validateEventRouting(event);

      validator.simulateEventDelivery('evt-trace', 1);
      await validator.validateEventDelivery(event);

      // Act
      const trace = await validator.traceEventFlow('evt-trace');

      // Assert
      expect(trace.eventId).toBe('evt-trace');
      expect(trace.timeline).toHaveLength(3);
      expect(trace.timeline[0].component).toBe('EventBridge');
      expect(trace.timeline[0].action).toBe('publish');
      expect(trace.timeline[1].component).toBe('EventBridge');
      expect(trace.timeline[1].action).toBe('route');
      expect(trace.timeline[2].component).toBe('Consumer');
      expect(trace.timeline[2].action).toBe('process');
      expect(trace.totalDuration).toBeGreaterThanOrEqual(0);
    });

    it('should return empty trace for unknown event', async () => {
      // Act
      const trace = await validator.traceEventFlow('unknown-event');

      // Assert
      expect(trace.eventId).toBe('unknown-event');
      expect(trace.timeline).toHaveLength(0);
      expect(trace.totalDuration).toBe(0);
    });

    it('should calculate total duration correctly', async () => {
      // Arrange
      const event = {
        eventId: 'evt-duration',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-duration' },
        timestamp: new Date().toISOString(),
      };

      validator.simulateEventPublication(event);
      await validator.validateEventPublication(event);

      await new Promise((resolve) => setTimeout(resolve, 100));

      validator.simulateEventDelivery('evt-duration', 1);
      await validator.validateEventDelivery(event);

      // Act
      const trace = await validator.traceEventFlow('evt-duration');

      // Assert
      expect(trace.totalDuration).toBeGreaterThan(0);
    });
  });

  describe('reset', () => {
    it('should clear all tracked events', async () => {
      // Arrange
      const event = {
        eventId: 'evt-reset',
        eventType: 'test.execution.completed',
        source: 'test-execution',
        detail: { executionId: 'exec-reset' },
      };

      validator.simulateEventPublication(event);
      validator.simulateEventRouting('evt-reset', 'notification-queue-sqs');
      validator.simulateEventDelivery('evt-reset', 1);

      // Act
      validator.reset();

      // Assert
      expect(validator.getPublishedEvents()).toHaveLength(0);
      expect(validator.getRoutedEvents()).toHaveLength(0);
      expect(validator.getDeliveredEvents()).toHaveLength(0);
    });
  });

  describe('helper methods', () => {
    it('should get all published events', () => {
      // Arrange
      const event1 = {
        eventId: 'evt-1',
        eventType: 'test.started',
        source: 'test',
        detail: {},
      };
      const event2 = {
        eventId: 'evt-2',
        eventType: 'test.completed',
        source: 'test',
        detail: {},
      };

      validator.simulateEventPublication(event1);
      validator.simulateEventPublication(event2);

      // Act
      const published = validator.getPublishedEvents();

      // Assert
      expect(published).toHaveLength(2);
      expect(published.map((e) => e.id)).toContain('evt-1');
      expect(published.map((e) => e.id)).toContain('evt-2');
    });

    it('should get all routed events', () => {
      // Arrange
      validator.simulateEventRouting('evt-1', 'queue-1');
      validator.simulateEventRouting('evt-2', 'queue-2');

      // Act
      const routed = validator.getRoutedEvents();

      // Assert
      expect(routed).toHaveLength(2);
      expect(routed.map((e) => e.eventId)).toContain('evt-1');
      expect(routed.map((e) => e.eventId)).toContain('evt-2');
    });

    it('should get all delivered events', () => {
      // Arrange
      validator.simulateEventDelivery('evt-1', 1);
      validator.simulateEventDelivery('evt-2', 3);

      // Act
      const delivered = validator.getDeliveredEvents();

      // Assert
      expect(delivered).toHaveLength(2);
      expect(delivered.find((e) => e.eventId === 'evt-1')?.attempts).toBe(1);
      expect(delivered.find((e) => e.eventId === 'evt-2')?.attempts).toBe(3);
    });
  });
});
