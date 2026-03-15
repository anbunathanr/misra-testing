/**
 * Tests for System Health Check Service
 */

import { SystemHealthCheckService } from '../health-check-service';

describe('SystemHealthCheckService', () => {
  let healthCheckService: SystemHealthCheckService;

  beforeEach(() => {
    healthCheckService = new SystemHealthCheckService('us-east-1');
  });

  describe('checkAll', () => {
    it('should return health check result with all components', async () => {
      const result = await healthCheckService.checkAll();

      expect(result).toBeDefined();
      expect(result.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(result.components).toBeInstanceOf(Map);
      expect(result.timestamp).toBeDefined();
      expect(result.components.size).toBeGreaterThan(0);
    });

    it('should check all required components', async () => {
      const result = await healthCheckService.checkAll();

      expect(result.components.has('DynamoDB')).toBe(true);
      expect(result.components.has('Lambda')).toBe(true);
      expect(result.components.has('EventBridge')).toBe(true);
      expect(result.components.has('SQS')).toBe(true);
      expect(result.components.has('S3')).toBe(true);
      expect(result.components.has('External')).toBe(true);
    });

    it('should include latency measurements', async () => {
      const result = await healthCheckService.checkAll();

      for (const [name, health] of result.components) {
        expect(health.latency).toBeDefined();
        expect(health.latency).toBeGreaterThanOrEqual(0);
      }
    });
  });

  describe('checkDynamoDB', () => {
    it('should check DynamoDB table accessibility', async () => {
      const result = await healthCheckService.checkDynamoDB();

      expect(result.name).toBe('DynamoDB');
      expect(result.status).toMatch(/^(healthy|unhealthy)$/);
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('should check all required tables', async () => {
      const result = await healthCheckService.checkDynamoDB();

      const expectedTables = [
        'TestCases',
        'TestSuites',
        'TestExecutions',
        'AIUsage',
        'AILearning',
        'misra-platform-notification-preferences-dev',
        'misra-platform-notification-templates-dev',
        'misra-platform-notification-history-dev',
      ];

      for (const table of expectedTables) {
        expect(result.details).toHaveProperty(table);
      }
    });
  });

  describe('checkLambdaFunctions', () => {
    it('should check Lambda function deployment', async () => {
      const result = await healthCheckService.checkLambdaFunctions();

      expect(result.name).toBe('Lambda');
      expect(result.status).toMatch(/^(healthy|unhealthy)$/);
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });

  describe('checkEventBridge', () => {
    it('should check EventBridge rule activation', async () => {
      const result = await healthCheckService.checkEventBridge();

      expect(result.name).toBe('EventBridge');
      expect(result.status).toMatch(/^(healthy|unhealthy)$/);
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });

  describe('checkSQS', () => {
    it('should check SQS queue availability', async () => {
      const result = await healthCheckService.checkSQS();

      expect(result.name).toBe('SQS');
      expect(result.status).toMatch(/^(healthy|unhealthy)$/);
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });

  describe('checkS3', () => {
    it('should check S3 bucket existence and permissions', async () => {
      const result = await healthCheckService.checkS3();

      expect(result.name).toBe('S3');
      expect(result.status).toMatch(/^(healthy|unhealthy)$/);
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });
  });

  describe('checkExternalDependencies', () => {
    it('should check external dependency reachability', async () => {
      const result = await healthCheckService.checkExternalDependencies();

      expect(result.name).toBe('External Dependencies');
      expect(result.status).toBe('healthy'); // Always healthy in test environment (mocked)
      expect(result.message).toBeDefined();
      expect(result.details).toBeDefined();
    });

    it('should verify mock services are available', async () => {
      const result = await healthCheckService.checkExternalDependencies();

      expect(result.details).toHaveProperty('openAI');
      expect(result.details).toHaveProperty('sns');
      expect(result.details).toHaveProperty('browser');
    });
  });

  describe('overall health determination', () => {
    it('should return healthy when all components are healthy', async () => {
      // This test will depend on actual AWS resources being available
      const result = await healthCheckService.checkAll();

      if (Array.from(result.components.values()).every(c => c.status === 'healthy')) {
        expect(result.overall).toBe('healthy');
      }
    });

    it('should return degraded when 1-2 components are unhealthy', async () => {
      const result = await healthCheckService.checkAll();

      const unhealthyCount = Array.from(result.components.values()).filter(
        c => c.status === 'unhealthy'
      ).length;

      if (unhealthyCount > 0 && unhealthyCount <= 2) {
        expect(result.overall).toBe('degraded');
      }
    });

    it('should return unhealthy when 3+ components are unhealthy', async () => {
      const result = await healthCheckService.checkAll();

      const unhealthyCount = Array.from(result.components.values()).filter(
        c => c.status === 'unhealthy'
      ).length;

      if (unhealthyCount > 2) {
        expect(result.overall).toBe('unhealthy');
      }
    });
  });
});
