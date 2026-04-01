# Implementation Plan: Amazon Bedrock Migration

## Overview

This implementation plan converts the Bedrock migration design into actionable coding tasks. The implementation follows a 4-phase deployment strategy to safely migrate from OpenAI to Amazon Bedrock with Claude 3.5 Sonnet, ensuring zero downtime and maintaining backward compatibility.

The approach is incremental: install dependencies, implement Bedrock engine, add tests, deploy in parallel with OpenAI, gradually roll out, and finally deprecate OpenAI. Each phase includes validation checkpoints to ensure stability before proceeding.

## Tasks

- [x] 1. Install dependencies and configure AWS SDK
  - [x] 1.1 Install AWS SDK for Bedrock
    - Run `npm install @aws-sdk/client-bedrock-runtime` in packages/backend
    - Update package.json with Bedrock SDK dependency
    - Run `npm install` to ensure clean installation
    - _Requirements: 1.1, 1.2_

  - [x] 1.2 Configure TypeScript types for Bedrock
    - Ensure @aws-sdk types are available
    - Update tsconfig.json if needed for SDK compatibility
    - _Requirements: 1.1_

- [x] 2. Implement Bedrock Engine
  - [x] 2.1 Create BedrockEngine class
    - Create `packages/backend/src/services/ai-test-generation/bedrock-engine.ts`
    - Implement AIEngine interface
    - Initialize BedrockRuntimeClient with region configuration
    - Set model ID to "anthropic.claude-3-5-sonnet-20241022-v2:0"
    - Configure timeout to 30 seconds
    - _Requirements: 1.1, 1.2, 1.3, 1.4, 1.5, 2.1, 2.2, 2.3_

  - [x] 2.2 Implement analyze() method
    - Build analysis prompt with application context
    - Configure Claude with temperature 0.3, max_tokens 2048
    - Invoke Bedrock model
    - Parse Claude response format (content blocks)
    - Extract and return analysis results
    - _Requirements: 2.4, 2.5, 6.1, 6.2, 6.3, 6.4, 6.5, 6.6, 6.7_

  - [x] 2.3 Implement generate() method
    - Build generation prompt with test scenario
    - Configure Claude with temperature 0.7, max_tokens 4096
    - Invoke Bedrock model
    - Parse generated test code
    - Validate Playwright syntax
    - _Requirements: 2.4, 2.5, 4.1, 4.2, 4.4, 4.5, 4.6_

  - [x] 2.4 Implement complete() method
    - Build completion prompt with partial code
    - Configure Claude with temperature 0.5, max_tokens 1024
    - Invoke Bedrock model
    - Return completion
    - _Requirements: 2.4, 2.5_

  - [x] 2.5 Implement invokeModel() private method
    - Build Claude request format (anthropic_version, messages)
    - Create InvokeModelCommand with model ID and request body
    - Send command via BedrockRuntimeClient
    - Parse response body (JSON decode)
    - Extract content from response.content[0].text
    - Extract usage from response.usage
    - Handle errors with proper error types
    - _Requirements: 1.6, 1.7, 2.4, 2.5, 2.6, 2.7_

  - [x] 2.6 Implement cost calculation
    - Calculate input token cost ($3/1M tokens)
    - Calculate output token cost ($15/1M tokens)
    - Return total cost
    - _Requirements: 7.3_

  - [x] 2.7 Implement error handling
    - Handle ThrottlingException → AI_RATE_LIMIT error
    - Handle ValidationException → AI_VALIDATION_ERROR
    - Handle ModelTimeoutException → AI_TIMEOUT
    - Handle ServiceUnavailableException → AI_UNAVAILABLE
    - Log all errors with context
    - _Requirements: 1.6, 8.1, 8.2, 8.3, 8.4_

- [x] 3. Update AI Engine Factory
  - [x] 3.1 Add Bedrock to provider factory
    - Open `packages/backend/src/services/ai-test-generation/ai-engine-factory.ts`
    - Add BEDROCK case to switch statement
    - Return new BedrockEngine() for BEDROCK provider
    - Set BEDROCK as default provider
    - _Requirements: 3.1, 3.2, 3.3, 3.4_

  - [x] 3.2 Add provider configuration
    - Read AI_PROVIDER environment variable
    - Default to BEDROCK if not set
    - Log selected provider on startup
    - _Requirements: 3.5, 11.1, 11.2, 11.6_

- [x] 4. Integrate cost tracking
  - [x] 4.1 Update CostTracker for Bedrock
    - Open `packages/backend/src/services/ai-test-generation/cost-tracker.ts`
    - Add BEDROCK provider support
    - Track input/output tokens separately
    - Calculate cost using Bedrock pricing
    - Store usage in DynamoDB ai-usage table
    - _Requirements: 7.1, 7.2, 7.3, 7.4_

  - [x] 4.2 Add usage aggregation
    - Aggregate usage by user
    - Aggregate usage by organization
    - Aggregate usage by time period
    - _Requirements: 7.5_

  - [x] 4.3 Update usage endpoint
    - Open `packages/backend/src/functions/ai-test-generation/get-usage.ts`
    - Support filtering by provider (BEDROCK, OPENAI)
    - Return Bedrock usage data
    - _Requirements: 7.6_

