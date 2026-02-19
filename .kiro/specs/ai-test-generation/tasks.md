# Implementation Plan: AI-Based Test Generation

## Overview

This implementation plan breaks down the AI-Based Test Generation feature into discrete coding tasks. The feature will be built incrementally, starting with core infrastructure, then adding AI integration, application analysis, test generation, and finally advanced features like batch processing and learning.

Each task builds on previous work and includes property-based tests to validate correctness properties from the design document.

## Tasks

- [x] 1. Set up AI test generation infrastructure
  - Create directory structure: `packages/backend/src/services/ai-test-generation/`
  - Define TypeScript types for AI test generation in `packages/backend/src/types/ai-test-generation.ts`
  - Set up OpenAI API client configuration in `packages/backend/src/config/openai-config.ts`
  - Install dependencies: `openai`, `puppeteer`, `fast-check` (dev)
  - _Requirements: 1.1_

- [x] 2. Implement AI Engine
  - [x] 2.1 Create AI Engine service
    - Implement `AIEngine` class in `packages/backend/src/services/ai-test-generation/ai-engine.ts`
    - Implement `generateTestSpecification()` method with OpenAI API integration
    - Implement structured prompt construction from ApplicationAnalysis
    - Implement response parsing to TestSpecification format
    - _Requirements: 1.2, 1.3_
  
  - [ ]* 2.2 Write property test for LLM response parsing
    - **Property 1: LLM Response Parsing Preserves Structure**
    - **Validates: Requirements 1.3**
  
  - [x] 2.3 Implement response validation
    - Implement `validateResponse()` method with schema validation
    - Add Zod schema for TestSpecification validation
    - _Requirements: 1.6_
  
  - [ ]* 2.4 Write property test for response validation
    - **Property 2: Response Schema Validation Correctness**
    - **Validates: Requirements 1.6**
  
  - [x] 2.5 Implement retry logic and error handling
    - Add exponential backoff retry logic (3 attempts: 1s, 2s, 4s)
    - Implement circuit breaker pattern for API failures
    - Add comprehensive error handling with descriptive messages
    - _Requirements: 1.4, 1.5, 10.1, 10.3, 10.5, 10.6_
  
  - [ ]* 2.6 Write unit tests for retry and circuit breaker
    - Test retry logic with simulated failures
    - Test circuit breaker state transitions
    - Test error message formatting
    - _Requirements: 1.4, 1.5, 10.5, 10.6_
  
  - [x] 2.7 Implement API interaction logging
    - Add logging for all API calls with request/response details
    - Include token usage in log entries
    - _Requirements: 1.7_
  
  - [ ]* 2.8 Write property test for API logging
    - **Property 3: API Interaction Logging**
    - **Validates: Requirements 1.7**

- [x] 3. Implement Application Analyzer
  - [x] 3.1 Create Application Analyzer service
    - Implement `ApplicationAnalyzer` class in `packages/backend/src/services/ai-test-generation/application-analyzer.ts`
    - Set up Puppeteer browser instance management
    - Implement `analyze()` method to load pages and extract DOM
    - _Requirements: 2.1_
  
  - [x] 3.2 Implement element identification
    - Add logic to identify interactive elements (buttons, links, inputs, selects, textareas, checkboxes, radios)
    - Extract element attributes (id, class, name, aria-label, data-testid, placeholder, text)
    - Generate CSS path and XPath for each element
    - _Requirements: 2.2, 2.3_
  
  - [ ]* 3.3 Write property tests for element identification
    - **Property 4: Interactive Element Identification**
    - **Property 5: Element Attribute Extraction Completeness**
    - **Validates: Requirements 2.2, 2.3**
  
  - [x] 3.4 Implement UI pattern detection
    - Add heuristics to detect forms, navigation menus, modals, tables
    - Group related elements into patterns
    - _Requirements: 2.4_
  
  - [ ]* 3.5 Write property test for UI pattern detection
    - **Property 6: UI Pattern Detection**
    - **Validates: Requirements 2.4**
  
  - [x] 3.6 Implement page metadata capture
    - Extract page title, viewport configuration, load time
    - Detect single-page application characteristics
    - _Requirements: 2.5_
  
  - [ ]* 3.7 Write property test for metadata capture
    - **Property 7: Page Metadata Capture**
    - **Validates: Requirements 2.5**
  
  - [x] 3.8 Implement user flow identification
    - Analyze navigation structure to identify potential flows
    - Detect form submission flows
    - _Requirements: 2.7_
  
  - [ ]* 3.9 Write property test for user flow identification
    - **Property 8: User Flow Identification**
    - **Validates: Requirements 2.7**
  
  - [x] 3.10 Implement SPA handling and error handling
    - Add wait logic for dynamic content (network idle detection)
    - Handle page load failures with descriptive errors
    - Add timeout configuration (30s default)
    - _Requirements: 2.6, 2.9, 10.2_
  
  - [ ]* 3.11 Write unit tests for SPA and error handling
    - Test SPA detection and wait logic
    - Test page load failure scenarios
    - Test timeout handling
    - _Requirements: 2.6, 2.9, 10.2_
  
  - [ ]* 3.12 Write property test for analysis result structure
    - **Property 9: Analysis Result Structure Completeness**
    - **Validates: Requirements 2.8**

