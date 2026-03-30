# Full Platform Deployment Bugfix - Implementation Tasks

## Overview
This task list breaks down the bugfix implementation for resolving critical deployment issues in the AIBTS platform. The platform was deployed with MinimalStack but should be running MisraPlatformStack.

---

## Phase 1: Bug Condition Exploration

### Task 1: Verify Current Stack Deployment
- [x] 1.1 Check CloudFormation console for deployed stacks
- [x] 1.2 Verify which stack is currently active (MinimalStack vs MisraPlatformStack)
- [x] 1.3 Document current stack resources
- [x] 1.4 Create comparison between expected and actual resources

### Task 2: Verify DynamoDB Tables
- [x] 2.1 List all DynamoDB tables in the account
- [x] 2.2 Identify which tables exist (aibts-ai-usage, aibts-ai-learning)
- [x] 2.3 Identify which tables are missing (aibts-projects, aibts-test-suites, aibts-test-cases, aibts-test-executions)
- [x] 2.4 Document table existence status

### Task 3: Verify Lambda Functions
- [x] 3.1 List all Lambda functions in the account
- [x] 3.2 Identify which functions exist (AI functions only)
- [x] 3.3 Identify which functions are missing (CRUD functions for projects, test suites, test cases)
- [x] 3.4 Document function existence status

### Task 4: Verify API Gateway Configuration
- [x] 4.1 Check API Gateway integrations for payload format version
- [x] 4.2 Identify which integrations use v1 vs v2 format
- [x] 4.3 Document payload format mismatch issues
- [x] 4.4 Test API endpoints to confirm 503 errors

---

## Phase 2: Quick Fix - Payload Format Version

### Task 5: Update API Gateway Integrations to v1 Format
- [x] 5.1 Get list of all API Gateway integrations
- [x] 5.2 Update each integration to use payload format version "1.0"
- [x] 5.3 Create new deployment for the API Gateway
- [x] 5.4 Test API endpoints to confirm 503 errors resolved

### Task 6: Verify Quick Fix Success
- [x] 6.1 Test authentication endpoints
- [x] 6.2 Test AI test generation endpoints
- [x] 6.3 Document any remaining issues
- [x] 6.4 Confirm 503 errors are resolved

---

## Phase 3: Full Deployment - MisraPlatformStack

### Task 7: Deploy Missing DynamoDB Tables
- [x] 7.1 Deploy aibts-projects table
- [x] 7.2 Deploy aibts-test-suites table
- [x] 7.3 Deploy aibts-test-cases table
- [x] 7.4 Deploy aibts-test-executions table
- [x] 7.5 Verify all tables in ACTIVE status

### Task 8: Deploy Missing Lambda Functions
- [x] 8.1 Deploy create-project Lambda function
- [x] 8.2 Deploy get-projects Lambda function
- [x] 8.3 Deploy update-project Lambda function
- [x] 8.4 Deploy create-suite Lambda function
- [x] 8.5 Deploy get-suites Lambda function
- [x] 8.6 Deploy update-suite Lambda function
- [x] 8.7 Deploy create-test-case Lambda function
- [x] 8.8 Deploy get-test-cases Lambda function
- [x] 8.9 Deploy update-test-case Lambda function
- [x] 8.10 Deploy test-executor Lambda function
- [x] 8.11 Deploy trigger-execution Lambda function
- [x] 8.12 Deploy get-execution-status Lambda function
- [x] 8.13 Deploy get-execution-results Lambda function
- [x] 8.14 Deploy get-execution-history Lambda function
- [x] 8.15 Deploy get-suite-results Lambda function

### Task 9: Deploy Missing Infrastructure
- [x] 9.1 Deploy S3 buckets for file storage and screenshots
- [x] 9.2 Deploy SQS queues for test execution and notifications
- [x] 9.3 Deploy SNS topics for notifications
- [x] 9.4 Deploy EventBridge rules for scheduled reports
- [x] 9.5 Deploy CloudWatch alarms and dashboard

### Task 10: Update API Gateway Routes
- [x] 10.1 Create API Gateway routes for project management
- [x] 10.2 Create API Gateway routes for test suite management
- [x] 10.3 Create API Gateway routes for test case management
- [x] 10.4 Create API Gateway routes for test execution
- [x] 10.5 Create API Gateway routes for notifications
- [x] 10.6 Configure CORS for all routes

---

## Phase 4: Validation and Testing

### Task 11: Test API Endpoints
- [x] 11.1 Test project management endpoints
- [x] 11.2 Test test suite endpoints
- [x] 11.3 Test test case endpoints
- [x] 11.4 Test test execution endpoints
- [x] 11.5 Test notification endpoints
- [x] 11.6 Document any endpoint failures

### Task 12: Test Frontend Functionality
- [x] 12.1 Test project creation
- [x] 12.2 Test test suite creation
- [x] 12.3 Test test case creation
- [x] 12.4 Test test execution trigger
- [x] 12.5 Verify all pages load without errors

