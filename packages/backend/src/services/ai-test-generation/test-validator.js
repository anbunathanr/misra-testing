"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.TestValidator = void 0;
/**
 * Test Validator
 *
 * Validates generated test cases before persistence.
 * Ensures test cases meet schema requirements and business rules.
 */
class TestValidator {
    /**
     * Validate a test case
     *
     * @param testCase - Test case to validate
     * @returns Validation result with any errors
     */
    validate(testCase) {
        const errors = [];
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
    validateStructure(testCase, errors) {
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
    validateName(testCase, errors) {
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
    validateProjectId(testCase, errors) {
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
    validateSteps(testCase, errors) {
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
    validateStep(step, index, errors) {
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
            case 'api-call':
                this.validateApiCallStep(step, stepPrefix, errors);
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
    validateNavigateStep(step, stepPrefix, errors) {
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
        }
        catch (error) {
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
    validateClickStep(step, stepPrefix, errors) {
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
    validateTypeStep(step, stepPrefix, errors) {
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
    validateAssertStep(step, stepPrefix, errors) {
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
    validateWaitStep(step, stepPrefix, errors) {
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
    /**
     * Validate API call step
     *
     * @param step - Test step to validate
     * @param stepPrefix - Prefix for error field
     * @param errors - Array to collect errors
     */
    validateApiCallStep(step, stepPrefix, errors) {
        if (!step.target || step.target.trim() === '') {
            errors.push({
                field: `${stepPrefix}.target`,
                message: 'API call step must have a target URL',
            });
            return;
        }
        // Validate URL format (HTTP/HTTPS only)
        try {
            const url = new URL(step.target);
            if (url.protocol !== 'http:' && url.protocol !== 'https:') {
                errors.push({
                    field: `${stepPrefix}.target`,
                    message: 'API call URL must use HTTP or HTTPS protocol',
                });
            }
        }
        catch (error) {
            errors.push({
                field: `${stepPrefix}.target`,
                message: 'API call target must be a valid URL',
            });
        }
    }
}
exports.TestValidator = TestValidator;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoidGVzdC12YWxpZGF0b3IuanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJ0ZXN0LXZhbGlkYXRvci50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOzs7QUFzQkE7Ozs7O0dBS0c7QUFDSCxNQUFhLGFBQWE7SUFDeEI7Ozs7O09BS0c7SUFDSCxRQUFRLENBQUMsUUFBa0I7UUFDekIsTUFBTSxNQUFNLEdBQXNCLEVBQUUsQ0FBQztRQUVyQywrQkFBK0I7UUFDL0IsSUFBSSxDQUFDLGlCQUFpQixDQUFDLFFBQVEsRUFBRSxNQUFNLENBQUMsQ0FBQztRQUV6QywwQkFBMEI7UUFDMUIsSUFBSSxDQUFDLFlBQVksQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFcEMsNkJBQTZCO1FBQzdCLElBQUksQ0FBQyxpQkFBaUIsQ0FBQyxRQUFRLEVBQUUsTUFBTSxDQUFDLENBQUM7UUFFekMsc0JBQXNCO1FBQ3RCLElBQUksQ0FBQyxhQUFhLENBQUMsUUFBUSxFQUFFLE1BQU0sQ0FBQyxDQUFDO1FBRXJDLE9BQU87WUFDTCxLQUFLLEVBQUUsTUFBTSxDQUFDLE1BQU0sS0FBSyxDQUFDO1lBQzFCLE1BQU07U0FDUCxDQUFDO0lBQ0osQ0FBQztJQUVEOzs7OztPQUtHO0lBQ0ssaUJBQWlCLENBQUMsUUFBa0IsRUFBRSxNQUF5QjtRQUNyRSx3QkFBd0I7UUFDeEIsSUFBSSxDQUFDLFFBQVEsQ0FBQyxVQUFVLEVBQUUsQ0FBQztZQUN6QixNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNWLEtBQUssRUFBRSxZQUFZO2dCQUNuQixPQUFPLEVBQUUsMEJBQTBCO2FBQ3BDLENBQUMsQ0FBQztRQUNMLENBQUM7UUFFRCxJQUFJLENBQUMsUUFBUSxDQUFDLE9BQU8sRUFBRSxDQUFDO1lBQ3RCLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1YsS0FBSyxFQUFFLFNBQVM7Z0JBQ2hCLE9BQU8sRUFBRSxzQkFBc0I7YUFDaEMsQ0FBQyxDQUFDO1FBQ0wsQ0FBQztRQUVELElBQUks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QkFBbUIsQ0FBQyxJQUFjLEVBQUUsVUFBa0IsRUFBRSxNQUF5QjtRQUN2RixJQUFJLENBQUMsSUFBSSxDQUFDLE1BQU0sSUFBSSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksRUFBRSxLQUFLLEVBQUUsRUFBRSxDQUFDO1lBQzlDLE1BQU0sQ0FBQyxJQUFJLENBQUM7Z0JBQ1YsS0FBSyxFQUFFLEdBQUcsVUFBVSxTQUFTO2dCQUM3QixPQUFPLEVBQUUsc0NBQXNDO2FBQ2hELENBQUMsQ0FBQztZQUNILE9BQU87UUFDVCxDQUFDO1FBRUQsd0NBQXdDO1FBQ3hDLElBQUksQ0FBQztZQUNILE1BQU0sR0FBRyxHQUFHLElBQUksR0FBRyxDQUFDLElBQUksQ0FBQyxNQUFNLENBQUMsQ0FBQztZQUNqQyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssT0FBTyxJQUFJLEdBQUcsQ0FBQyxRQUFRLEtBQUssUUFBUSxFQUFFLENBQUM7Z0JBQzFELE1BQU0sQ0FBQyxJQUFJLENBQUM7b0JBQ1YsS0FBSyxFQUFFLEdBQUcsVUFBVSxTQUFTO29CQUM3QixPQUFPLEVBQUUsOENBQThDO2lCQUN4RCxDQUFDLENBQUM7WUFDTCxDQUFDO1FBQ0gsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixNQUFNLENBQUMsSUFBSSxDQUFDO2dCQUNWLEtBQUssRUFBRSxHQUFHLFVBQVUsU0FBUztnQkFDN0IsT0FBTyxFQUFFLHFDQUFxQzthQUMvQyxDQUFDLENBQUM7UUFDTCxDQUFDO0lBQ0gsQ0FBQztDQUNGO0FBM1ZELHNDQTJWQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFRlc3RDYXNlLCBUZXN0U3RlcCB9IGZyb20gJy4uLy4uL3R5cGVzL3Rlc3QtY2FzZSc7XHJcblxyXG4vKipcclxuICogVmFsaWRhdGlvbiBSZXN1bHRcclxuICogXHJcbiAqIENvbnRhaW5zIHZhbGlkYXRpb24gc3RhdHVzIGFuZCBhbnkgZXJyb3JzIGZvdW5kXHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFZhbGlkYXRpb25SZXN1bHQge1xyXG4gIHZhbGlkOiBib29sZWFuO1xyXG4gIGVycm9yczogVmFsaWRhdGlvbkVycm9yW107XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBWYWxpZGF0aW9uIEVycm9yXHJcbiAqIFxyXG4gKiBEZXNjcmliZXMgYSBzcGVjaWZpYyB2YWxpZGF0aW9uIGZhaWx1cmVcclxuICovXHJcbmV4cG9ydCBpbnRlcmZhY2UgVmFsaWRhdGlvbkVycm9yIHtcclxuICBmaWVsZDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIFRlc3QgVmFsaWRhdG9yXHJcbiAqIFxyXG4gKiBWYWxpZGF0ZXMgZ2VuZXJhdGVkIHRlc3QgY2FzZXMgYmVmb3JlIHBlcnNpc3RlbmNlLlxyXG4gKiBFbnN1cmVzIHRlc3QgY2FzZXMgbWVldCBzY2hlbWEgcmVxdWlyZW1lbnRzIGFuZCBidXNpbmVzcyBydWxlcy5cclxuICovXHJcbmV4cG9ydCBjbGFzcyBUZXN0VmFsaWRhdG9yIHtcclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBhIHRlc3QgY2FzZVxyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZXN0Q2FzZSAtIFRlc3QgY2FzZSB0byB2YWxpZGF0ZVxyXG4gICAqIEByZXR1cm5zIFZhbGlkYXRpb24gcmVzdWx0IHdpdGggYW55IGVycm9yc1xyXG4gICAqL1xyXG4gIHZhbGlkYXRlKHRlc3RDYXNlOiBUZXN0Q2FzZSk6IFZhbGlkYXRpb25SZXN1bHQge1xyXG4gICAgY29uc3QgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSA9IFtdO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHRlc3QgY2FzZSBzdHJ1Y3R1cmVcclxuICAgIHRoaXMudmFsaWRhdGVTdHJ1Y3R1cmUodGVzdENhc2UsIGVycm9ycyk7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgdGVzdCBjYXNlIG5hbWVcclxuICAgIHRoaXMudmFsaWRhdGVOYW1lKHRlc3RDYXNlLCBlcnJvcnMpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHByb2plY3QgSUQgZm9ybWF0XHJcbiAgICB0aGlzLnZhbGlkYXRlUHJvamVjdElkKHRlc3RDYXNlLCBlcnJvcnMpO1xyXG5cclxuICAgIC8vIFZhbGlkYXRlIHRlc3Qgc3RlcHNcclxuICAgIHRoaXMudmFsaWRhdGVTdGVwcyh0ZXN0Q2FzZSwgZXJyb3JzKTtcclxuXHJcbiAgICByZXR1cm4ge1xyXG4gICAgICB2YWxpZDogZXJyb3JzLmxlbmd0aCA9PT0gMCxcclxuICAgICAgZXJyb3JzLFxyXG4gICAgfTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIHRlc3QgY2FzZSBzdHJ1Y3R1cmVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdGVzdENhc2UgLSBUZXN0IGNhc2UgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlU3RydWN0dXJlKHRlc3RDYXNlOiBUZXN0Q2FzZSwgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xyXG4gICAgLy8gQ2hlY2sgcmVxdWlyZWQgZmllbGRzXHJcbiAgICBpZiAoIXRlc3RDYXNlLnRlc3RDYXNlSWQpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAndGVzdENhc2VJZCcsXHJcbiAgICAgICAgbWVzc2FnZTogJ1Rlc3QgY2FzZSBJRCBpcyByZXF1aXJlZCcsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGVzdENhc2Uuc3VpdGVJZCkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdzdWl0ZUlkJyxcclxuICAgICAgICBtZXNzYWdlOiAnU3VpdGUgSUQgaXMgcmVxdWlyZWQnLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXRlc3RDYXNlLnByb2plY3RJZCkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdwcm9qZWN0SWQnLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdQcm9qZWN0IElEIGlzIHJlcXVpcmVkJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCF0ZXN0Q2FzZS51c2VySWQpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAndXNlcklkJyxcclxuICAgICAgICBtZXNzYWdlOiAnVXNlciBJRCBpcyByZXF1aXJlZCcsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIGlmICghdGVzdENhc2UudHlwZSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICd0eXBlJyxcclxuICAgICAgICBtZXNzYWdlOiAnVGVzdCB0eXBlIGlzIHJlcXVpcmVkJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKCFBcnJheS5pc0FycmF5KHRlc3RDYXNlLnN0ZXBzKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdzdGVwcycsXHJcbiAgICAgICAgbWVzc2FnZTogJ1N0ZXBzIG11c3QgYmUgYW4gYXJyYXknLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIUFycmF5LmlzQXJyYXkodGVzdENhc2UudGFncykpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAndGFncycsXHJcbiAgICAgICAgbWVzc2FnZTogJ1RhZ3MgbXVzdCBiZSBhbiBhcnJheScsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgdGVzdCBjYXNlIG5hbWVcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdGVzdENhc2UgLSBUZXN0IGNhc2UgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlTmFtZSh0ZXN0Q2FzZTogVGVzdENhc2UsIGVycm9yczogVmFsaWRhdGlvbkVycm9yW10pOiB2b2lkIHtcclxuICAgIGlmICghdGVzdENhc2UubmFtZSB8fCB0ZXN0Q2FzZS5uYW1lLnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiAnbmFtZScsXHJcbiAgICAgICAgbWVzc2FnZTogJ1Rlc3QgY2FzZSBuYW1lIGNhbm5vdCBiZSBlbXB0eScsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgcHJvamVjdCBJRCBmb3JtYXRcclxuICAgKiBcclxuICAgKiBAcGFyYW0gdGVzdENhc2UgLSBUZXN0IGNhc2UgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlUHJvamVjdElkKHRlc3RDYXNlOiBUZXN0Q2FzZSwgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xyXG4gICAgaWYgKHRlc3RDYXNlLnByb2plY3RJZCkge1xyXG4gICAgICAvLyBVVUlEIGZvcm1hdCB2YWxpZGF0aW9uIChiYXNpYyBjaGVjaylcclxuICAgICAgY29uc3QgdXVpZFJlZ2V4ID0gL15bMC05YS1mXXs4fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXs0fS1bMC05YS1mXXsxMn0kL2k7XHJcbiAgICAgIGlmICghdXVpZFJlZ2V4LnRlc3QodGVzdENhc2UucHJvamVjdElkKSkge1xyXG4gICAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICAgIGZpZWxkOiAncHJvamVjdElkJyxcclxuICAgICAgICAgIG1lc3NhZ2U6ICdQcm9qZWN0IElEIG11c3QgYmUgYSB2YWxpZCBVVUlEJyxcclxuICAgICAgICB9KTtcclxuICAgICAgfVxyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVmFsaWRhdGUgdGVzdCBzdGVwc1xyXG4gICAqIFxyXG4gICAqIEBwYXJhbSB0ZXN0Q2FzZSAtIFRlc3QgY2FzZSB0byB2YWxpZGF0ZVxyXG4gICAqIEBwYXJhbSBlcnJvcnMgLSBBcnJheSB0byBjb2xsZWN0IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVTdGVwcyh0ZXN0Q2FzZTogVGVzdENhc2UsIGVycm9yczogVmFsaWRhdGlvbkVycm9yW10pOiB2b2lkIHtcclxuICAgIGlmICghQXJyYXkuaXNBcnJheSh0ZXN0Q2FzZS5zdGVwcykpIHtcclxuICAgICAgcmV0dXJuOyAvLyBBbHJlYWR5IHJlcG9ydGVkIGluIHN0cnVjdHVyZSB2YWxpZGF0aW9uXHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHRlc3RDYXNlLnN0ZXBzLmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6ICdzdGVwcycsXHJcbiAgICAgICAgbWVzc2FnZTogJ1Rlc3QgY2FzZSBtdXN0IGhhdmUgYXQgbGVhc3Qgb25lIHN0ZXAnLFxyXG4gICAgICB9KTtcclxuICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgIHRlc3RDYXNlLnN0ZXBzLmZvckVhY2goKHN0ZXAsIGluZGV4KSA9PiB7XHJcbiAgICAgIHRoaXMudmFsaWRhdGVTdGVwKHN0ZXAsIGluZGV4LCBlcnJvcnMpO1xyXG4gICAgfSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBhIHNpbmdsZSB0ZXN0IHN0ZXBcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc3RlcCAtIFRlc3Qgc3RlcCB0byB2YWxpZGF0ZVxyXG4gICAqIEBwYXJhbSBpbmRleCAtIFN0ZXAgaW5kZXggZm9yIGVycm9yIHJlcG9ydGluZ1xyXG4gICAqIEBwYXJhbSBlcnJvcnMgLSBBcnJheSB0byBjb2xsZWN0IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVTdGVwKHN0ZXA6IFRlc3RTdGVwLCBpbmRleDogbnVtYmVyLCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdKTogdm9pZCB7XHJcbiAgICBjb25zdCBzdGVwUHJlZml4ID0gYHN0ZXBzWyR7aW5kZXh9XWA7XHJcblxyXG4gICAgLy8gVmFsaWRhdGUgYWN0aW9uIHR5cGVcclxuICAgIGNvbnN0IHZhbGlkQWN0aW9ucyA9IFsnbmF2aWdhdGUnLCAnY2xpY2snLCAndHlwZScsICdhc3NlcnQnLCAnd2FpdCcsICdhcGktY2FsbCddO1xyXG4gICAgaWYgKCFzdGVwLmFjdGlvbiB8fCAhdmFsaWRBY3Rpb25zLmluY2x1ZGVzKHN0ZXAuYWN0aW9uKSkge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LmFjdGlvbmAsXHJcbiAgICAgICAgbWVzc2FnZTogYEludmFsaWQgYWN0aW9uIHR5cGU6ICR7c3RlcC5hY3Rpb259LiBNdXN0IGJlIG9uZSBvZjogJHt2YWxpZEFjdGlvbnMuam9pbignLCAnKX1gLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBzdGVwIG51bWJlclxyXG4gICAgaWYgKHR5cGVvZiBzdGVwLnN0ZXBOdW1iZXIgIT09ICdudW1iZXInIHx8IHN0ZXAuc3RlcE51bWJlciA8IDEpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiBgJHtzdGVwUHJlZml4fS5zdGVwTnVtYmVyYCxcclxuICAgICAgICBtZXNzYWdlOiAnU3RlcCBudW1iZXIgbXVzdCBiZSBhIHBvc2l0aXZlIG51bWJlcicsXHJcbiAgICAgIH0pO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFZhbGlkYXRlIGFjdGlvbi1zcGVjaWZpYyByZXF1aXJlbWVudHNcclxuICAgIHN3aXRjaCAoc3RlcC5hY3Rpb24pIHtcclxuICAgICAgY2FzZSAnbmF2aWdhdGUnOlxyXG4gICAgICAgIHRoaXMudmFsaWRhdGVOYXZpZ2F0ZVN0ZXAoc3RlcCwgc3RlcFByZWZpeCwgZXJyb3JzKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnY2xpY2snOlxyXG4gICAgICAgIHRoaXMudmFsaWRhdGVDbGlja1N0ZXAoc3RlcCwgc3RlcFByZWZpeCwgZXJyb3JzKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAndHlwZSc6XHJcbiAgICAgICAgdGhpcy52YWxpZGF0ZVR5cGVTdGVwKHN0ZXAsIHN0ZXBQcmVmaXgsIGVycm9ycyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2Fzc2VydCc6XHJcbiAgICAgICAgdGhpcy52YWxpZGF0ZUFzc2VydFN0ZXAoc3RlcCwgc3RlcFByZWZpeCwgZXJyb3JzKTtcclxuICAgICAgICBicmVhaztcclxuICAgICAgY2FzZSAnd2FpdCc6XHJcbiAgICAgICAgdGhpcy52YWxpZGF0ZVdhaXRTdGVwKHN0ZXAsIHN0ZXBQcmVmaXgsIGVycm9ycyk7XHJcbiAgICAgICAgYnJlYWs7XHJcbiAgICAgIGNhc2UgJ2FwaS1jYWxsJzpcclxuICAgICAgICB0aGlzLnZhbGlkYXRlQXBpQ2FsbFN0ZXAoc3RlcCwgc3RlcFByZWZpeCwgZXJyb3JzKTtcclxuICAgICAgICBicmVhaztcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIG5hdmlnYXRlIHN0ZXBcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc3RlcCAtIFRlc3Qgc3RlcCB0byB2YWxpZGF0ZVxyXG4gICAqIEBwYXJhbSBzdGVwUHJlZml4IC0gUHJlZml4IGZvciBlcnJvciBmaWVsZFxyXG4gICAqIEBwYXJhbSBlcnJvcnMgLSBBcnJheSB0byBjb2xsZWN0IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVOYXZpZ2F0ZVN0ZXAoc3RlcDogVGVzdFN0ZXAsIHN0ZXBQcmVmaXg6IHN0cmluZywgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xyXG4gICAgaWYgKCFzdGVwLnRhcmdldCB8fCBzdGVwLnRhcmdldC50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogYCR7c3RlcFByZWZpeH0udGFyZ2V0YCxcclxuICAgICAgICBtZXNzYWdlOiAnTmF2aWdhdGUgc3RlcCBtdXN0IGhhdmUgYSB0YXJnZXQgVVJMJyxcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBVUkwgZm9ybWF0IChIVFRQL0hUVFBTIG9ubHkpXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHN0ZXAudGFyZ2V0KTtcclxuICAgICAgaWYgKHVybC5wcm90b2NvbCAhPT0gJ2h0dHA6JyAmJiB1cmwucHJvdG9jb2wgIT09ICdodHRwczonKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LnRhcmdldGAsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnTmF2aWdhdGUgVVJMIG11c3QgdXNlIEhUVFAgb3IgSFRUUFMgcHJvdG9jb2wnLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LnRhcmdldGAsXHJcbiAgICAgICAgbWVzc2FnZTogJ05hdmlnYXRlIHRhcmdldCBtdXN0IGJlIGEgdmFsaWQgVVJMJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBjbGljayBzdGVwXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHN0ZXAgLSBUZXN0IHN0ZXAgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gc3RlcFByZWZpeCAtIFByZWZpeCBmb3IgZXJyb3IgZmllbGRcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlQ2xpY2tTdGVwKHN0ZXA6IFRlc3RTdGVwLCBzdGVwUHJlZml4OiBzdHJpbmcsIGVycm9yczogVmFsaWRhdGlvbkVycm9yW10pOiB2b2lkIHtcclxuICAgIGlmICghc3RlcC50YXJnZXQgfHwgc3RlcC50YXJnZXQudHJpbSgpID09PSAnJykge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LnRhcmdldGAsXHJcbiAgICAgICAgbWVzc2FnZTogJ0NsaWNrIHN0ZXAgbXVzdCBoYXZlIGEgdGFyZ2V0IHNlbGVjdG9yJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB0eXBlIHN0ZXBcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc3RlcCAtIFRlc3Qgc3RlcCB0byB2YWxpZGF0ZVxyXG4gICAqIEBwYXJhbSBzdGVwUHJlZml4IC0gUHJlZml4IGZvciBlcnJvciBmaWVsZFxyXG4gICAqIEBwYXJhbSBlcnJvcnMgLSBBcnJheSB0byBjb2xsZWN0IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVUeXBlU3RlcChzdGVwOiBUZXN0U3RlcCwgc3RlcFByZWZpeDogc3RyaW5nLCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdKTogdm9pZCB7XHJcbiAgICBpZiAoIXN0ZXAudGFyZ2V0IHx8IHN0ZXAudGFyZ2V0LnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiBgJHtzdGVwUHJlZml4fS50YXJnZXRgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUeXBlIHN0ZXAgbXVzdCBoYXZlIGEgdGFyZ2V0IHNlbGVjdG9yJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKHN0ZXAudmFsdWUgPT09IHVuZGVmaW5lZCB8fCBzdGVwLnZhbHVlID09PSBudWxsKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogYCR7c3RlcFByZWZpeH0udmFsdWVgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdUeXBlIHN0ZXAgbXVzdCBoYXZlIGEgdmFsdWUnLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIFZhbGlkYXRlIGFzc2VydCBzdGVwXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHN0ZXAgLSBUZXN0IHN0ZXAgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gc3RlcFByZWZpeCAtIFByZWZpeCBmb3IgZXJyb3IgZmllbGRcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlQXNzZXJ0U3RlcChzdGVwOiBUZXN0U3RlcCwgc3RlcFByZWZpeDogc3RyaW5nLCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdKTogdm9pZCB7XHJcbiAgICBpZiAoIXN0ZXAudGFyZ2V0IHx8IHN0ZXAudGFyZ2V0LnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiBgJHtzdGVwUHJlZml4fS50YXJnZXRgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBc3NlcnQgc3RlcCBtdXN0IGhhdmUgYSB0YXJnZXQgc2VsZWN0b3InLFxyXG4gICAgICB9KTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoIXN0ZXAuZXhwZWN0ZWRSZXN1bHQgfHwgc3RlcC5leHBlY3RlZFJlc3VsdC50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogYCR7c3RlcFByZWZpeH0uZXhwZWN0ZWRSZXN1bHRgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdBc3NlcnQgc3RlcCBtdXN0IGhhdmUgYW4gZXhwZWN0ZWQgcmVzdWx0JyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSB3YWl0IHN0ZXBcclxuICAgKiBcclxuICAgKiBAcGFyYW0gc3RlcCAtIFRlc3Qgc3RlcCB0byB2YWxpZGF0ZVxyXG4gICAqIEBwYXJhbSBzdGVwUHJlZml4IC0gUHJlZml4IGZvciBlcnJvciBmaWVsZFxyXG4gICAqIEBwYXJhbSBlcnJvcnMgLSBBcnJheSB0byBjb2xsZWN0IGVycm9yc1xyXG4gICAqL1xyXG4gIHByaXZhdGUgdmFsaWRhdGVXYWl0U3RlcChzdGVwOiBUZXN0U3RlcCwgc3RlcFByZWZpeDogc3RyaW5nLCBlcnJvcnM6IFZhbGlkYXRpb25FcnJvcltdKTogdm9pZCB7XHJcbiAgICBpZiAoIXN0ZXAudGFyZ2V0IHx8IHN0ZXAudGFyZ2V0LnRyaW0oKSA9PT0gJycpIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiBgJHtzdGVwUHJlZml4fS50YXJnZXRgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdXYWl0IHN0ZXAgbXVzdCBoYXZlIGEgdGFyZ2V0IGR1cmF0aW9uJyxcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSB0aGF0IHRhcmdldCBpcyBhIG51bWJlciAoYXMgc3RyaW5nKVxyXG4gICAgY29uc3QgZHVyYXRpb24gPSBwYXJzZUludChzdGVwLnRhcmdldCwgMTApO1xyXG4gICAgaWYgKGlzTmFOKGR1cmF0aW9uKSB8fCBkdXJhdGlvbiA8IDApIHtcclxuICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgIGZpZWxkOiBgJHtzdGVwUHJlZml4fS50YXJnZXRgLFxyXG4gICAgICAgIG1lc3NhZ2U6ICdXYWl0IHN0ZXAgdGFyZ2V0IG11c3QgYmUgYSBub24tbmVnYXRpdmUgbnVtYmVyIChtaWxsaXNlY29uZHMpJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBWYWxpZGF0ZSBBUEkgY2FsbCBzdGVwXHJcbiAgICogXHJcbiAgICogQHBhcmFtIHN0ZXAgLSBUZXN0IHN0ZXAgdG8gdmFsaWRhdGVcclxuICAgKiBAcGFyYW0gc3RlcFByZWZpeCAtIFByZWZpeCBmb3IgZXJyb3IgZmllbGRcclxuICAgKiBAcGFyYW0gZXJyb3JzIC0gQXJyYXkgdG8gY29sbGVjdCBlcnJvcnNcclxuICAgKi9cclxuICBwcml2YXRlIHZhbGlkYXRlQXBpQ2FsbFN0ZXAoc3RlcDogVGVzdFN0ZXAsIHN0ZXBQcmVmaXg6IHN0cmluZywgZXJyb3JzOiBWYWxpZGF0aW9uRXJyb3JbXSk6IHZvaWQge1xyXG4gICAgaWYgKCFzdGVwLnRhcmdldCB8fCBzdGVwLnRhcmdldC50cmltKCkgPT09ICcnKSB7XHJcbiAgICAgIGVycm9ycy5wdXNoKHtcclxuICAgICAgICBmaWVsZDogYCR7c3RlcFByZWZpeH0udGFyZ2V0YCxcclxuICAgICAgICBtZXNzYWdlOiAnQVBJIGNhbGwgc3RlcCBtdXN0IGhhdmUgYSB0YXJnZXQgVVJMJyxcclxuICAgICAgfSk7XHJcbiAgICAgIHJldHVybjtcclxuICAgIH1cclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBVUkwgZm9ybWF0IChIVFRQL0hUVFBTIG9ubHkpXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCB1cmwgPSBuZXcgVVJMKHN0ZXAudGFyZ2V0KTtcclxuICAgICAgaWYgKHVybC5wcm90b2NvbCAhPT0gJ2h0dHA6JyAmJiB1cmwucHJvdG9jb2wgIT09ICdodHRwczonKSB7XHJcbiAgICAgICAgZXJyb3JzLnB1c2goe1xyXG4gICAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LnRhcmdldGAsXHJcbiAgICAgICAgICBtZXNzYWdlOiAnQVBJIGNhbGwgVVJMIG11c3QgdXNlIEhUVFAgb3IgSFRUUFMgcHJvdG9jb2wnLFxyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICBlcnJvcnMucHVzaCh7XHJcbiAgICAgICAgZmllbGQ6IGAke3N0ZXBQcmVmaXh9LnRhcmdldGAsXHJcbiAgICAgICAgbWVzc2FnZTogJ0FQSSBjYWxsIHRhcmdldCBtdXN0IGJlIGEgdmFsaWQgVVJMJyxcclxuICAgICAgfSk7XHJcbiAgICB9XHJcbiAgfVxyXG59XHJcbiJdfQ==