- [x] 4. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 5. Implement Selector Generator
  - [x] 5.1 Create Selector Generator service
    - Implement `SelectorGenerator` class in `packages/backend/src/services/ai-test-generation/selector-generator.ts`
    - Implement `generateSelector()` method with priority-based selection
    - Implement selector priority order: data-testid > id > aria-label > name > class > xpath
    - _Requirements: 4.1, 4.2, 4.3, 4.4_
  
  - [ ]* 5.2 Write property test for selector priority
    - **Property 17: Selector Priority Order**
    - **Validates: Requirements 4.1, 4.2, 4.3, 4.4**
  
  - [x] 5.3 Implement selector validation and refinement
    - Implement `validateSelector()` method to check uniqueness
    - Add refinement logic for non-unique selectors
    - Ensure position-based selectors are avoided
    - _Requirements: 4.6, 4.7, 4.8_
  
  - [ ]* 5.4 Write property tests for selector validation
    - **Property 18: Position-Based Selector Avoidance**
    - **Property 19: Selector Uniqueness**
    - **Property 20: Selector Refinement Produces Uniqueness**
    - **Validates: Requirements 4.6, 4.7, 4.8**

- [x] 6. Implement Test Generator
  - [x] 6.1 Create Test Generator service
    - Implement `TestGenerator` class in `packages/backend/src/services/ai-test-generation/test-generator.ts`
    - Implement `generate()` method to convert TestSpecification to TestCase
    - Integrate with AI Engine, Selector Generator, and Test Validator
    - Map AI-generated steps to TestStep format
    - _Requirements: 3.1, 3.2_
  
  - [ ]* 6.2 Write property test for test case generation
    - **Property 10: Test Case Generation Completeness**
    - **Validates: Requirements 3.1**
  
  - [x] 6.3 Implement step generation logic
    - Map each AI step action to TestStep with proper parameters
    - Generate selectors for element interactions using Selector Generator
    - Assign sequential step numbers
    - _Requirements: 3.2, 3.3, 3.4, 3.5, 3.6_
  
  - [ ]* 6.4 Write property tests for step generation
    - **Property 11: Test Step Action Type Validity**
    - **Property 12: Test Step Required Parameters**
    - **Validates: Requirements 3.2, 3.3, 3.4, 3.5, 3.6**
  
  - [x] 6.5 Implement test case metadata
    - Assign descriptive name from TestSpecification
    - Add tags including 'ai-generated' tag
    - Set test case type (primarily 'ui')
    - Associate with projectId and suiteId
    - _Requirements: 3.7, 3.8, 3.10_
  
  - [ ]* 6.6 Write property tests for test case metadata
    - **Property 13: Test Case Naming**
    - **Property 14: AI-Generated Tag Assignment**
    - **Property 16: Project Association Preservation**
    - **Validates: Requirements 3.7, 3.8, 3.10**
  
  - [x] 6.7 Implement test case persistence
    - Integrate with TestCaseService to persist generated tests
    - Ensure all fields are properly saved
    - _Requirements: 3.9_
  
  - [ ]* 6.8 Write property test for persistence
    - **Property 15: Test Case Persistence Round-Trip**
    - **Validates: Requirements 3.9**

