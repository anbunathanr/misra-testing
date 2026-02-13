# Implementation Plan: Test Execution

## Overview

This implementation plan breaks down the test execution feature into discrete coding tasks. The approach follows an incremental pattern: infrastructure setup → core execution logic → API endpoints → frontend integration → testing. Each task builds on previous work to ensure continuous integration without orphaned code.

## Tasks

- [x] 1. Set up DynamoDB TestExecutions table and S3 screenshots bucket
  - Create TestExecutions table with primary key and GSIs in infrastructure stack
  - Create S3 bucket for screenshot storage with appropriate lifecycle policies
  - Add environment variables for table name and bucket name
  - _Requirements: 6.1, 5.2_

- [x] 2. Create SQS queue for test execution
  - Create SQS queue with dead-letter queue configuration
  - Set appropriate visibility timeout (15 minutes to match Lambda timeout)
  - Add queue URL to environment variables
  - _Requirements: 1.2, 8.1, 12.4_

- [x] 3. Implement test execution data models and types
  - Create TypeScript interfaces for TestExecution, StepResult, ExecutionStatus, ExecutionResult
  - Create types for SQS message format (ExecutionMessage)
  - Create API request/response types for all execution endpoints
  - _Requirements: 6.1, 6.2_

- [x] 3.1 Write property test for execution data model completeness
  - **Property 19: Execution Persistence**
  - **Validates: Requirements 6.1, 6.2**

- [x] 4. Set up Playwright for Lambda
  - Add @sparticuz/chromium and playwright-core dependencies
  - Create Lambda layer or configure container image with Chromium
  - Implement browser initialization function with headless configuration
  - Implement browser cleanup function
  - _Requirements: 10.1, 10.2, 10.3, 10.4_

- [x] 4.1 Write property test for browser initialization and cleanup
  - **Property 27: Browser Initialization Configuration**
  - **Property 28: Browser Resource Cleanup**
  - **Validates: Requirements 10.3, 10.4**

- [x] 5. Implement step execution logic
  - [x] 5.1 Implement navigate action executor
    - Create function to execute navigate steps with Playwright
    - Handle navigation timeouts and errors
    - _Requirements: 3.1_
  
  - [x] 5.2 Write property test for navigate action
    - **Property 10: Navigate Action Execution**
    - **Validates: Requirements 3.1**
  
  - [x] 5.3 Implement click action executor
    - Create function to execute click steps with element location and retry
    - _Requirements: 3.2_
  
  - [x] 5.4 Write property test for click action
    - **Property 11: Click Action Execution**
    - **Validates: Requirements 3.2**
  
  - [x] 5.5 Implement type action executor
    - Create function to execute type steps with element location and text input
    - _Requirements: 3.3_
  
  - [x] 5.6 Write property test for type action
    - **Property 12: Type Action Execution**
    - **Validates: Requirements 3.3**
  
  - [x] 5.7 Implement wait action executor
    - Create function to execute wait steps with specified duration
    - _Requirements: 3.4_
  
  - [x] 5.8 Write property test for wait action
    - **Property 13: Wait Action Execution**
    - **Validates: Requirements 3.4**
  
  - [x] 5.9 Implement assert action executor
    - Create function to execute assert steps with condition validation
    - Support visible, text, and value assertion types
    - _Requirements: 3.5_
  
  - [x] 5.10 Write property test for assert action
    - **Property 14: Assert Action Execution**
    - **Validates: Requirements 3.5**
  
  - [x] 5.11 Implement api-call action executor
    - Create function to execute API call steps with axios
    - Include request/response details in step result
    - _Requirements: 4.1_
  
  - [x] 5.12 Write property test for api-call action
    - **Property 17: API Call Execution**
    - **Validates: Requirements 4.1**

- [x] 6. Implement screenshot capture and storage
  - Create function to capture screenshots with Playwright
  - Create function to upload screenshots to S3 with unique keys
  - Integrate screenshot capture into step execution on failures
  - _Requirements: 5.1, 5.2, 5.3_

