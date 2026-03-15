/**
 * Integration Test Configuration
 * 
 * Configuration for integration test environment and behavior.
 */

/**
 * Integration test environment configuration
 */
export const integrationTestConfig = {
  // AWS Configuration
  aws: {
    region: process.env.AWS_REGION || 'us-east-1',
    useRealAWS: process.env.USE_REAL_AWS === 'true',
  },

  // Test Timeouts
  timeouts: {
    default: 60000, // 60 seconds
    longRunning: 300000, // 5 minutes
    performance: 120000, // 2 minutes
  },

  // Test Data
  testData: {
    cleanupOnSuccess: true,
    cleanupOnFailure: true,
    tagPrefix: 'integration-test',
  },

  // Mock Services
  mocks: {
    openAI: {
      defaultLatency: 100,
      defaultFailureRate: 0,
    },
    sns: {
      defaultLatency: 50,
      defaultFailureRate: 0,
    },
    browser: {
      defaultLatency: 100,
      defaultFailureRate: 0,
    },
  },

  // Logging
  logging: {
    captureDetailedLogs: process.env.CAPTURE_DETAILED_LOGS !== 'false',
    logLevel: process.env.LOG_LEVEL || 'info',
  },

  // Performance Thresholds
  performance: {
    maxEndToEndLatency: 60000, // 60 seconds
    maxGenerationTime: 10000, // 10 seconds
    maxExecutionTime: 30000, // 30 seconds
    maxNotificationDelay: 5000, // 5 seconds
  },
};

/**
 * Get test environment type
 */
export function getTestEnvironment(): 'local' | 'ci' | 'aws' {
  if (process.env.CI === 'true') {
    return 'ci';
  }
  if (integrationTestConfig.aws.useRealAWS) {
    return 'aws';
  }
  return 'local';
}

/**
 * Check if running in CI environment
 */
export function isCI(): boolean {
  return getTestEnvironment() === 'ci';
}

/**
 * Check if using real AWS services
 */
export function useRealAWS(): boolean {
  return integrationTestConfig.aws.useRealAWS;
}
