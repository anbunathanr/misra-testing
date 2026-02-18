import { TestCase, TestStep } from '../../types/test-case';

/**
 * Validation Result
 * 
 * Contains validation status and any errors found
 */
export interface ValidationResult {
  valid: boolean;
  errors: ValidationError[];
}

/**
 * Validation Error
 * 
 * Describes a specific validation failure
 */
export interface ValidationError {
  field: string;
  message: string;
}

/**
 * Test Validator
 * 
 * Validates generated test cases before persistence.
 * Ensures test cases meet schema requirements and business rules.
 */
export class TestValidator {
  /**
   * Validate a test case
   * 
   * @param testCase - Test case to validate
   * @returns Validation result with any errors
   */
  validate(testCase: TestCase): ValidationResult {
    const errors: ValidationError[] = [];

    // Validate test case structure
    this.validateStructure(testCase, errors);

    // Validate test case name
    this.validateName(testCase, errors);

    // Validate project ID format
    this.validateProjectId(testCase, errors);

    // Validate test steps
    this.validateSteps(testCase, errors);

    return {
      valid: errors.length === 0,
      errors,
    };
  }

  /**
   * Validate test case structure
   * 
   * @param testCase - Test case to validate
   * @param errors - Array to collect errors
   */
  private validateStructure(testCase: TestCase, errors: ValidationError[]): void {
    // Check required fields
    if (!testCase.testCaseId) {
      errors.push({
        field: 'testCaseId',
        message: 'Test case ID is required',
      });
    }

    if (!testCase.suiteId) {
      errors.push({
        field: 'suiteId',
        message: 'Suite ID is required',
      });
    }

    if (!testCase.projectId) {
      errors.push({
        field: 'projectId',
        message: 'Project ID is required',
      });
    }

    if (!testCase.userId) {
      errors.push({
        field: 'userId',
        message: 'User ID is required',
      });
    }

    if (!testCase.type) {
      errors.push({
        field: 'type',
        message: 'Test type is required',
      });
    }

    if (!Array.isArray(testCase.steps)) {
      errors.push({
        field: 'steps',
        message: 'Steps must be an array',
      });
    }

    if (!Array.isArray(testCase.tags)) {
      errors.push({
        field: 'tags',
        message: 'Tags must be an array',
      });
    }
  }

  /**
   * Validate test case name
   * 
   * @param testCase - Test case to validate
   * @param errors - Array to collect errors
   */
  private validateName(testCase: TestCase, errors: ValidationError[]): void {
    if (!testCase.name || testCase.name.trim() === '') {
      errors.push({
        field: 'name',
        message: 'Test case name cannot be empty',
      });
    }
  }

  /**
   * Validate project ID format
   * 
   * @param testCase - Test case to validate
   * @param errors - Array to collect errors
   */
  private validateProjectId(testCase: TestCase, errors: ValidationError[]): void {
    if (testCase.projectId) {
      // UUID format validation (basic check)
      const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
      if (!uuidRegex.test(testCase.projectId)) {
        errors.push({
          field: 'projectId',
          message: 'Project ID must be a valid UUID',
        });
      }
    }
  }

  /**
   * Validate test steps
   * 
   * @param testCase - Test case to validate
   * @param errors - Array to collect errors
   */
  private validateSteps(testCase: TestCase, errors: ValidationError[]): void {
    if (!Array.isArray(testCase.steps)) {
      return; // Already reported in structure validation
    }

    if (testCase.steps.length === 0) {
      errors.push({
        field: 'steps',
        message: 'Test case must have at least one step',
      });
      return;
    }

    testCase.steps.forEach((step, index) => {
      this.validateStep(step, index, errors);
    });
  }

