# Implementation Plan: Notification System

## Overview

This implementation plan breaks down the notification system into discrete, incremental tasks. The system will be built in layers: infrastructure setup, core services, Lambda functions, API endpoints, and testing. Each task builds on previous work to ensure continuous integration and early validation.

## Tasks

- [x] 1. Set up infrastructure and DynamoDB tables
  - Create NotificationPreferences DynamoDB table with userId partition key
  - Create NotificationTemplates DynamoDB table with templateId partition key and EventTypeChannelIndex GSI
  - Create NotificationHistory DynamoDB table with notificationId partition key, UserTimeIndex GSI, and EventTypeTimeIndex GSI
  - Create SNS topics for email, SMS, and webhook notifications
  - Create SQS notification queue with DLQ configuration
  - Add infrastructure to misra-platform-stack.ts
  - _Requirements: 1.1, 1.4, 6.1, 7.1, 8.1_

- [x] 2. Implement core notification data types and interfaces
  - Create types/notification.ts with NotificationEvent, NotificationPreferences, NotificationTemplate, NotificationHistoryRecord interfaces
  - Create types for SNS delivery options and results
  - Create types for n8n webhook payloads and results
  - Create types for template rendering context
  - _Requirements: 1.2, 5.1, 6.1, 7.1, 8.1_

- [x] 3. Implement Retry Handler Service
  - [x] 3.1 Create services/retry-handler-service.ts
    - Implement executeWithRetry method with exponential backoff
    - Implement calculateBackoffDelay method
    - Support configurable retry parameters (maxRetries, initialDelay, backoffMultiplier)
    - _Requirements: 1.3, 9.1_
  
  - [ ]* 3.2 Write property test for retry logic
    - **Property 3: Retry with Exponential Backoff**
    - **Validates: Requirements 1.3, 9.1**
  
  - [ ]* 3.3 Write unit tests for retry handler
    - Test successful operation on first attempt
    - Test retry on transient failures
    - Test exhausted retries
    - _Requirements: 1.3, 9.1_

- [x] 4. Implement SNS Delivery Service
  - [x] 4.1 Create services/sns-delivery-service.ts
    - Implement sendEmail method
    - Implement sendSMS method
    - Implement sendWebhook method
    - Implement sendToSlack method with Block Kit formatting
    - Implement publishToTopic method
    - Integrate retry handler for failed deliveries
    - _Requirements: 1.2, 1.3, 1.6, 10.1, 10.2_
  
  - [ ]* 4.2 Write property test for SNS message publishing
    - **Property 2: SNS Message Publishing**
    - **Validates: Requirements 1.2**
  
  - [ ]* 4.3 Write property test for payload size validation
    - **Property 5: Payload Size Validation**
    - **Validates: Requirements 1.6**
  
  - [ ]* 4.4 Write property test for Slack Block Kit formatting
    - **Property 42: Slack Block Kit Formatting**
    - **Validates: Requirements 10.2**
  
  - [ ]* 4.5 Write unit tests for SNS delivery service
    - Test email delivery with valid recipient
    - Test SMS delivery with valid phone number
    - Test webhook delivery with valid URL
    - Test Slack delivery with action buttons
    - Test payload size rejection
    - _Requirements: 1.2, 1.6, 10.1, 10.2, 10.3_

- [x] 5. Implement n8n Integration Service
  - [x] 5.1 Create services/n8n-integration-service.ts
    - Implement sendToWebhook method with timeout (10 seconds)
    - Implement isEnabled method
    - Implement validateConfiguration method
    - Add authentication header support (API key, bearer token)
    - _Requirements: 5.1, 5.2, 5.4, 5.5_
  
  - [ ]* 5.2 Write property test for n8n webhook delivery
    - **Property 19: n8n Webhook Delivery**
    - **Validates: Requirements 5.1, 5.2**
  
  - [ ]* 5.3 Write property test for n8n authentication headers
    - **Property 22: n8n Authentication Headers**
    - **Validates: Requirements 5.5**
  
  - [ ]* 5.4 Write unit tests for n8n integration
    - Test successful webhook delivery
    - Test webhook timeout handling
    - Test authentication header inclusion
    - Test disabled n8n configuration
    - _Requirements: 5.1, 5.2, 5.4, 5.5_