- [x] 6.1 Write property test for screenshot capture on UI failures
  - **Property 15: Screenshot Capture on UI Failure**
  - **Validates: Requirements 3.6, 5.1, 5.2**

- [x] 6.2 Write property test for screenshot association
  - **Property 16: Screenshot Association**
  - **Validates: Requirements 5.3, 5.4**

- [x] 7. Implement retry logic with exponential backoff
  - Create retry utility function with exponential backoff
  - Integrate retry logic into browser action executors
  - Integrate retry logic into API call executor
  - _Requirements: 12.1, 12.2_

- [x] 7.1 Write property test for retry behavior
  - **Property 30: Retry on Transient Failures**
  - **Validates: Requirements 12.1, 12.2**

- [x] 8. Implement core test executor service
  - Create function to execute a single test case with all steps sequentially
  - Implement status transition logic (queued → running → completed/error)
  - Implement result determination logic (pass/fail/error based on steps)
  - Handle errors and timeouts appropriately
  - _Requirements: 1.4, 1.5, 1.6, 1.7_

- [x] 8.1 Write property test for sequential step execution
  - **Property 3: Sequential Step Execution**
  - **Validates: Requirements 1.4**

- [x] 8.2 Write property test for successful execution result
  - **Property 4: Successful Execution Result**
  - **Validates: Requirements 1.5**

- [x] 8.3 Write property test for failed execution result
  - **Property 5: Failed Execution Result**
  - **Validates: Requirements 1.6**

- [x] 8.4 Write property test for error execution result
  - **Property 6: Error Execution Result**
  - **Validates: Requirements 1.7**

- [x] 9. Implement DynamoDB operations for test executions
  - Create function to create execution record with status "queued"
  - Create function to update execution status
  - Create function to update execution with final results
  - Create function to query execution by ID
  - Create function to query execution history with filters
  - _Requirements: 6.1, 6.3, 6.4, 7.1_

- [x] 9.1 Write property test for execution history filtering
  - **Property 20: Execution History Filtering**
  - **Validates: Requirements 6.3**

- [x] 9.2 Write property test for execution history ordering
  - **Property 21: Execution History Ordering**
  - **Validates: Requirements 6.4**

- [x] 10. Implement Executor Lambda function
  - Create Lambda handler that processes SQS messages
  - Initialize browser for UI tests
  - Execute test case using core executor service
  - Update execution record with results
  - Upload screenshots to S3
  - Clean up browser resources
  - Handle Lambda timeout scenarios
  - _Requirements: 1.3, 8.2, 8.3, 8.4_

- [x] 10.1 Write property test for execution status transitions
  - **Property 2: Execution Status Transitions**
  - **Validates: Requirements 1.3, 7.1**

- [x] 10.2 Write unit tests for Lambda timeout handling
  - Test timeout scenarios and error recording
  - _Requirements: 8.3, 8.4_

- [x] 11. Checkpoint - Ensure executor Lambda works end-to-end
  - Ensure all tests pass, ask the user if questions arise.

- [x] 12. Implement Trigger Lambda function for single test case
  - Create POST /api/executions/trigger endpoint handler
  - Validate request (testCaseId or testSuiteId required)
  - Authenticate user and verify project access
  - Fetch test case from TestCases table
  - Create execution record in TestExecutions table
  - Send message to SQS queue
  - Return execution ID and status
  - _Requirements: 1.1, 1.2, 11.1_

- [x] 12.1 Write property test for execution record creation
  - **Property 1: Execution Record Creation**
  - **Validates: Requirements 1.1, 1.2**

- [x] 12.2 Write unit test for trigger endpoint
  - Test endpoint exists and responds correctly
  - _Requirements: 11.1_

- [x] 13. Implement Trigger Lambda function for test suite
  - Extend trigger handler to support testSuiteId
  - Fetch test suite and all test cases from database
  - Create suite execution record
  - Create individual execution records for each test case
  - Queue all test cases to SQS
  - Return suite execution ID and test case execution IDs
  - _Requirements: 2.1, 2.2, 2.3, 11.2_

