/**
 * Data Flow Validator Service
 * 
 * Validates data format compatibility and transformation correctness across system boundaries.
 * Ensures that data flowing between AI Generation, Test Execution, Notification System, and Learning Engine
 * maintains schema compatibility and correct field types.
 */

import { TestCase } from '../../../types/test-case';
import { TestExecution } from '../../../types/test-execution';

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
 * Data Flow Validator Service
 */
export class DataFlowValidator {
  /**
   * Validate test case schema
   */
  validateTestCaseSchema(testCase: any): SchemaValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaWarning[] = [];

    // Required fields
    const requiredFields = [
      'testCaseId',
      'suiteId',
      'projectId',
      'userId',
      'name',
      'description',
      'type',
      'steps',
      'priority',
      'tags',
      'createdAt',
      'updatedAt',
    ];

    for (const field of requiredFields) {
      if (!(field in testCase)) {
        errors.push({
          field,
          expected: 'present',
          actual: 'missing',
          message: `Required field '${field}' is missing`,
        });
      }
    }

    // Type validations
    if (testCase.testCaseId && typeof testCase.testCaseId !== 'string') {
      errors.push({
        field: 'testCaseId',
        expected: 'string',
        actual: typeof testCase.testCaseId,
        message: 'testCaseId must be a string',
      });
    }

    if (testCase.type && !['functional', 'ui', 'api', 'performance'].includes(testCase.type)) {
      errors.push({
        field: 'type',
        expected: 'functional | ui | api | performance',
        actual: testCase.type,
        message: `Invalid test type: ${testCase.type}`,
      });
    }

    if (testCase.priority && !['high', 'medium', 'low'].includes(testCase.priority)) {
      errors.push({
        field: 'priority',
        expected: 'high | medium | low',
        actual: testCase.priority,
        message: `Invalid priority: ${testCase.priority}`,
      });
    }

    if (testCase.steps && !Array.isArray(testCase.steps)) {
      errors.push({
        field: 'steps',
        expected: 'array',
        actual: typeof testCase.steps,
        message: 'steps must be an array',
      });
    } else if (testCase.steps) {
      // Validate each step
      testCase.steps.forEach((step: any, index: number) => {
        if (!step.action) {
          errors.push({
            field: `steps[${index}].action`,
            expected: 'present',
            actual: 'missing',
            message: `Step ${index} is missing action field`,
          });
        }

        const validActions = ['navigate', 'click', 'type', 'assert', 'wait', 'api-call'];
        if (step.action && !validActions.includes(step.action)) {
          errors.push({
            field: `steps[${index}].action`,
            expected: validActions.join(' | '),
            actual: step.action,
            message: `Invalid action type: ${step.action}`,
          });
        }

        if (!step.target) {
          errors.push({
            field: `steps[${index}].target`,
            expected: 'present',
            actual: 'missing',
            message: `Step ${index} is missing target field`,
          });
        }
      });
    }

    if (testCase.tags && !Array.isArray(testCase.tags)) {
      errors.push({
        field: 'tags',
        expected: 'array',
        actual: typeof testCase.tags,
        message: 'tags must be an array',
      });
    }

    // Warnings for optional but recommended fields
    if (!testCase.description || testCase.description.trim() === '') {
      warnings.push({
        field: 'description',
        message: 'Description is empty or missing',
      });
    }