- [x] 6. Implement Notification Template Service
  - [x] 6.1 Create services/notification-template-service.ts
    - Implement getTemplate method (query by eventType and channel)
    - Implement renderTemplate method with variable substitution
    - Implement createTemplate method
    - Implement updateTemplate method
    - Implement validateTemplate method (check syntax)
    - Handle missing variables with default values
    - _Requirements: 8.1, 8.2, 8.3, 8.4, 8.5, 8.6_
  
  - [ ]* 6.2 Write property test for template variable substitution
    - **Property 35: Template Variable Substitution**
    - **Validates: Requirements 8.2**
  
  - [ ]* 6.3 Write property test for missing variable handling
    - **Property 38: Missing Variable Graceful Handling**
    - **Validates: Requirements 8.5**
  
  - [ ]* 6.4 Write property test for template syntax validation
    - **Property 39: Template Syntax Validation**
    - **Validates: Requirements 8.6**
  
  - [ ]* 6.5 Write unit tests for template service
    - Test template retrieval by event type and channel
    - Test variable substitution with all variables present
    - Test variable substitution with missing variables
    - Test template validation with invalid syntax
    - Test template update persistence
    - _Requirements: 8.1, 8.2, 8.4, 8.5, 8.6_

- [x] 7. Implement Notification Preferences Service
  - [x] 7.1 Create services/notification-preferences-service.ts
    - Implement getPreferences method
    - Implement updatePreferences method
    - Implement shouldSendNotification method (check enabled/disabled)
    - Implement getDeliveryChannels method
    - Implement isInQuietHours method
    - Implement checkFrequencyLimit method
    - Validate email addresses and phone numbers
    - Apply default preferences when none configured
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_
  
  - [ ]* 7.2 Write property test for preference-based filtering
    - **Property 24: Preference-Based Event Filtering**
    - **Validates: Requirements 6.1, 6.2**
  
  - [ ]* 7.3 Write property test for quiet hours suppression
    - **Property 25: Quiet Hours Suppression**
    - **Validates: Requirements 6.3**
  
  - [ ]* 7.4 Write property test for default preferences
    - **Property 26: Default Preferences Application**
    - **Validates: Requirements 6.4**
  
  - [ ]* 7.5 Write property test for contact validation
    - **Property 27: Contact Information Validation**
    - **Validates: Requirements 6.5**
  
  - [ ]* 7.6 Write property test for frequency limit batching
    - **Property 28: Frequency Limit Batching**
    - **Validates: Requirements 6.6, 6.7**
  
  - [ ]* 7.7 Write unit tests for preferences service
    - Test preference retrieval
    - Test preference updates
    - Test quiet hours detection
    - Test frequency limit checking
    - Test email/phone validation
    - _Requirements: 6.1, 6.2, 6.3, 6.4, 6.5, 6.6_

- [x] 8. Implement Notification History Service
  - [x] 8.1 Create services/notification-history-service.ts
    - Implement recordNotification method
    - Implement updateDeliveryStatus method
    - Implement queryHistory method with filtering and pagination
    - Implement getNotificationById method
    - Implement archiveOldRecords method
    - Set TTL to 90 days for all records
    - _Requirements: 7.1, 7.2, 7.3, 7.4, 7.5, 7.6_
  
  - [ ]* 8.2 Write property test for history persistence
    - **Property 29: History Persistence Completeness**
    - **Validates: Requirements 7.1, 7.4**
  
  - [ ]* 8.3 Write property test for history TTL
    - **Property 30: History TTL Configuration**
    - **Validates: Requirements 7.2**
  
  - [ ]* 8.4 Write property test for history query filtering
    - **Property 31: History Query Filtering**
    - **Validates: Requirements 7.3**
  
  - [ ]* 8.5 Write property test for history pagination
    - **Property 33: History Pagination**
    - **Validates: Requirements 7.6**
  
  - [ ]* 8.6 Write unit tests for history service
    - Test notification recording
    - Test delivery status updates
    - Test query with various filters
    - Test pagination with different page sizes
    - Test TTL value calculation
    - _Requirements: 7.1, 7.2, 7.3, 7.5, 7.6_

