/**
 * Fast-check generators for AI Test Generation
 * 
 * Provides property-based test data generators for all AI test generation types.
 */

import * as fc from 'fast-check';
import {
  ApplicationAnalysis,
  TestSpecification,
  IdentifiedElement,
  AIGeneratedStep,
  TokenUsage,
  AIUsageRecord,
  SelectorStrategy,
  LearningContext,
  UIPattern,
  UserFlow,
  PageMetadata,
  ValidationError,
  ValidationResult,
  BatchResult,
  FailedGeneration,
} from '../../types/ai-test-generation';
import { TestCase, TestStep } from '../../types/test-case';

// ============================================================================
// Basic Generators
// ============================================================================

/**
 * Generate valid URLs
 */
export const urlArb = (): fc.Arbitrary<string> =>
  fc.webUrl({ validSchemes: ['http', 'https'] });

/**
 * Generate selector strategies
 */
export const selectorStrategyArb = (): fc.Arbitrary<SelectorStrategy> =>
  fc.constantFrom<SelectorStrategy>(
    'data-testid',
    'id',
    'aria-label',
    'name',
    'class',
    'xpath',
    'text-content'
  );

/**
 * Generate element types
 */
export const elementTypeArb = () =>
  fc.constantFrom('button', 'link', 'input', 'select', 'textarea', 'checkbox', 'radio');

/**
 * Generate action types
 */
export const actionTypeArb = () =>
  fc.constantFrom('navigate', 'click', 'type', 'assert', 'wait');

// ============================================================================
// Application Analyzer Generators
// ============================================================================

/**
 * Generate identified elements
 */
export const identifiedElementArb = (): fc.Arbitrary<IdentifiedElement> =>
  fc.record({
    type: elementTypeArb(),
    attributes: fc.record({
      id: fc.option(fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), { nil: undefined }),
      class: fc.option(fc.stringMatching(/^[a-zA-Z0-9_-]{1,30}$/), { nil: undefined }),
      name: fc.option(fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), { nil: undefined }),
      'aria-label': fc.option(fc.stringMatching(/^[a-zA-Z0-9 _-]{1,30}$/), { nil: undefined }),
      'data-testid': fc.option(fc.stringMatching(/^[a-zA-Z0-9_-]{1,20}$/), { nil: undefined }),
      placeholder: fc.option(fc.stringMatching(/^[a-zA-Z0-9 _-]{1,30}$/), { nil: undefined }),
      text: fc.option(fc.stringMatching(/^[a-zA-Z0-9 _-]{1,50}$/), { nil: undefined }),
    }),
    xpath: fc.stringMatching(/^[a-zA-Z0-9_-]{5,100}$/).map(s => `//${s}`),
    cssPath: fc.stringMatching(/^[a-zA-Z0-9_-]{3,50}$/).map(s => `.${s}`),
  });

/**
 * Generate UI patterns
 */
export const uiPatternArb = (): fc.Arbitrary<UIPattern> =>
  fc.record({
    type: fc.constantFrom('form', 'navigation', 'modal', 'table', 'list'),
    elements: fc.array(identifiedElementArb(), { minLength: 1, maxLength: 5 }),
    description: fc.string({ minLength: 10, maxLength: 100 }),
  });

/**
 * Generate user flows
 */
export const userFlowArb = (): fc.Arbitrary<UserFlow> =>
  fc.record({
    name: fc.string({ minLength: 5, maxLength: 50 }),
    steps: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 1, maxLength: 10 }),
    entryPoint: identifiedElementArb(),
  });

/**
 * Generate page metadata
 */
export const pageMetadataArb = (): fc.Arbitrary<PageMetadata> =>
  fc.record({
    viewport: fc.record({
      width: fc.integer({ min: 320, max: 1920 }),
      height: fc.integer({ min: 480, max: 1080 }),
    }),
    loadTime: fc.integer({ min: 100, max: 10000 }),
    isSPA: fc.boolean(),
  });

/**
 * Generate application analysis
 */
export const applicationAnalysisArb = (): fc.Arbitrary<ApplicationAnalysis> =>
  fc.record({
    url: urlArb(),
    title: fc.string({ minLength: 5, maxLength: 100 }),
    elements: fc.array(identifiedElementArb(), { minLength: 0, maxLength: 20 }),
    patterns: fc.array(uiPatternArb(), { minLength: 0, maxLength: 5 }),
    flows: fc.array(userFlowArb(), { minLength: 0, maxLength: 3 }),
    metadata: pageMetadataArb(),
  });

