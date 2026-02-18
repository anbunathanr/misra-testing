/**
 * Fast-check generators for test execution data
 */
import * as fc from 'fast-check';
import { TestExecution, ExecutionStatus, ExecutionResult, StepResult, StepStatus, ExecutionMessage } from '../../types/test-execution';
import { TestCase, TestStep } from '../../types/test-case';
export declare const executionStatusGenerator: () => fc.Arbitrary<ExecutionStatus>;
export declare const executionResultGenerator: () => fc.Arbitrary<ExecutionResult>;
export declare const stepStatusGenerator: () => fc.Arbitrary<StepStatus>;
export declare const testStepGenerator: () => fc.Arbitrary<TestStep>;
export declare const testCaseGenerator: () => fc.Arbitrary<TestCase>;
export declare const stepResultGenerator: () => fc.Arbitrary<StepResult>;
export declare const testExecutionGenerator: () => fc.Arbitrary<TestExecution>;
export declare const executionMessageGenerator: () => fc.Arbitrary<ExecutionMessage>;
export declare const completedTestExecutionGenerator: () => fc.Arbitrary<TestExecution>;