- [x] 9. Checkpoint - Ensure all service tests pass
  - Ensure all tests pass, ask the user if questions arise.

- [x] 10. Implement Notification Processor Lambda
  - [x] 10.1 Create functions/notifications/processor.ts
    - Parse notification event from SQS message
    - Check user preferences and filter if disabled
    - Check quiet hours and suppress if applicable
    - Check frequency limits and batch if exceeded
    - Get appropriate template for event type and channel
    - Render template with event context
    - Route to n8n webhook if enabled, otherwise SNS
    - Handle n8n fallback to SNS on failure
    - Record notification attempt in history
    - Update delivery status based on result
    - Handle critical alert preference override
    - _Requirements: 1.2, 2.1, 2.2, 2.3, 2.4, 2.5, 2.6, 3.5, 5.1, 5.4, 6.1, 6.3, 6.7, 7.1, 8.1_
  
  - [ ]* 10.2 Write property test for test event notification generation
    - **Property 1: Test Event Notification Generation**
    - **Validates: Requirements 2.1, 2.2, 2.3**
  
  - [ ]* 10.3 Write property test for required notification fields
    - **Property 6: Required Notification Fields**
    - **Validates: Requirements 2.4**
  
  - [ ]* 10.4 Write property test for screenshot inclusion
    - **Property 7: Conditional Screenshot Inclusion**
    - **Validates: Requirements 2.5**
  
  - [ ]* 10.5 Write property test for recipient authorization
    - **Property 8: Recipient Authorization Filtering**
    - **Validates: Requirements 2.6**
  
  - [ ]* 10.6 Write property test for critical alert generation
    - **Property 9: Critical Alert Generation**
    - **Validates: Requirements 3.1, 3.6**
  
  - [ ]* 10.7 Write property test for critical alert preference override
    - **Property 13: Critical Alert Preference Override**
    - **Validates: Requirements 3.5**
  
  - [ ]* 10.8 Write property test for n8n fallback
    - **Property 21: n8n Fallback to SNS**
    - **Validates: Requirements 5.4**
  
  - [ ]* 10.9 Write property test for direct SNS when n8n disabled
    - **Property 23: Direct SNS Delivery When n8n Disabled**
    - **Validates: Requirements 5.6**
  
  - [ ]* 10.10 Write unit tests for notification processor
    - Test successful notification processing
    - Test preference filtering
    - Test quiet hours suppression
    - Test n8n webhook with fallback
    - Test critical alert override
    - Test history recording
    - _Requirements: 2.1, 2.6, 3.5, 5.4, 6.1, 6.3, 7.1_

- [x] 11. Implement Scheduled Reports Lambda
  - [x] 11.1 Create functions/notifications/scheduled-reports.ts
    - Query test executions for reporting period (daily/weekly/monthly)
    - Calculate summary statistics (total, pass rate, fail rate, avg duration)
    - Identify top failing tests
    - Calculate trend comparisons with previous period
    - Handle empty result sets (zero activity)
    - Publish report event to notification queue
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_
  
  - [ ]* 11.2 Write property test for daily report time range
    - **Property 14: Daily Report Time Range**
    - **Validates: Requirements 4.1**
  
  - [ ]* 11.3 Write property test for weekly report time range
    - **Property 15: Weekly Report Time Range**
    - **Validates: Requirements 4.2**
  
  - [ ]* 11.4 Write property test for report content completeness
    - **Property 16: Summary Report Content Completeness**
    - **Validates: Requirements 4.3**
  
  - [ ]* 11.5 Write property test for trend calculation
    - **Property 17: Trend Comparison Calculation**
    - **Validates: Requirements 4.4**
  
  - [ ]* 11.6 Write unit tests for scheduled reports
    - Test daily report generation
    - Test weekly report generation
    - Test empty result handling (edge case from 4.5)
    - Test trend calculation
    - Test top failing tests identification
    - _Requirements: 4.1, 4.2, 4.3, 4.4, 4.5_