    if (!testCase.tags || testCase.tags.length === 0) {
      warnings.push({
        field: 'tags',
        message: 'No tags specified',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate execution event schema
   */
  validateExecutionEventSchema(event: any): SchemaValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaWarning[] = [];

    // Required fields for execution events
    const requiredFields = [
      'executionId',
      'testCaseId',
      'status',
      'result',
      'startTime',
      'duration',
    ];

    for (const field of requiredFields) {
      if (!(field in event)) {
        errors.push({
          field,
          expected: 'present',
          actual: 'missing',
          message: `Required field '${field}' is missing`,
        });
      }
    }

    // Type validations
    if (event.executionId && typeof event.executionId !== 'string') {
      errors.push({
        field: 'executionId',
        expected: 'string',
        actual: typeof event.executionId,
        message: 'executionId must be a string',
      });
    }

    if (event.status && !['queued', 'running', 'completed', 'error'].includes(event.status)) {
      errors.push({
        field: 'status',
        expected: 'queued | running | completed | error',
        actual: event.status,
        message: `Invalid status: ${event.status}`,
      });
    }

    if (event.result && !['pass', 'fail', 'error'].includes(event.result)) {
      errors.push({
        field: 'result',
        expected: 'pass | fail | error',
        actual: event.result,
        message: `Invalid result: ${event.result}`,
      });
    }

    if (event.duration && typeof event.duration !== 'number') {
      errors.push({
        field: 'duration',
        expected: 'number',
        actual: typeof event.duration,
        message: 'duration must be a number',
      });
    }

    // Warnings
    if (event.result === 'fail' && !event.screenshots) {
      warnings.push({
        field: 'screenshots',
        message: 'Failed execution should include screenshots',
      });
    }

    if (event.result === 'error' && !event.errorMessage) {
      warnings.push({
        field: 'errorMessage',
        message: 'Error result should include error message',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate notification payload schema
   */
  validateNotificationPayloadSchema(payload: any): SchemaValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaWarning[] = [];

    // Required fields for notification payloads
    const requiredFields = [
      'executionId',
      'testCaseId',
      'status',
      'result',
      'duration',
    ];

    for (const field of requiredFields) {
      if (!(field in payload)) {
        errors.push({
          field,
          expected: 'present',
          actual: 'missing',
          message: `Required field '${field}' is missing`,
        });
      }
    }

    // Type validations
    if (payload.executionId && typeof payload.executionId !== 'string') {
      errors.push({
        field: 'executionId',
        expected: 'string',
        actual: typeof payload.executionId,
        message: 'executionId must be a string',
      });
    }

    if (payload.status && !['queued', 'running', 'completed', 'error'].includes(payload.status)) {
      errors.push({
        field: 'status',
        expected: 'queued | running | completed | error',
        actual: payload.status,
        message: `Invalid status: ${payload.status}`,
      });
    }

    if (payload.result && !['pass', 'fail', 'error'].includes(payload.result)) {
      errors.push({
        field: 'result',
        expected: 'pass | fail | error',
        actual: payload.result,
        message: `Invalid result: ${payload.result}`,
      });
    }

    // Warnings
    if (payload.result === 'fail' && !payload.screenshotUrls) {
      warnings.push({
        field: 'screenshotUrls',
        message: 'Failed execution notification should include screenshot URLs',
      });
    }

    if (!payload.testCaseName) {
      warnings.push({
        field: 'testCaseName',
        message: 'Notification should include test case name for better context',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate learning data schema
   */
  validateLearningDataSchema(data: any): SchemaValidationResult {
    const errors: SchemaError[] = [];
    const warnings: SchemaWarning[] = [];

    // Required fields for learning data
    const requiredFields = [
      'domain',
      'timestamp',
      'executionId',
      'testCaseId',
      'success',
    ];

    for (const field of requiredFields) {
      if (!(field in data)) {
        errors.push({
          field,
          expected: 'present',
          actual: 'missing',
          message: `Required field '${field}' is missing`,
        });
      }
    }

    // Type validations
    if (data.domain && typeof data.domain !== 'string') {
      errors.push({
        field: 'domain',
        expected: 'string',
        actual: typeof data.domain,
        message: 'domain must be a string',
      });
    }

    if (data.timestamp && typeof data.timestamp !== 'number') {
      errors.push({
        field: 'timestamp',
        expected: 'number',
        actual: typeof data.timestamp,
        message: 'timestamp must be a number',
      });
    }

    if (data.success && typeof data.success !== 'boolean') {
      errors.push({
        field: 'success',
        expected: 'boolean',
        actual: typeof data.success,
        message: 'success must be a boolean',
      });
    }

    // Warnings
    if (data.success === false && !data.failureReason) {
      warnings.push({
        field: 'failureReason',
        message: 'Failed execution should include failure reason for learning',
      });
    }

    if (data.success === false && !data.selectorStrategy) {
      warnings.push({
        field: 'selectorStrategy',
        message: 'Failed execution should include selector strategy for learning',
      });
    }

    return {
      valid: errors.length === 0,
      errors,
      warnings,
    };
  }

  /**
   * Validate cross-system data flow
   */
  validateCrossSystemDataFlow(flow: DataFlow): DataFlowValidationResult {
    const issues: DataFlowIssue[] = [];
    let transformationRequired = false;

    // Validate based on source and destination
    if (flow.source === 'ai-generation' && flow.destination === 'test-execution') {
      // AI generation produces test cases, test execution consumes them
      const testCaseValidation = this.validateTestCaseSchema(flow.sampleData);
      
      if (!testCaseValidation.valid) {
        testCaseValidation.errors.forEach(error => {
          issues.push({
            severity: 'error',
            field: error.field,
            description: error.message,
            recommendation: `Ensure AI generation produces valid test case schema`,
          });
        });
      }

      testCaseValidation.warnings.forEach(warning => {
        issues.push({
          severity: 'warning',
          field: warning.field,
          description: warning.message,
          recommendation: 'Consider adding this field for better test quality',
        });
      });
    }

    if (flow.source === 'test-execution' && flow.destination === 'notification-system') {
      // Test execution produces events, notification system consumes them
      const eventValidation = this.validateExecutionEventSchema(flow.sampleData);
      
      if (!eventValidation.valid) {
        eventValidation.errors.forEach(error => {
          issues.push({
            severity: 'error',
            field: error.field,
            description: error.message,
            recommendation: `Ensure test execution produces valid event schema`,
          });
        });
      }

      // Check if notification payload can be derived from execution event
      const notificationValidation = this.validateNotificationPayloadSchema(flow.sampleData);
      if (!notificationValidation.valid) {
        transformationRequired = true;
        issues.push({
          severity: 'warning',
          field: 'payload',
          description: 'Execution event requires transformation for notification payload',
          recommendation: 'Add transformation layer to map execution events to notification payloads',
        });
      }
    }

    if (flow.source === 'test-execution' && flow.destination === 'learning-engine') {
      // Test execution produces results, learning engine consumes them
      const learningValidation = this.validateLearningDataSchema(flow.sampleData);
      
      if (!learningValidation.valid) {
        learningValidation.errors.forEach(error => {
          issues.push({
            severity: 'error',
            field: error.field,
            description: error.message,
            recommendation: `Ensure test execution produces valid learning data schema`,
          });
        });
      }
    }

    return {
      compatible: issues.filter(i => i.severity === 'error').length === 0,
      transformationRequired,
      issues,
    };
  }

  /**
   * Validate schema mismatch and provide recommendations
   */
  validateSchemaMismatch(expected: any, actual: any, path: string = ''): DataFlowIssue[] {
    const issues: DataFlowIssue[] = [];

    // Check for missing fields
    for (const key in expected) {
      if (!(key in actual)) {
        issues.push({
          severity: 'error',
          field: path ? `${path}.${key}` : key,
          description: `Missing required field`,
          recommendation: `Add field '${key}' to match expected schema`,
        });
      }
    }

    // Check for type mismatches
    for (const key in actual) {
      if (key in expected) {
        const expectedType = typeof expected[key];
        const actualType = typeof actual[key];
        
        if (expectedType !== actualType) {
          issues.push({
            severity: 'error',
            field: path ? `${path}.${key}` : key,
            description: `Type mismatch: expected ${expectedType}, got ${actualType}`,
            recommendation: `Convert field '${key}' to ${expectedType}`,
          });
        }
      }
    }

    return issues;
  }
}