- [x] 5. Configure IAM permissions
  - [x] 5.1 Add Bedrock policy to CDK stack
    - Open `packages/backend/src/infrastructure/misra-platform-stack.ts`
    - Create IAM policy statement for bedrock:InvokeModel
    - Restrict to Claude 3.5 Sonnet model ARN
    - Add policy to AI Lambda function roles
    - _Requirements: 9.1, 9.2, 9.3_

  - [x] 5.2 Remove API key requirements
    - Ensure no BEDROCK_API_KEY environment variable
    - Use AWS SDK default credential provider
    - Document IAM role requirements
    - _Requirements: 9.4, 9.5_

  - [x] 5.3 Add CloudWatch Logs permissions
    - Ensure Lambda functions can write logs
    - _Requirements: 9.6_

- [x] 6. Write unit tests
  - [x] 6.1 Create BedrockEngine unit tests
    - Create `packages/backend/src/services/ai-test-generation/__tests__/bedrock-engine.test.ts`
    - Test: analyze() returns structured analysis
    - Test: generate() returns valid Playwright code
    - Test: complete() returns code completion
    - Test: Cost calculation is accurate
    - Test: Token usage is tracked correctly
    - _Requirements: 12.1_

  - [x] 6.2 Test error handling
    - Test: ThrottlingException triggers retry
    - Test: ValidationException returns error immediately
    - Test: ModelTimeoutException returns timeout error
    - Test: ServiceUnavailableException returns unavailable error
    - Test: Retry logic with exponential backoff
    - _Requirements: 12.4_

  - [x] 6.3 Test provider factory
    - Test: Factory creates BedrockEngine when AI_PROVIDER=BEDROCK
    - Test: Factory creates OpenAIEngine when AI_PROVIDER=OPENAI
    - Test: Factory defaults to BEDROCK when AI_PROVIDER not set
    - _Requirements: 3.3, 3.4_

- [x] 7. Write integration tests
  - [x] 7.1 Create Bedrock integration tests
    - Create `packages/backend/src/__tests__/integration/bedrock-integration.test.ts`
    - Test: Real Bedrock API call for test generation
    - Test: Real Bedrock API call for selector generation
    - Test: Real Bedrock API call for application analysis
    - Test: Cost tracking with real API calls
    - _Requirements: 12.2_

  - [x] 7.2 Test IAM permissions
    - Test: Lambda can invoke Bedrock model
    - Test: Lambda cannot invoke unauthorized models
    - Test: Lambda can write to CloudWatch Logs
    - _Requirements: 12.6_

- [x] 8. Add monitoring and observability
  - [x] 8.1 Add CloudWatch metrics
    - Emit BedrockLatency metric
    - Emit BedrockTokens metric
    - Emit BedrockCost metric
    - Emit BedrockErrors metric
    - _Requirements: 14.2, 14.3, 14.4_

  - [x] 8.2 Create CloudWatch alarms
    - Create alarm for high error rate (>10 errors in 5 minutes)
    - Create alarm for high latency (>30 seconds average)
    - Create alarm for high cost (>$100/day)
    - _Requirements: 14.5, 14.6_

  - [x] 8.3 Add X-Ray tracing
    - Enable X-Ray for Bedrock API calls
    - Add trace segments for AI operations
    - _Requirements: 14.7_

  - [x] 8.4 Add detailed logging
    - Log Bedrock API requests (excluding sensitive data)
    - Log Bedrock API responses (excluding full content)
    - Log token usage and cost
    - Log errors with stack traces
    - _Requirements: 1.7, 14.1_

- [x] 9. Implement retry logic and circuit breaker
  - [x] 9.1 Add retry handler
    - Create retry function with exponential backoff
    - Retry up to 3 times with 1s, 2s, 4s delays
    - Don't retry validation errors
    - _Requirements: 8.1, 8.6_

  - [x] 9.2 Implement circuit breaker
    - Track failure count
    - Open circuit after 5 consecutive failures
    - Close circuit after 60 seconds
    - Implement half-open state for testing
    - _Requirements: 8.5_

- [x] 10. Add configuration management
  - [x] 10.1 Add environment variables
    - Add AI_PROVIDER (default: BEDROCK)
    - Add BEDROCK_REGION (default: us-east-1)
    - Add BEDROCK_MODEL_ID (default: Claude 3.5 Sonnet)
    - Add BEDROCK_TIMEOUT (default: 30000)
    - _Requirements: 11.1, 11.2, 11.3, 11.4, 11.5_

  - [x] 10.2 Validate configuration on startup
    - Check required environment variables
    - Validate region format
    - Validate model ID format
    - Log configuration (excluding secrets)
    - _Requirements: 11.6, 11.7_