// ============================================================================
// AI Engine Generators
// ============================================================================

/**
 * Generate AI-generated steps
 */
export const aiGeneratedStepArb = (): fc.Arbitrary<AIGeneratedStep> =>
  fc.record({
    action: actionTypeArb(),
    description: fc.string({ minLength: 10, maxLength: 100 }),
    elementDescription: fc.option(fc.string({ minLength: 5, maxLength: 50 }), { nil: undefined }),
    value: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    assertion: fc.option(
      fc.record({
        type: fc.constantFrom('exists', 'visible', 'text', 'value', 'attribute'),
        expected: fc.string({ minLength: 1, maxLength: 50 }),
      }),
      { nil: undefined }
    ),
  });

/**
 * Generate test specifications
 */
export const testSpecificationArb = (): fc.Arbitrary<TestSpecification> =>
  fc.record({
    testName: fc.string({ minLength: 5, maxLength: 100 }),
    description: fc.string({ minLength: 10, maxLength: 200 }),
    steps: fc.array(aiGeneratedStepArb(), { minLength: 1, maxLength: 10 }),
    tags: fc.array(fc.string({ minLength: 3, maxLength: 20 }), { minLength: 0, maxLength: 5 }),
  });

/**
 * Generate learning context
 */
export const learningContextArb = (): fc.Arbitrary<LearningContext> =>
  fc.record({
    successfulPatterns: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
    failingPatterns: fc.array(fc.string({ minLength: 10, maxLength: 50 }), { minLength: 0, maxLength: 10 }),
    selectorPreferences: fc.array(selectorStrategyArb(), { minLength: 0, maxLength: 7 }),
  });

// ============================================================================
// Test Case Generators
// ============================================================================

/**
 * Generate test steps
 */
export const testStepArb = (): fc.Arbitrary<TestStep> =>
  fc.oneof(
    // Navigate step with valid URL
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('navigate' as const),
      target: fc.webUrl({ validSchemes: ['http', 'https'] }),
      value: fc.constant(undefined),
      expectedResult: fc.constant(undefined),
    }),
    // Click step
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('click' as const),
      target: fc.stringMatching(/^[a-zA-Z0-9_\-:./#]{3,50}$/),
      value: fc.constant(undefined),
      expectedResult: fc.constant(undefined),
    }),
    // Type step
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('type' as const),
      target: fc.stringMatching(/^[a-zA-Z0-9_\-:./#]{3,50}$/),
      value: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 _\-:./#]{0,99}$/),
      expectedResult: fc.constant(undefined),
    }),
    // Assert step
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('assert' as const),
      target: fc.stringMatching(/^[a-zA-Z0-9_\-:./#]{3,50}$/),
      value: fc.constant(undefined),
      expectedResult: fc.stringMatching(/^[a-zA-Z0-9][a-zA-Z0-9 _\-:./#]{0,99}$/),
    }),
    // Wait step
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('wait' as const),
      target: fc.integer({ min: 0, max: 10000 }).map(n => n.toString()),
      value: fc.constant(undefined),
      expectedResult: fc.constant(undefined),
    }),
    // API call step
    fc.record({
      stepNumber: fc.integer({ min: 1, max: 100 }),
      action: fc.constant('api-call' as const),
      target: fc.webUrl({ validSchemes: ['http', 'https'] }),
      value: fc.constant(undefined),
      expectedResult: fc.constant(undefined),
    })
  );

/**
 * Generate test cases
 */
export const testCaseArb = (): fc.Arbitrary<TestCase> =>
  fc.record({
    testCaseId: fc.uuid(),
    projectId: fc.uuid(),
    suiteId: fc.uuid(),
    userId: fc.uuid(),
    name: fc.stringMatching(/^[a-zA-Z0-9 _-]{5,100}$/).filter(s => s.trim().length > 0),
    description: fc.stringMatching(/^[a-zA-Z0-9 _\-.,!?]{10,200}$/),
    type: fc.constantFrom('functional', 'ui', 'api', 'performance'),
    steps: fc.array(testStepArb(), { minLength: 1, maxLength: 20 }),
    priority: fc.constantFrom('high', 'medium', 'low'),
    tags: fc.array(fc.stringMatching(/^[a-zA-Z0-9_-]{3,20}$/), { minLength: 0, maxLength: 10 }),
    createdAt: fc.date().map(d => d.getTime()),
    updatedAt: fc.date().map(d => d.getTime()),
  });