- [x] 13.1 Write property test for suite execution record creation
  - **Property 7: Suite Execution Record Creation**
  - **Validates: Requirements 2.1, 2.2, 2.3**

- [x] 13.2 Write property test for individual test case queueing
  - **Property 24: Individual Test Case Queueing**
  - **Validates: Requirements 8.1, 8.2**

- [x] 13.3 Write unit test for suite trigger endpoint
  - Test endpoint exists and responds correctly
  - _Requirements: 11.2_

- [x] 14. Implement suite status aggregation logic
  - Create function to calculate suite aggregate results from test case results
  - Create function to determine suite status based on test case statuses
  - Update Executor Lambda to update suite status after each test case completes
  - _Requirements: 2.4, 2.5_

- [x] 14.1 Write property test for suite aggregate results
  - **Property 8: Suite Aggregate Results**
  - **Validates: Requirements 2.4**

- [x] 14.2 Write property test for suite running status
  - **Property 9: Suite Running Status**
  - **Validates: Requirements 2.5**

- [x] 15. Implement Get Execution Status Lambda
  - Create GET /api/executions/{executionId}/status endpoint handler
  - Query execution record from DynamoDB
  - Calculate progress information (current step, percentage)
  - Return status, result, progress, and timing information
  - _Requirements: 7.2, 7.3, 11.3_

- [x] 15.1 Write property test for execution status API response
  - **Property 22: Execution Status API Response**
  - **Validates: Requirements 7.2, 7.3**

- [x] 15.2 Write property test for suite execution progress
  - **Property 23: Suite Execution Progress**
  - **Validates: Requirements 7.4**

- [x] 15.3 Write unit test for status endpoint
  - Test endpoint exists and responds correctly
  - _Requirements: 11.3_

- [x] 16. Implement Get Execution Results Lambda
  - Create GET /api/executions/{executionId} endpoint handler
  - Query execution record from DynamoDB
  - Generate pre-signed URLs for all screenshots
  - Return complete execution details with screenshot URLs
  - _Requirements: 9.1, 9.2, 9.3, 11.5_

- [ ] 16.1 Write property test for execution result completeness
  - **Property 25: Execution Result Completeness**
  - **Validates: Requirements 9.1, 9.2, 9.3**

- [ ] 16.2 Write unit test for results endpoint
  - Test endpoint exists and responds correctly
  - _Requirements: 11.5_

- [ ] 17. Implement Get Execution History Lambda
  - Create GET /api/executions/history endpoint handler
  - Parse query parameters (projectId, testCaseId, testSuiteId, date range, limit)
  - Query appropriate DynamoDB GSI based on filters
  - Apply date range filtering
  - Return paginated results ordered by timestamp descending
  - _Requirements: 6.3, 6.4, 11.4_

- [ ] 17.1 Write unit test for history endpoint
  - Test endpoint exists and responds correctly with filters
  - _Requirements: 11.4_

- [ ] 18. Implement suite execution results endpoint
  - Create GET /api/executions/suites/{suiteExecutionId} endpoint handler
  - Query suite execution record and all test case executions
  - Calculate aggregate statistics
  - Return suite results with individual test case results
  - _Requirements: 9.4_

- [ ] 18.1 Write property test for suite result completeness
  - **Property 26: Suite Result Completeness**
  - **Validates: Requirements 9.4**

- [ ] 19. Implement API authentication and authorization
  - Add authentication middleware to all execution endpoints
  - Verify user has access to the project for all operations
  - Return 401 for unauthenticated requests
  - Return 403 for unauthorized requests
  - _Requirements: 11.6_

- [ ] 19.1 Write property test for API authentication
  - **Property 29: API Authentication**
  - **Validates: Requirements 11.6**

- [ ] 20. Implement error handling and logging
  - Add comprehensive error handling to all Lambda functions
  - Implement detailed error logging with context
  - Add timeout handling with appropriate error messages
  - Configure CloudWatch log groups
  - _Requirements: 12.3, 12.5_

