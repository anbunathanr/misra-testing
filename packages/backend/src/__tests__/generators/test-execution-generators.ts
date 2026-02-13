/**
 * Fast-check generators for test execution data
 */

import * as fc from 'fast-check';
import {
  TestExecution,
  ExecutionStatus,
  ExecutionResult,
  StepResult,
  StepStatus,
  ExecutionMessage,
} from '../../types/test-execution';
import { TestCase, TestStep } from '../../types/test-case';

// Generator for execution status
export const executionStatusGenerator = (): fc.Arbitrary<ExecutionStatus> =>
  fc.constantFrom('queued', 'running', 'completed', 'error');

// Generator for execution result
export const executionResultGenerator = (): fc.Arbitrary<ExecutionResult> =>
  fc.constantFrom('pass', 'fail', 'error');

// Generator for step status
export const stepStatusGenerator = (): fc.Arbitrary<StepStatus> =>
  fc.constantFrom('pass', 'fail', 'error');

// Generator for test step
export const testStepGenerator = (): fc.Arbitrary<TestStep> =>
  fc.record({
    stepNumber: fc.integer({ min: 1, max: 20 }),
    action: fc.constantFrom('navigate', 'click', 'type', 'assert', 'wait', 'api-call'),
    target: fc.string({ minLength: 1, maxLength: 200 }),
    value: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    expectedResult: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
  });

// Generator for test case
export const testCaseGenerator = (): fc.Arbitrary<TestCase> =>
  fc.record({
    testCaseId: fc.uuid(),
    suiteId: fc.uuid(),
    projectId: fc.uuid(),
    userId: fc.uuid(),
    name: fc.string({ minLength: 1, maxLength: 100 }),
    description: fc.string({ minLength: 0, maxLength: 500 }),
    type: fc.constantFrom('functional', 'ui', 'api', 'performance'),
    steps: fc.array(testStepGenerator(), { minLength: 1, maxLength: 10 }),
    priority: fc.constantFrom('high', 'medium', 'low'),
    tags: fc.array(fc.string({ minLength: 1, maxLength: 20 }), { maxLength: 5 }),
    createdAt: fc.integer({ min: 1600000000000, max: Date.now() }),
    updatedAt: fc.integer({ min: 1600000000000, max: Date.now() }),
  });

// Generator for step result
export const stepResultGenerator = (): fc.Arbitrary<StepResult> =>
  fc.record({
    stepIndex: fc.integer({ min: 0, max: 19 }),
    action: fc.constantFrom('navigate', 'click', 'type', 'assert', 'wait', 'api-call'),
    status: stepStatusGenerator(),
    duration: fc.integer({ min: 10, max: 30000 }),
    errorMessage: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    screenshot: fc.option(fc.string({ minLength: 10, maxLength: 100 }), { nil: undefined }),
    details: fc.option(
      fc.record({
        url: fc.option(fc.webUrl(), { nil: undefined }),
        selector: fc.option(fc.string({ minLength: 1, maxLength: 100 }), { nil: undefined }),
        value: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
        assertion: fc.option(fc.string({ minLength: 0, maxLength: 200 }), { nil: undefined }),
      }),
      { nil: undefined }
    ),
  });

// Generator for test execution
export const testExecutionGenerator = (): fc.Arbitrary<TestExecution> =>
  fc.record({
    executionId: fc.uuid(),
    projectId: fc.uuid(),
    testCaseId: fc.option(fc.uuid(), { nil: undefined }),
    testSuiteId: fc.option(fc.uuid(), { nil: undefined }),
    suiteExecutionId: fc.option(fc.uuid(), { nil: undefined }),
    status: executionStatusGenerator(),
    result: fc.option(executionResultGenerator(), { nil: undefined }),
    startTime: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
    endTime: fc.option(
      fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
      { nil: undefined }
    ),
    duration: fc.option(fc.integer({ min: 100, max: 600000 }), { nil: undefined }),
    steps: fc.array(stepResultGenerator(), { minLength: 0, maxLength: 10 }),
    screenshots: fc.array(fc.string({ minLength: 10, maxLength: 100 }), { maxLength: 5 }),
    errorMessage: fc.option(fc.string({ minLength: 0, maxLength: 500 }), { nil: undefined }),
    metadata: fc.record({
      triggeredBy: fc.uuid(),
      environment: fc.option(fc.constantFrom('test', 'staging', 'production'), { nil: undefined }),
      browserVersion: fc.option(fc.string({ minLength: 1, maxLength: 50 }), { nil: undefined }),
    }),
    createdAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
    updatedAt: fc.date({ min: new Date('2024-01-01'), max: new Date() }).map(d => d.toISOString()),
  });

// Generator for execution message (SQS)
export const executionMessageGenerator = (): fc.Arbitrary<ExecutionMessage> =>
  fc.record({
    executionId: fc.uuid(),
    testCaseId: fc.uuid(),
    projectId: fc.uuid(),
    suiteExecutionId: fc.option(fc.uuid(), { nil: undefined }),
    testCase: testCaseGenerator(),
    metadata: fc.record({
      triggeredBy: fc.uuid(),
      environment: fc.option(fc.constantFrom('test', 'staging', 'production'), { nil: undefined }),
    }),
  });

// Generator for completed test execution (with result and endTime)
export const completedTestExecutionGenerator = (): fc.Arbitrary<TestExecution> =>
  testExecutionGenerator().map(execution => ({
    ...execution,
    status: 'completed' as ExecutionStatus,
    result: fc.sample(executionResultGenerator(), 1)[0],
    endTime: new Date(
      new Date(execution.startTime).getTime() + (execution.duration || 5000)
    ).toISOString(),
  }));
