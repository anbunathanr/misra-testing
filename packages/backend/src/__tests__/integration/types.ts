/**
 * Integration Test Types
 * 
 * Core type definitions for the integration testing framework.
 */

import { TestCase } from '../../types/test-case';
import { TestSuite } from '../../types/test-suite';
import { TestProject } from '../../types/test-project';
import { TestExecution } from '../../types/test-execution';
import { NotificationHistoryRecord } from '../../types/notification';

/**
 * Test category for organizing integration tests
 */
export type TestCategory = 
  | 'end-to-end'
  | 'data-flow'
  | 'event-flow'
  | 'error-handling'
  | 'performance'
  | 'infrastructure';

/**
 * Test context provides isolated environment for each test
 */
export interface TestContext {
  testId: string;
  projectId: string;
  userId: string;
  testData: TestDataSet;
  mocks: MockServices;
  startTime: Date;
  config: TestConfig;
}

/**
 * Test data set contains all seeded data for a test
 */
export interface TestDataSet {
  projects: TestProject[];
  testCases: TestCase[];
  testSuites: TestSuite[];
  executions: TestExecution[];
  notifications: NotificationHistoryRecord[];
}

/**
 * Mock services for external dependencies
 */
export interface MockServices {
  openAI: MockOpenAIService;
  sns: MockSNSService;
  browser: MockBrowserService;
}

/**
 * Test configuration
 */
export interface TestConfig {
  timeout: number;
  useRealAWS: boolean;
  cleanupOnFailure: boolean;
  captureDetailedLogs: boolean;
}

/**
 * Integration test definition
 */
export interface IntegrationTest {
  name: string;
  category: TestCategory;
  timeout: number;
  execute(context: TestContext): Promise<TestResult>;
  validate(context: TestContext): Promise<ValidationResult>;
}

/**
 * Test result
 */
export interface TestResult {
  testName: string;
  status: 'pass' | 'fail' | 'error';
  duration: number;
  metrics: TestMetrics;
  errors: string[];
  logs: string[];
}

/**
 * Validation result
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
  warnings: ValidationWarning[];
}

export interface ValidationError {
  field: string;
  message: string;
  actual?: any;
  expected?: any;
}

export interface ValidationWarning {
  field: string;
  message: string;
}

/**
 * Test metrics
 */
export interface TestMetrics {
  [key: string]: number;
}

/**
 * Mock OpenAI Service
 */
export interface MockOpenAIService {
  configure(config: MockOpenAIConfig): void;
  mockAnalysisResponse(url: string, response: any): void;
  mockGenerationResponse(scenario: string, response: any): void;
  mockError(errorType: 'timeout' | 'rate-limit' | 'invalid-response'): void;
  getCallHistory(): OpenAICall[];
  reset(): void;
}

export interface MockOpenAIConfig {
  latency: number;
  failureRate: number;
  tokenUsage: TokenUsage;
}

export interface TokenUsage {
  promptTokens: number;
  completionTokens: number;
}

export interface OpenAICall {
  timestamp: string;
  prompt: string;
  response: any;
  duration: number;
  tokens: TokenUsage;
}

/**
 * Mock SNS Service
 */
export interface MockSNSService {
  configure(config: MockSNSConfig): void;
  mockEmailDelivery(recipient: string, success: boolean): void;
  mockSMSDelivery(phoneNumber: string, success: boolean): void;
  mockWebhookDelivery(url: string, success: boolean): void;
  simulateDelivery(
    channel: 'email' | 'sms' | 'webhook',
    recipient: string,
    subject: string | undefined,
    body: string
  ): Promise<void>;
  getDeliveredMessages(): SNSMessage[];
  getFailedMessages(): SNSMessage[];
  reset(): void;
}

export interface MockSNSConfig {
  deliveryLatency: number;
  failureRate: number;
}

export interface SNSMessage {
  messageId: string;
  channel: 'email' | 'sms' | 'webhook';
  recipient: string;
  subject?: string;
  body: string;
  timestamp: string;
  delivered: boolean;
  error?: string;
}

/**
 * Mock Browser Service
 */
export interface MockBrowserService {
  configure(config: MockBrowserConfig): void;
  mockPageLoad(url: string, success: boolean): void;
  mockElementInteraction(selector: string, success: boolean): void;
  mockScreenshot(url: string): void;
  getExecutedActions(): BrowserAction[];
  reset(): void;
}