- [x] 12. Implement failure detection and alerting logic
  - [x] 12.1 Create services/failure-detection-service.ts
    - Implement detectSuiteFailureRate method (check > 50%)
    - Implement detectConsecutiveFailures method (check 3 consecutive)
    - Implement generateCriticalAlert method
    - _Requirements: 3.2, 3.3, 3.4_
  
  - [ ]* 12.2 Write property test for suite failure threshold
    - **Property 10: Suite Failure Threshold Alert**
    - **Validates: Requirements 3.2**
  
  - [ ]* 12.3 Write property test for consecutive failure escalation
    - **Property 11: Consecutive Failure Escalation**
    - **Validates: Requirements 3.3**
  
  - [ ]* 12.4 Write property test for critical alert content
    - **Property 12: Critical Alert Content Completeness**
    - **Validates: Requirements 3.4**
  
  - [ ]* 12.5 Write unit tests for failure detection
    - Test suite failure rate calculation
    - Test consecutive failure detection
    - Test critical alert generation
    - _Requirements: 3.2, 3.3, 3.4_

- [x] 13. Integrate notification system with test execution
  - [x] 13.1 Update test executor Lambda to publish events
    - Publish test completion events to EventBridge
    - Include all required event data (executionId, status, result, duration, screenshots)
    - _Requirements: 2.1, 2.2, 2.3, 2.4, 2.5_
  
  - [x] 13.2 Create EventBridge rule for test completion events
    - Configure event pattern to match test execution events
    - Route events to notification queue
    - _Requirements: 1.2_
  
  - [ ]* 13.3 Write integration test for event flow
    - Test event publishing from executor
    - Test event routing to notification queue
    - Test notification processor consumption
    - _Requirements: 1.2, 2.1_

- [x] 14. Implement notification preferences API endpoints
  - [x] 14.1 Create functions/notifications/get-preferences.ts
    - Get user preferences by userId
    - Return default preferences if none configured
    - _Requirements: 6.1, 6.4_
  
  - [x] 14.2 Create functions/notifications/update-preferences.ts
    - Validate input (email, phone, channels)
    - Update user preferences
    - Return updated preferences
    - _Requirements: 6.1, 6.2, 6.3, 6.5, 6.6_
  
  - [ ]* 14.3 Write unit tests for preferences API
    - Test get preferences
    - Test update preferences
    - Test validation errors
    - _Requirements: 6.1, 6.2, 6.5_

- [x] 15. Implement notification history API endpoints
  - [x] 15.1 Create functions/notifications/get-history.ts
    - Query notification history with filters
    - Support pagination
    - Return formatted results
    - _Requirements: 7.3, 7.6_
  
  - [x] 15.2 Create functions/notifications/get-notification.ts
    - Get single notification by ID
    - Return notification details
    - _Requirements: 7.1_
  
  - [ ]* 15.3 Write unit tests for history API
    - Test history query with filters
    - Test pagination
    - Test single notification retrieval
    - _Requirements: 7.1, 7.3, 7.6_

- [x] 16. Implement notification template management API endpoints
  - [x] 16.1 Create functions/notifications/create-template.ts
    - Validate template syntax
    - Create new template
    - Return created template
    - _Requirements: 8.4, 8.6_
  
  - [x] 16.2 Create functions/notifications/update-template.ts
    - Validate template syntax
    - Update existing template
    - Return updated template
    - _Requirements: 8.4, 8.6_
  
  - [x] 16.3 Create functions/notifications/get-templates.ts
    - List all templates
    - Filter by event type or channel
    - _Requirements: 8.1_
  
  - [ ]* 16.4 Write unit tests for template API
    - Test template creation
    - Test template updates
    - Test template listing
    - Test validation errors
    - _Requirements: 8.1, 8.4, 8.6_

