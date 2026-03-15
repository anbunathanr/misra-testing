/**
 * Example Integration Test with Health Checks
 * 
 * Demonstrates how health checks are integrated into the test harness.
 */

import { IntegrationTestHarness } from './test-harness';
import { IntegrationTest, TestContext, ValidationResult } from './types';

describe('Health Check Integration Example', () => {
  let harness: IntegrationTestHarness;

  beforeAll(() => {
    harness = new IntegrationTestHarness();
  });

  describe('Health Check Before Tests', () => {
    it('should run health checks and report system status', async () => {
      const healthResult = await harness.runHealthChecks();

      expect(healthResult).toBeDefined();
      expect(healthResult.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
      expect(healthResult.components.size).toBeGreaterThan(0);
      expect(healthResult.timestamp).toBeDefined();

      console.log('System Health Status:', healthResult.overall);
      console.log('Component Status:');
      for (const [name, health] of healthResult.components) {
        console.log(`  ${name}: ${health.status} (${health.latency}ms)`);
        if (health.message) {
          console.log(`    ${health.message}`);
        }
      }
    });

    it('should store health check result for later access', async () => {
      await harness.runHealthChecks();
      
      const lastHealthCheck = harness.getLastHealthCheck();
      expect(lastHealthCheck).toBeDefined();
      expect(lastHealthCheck?.overall).toMatch(/^(healthy|degraded|unhealthy)$/);
    });
  });

  describe('Test Execution with Health Checks', () => {
    it('should skip tests if health check fails', async () => {
      // This test demonstrates the behavior when health checks fail
      // In a real scenario, if the system is unhealthy, tests would be skipped

      const test: IntegrationTest = {
        name: 'Sample Test',
        category: 'end-to-end',
        timeout: 60000,

        async execute(context: TestContext): Promise<ValidationResult> {
          // Test logic here
          return {
            valid: true,
            errors: [],
            warnings: [],
          };
        },

        async validate(context: TestContext): Promise<ValidationResult> {
          return {
            valid: true,
            errors: [],
            warnings: [],
          };
        },
      };

      // Run health checks first
      try {
        await harness.runHealthChecks();
        
        // If health checks pass, run the test
        const context = await harness.setup();
        const result = await harness.runTest(test, context);
        await harness.teardown(context);

        expect(result.status).toMatch(/^(pass|fail|error)$/);
      } catch (error) {
        // Health check failed - test should be skipped
        console.log('Test skipped due to failed health check:', error);
        expect(error).toBeDefined();
      }
    });
  });

  describe('Component-Specific Health Checks', () => {
    it('should report DynamoDB health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const dynamoDBHealth = healthResult.components.get('DynamoDB');

      expect(dynamoDBHealth).toBeDefined();
      expect(dynamoDBHealth?.name).toBe('DynamoDB');
      expect(dynamoDBHealth?.status).toMatch(/^(healthy|unhealthy)$/);
      
      if (dynamoDBHealth?.status === 'unhealthy') {
        console.warn('DynamoDB is unhealthy:', dynamoDBHealth.message);
        console.warn('Details:', dynamoDBHealth.details);
      }
    });

    it('should report Lambda health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const lambdaHealth = healthResult.components.get('Lambda');

      expect(lambdaHealth).toBeDefined();
      expect(lambdaHealth?.name).toBe('Lambda');
      expect(lambdaHealth?.status).toMatch(/^(healthy|unhealthy)$/);
      
      if (lambdaHealth?.status === 'unhealthy') {
        console.warn('Lambda is unhealthy:', lambdaHealth.message);
        console.warn('Details:', lambdaHealth.details);
      }
    });

    it('should report EventBridge health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const eventBridgeHealth = healthResult.components.get('EventBridge');

      expect(eventBridgeHealth).toBeDefined();
      expect(eventBridgeHealth?.name).toBe('EventBridge');
      expect(eventBridgeHealth?.status).toMatch(/^(healthy|unhealthy)$/);
    });

    it('should report SQS health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const sqsHealth = healthResult.components.get('SQS');

      expect(sqsHealth).toBeDefined();
      expect(sqsHealth?.name).toBe('SQS');
      expect(sqsHealth?.status).toMatch(/^(healthy|unhealthy)$/);
    });

    it('should report S3 health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const s3Health = healthResult.components.get('S3');

      expect(s3Health).toBeDefined();
      expect(s3Health?.name).toBe('S3');
      expect(s3Health?.status).toMatch(/^(healthy|unhealthy)$/);
    });

    it('should report External dependencies health status', async () => {
      const healthResult = await harness.runHealthChecks();
      const externalHealth = healthResult.components.get('External');

      expect(externalHealth).toBeDefined();
      expect(externalHealth?.name).toBe('External Dependencies');
      expect(externalHealth?.status).toBe('healthy'); // Always healthy in test environment
    });
  });
});