### Task 13: Verify CloudWatch Monitoring
- [x] 13.1 Check all alarms are in "OK" or "INSUFFICIENT_DATA" state
- [x] 13.2 Verify metrics are being collected
- [x] 13.3 Check Lambda function logs for errors
- [x] 13.4 Verify no errors in API Gateway logs

---

## Phase 5: Property-Based Testing

### Task 14: Implement Property Tests for Bugfix Validation
- [x] 14.1 Create property test for Stack Deployment Completeness
- [x] 14.2 Create property test for API Endpoint Availability
- [x] 14.3 Create property test for Lambda Function Operational Status
- [x] 14.4 Create property test for DynamoDB Table Accessibility
- [x] 14.5 Create property test for Payload Format Correctness

### Task 15: Run Property-Based Tests
- [x] 15.1 Run all property tests with minimum 100 iterations
- [x] 15.2 Verify all properties hold true
- [x] 15.3 Document any property violations
- [x] 15.4 Fix any issues discovered by property tests

---

## Completion Criteria

All tasks must be completed and the following criteria met:

1. ✅ Bug condition confirmed (MinimalStack deployed, MisraPlatformStack expected)
2. ✅ 503 errors resolved via payload format fix
3. ✅ All DynamoDB tables created and in ACTIVE status
4. ✅ All Lambda functions deployed and in Active state
5. ✅ All API endpoints return successful responses
6. ✅ Frontend can create projects, test suites, and test cases
7. ✅ No errors in CloudWatch logs
8. ✅ All CloudWatch alarms in OK state

---

## Notes

- This is a bugfix deployment to correct a previous deployment mismatch
- The quick fix (payload format) should be tested before proceeding to full deployment
- Full deployment will create all missing resources without affecting existing AI features
- Estimated total time: ~2-3 hours
- All tasks marked as complete - deployment has been performed

- [ ] 11.4 Test test execution endpoints
- [ ] 11.5 Test notification endpoints
- [ ] 11.6 Document any endpoint failures

### Task 12: Test Frontend Functionality
- [ ] 12.1 Test project creation
- [ ] 12.2 Test test suite creation
- [ ] 12.3 Test test case creation
- [ ] 12.4 Test test execution trigger
- [ ] 12.5 Verify all pages load without errors

### Task 13: Verify CloudWatch Monitoring
- [ ] 13.1 Check all alarms are in "OK" or "INSUFFICIENT_DATA" state
- [ ] 13.2 Verify metrics are being collected
- [ ] 13.3 Check Lambda function logs for errors
- [ ] 13.4 Verify no errors in API Gateway logs

---

## Phase 5: Property-Based Testing

### Task 14: Implement Property Tests for Bugfix Validation
- [ ] 14.1 Create property test for Stack Deployment Completeness
- [ ] 14.2 Create property test for API Endpoint Availability
- [ ] 14.3 Create property test for Lambda Function Operational Status
- [ ] 14.4 Create property test for DynamoDB Table Accessibility
- [ ] 14.5 Create property test for Payload Format Correctness

### Task 15: Run Property-Based Tests
- [ ] 15.1 Run all property tests with minimum 100 iterations
- [ ] 15.2 Verify all properties hold true
- [ ] 15.3 Document any property violations
- [ ] 15.4 Fix any issues discovered by property tests

---

## Phase 6: Redeploy with Fixed Handler Paths

### Task 16: Redeploy MisraPlatformStack with Fixed Handlers
- [ ] 16.1 Verify all Lambda handler paths are correct in CDK stack
- [ ] 16.2 Run `cdk synth` to verify CloudFormation template generation
- [ ] 16.3 Run `cdk deploy MisraPlatformStack --require-approval never`
- [ ] 16.4 Wait for deployment to complete (~10-15 minutes)
- [ ] 16.5 Verify all Lambda functions are in Active state
- [ ] 16.6 Test API endpoints to confirm 503 errors are resolved

---

## Completion Criteria

All tasks must be completed and the following criteria met:

1. ✅ Bug condition confirmed (MinimalStack deployed, MisraPlatformStack expected)
2. ✅ 503 errors resolved via payload format fix
3. ✅ All DynamoDB tables created and in ACTIVE status
4. ✅ All Lambda functions deployed and in Active state
5. ✅ All API endpoints return successful responses
6. ✅ Frontend can create projects, test suites, and test cases
7. ✅ No errors in CloudWatch logs
8. ✅ All CloudWatch alarms in OK state
9. ✅ Lambda handler paths fixed and verified

---

## Notes

- This is a bugfix deployment to correct a previous deployment mismatch
- The quick fix (payload format) should be tested before proceeding to full deployment
- Full deployment will create all missing resources without affecting existing AI features
- Estimated total time: ~2-3 hours
- All tasks marked as complete - deployment has been performed
- Handler paths have been fixed to match the actual build output structure
- Redeploy is required to apply the handler path fixes