- [x] 17. Add API Gateway routes for notification endpoints
  - Add POST /notifications/preferences - Update preferences
  - Add GET /notifications/preferences - Get preferences
  - Add GET /notifications/history - Query history
  - Add GET /notifications/history/{notificationId} - Get notification
  - Add POST /notifications/templates - Create template (admin only)
  - Add PUT /notifications/templates/{templateId} - Update template (admin only)
  - Add GET /notifications/templates - List templates
  - Configure CORS and authentication
  - _Requirements: 6.1, 7.3, 7.6, 8.1, 8.4_

- [x] 18. Create default notification templates
  - [x] 18.1 Create seed data for default templates
    - Email template for test completion
    - Email template for test failure
    - Email template for critical alert
    - Email template for summary report
    - SMS template for critical alert
    - Slack template for test failure
    - Slack template for critical alert
    - _Requirements: 8.1, 8.3_
  
  - [x] 18.2 Create template seeding script
    - Load default templates into DynamoDB
    - Run during stack deployment
    - _Requirements: 8.1_

- [ ] 19. Implement security and sanitization
  - [ ] 19.1 Add input sanitization to preferences service
    - Sanitize webhook URLs
    - Sanitize email addresses
    - Prevent injection attacks
    - _Requirements: 12.3_
  
  - [ ] 19.2 Add sensitive data filtering to notification processor
    - Scan notification content for sensitive patterns
    - Redact passwords, API keys, tokens
    - _Requirements: 12.2_
  
  - [ ] 19.3 Add PII redaction to logging
    - Redact email addresses in logs
    - Redact phone numbers in logs
    - Redact names in logs
    - _Requirements: 12.6_
  
  - [ ]* 19.4 Write property test for sensitive data exclusion
    - **Property 48: Sensitive Data Exclusion**
    - **Validates: Requirements 12.2**
  
  - [ ]* 19.5 Write property test for input sanitization
    - **Property 49: Input Sanitization**
    - **Validates: Requirements 12.3**
  
  - [ ]* 19.6 Write property test for PII redaction
    - **Property 50: PII Redaction in Logs**
    - **Validates: Requirements 12.6**
  
  - [ ]* 19.7 Write unit tests for security features
    - Test input sanitization
    - Test sensitive data filtering
    - Test PII redaction
    - _Requirements: 12.2, 12.3, 12.6_

- [x] 20. Implement monitoring and alerting
  - [x] 20.1 Add CloudWatch alarms
    - Alarm for DLQ depth > 0
    - Alarm for queue depth > 1000
    - Alarm for Lambda errors
    - Alarm for SNS delivery failures
    - _Requirements: 9.5_
  
  - [ ]* 20.2 Write property test for queue depth alert
    - **Property 41: Queue Depth Alert Threshold**
    - **Validates: Requirements 9.5**
  
  - [x] 20.3 Add CloudWatch dashboard
    - Notification processing metrics
    - Delivery success rates by channel
    - Queue depth over time
    - Lambda performance metrics
    - _Requirements: 9.5_

- [ ] 21. Implement rate limiting for SNS
  - [ ] 21.1 Create services/rate-limiter-service.ts
    - Implement token bucket algorithm
    - Track API call rates per topic
    - Throttle requests when approaching limits
    - _Requirements: 11.6_
  
  - [ ]* 21.2 Write property test for SNS rate limiting
    - **Property 47: SNS Rate Limiting**
    - **Validates: Requirements 11.6**
  
  - [ ]* 21.3 Write unit tests for rate limiter
    - Test token bucket algorithm
    - Test throttling behavior
    - Test rate limit enforcement
    - _Requirements: 11.6_