- [ ] 20.1 Write property test for timeout handling
  - **Property 31: Timeout Handling**
  - **Validates: Requirements 12.3**

- [ ] 20.2 Write property test for error logging
  - **Property 32: Error Logging**
  - **Validates: Requirements 12.5**

- [ ] 21. Checkpoint - Ensure all backend APIs work correctly
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 22. Create Redux RTK Query API for test executions
  - Create executionsApi with endpoints for trigger, status, results, and history
  - Configure polling for status endpoint
  - Add cache invalidation tags
  - _Requirements: 7.2_

- [ ] 23. Create ExecutionTriggerButton component
  - Create button component to trigger test case execution
  - Show loading state during trigger
  - Handle success and error states
  - Display execution ID on success
  - _Requirements: 1.1_

- [ ] 24. Create ExecutionStatusBadge component
  - Create badge component to display execution status
  - Implement polling to fetch status updates every 3 seconds
  - Show status (queued, running, completed, error) with appropriate colors
  - Show progress information (current step / total steps)
  - Stop polling when execution reaches terminal state
  - _Requirements: 7.2, 7.3_

- [ ] 25. Create ExecutionResultsTable component
  - Create table component to display execution history
  - Show execution ID, test case name, status, result, duration, timestamp
  - Support filtering by date range
  - Add click handler to view detailed results
  - _Requirements: 6.3, 6.4_

- [ ] 26. Create ExecutionDetailsModal component
  - Create modal component to show detailed execution results
  - Display overall status, result, and duration
  - Show step-by-step results with status indicators
  - Display error messages for failed steps
  - Show screenshots for failed UI steps with image viewer
  - _Requirements: 9.1, 9.2, 9.3_

- [ ] 27. Create ScreenshotViewer component
  - Create image viewer component for screenshots
  - Support zoom and pan functionality
  - Display screenshot timestamp and step information
  - _Requirements: 5.4_

- [ ] 28. Create TestSuiteExecutionView component
  - Create component to display suite execution results
  - Show aggregate statistics (total, passed, failed, errors)
  - Display individual test case results in a table
  - Support expanding test cases to see step details
  - _Requirements: 2.4, 9.4_

- [ ] 29. Create TestExecutionsPage
  - Create page component for viewing execution history
  - Integrate ExecutionResultsTable component
  - Add filters for project, test suite, test case, date range
  - Add ExecutionDetailsModal for viewing details
  - _Requirements: 6.3, 6.4, 9.1_

- [ ] 30. Integrate execution trigger into TestCasesPage
  - Add ExecutionTriggerButton to test case list items
  - Add ExecutionStatusBadge to show latest execution status
  - Add link to view execution history for each test case
  - _Requirements: 1.1, 7.2_

- [ ] 31. Integrate execution trigger into TestSuitesPage
  - Add ExecutionTriggerButton to test suite list items
  - Add ExecutionStatusBadge to show latest suite execution status
  - Add link to view suite execution results
  - _Requirements: 2.1, 7.2_

- [ ] 32. Add navigation menu item for Test Executions
  - Add "Executions" menu item to sidebar navigation
  - Link to TestExecutionsPage
  - _Requirements: 9.1_

- [ ] 33. Final checkpoint - End-to-end testing
  - Ensure all tests pass, ask the user if questions arise.
  - Manually test complete flow: trigger execution → monitor status → view results
  - Test both single test case and test suite execution
  - Verify screenshots are captured and displayed correctly
  - Verify execution history filtering and pagination

## Notes

- All tasks are required for comprehensive implementation
- Each task references specific requirements for traceability
- Checkpoints ensure incremental validation at key milestones
- Property tests validate universal correctness properties with minimum 100 iterations
- Unit tests validate specific examples, edge cases, and API endpoints
- Browser automation requires Lambda Layer with Chromium or container image deployment
- SQS queue enables async execution to handle Lambda timeout constraints
- Pre-signed S3 URLs provide secure, temporary access to screenshots