export interface MockBrowserConfig {
  actionLatency: number;
  failureRate: number;
}

export interface BrowserAction {
  action: 'navigate' | 'click' | 'type' | 'assert' | 'screenshot';
  target: string;
  timestamp: string;
  success: boolean;
  duration: number;
  error?: string;
}

/**
 * Integration test suite
 */
export interface IntegrationTestSuite {
  name: string;
  tests: IntegrationTest[];
  setup?(): Promise<void>;
  teardown?(): Promise<void>;
}

/**
 * Suite result
 */
export interface SuiteResult {
  suiteName: string;
  totalTests: number;
  passed: number;
  failed: number;
  errors: number;
  duration: number;
  testResults: TestResult[];
}

/**
 * Health check result for overall system
 */
export interface HealthCheckResult {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  components: Map<string, ComponentHealth>;
  timestamp: string;
}

/**
 * Health status for individual component
 */
export interface ComponentHealth {
  name: string;
  status: 'healthy' | 'unhealthy';
  message?: string;
  latency?: number;
  details?: Record<string, any>;
}

/**
 * Schema validation result
 */
export interface SchemaValidationResult {
  valid: boolean;
  errors: SchemaError[];
  warnings: SchemaWarning[];
}

/**
 * Schema validation error
 */
export interface SchemaError {
  field: string;
  expected: string;
  actual: string;
  message: string;
}

/**
 * Schema validation warning
 */
export interface SchemaWarning {
  field: string;
  message: string;
}

/**
 * Data flow between systems
 */
export interface DataFlow {
  source: SystemComponent;
  destination: SystemComponent;
  dataType: string;
  sampleData: any;
}

/**
 * Data flow validation result
 */
export interface DataFlowValidationResult {
  compatible: boolean;
  transformationRequired: boolean;
  issues: DataFlowIssue[];
}

/**
 * Data flow issue
 */
export interface DataFlowIssue {
  severity: 'error' | 'warning';
  field: string;
  description: string;
  recommendation?: string;
}

/**
 * System component type
 */
export type SystemComponent = 
  | 'ai-generation'
  | 'test-execution'
  | 'notification-system'
  | 'learning-engine';

/**
 * Event publication validation result
 */
export interface PublicationValidationResult {
  published: boolean;
  eventBridgeEventId?: string;
  timestamp: string;
  error?: string;
}

/**
 * Event routing validation result
 */
export interface RoutingValidationResult {
  routed: boolean;
  targetQueue?: string;
  targetLambda?: string;
  routingDelay: number;
  error?: string;
}

/**
 * Event delivery validation result
 */
export interface DeliveryValidationResult {
  delivered: boolean;
  deliveryAttempts: number;
  deliveryDelay: number;
  processed: boolean;
  error?: string;
}

/**
 * Event ordering validation result
 */
export interface OrderingValidationResult {
  ordered: boolean;
  expectedOrder: string[];
  actualOrder: string[];
  violations: OrderViolation[];
}

/**
 * Event ordering violation
 */
export interface OrderViolation {
  expectedIndex: number;
  actualIndex: number;
  eventId: string;
}

/**
 * Event trace for distributed tracing
 */
export interface EventTrace {
  eventId: string;
  timeline: EventTraceStep[];
  totalDuration: number;
}

/**
 * Event trace step
 */
export interface EventTraceStep {
  component: string;
  action: string;
  timestamp: string;
  duration: number;
  status: 'success' | 'failure';
  details?: Record<string, any>;
}

/**
 * Performance metric
 */
export interface PerformanceMetric {
  name: string;
  value: number;
  unit: 'ms' | 'seconds' | 'count' | 'bytes';
  timestamp: string;
  tags: Record<string, string>;
}

/**
 * Performance statistics
 */
export interface PerformanceStatistics {
  metrics: Map<string, MetricStats>;
  summary: {
    totalTests: number;
    totalDuration: number;
    averageDuration: number;
    p50: number;
    p95: number;
    p99: number;
  };
}

/**
 * Metric statistics
 */
export interface MetricStats {
  count: number;
  min: number;
  max: number;
  mean: number;
  median: number;
  p95: number;
  p99: number;
  stdDev: number;
}