- [x] 7. Implement Test Validator
  - [x] 7.1 Create Test Validator service
    - Implement `TestValidator` class in `packages/backend/src/services/ai-test-generation/test-validator.ts`
    - Implement `validate()` method with comprehensive validation rules
    - Validate test case structure against schema
    - Validate action types and required parameters
    - _Requirements: 5.1, 5.2, 5.3_
  
  - [ ]* 7.2 Write property tests for schema validation
    - **Property 21: Test Case Schema Validation**
    - **Validates: Requirements 5.1, 5.2, 5.3**
  
  - [x] 7.3 Implement field-specific validation
    - Validate selectors are non-empty strings
    - Validate URLs in navigate steps (HTTP/HTTPS only)
    - Validate test case name is non-empty
    - Validate projectId is valid UUID format
    - _Requirements: 5.4, 5.5, 5.6, 5.7_
  
  - [ ]* 7.4 Write property tests for field validation
    - **Property 22: Selector Non-Empty Validation**
    - **Property 23: Navigate URL Validation**
    - **Property 24: Test Case Name Validation**
    - **Property 25: Project ID Format Validation**
    - **Validates: Requirements 5.4, 5.5, 5.6, 5.7**
  
  - [x] 7.5 Implement validation error handling
    - Collect all validation errors (don't fail fast)
    - Return structured ValidationResult with all errors
    - _Requirements: 5.8, 5.9_
  
  - [ ]* 7.6 Write property tests for validation results
    - **Property 26: Validation Error Completeness**
    - **Property 27: Valid Test Case Acceptance**
    - **Validates: Requirements 5.8, 5.9**

- [x] 8. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 9. Implement Cost Tracker
  - [ ] 9.1 Create Cost Tracker infrastructure
    - Create DynamoDB table for AI usage: `AIUsage` table in `packages/backend/src/infrastructure/ai-usage-table.ts`
    - Define usage record schema with GSIs for projectId and timestamp
    - _Requirements: 9.1, 9.2, 9.4_
  
  - [ ] 9.2 Create Cost Tracker service
    - Implement `CostTracker` class in `packages/backend/src/services/ai-test-generation/cost-tracker.ts`
    - Implement `recordUsage()` method to store usage records
    - Implement token usage tracking
    - _Requirements: 9.1, 9.2, 9.4_
  
  - [ ]* 9.3 Write property tests for usage tracking
    - **Property 43: User API Call Tracking**
    - **Property 44: Token Usage Recording**
    - **Property 46: Usage Record Metadata**
    - **Validates: Requirements 9.1, 9.2, 9.4**
  
  - [ ] 9.4 Implement cost calculation
    - Add configurable pricing rates for OpenAI models
    - Implement cost calculation: (promptTokens × promptRate + completionTokens × completionRate)
    - _Requirements: 9.3_
  
  - [ ]* 9.5 Write property test for cost calculation
    - **Property 45: Cost Calculation Accuracy**
    - **Validates: Requirements 9.3**
  
  - [ ] 9.6 Implement usage limits and statistics
    - Implement `checkLimit()` method to enforce per-user/per-project limits
    - Implement `getUsageStats()` method with aggregation by user, project, time period
    - _Requirements: 9.5, 9.6, 9.7, 9.8_
  
  - [ ]* 9.7 Write property tests for usage limits and stats
    - **Property 47: Usage Limit Enforcement**
    - **Property 48: Usage Statistics Aggregation**
    - **Validates: Requirements 9.5, 9.8**
  
  - [ ]* 9.8 Write unit tests for limit enforcement
    - Test limit checking with various usage levels
    - Test error response when limit is reached
    - _Requirements: 9.6_

- [ ] 10. Implement Batch Processor
  - [ ] 10.1 Create Batch Processor service
    - Implement `BatchProcessor` class in `packages/backend/src/services/ai-test-generation/batch-processor.ts`
    - Implement `generateBatch()` method for bulk test generation
    - Analyze application once and reuse for all scenarios
    - _Requirements: 6.1, 6.2, 6.3_
  
  - [ ]* 10.2 Write property test for batch generation
    - **Property 28: Batch Generation Attempt Count**
    - **Validates: Requirements 6.1, 6.3**
  
  - [ ] 10.3 Implement parallel processing and result aggregation
    - Process scenarios in parallel (configurable concurrency)
    - Collect results from all generation attempts
    - Continue processing even if individual generations fail
    - _Requirements: 6.4, 6.5, 6.7_
  
  - [ ]* 10.4 Write property tests for batch results
    - **Property 29: Batch Result Completeness**
    - **Property 31: Batch Failure Isolation**
    - **Validates: Requirements 6.5, 6.7**
  
  - [ ] 10.5 Implement batch summary and persistence
    - Calculate summary statistics (total, succeeded, failed)
    - Persist all successful test cases
    - Include detailed error information for failures
    - _Requirements: 6.6, 6.8, 6.9_
  
  - [ ]* 10.6 Write property tests for batch summary and persistence
    - **Property 30: Batch Summary Accuracy**
    - **Property 32: Batch Success Persistence**
    - **Property 33: Batch Failure Details**
    - **Validates: Requirements 6.6, 6.8, 6.9**

- [ ] 11. Implement Learning Engine
  - [ ] 11.1 Create Learning Engine infrastructure
    - Create DynamoDB table for learning data: `AILearning` table in `packages/backend/src/infrastructure/ai-learning-table.ts`
    - Define learning record schema with domain-based partitioning
    - _Requirements: 7.7_
  
  - [ ] 11.2 Create Learning Engine service
    - Implement `LearningEngine` class in `packages/backend/src/services/ai-test-generation/learning-engine.ts`
    - Implement `recordExecution()` method to track test results
    - Extract domain from test case URL for context grouping
    - _Requirements: 7.1_
  
  - [ ]* 11.3 Write property test for execution recording
    - **Property 34: Execution Result Recording**
    - **Validates: Requirements 7.1**
  
  - [ ] 11.4 Implement selector failure tracking
    - Detect selector failures from execution results
    - Record failing selectors with strategy and failure count
    - _Requirements: 7.2_
  
  - [ ]* 11.5 Write property test for selector failure tracking
    - **Property 35: Selector Failure Recording**
    - **Validates: Requirements 7.2**
  
  - [ ] 11.6 Implement success rate tracking
    - Track success/failure counts for selector strategies
    - Track success/failure counts for test patterns
    - _Requirements: 7.3, 7.4_
  
  - [ ]* 11.7 Write property tests for success tracking
    - **Property 36: Selector Strategy Success Tracking**
    - **Property 37: Test Pattern Success Tracking**
    - **Validates: Requirements 7.3, 7.4**
  
  - [ ] 11.8 Implement learning context provision
    - Implement `getLearningContext()` method to retrieve domain-specific learning data
    - Provide successful patterns, failing patterns, and selector preferences
    - Integrate learning context into AI Engine prompts
    - _Requirements: 7.5, 7.6_
  
  - [ ]* 11.9 Write property tests for learning context
    - **Property 38: Learning Context Provision**
    - **Property 39: Domain-Specific Learning History**
    - **Validates: Requirements 7.5, 7.6, 7.7**

- [ ] 12. Checkpoint - Ensure all tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 13. Implement API endpoints
  - [ ] 13.1 Create analyze endpoint
    - Implement POST `/api/ai-test-generation/analyze` handler in `packages/backend/src/functions/ai-test-generation/analyze.ts`
    - Accept URL and analysis options
    - Invoke Application Analyzer
    - Return ApplicationAnalysis results
    - _Requirements: 8.1_
  
  - [ ] 13.2 Create generate endpoint
    - Implement POST `/api/ai-test-generation/generate` handler in `packages/backend/src/functions/ai-test-generation/generate.ts`
    - Accept analysis results, scenario description, projectId, suiteId
    - Invoke Test Generator
    - Record usage with Cost Tracker
    - Return generated test case
    - _Requirements: 8.2_
  
  - [ ] 13.3 Create batch generate endpoint
    - Implement POST `/api/ai-test-generation/batch` handler in `packages/backend/src/functions/ai-test-generation/batch.ts`
    - Accept URL, scenario list, projectId, suiteId
    - Invoke Batch Processor
    - Record usage with Cost Tracker
    - Return batch results
    - _Requirements: 8.3_
  
  - [ ] 13.4 Create usage stats endpoint
    - Implement GET `/api/ai-test-generation/usage` handler in `packages/backend/src/functions/ai-test-generation/get-usage.ts`
    - Accept query parameters for userId, projectId, date range
    - Invoke Cost Tracker to retrieve statistics
    - Return usage statistics and cost estimates
    - _Requirements: 8.4, 9.7_
  
  - [ ] 13.5 Add authentication and authorization
    - Apply existing authentication middleware to all endpoints
    - Add project-level authorization checks
    - _Requirements: 8.5, 8.6_
  
  - [ ] 13.6 Implement error handling and response formatting
    - Add comprehensive error handling for all endpoints
    - Return appropriate HTTP status codes (200, 400, 401, 403, 500)
    - Format error responses consistently with error messages
    - Include request identifiers in all responses
    - _Requirements: 8.7, 8.8, 10.7, 10.8_
  
  - [ ]* 13.7 Write property tests for API responses
    - **Property 40: API Response Status Code Correctness**
    - **Property 41: Error Response Format Consistency**
    - **Property 42: Success Response Data Completeness**
    - **Property 49: Error Logging Context**
    - **Property 50: Error Response Traceability**
    - **Validates: Requirements 8.7, 8.8, 8.9, 10.7, 10.8**
  
  - [ ]* 13.8 Write integration tests for API endpoints
    - Test analyze endpoint with sample URLs
    - Test generate endpoint with analysis and scenarios
    - Test batch endpoint with multiple scenarios
    - Test usage stats endpoint with various queries
    - Test authentication and authorization
    - Test error scenarios (invalid input, API failures, limit exceeded)
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_

- [ ] 14. Add infrastructure and deployment configuration
  - [ ] 14.1 Update CDK stack
    - Add AIUsage and AILearning tables to infrastructure stack
    - Add Lambda functions for AI test generation endpoints
    - Configure API Gateway routes
    - Set up environment variables for OpenAI API key
    - Grant Lambda permissions for DynamoDB tables and S3 (if needed)
    - _Requirements: All_
  
  - [ ] 14.2 Add configuration management
    - Create configuration file for OpenAI model selection (GPT-4 vs GPT-3.5-turbo)
    - Add configuration for usage limits (per-user, per-project)
    - Add configuration for pricing rates
    - Add configuration for retry and timeout settings
    - _Requirements: 1.4, 1.8, 9.3, 9.5_

- [ ] 15. Create property test generators
  - [ ] 15.1 Create test data generators
    - Implement fast-check generators in `packages/backend/src/__tests__/generators/ai-test-generation-generators.ts`
    - Create generator for ApplicationAnalysis objects
    - Create generator for TestSpecification objects
    - Create generator for IdentifiedElement objects
    - Create generator for TestCase objects
    - Create generator for LLM responses (valid and invalid)
    - Create generator for usage records
    - _Requirements: All property tests_

- [ ] 16. Final checkpoint - Ensure all tests pass
  - Run all unit tests, property tests, and integration tests
  - Verify test coverage meets goals (>80% unit coverage, all 50 properties implemented)
  - Ensure all tests pass, ask the user if questions arise.

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties from the design document
- Integration tests verify end-to-end flows and API contracts
- The implementation follows a bottom-up approach: infrastructure → core services → integration → API
- OpenAI API key must be configured as environment variable before testing
- Consider using OpenAI API mocking for tests to avoid costs during development