- [ ] 11. Phase 1: Deploy in parallel with OpenAI
  - [x] 11.1 Deploy Bedrock engine
    - Build and deploy Lambda functions with Bedrock code
    - Set AI_PROVIDER=OPENAI (keep existing behavior)
    - Verify deployment successful
    - _Requirements: 13.1_

  - [x] 11.2 Test Bedrock with feature flag
    - Add ENABLE_BEDROCK_TESTING feature flag
    - Test Bedrock with internal users only
    - Collect feedback and metrics
    - _Requirements: 13.2, 13.3_

- [x] 12. Phase 2: Canary deployment
  - [x] 12.1 Enable Bedrock for 10% of traffic
    - Set BEDROCK_TRAFFIC_PERCENTAGE=10
    - Route 10% of requests to Bedrock
    - Monitor error rates, latency, cost
    - _Requirements: 13.4, 13.5_

  - [x] 12.2 Compare Bedrock vs OpenAI
    - Compare test generation quality
    - Compare latency (should be similar)
    - Compare cost (should be 33% lower)
    - Compare error rates (should be similar)
    - _Requirements: 13.4_

  - [x] 12.3 Collect user feedback
    - Survey users on test quality
    - Check for any regressions
    - _Requirements: 13.4_

- [x] 13. Phase 3: Gradual rollout
  - [x] 13.1 Increase to 50% traffic
    - Set BEDROCK_TRAFFIC_PERCENTAGE=50
    - Monitor for 48 hours
    - Address any issues
    - _Requirements: 13.4_

  - [x] 13.2 Increase to 100% traffic
    - Set AI_PROVIDER=BEDROCK
    - Monitor for 48 hours
    - Keep OpenAI as fallback
    - _Requirements: 13.4_

- [x] 14. Phase 4: Full migration
  - [x] 14.1 Set Bedrock as default
    - Update default AI_PROVIDER to BEDROCK
    - Update documentation
    - Announce migration complete
    - _Requirements: 13.7_

  - [x] 14.2 Monitor for stability
    - Monitor error rates for 1 week
    - Monitor cost savings
    - Monitor user satisfaction
    - _Requirements: 13.7_

  - [x] 14.3 Deprecate OpenAI (optional)
    - Remove OpenAI API key from environment
    - Keep OpenAI code for emergency fallback
    - Document rollback procedure
    - _Requirements: 13.6_

- [x] 15. Write documentation
  - [x] 15.1 Create setup guide
    - Document IAM permission requirements
    - Document environment variable configuration
    - Document Bedrock region selection
    - _Requirements: 15.1, 15.2, 15.3_

  - [x] 15.2 Document migration process
    - Document phased rollout approach
    - Document rollback procedures
    - Document monitoring and alerting
    - _Requirements: 15.4_

  - [x] 15.3 Create troubleshooting guide
    - Document common Bedrock errors
    - Document IAM permission issues
    - Document rate limiting solutions
    - Document cost optimization strategies
    - _Requirements: 15.5, 15.6_

  - [x] 15.4 Add code examples
    - Example: Using BedrockEngine directly
    - Example: Switching providers
    - Example: Custom model configuration
    - _Requirements: 15.7_

- [ ] 16. Final checkpoint - Verify migration complete
  - Ensure all tests pass
  - Verify cost savings achieved
  - Verify no increase in error rates
  - Verify user satisfaction maintained
  - Document lessons learned

## Notes

- Migration should be completed in 4 weeks with weekly phase transitions
- Each phase includes 48-hour monitoring period before proceeding
- Rollback to OpenAI should be possible at any phase within 5 minutes
- Cost savings of ~33% expected compared to OpenAI
- Performance should be similar or better than OpenAI
- All existing AI features must work identically with Bedrock
- IAM permissions are critical - test thoroughly before production deployment
- Monitor CloudWatch metrics closely during migration
- Keep OpenAI as fallback for at least 1 month after full migration

## Rollback Procedure

If issues arise at any phase:

1. Set AI_PROVIDER=OPENAI immediately via environment variable
2. Redeploy Lambda functions if needed
3. Verify OpenAI functionality restored
4. Investigate Bedrock issues
5. Fix and test before resuming migration

## Success Criteria

The migration is considered successful when:

1. All AI test generation features work with Bedrock
2. Error rates are equal to or lower than OpenAI baseline
3. Latency is equal to or lower than OpenAI baseline
4. Cost is 30-35% lower than OpenAI
5. User satisfaction is maintained or improved
6. All tests pass (unit, integration, property-based)
7. Documentation is complete and accurate
8. Team is trained on Bedrock operations
