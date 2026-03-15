import { TestCase } from '../../types/test-case';
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
export declare class TestValidator {
    /**
     * Validate a test case
     *
     * @param testCase - Test case to validate
     * @returns Validation result with any errors
     */
    validate(testCase: TestCase): ValidationResult;
    /**
     * Validate test case structure
     *
     * @param testCase - Test case to validate
     * @param errors - Array to collect errors
     */
    private validateStructure;
    /**
     * Validate test case name
     *
     * @param testCase - Test case to validate
     * @param errors - Array to collect errors
     */
    private validateName;
    /**
     * Validate project ID format
     *
     * @param testCase - Test case to validate
     * @param errors - Array to collect errors
     */
    private validateProjectId;
    /**
     * Validate test steps
     *
     * @param testCase - Test case to validate
     * @param errors - Array to collect errors
     */
    private validateSteps;
    /**
     * Validate a single test step
     *
     * @param step - Test step to validate
     * @param index - Step index for error reporting
     * @param errors - Array to collect errors
     */
    private validateStep;
    /**
     * Validate navigate step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateNavigateStep;
    /**
     * Validate click step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateClickStep;
    /**
     * Validate type step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateTypeStep;
    /**
     * Validate assert step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateAssertStep;
    /**
     * Validate wait step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateWaitStep;
    /**
     * Validate API call step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    private validateApiCallStep;
}