// ============================================================================
// Validation Generators
// ============================================================================

/**
 * Generate validation errors
 */
export const validationErrorArb = (): fc.Arbitrary<ValidationError> =>
  fc.record({
    field: fc.string({ minLength: 3, maxLength: 30 }),
    message: fc.string({ minLength: 10, maxLength: 100 }),
  });

/**
 * Generate validation results
 */
export const validationResultArb = (): fc.Arbitrary<ValidationResult> =>
  fc.record({
    valid: fc.boolean(),
    errors: fc.array(validationErrorArb(), { minLength: 0, maxLength: 10 }),
  });

// ============================================================================
// Batch Processing Generators
// ============================================================================

/**
 * Generate failed generations
 */
export const failedGenerationArb = (): fc.Arbitrary<FailedGeneration> =>
  fc.record({
    scenario: fc.string({ minLength: 10, maxLength: 100 }),
    error: fc.string({ minLength: 10, maxLength: 200 }),
  });

/**
 * Generate batch results
 */
export const batchResultArb = (): fc.Arbitrary<BatchResult> =>
  fc.record({
    successful: fc.array(testCaseArb(), { minLength: 0, maxLength: 10 }),
    failed: fc.array(failedGenerationArb(), { minLength: 0, maxLength: 5 }),
    summary: fc.record({
      total: fc.integer({ min: 0, max: 15 }),
      succeeded: fc.integer({ min: 0, max: 10 }),
      failed: fc.integer({ min: 0, max: 5 }),
    }),
  });

// ============================================================================
// Cost Tracking Generators
// ============================================================================

/**
 * Generate token usage
 */
export const tokenUsageArb = (): fc.Arbitrary<TokenUsage> =>
  fc.record({
    promptTokens: fc.integer({ min: 10, max: 5000 }),
    completionTokens: fc.integer({ min: 10, max: 3000 }),
    totalTokens: fc.integer({ min: 20, max: 8000 }),
  });

/**
 * Generate AI usage records
 */
export const aiUsageRecordArb = (): fc.Arbitrary<AIUsageRecord> =>
  fc.record({
    userId: fc.uuid(),
    timestamp: fc.integer({ min: 1577836800000, max: 1893456000000 }).map(ts => new Date(ts).toISOString()),
    projectId: fc.uuid(),
    operationType: fc.constantFrom('analyze', 'generate', 'batch'),
    tokens: tokenUsageArb(),
    cost: fc.float({ min: Math.fround(0.01), max: Math.fround(1.0), noNaN: true }),
    testCasesGenerated: fc.integer({ min: 0, max: 20 }),
    metadata: fc.record({
      model: fc.constantFrom('gpt-4', 'gpt-3.5-turbo'),
      duration: fc.integer({ min: 100, max: 30000 }),
    }),
  });

// ============================================================================
// LLM Response Generators
// ============================================================================

/**
 * Generate valid LLM JSON responses
 */
export const validLLMResponseArb = (): fc.Arbitrary<string> =>
  testSpecificationArb().map(spec => JSON.stringify(spec));

/**
 * Generate invalid LLM JSON responses
 */
export const invalidLLMResponseArb = (): fc.Arbitrary<string> =>
  fc.oneof(
    fc.constant(''), // Empty response
    fc.constant('not json'), // Invalid JSON
    fc.constant('{"incomplete": '), // Incomplete JSON
    fc.record({ // Missing required fields
      testName: fc.string(),
    }).map(obj => JSON.stringify(obj)),
    fc.record({ // Invalid step action
      testName: fc.string(),
      description: fc.string(),
      steps: fc.array(fc.record({
        action: fc.constant('invalid-action'),
        description: fc.string(),
      })),
      tags: fc.array(fc.string()),
    }).map(obj => JSON.stringify(obj))
  );

// ============================================================================
// Composite Generators
// ============================================================================

/**
 * Generate complete test generation scenario
 */
export const testGenerationScenarioArb = () =>
  fc.record({
    analysis: applicationAnalysisArb(),
    scenario: fc.string({ minLength: 10, maxLength: 200 }),
    projectId: fc.uuid(),
    suiteId: fc.uuid(),
    context: fc.option(learningContextArb(), { nil: undefined }),
  });

/**
 * Generate batch generation scenario
 */
export const batchGenerationScenarioArb = () =>
  fc.record({
    url: urlArb(),
    scenarios: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { minLength: 1, maxLength: 10 }),
    projectId: fc.uuid(),
    suiteId: fc.uuid(),
  });