- [ ] 22. Implement Slack-specific features
  - [ ] 22.1 Add Slack action button support to SNS service
    - Create action buttons for view test, view logs, re-run test
    - Format buttons using Slack Block Kit
    - _Requirements: 10.3_
  
  - [ ] 22.2 Add Slack webhook routing logic
    - Route events to correct webhook based on event type
    - Support multiple webhooks per user
    - _Requirements: 10.4, 10.6_
  
  - [ ] 22.3 Add Slack fallback to email
    - Detect Slack webhook failures
    - Trigger email delivery as fallback
    - _Requirements: 10.5_
  
  - [ ]* 22.4 Write property test for Slack action buttons
    - **Property 43: Slack Action Buttons**
    - **Validates: Requirements 10.3**
  
  - [ ]* 22.5 Write property test for Slack webhook routing
    - **Property 44: Slack Webhook Routing**
    - **Validates: Requirements 10.1, 10.4, 10.6**
  
  - [ ]* 22.6 Write property test for Slack fallback
    - **Property 45: Slack Fallback to Email**
    - **Validates: Requirements 10.5**
  
  - [ ]* 22.7 Write unit tests for Slack features
    - Test action button creation
    - Test webhook routing
    - Test fallback to email
    - _Requirements: 10.3, 10.4, 10.5, 10.6_

- [ ] 23. Implement batch processing optimization
  - [ ] 23.1 Add batch query support to scheduled reports
    - Use DynamoDB batch operations
    - Minimize API calls for large datasets
    - _Requirements: 11.2_
  
  - [ ]* 23.2 Write property test for batch processing
    - **Property 46: Batch Processing for Reports**
    - **Validates: Requirements 11.2**
  
  - [ ]* 23.3 Write unit tests for batch operations
    - Test batch query execution
    - Test performance with large datasets
    - _Requirements: 11.2_

- [x] 24. Add EventBridge scheduled rules
  - Create cron rule for daily reports (09:00 UTC)
  - Create cron rule for weekly reports (Monday 09:00 UTC)
  - Configure rules to trigger scheduled reports Lambda
  - _Requirements: 4.1, 4.2_

- [ ] 25. Implement report frequency configuration
  - [ ] 25.1 Add report frequency to preferences
    - Support daily, weekly, monthly, disabled
    - Filter report delivery based on frequency
    - _Requirements: 4.6_
  
  - [ ]* 25.2 Write property test for report frequency
    - **Property 18: Report Frequency Configuration**
    - **Validates: Requirements 4.6**
  
  - [ ]* 25.3 Write unit tests for frequency filtering
    - Test daily frequency
    - Test weekly frequency
    - Test disabled reports
    - _Requirements: 4.6_

- [ ] 26. Final checkpoint - Integration testing
  - [ ] 26.1 Test end-to-end notification flow
    - Trigger test execution
    - Verify event published to EventBridge
    - Verify notification processed
    - Verify delivery to SNS
    - Verify history recorded
  
  - [ ] 26.2 Test scheduled reports
    - Manually trigger daily report Lambda
    - Verify report generation
    - Verify notification delivery
  
  - [ ] 26.3 Test n8n integration
    - Configure n8n webhook
    - Trigger notification
    - Verify webhook called
    - Test fallback on failure
  
  - [ ] 26.4 Test preference management
    - Update preferences via API
    - Trigger notification
    - Verify preferences respected
  
  - [ ] 26.5 Test notification history
    - Query history via API
    - Verify filtering works
    - Verify pagination works
  
  - Ensure all tests pass, ask the user if questions arise.

- [ ] 27. Documentation and deployment
  - Update README with notification system setup instructions
  - Document environment variables required
  - Document API endpoints
  - Document default templates
  - Create deployment guide for n8n integration
  - Add CloudWatch dashboard setup instructions

## Notes

- Tasks marked with `*` are optional and can be skipped for faster MVP
- Each task references specific requirements for traceability
- Property tests validate universal correctness properties (50 total)
- Unit tests validate specific examples and edge cases
- Integration tests verify end-to-end flows
- The system uses TypeScript and AWS CDK for infrastructure
- All Lambda functions use Node.js 20.x runtime
- DynamoDB tables use on-demand billing mode
- SNS topics are created automatically if they don't exist
- SQS queues have DLQ configured for failed messages
- EventBridge rules trigger scheduled reports
- n8n integration is optional and can be disabled