  /**
   * Validate a single test step
   * 
   * @param step - Test step to validate
   * @param index - Step index for error reporting
   * @param errors - Array to collect errors
   */
  private validateStep(step: TestStep, index: number, errors: ValidationError[]): void {
    const stepPrefix = `steps[${index}]`;

    // Validate action type
    const validActions = ['navigate', 'click', 'type', 'assert', 'wait', 'api-call'];
    if (!step.action || !validActions.includes(step.action)) {
      errors.push({
        field: `${stepPrefix}.action`,
        message: `Invalid action type: ${step.action}. Must be one of: ${validActions.join(', ')}`,
      });
    }

    // Validate step number
    if (typeof step.stepNumber !== 'number' || step.stepNumber < 1) {
      errors.push({
        field: `${stepPrefix}.stepNumber`,
        message: 'Step number must be a positive number',
      });
    }

    // Validate action-specific requirements
    switch (step.action) {
      case 'navigate':
        this.validateNavigateStep(step, stepPrefix, errors);
        break;
      case 'click':
        this.validateClickStep(step, stepPrefix, errors);
        break;
      case 'type':
        this.validateTypeStep(step, stepPrefix, errors);
        break;
      case 'assert':
        this.validateAssertStep(step, stepPrefix, errors);
        break;
      case 'wait':
        this.validateWaitStep(step, stepPrefix, errors);
        break;
    }
  }

  /**
   * Validate navigate step
   * 
   * @param step - Test step to validate
   * @param stepPrefix - Prefix for error field
   * @param errors - Array to collect errors
   */
  private validateNavigateStep(step: TestStep, stepPrefix: string, errors: ValidationError[]): void {
    if (!step.target || step.target.trim() === '') {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Navigate step must have a target URL',
      });
      return;
    }

    // Validate URL format (HTTP/HTTPS only)
    try {
      const url = new URL(step.target);
      if (url.protocol !== 'http:' && url.protocol !== 'https:') {
        errors.push({
          field: `${stepPrefix}.target`,
          message: 'Navigate URL must use HTTP or HTTPS protocol',
        });
      }
    } catch (error) {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Navigate target must be a valid URL',
      });
    }
  }

  /**
   * Validate click step
   * 
   * @param step - Test step to validate
   * @param stepPrefix - Prefix for error field
   * @param errors - Array to collect errors
   */
  private validateClickStep(step: TestStep, stepPrefix: string, errors: ValidationError[]): void {
    if (!step.target || step.target.trim() === '') {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Click step must have a target selector',
      });
    }
  }

  /**
   * Validate type step
   * 
   * @param step - Test step to validate
   * @param stepPrefix - Prefix for error field
   * @param errors - Array to collect errors
   */
  private validateTypeStep(step: TestStep, stepPrefix: string, errors: ValidationError[]): void {
    if (!step.target || step.target.trim() === '') {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Type step must have a target selector',
      });
    }

    if (step.value === undefined || step.value === null) {
      errors.push({
        field: `${stepPrefix}.value`,
        message: 'Type step must have a value',
      });
    }
  }

  /**
   * Validate assert step
   * 
   * @param step - Test step to validate
   * @param stepPrefix - Prefix for error field
   * @param errors - Array to collect errors
   */
  private validateAssertStep(step: TestStep, stepPrefix: string, errors: ValidationError[]): void {
    if (!step.target || step.target.trim() === '') {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Assert step must have a target selector',
      });
    }

    if (!step.expectedResult || step.expectedResult.trim() === '') {
      errors.push({
        field: `${stepPrefix}.expectedResult`,
        message: 'Assert step must have an expected result',
      });
    }
  }

  /**
   * Validate wait step
   * 
   * @param step - Test step to validate
   * @param stepPrefix - Prefix for error field
   * @param errors - Array to collect errors
   */
  private validateWaitStep(step: TestStep, stepPrefix: string, errors: ValidationError[]): void {
    if (!step.target || step.target.trim() === '') {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Wait step must have a target duration',
      });
      return;
    }

    // Validate that target is a number (as string)
    const duration = parseInt(step.target, 10);
    if (isNaN(duration) || duration < 0) {
      errors.push({
        field: `${stepPrefix}.target`,
        message: 'Wait step target must be a non-negative number (milliseconds)',
      });
    }
  }
}
