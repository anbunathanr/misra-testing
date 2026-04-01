# Bedrock Migration - Deployment Readiness Checklist

## Overview

This checklist ensures all prerequisites are met before deploying the Bedrock migration to AWS. Complete each section before proceeding with deployment.

**Last Updated**: Current Session  
**Migration Phase**: Pre-Deployment Validation

---

## ✅ Code Implementation (Complete)

- [x] BedrockEngine class implemented
- [x] AIEngineFactory updated with BEDROCK provider
- [x] Cost tracking integrated
- [x] IAM permissions configured in CDK
- [x] Monitoring and observability added
- [x] Configuration management implemented
- [x] Error handling and retry logic complete
- [x] Circuit breaker pattern implemented

---

## ✅ Testing (Complete)

- [x] Unit tests passing (85 tests)
  - [x] BedrockEngine tests (34 tests)
  - [x] AIEngineFactory tests (16 tests)
  - [x] CostTracker tests (19 tests)
  - [x] Error handling tests
  - [x] Circuit breaker tests

- [x] Integration tests ready (16 tests)
  - [x] Bedrock API integration tests
  - [x] IAM permissions tests
  - [x] Auto-skip without AWS credentials

---

## ✅ Documentation (Complete)

- [x] Setup guide (BEDROCK_SETUP_GUIDE.md)
- [x] Migration process (BEDROCK_MIGRATION_PROCESS.md)
- [x] Troubleshooting guide (BEDROCK_TROUBLESHOOTING_GUIDE.md)
- [x] Code examples (BEDROCK_CODE_EXAMPLES.md)
- [x] IAM configuration (IAM_CONFIGURATION.md)

---

## 🔲 AWS Prerequisites (To Verify)

### AWS Account Access

- [ ] AWS account credentials configured
- [ ] AWS CLI installed and configured
- [ ] Correct AWS region selected (us-east-1 recommended)
- [ ] AWS CDK installed (`npm install -g aws-cdk`)

### Bedrock Model Access

- [ ] Amazon Bedrock enabled in AWS account
- [ ] Claude 3.5 Sonnet model access requested and approved
  - Go to: AWS Console → Bedrock → Model access
  - Request access to: `anthropic.claude-3-5-sonnet-20241022-v2:0`
  - Wait for approval (usually instant)

### IAM Permissions

- [ ] Deployment user has permissions to:
  - [ ] Create/update Lambda functions
  - [ ] Create/update IAM roles and policies
  - [ ] Create/update CloudWatch alarms
  - [ ] Enable X-Ray tracing
  - [ ] Access Bedrock service
  - [ ] Deploy CDK stacks

---

## 🔲 Environment Configuration (To Set)

### Required Environment Variables

```bash
# AI Provider Configuration
AI_PROVIDER=OPENAI  # Start with OPENAI (no behavior change)

# Bedrock Configuration (for when switching to Bedrock)
BEDROCK_REGION=us-east-1
BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0
BEDROCK_TIMEOUT=30000

# Monitoring
ENABLE_BEDROCK_MONITORING=true

# Feature Flags (for phased rollout)
ENABLE_BEDROCK_TESTING=false  # Enable for internal testing
BEDROCK_TRAFFIC_PERCENTAGE=0  # Start at 0%
```

### Verify Current Configuration

```bash
# Check current AI provider
echo $AI_PROVIDER

# Verify AWS credentials
aws sts get-caller-identity

# Check Bedrock model access
aws bedrock list-foundation-models --region us-east-1 \
  --query "modelSummaries[?modelId=='anthropic.claude-3-5-sonnet-20241022-v2:0']"
```

---

## 🔲 Pre-Deployment Testing (To Complete)

### Local Testing

- [ ] Run all unit tests: `npm test`
- [ ] Run integration tests (if AWS credentials available)
- [ ] Verify TypeScript compilation: `npm run build`
- [ ] Check for linting errors: `npm run lint`

### CDK Validation

```bash
cd packages/backend

# Synthesize CDK stack (dry run)
cdk synth

# Check for CDK errors
cdk diff

# Validate IAM policies
cdk doctor
```

---

## 🔲 Deployment Plan (To Execute)

### Phase 1: Parallel Deployment (Week 1)

**Objective**: Deploy Bedrock code without changing behavior

**Steps**:
1. [ ] Deploy CDK stack with Bedrock code
2. [ ] Keep `AI_PROVIDER=OPENAI` (no behavior change)
3. [ ] Verify deployment successful
4. [ ] Run smoke tests
5. [ ] Enable `ENABLE_BEDROCK_TESTING=true` for internal testing
6. [ ] Test Bedrock with internal users
7. [ ] Collect initial metrics

**Success Criteria**:
- All Lambda functions deployed successfully
- No errors in CloudWatch Logs
- OpenAI functionality unchanged
- Bedrock available for testing

**Rollback Plan**:
- Redeploy previous CDK stack version
- Verify OpenAI functionality restored

---

### Phase 2: Canary Deployment (Week 2)

**Objective**: Route 10% of traffic to Bedrock

**Steps**:
1. [ ] Implement traffic routing logic (if not already done)
2. [ ] Set `BEDROCK_TRAFFIC_PERCENTAGE=10`
3. [ ] Deploy configuration change
4. [ ] Monitor for 48 hours:
   - [ ] Error rates (should be similar to OpenAI)
   - [ ] Latency (should be <30s P95)
   - [ ] Cost (should be ~33% lower)
   - [ ] Test quality (manual review)
5. [ ] Collect user feedback
6. [ ] Compare Bedrock vs OpenAI metrics

**Success Criteria**:
- Error rate ≤ OpenAI baseline
- Latency ≤ OpenAI baseline
- Cost reduction ~30-35%
- No user complaints
- Test quality maintained

**Rollback Plan**:
- Set `BEDROCK_TRAFFIC_PERCENTAGE=0`
- All traffic back to OpenAI within 1 minute

---

### Phase 3: Gradual Rollout (Week 3)

**Objective**: Increase Bedrock traffic to 100%

**Steps**:
1. [ ] Increase to 50%: `BEDROCK_TRAFFIC_PERCENTAGE=50`
2. [ ] Monitor for 48 hours
3. [ ] Address any issues discovered
4. [ ] Increase to 100%: `AI_PROVIDER=BEDROCK`
5. [ ] Monitor for 48 hours
6. [ ] Keep OpenAI as fallback

**Success Criteria**:
- All metrics within acceptable ranges
- No increase in error rates
- Cost savings achieved
- User satisfaction maintained

**Rollback Plan**:
- Set `AI_PROVIDER=OPENAI`
- Redeploy if needed

---

### Phase 4: Full Migration (Week 4)

**Objective**: Complete migration to Bedrock

**Steps**:
1. [ ] Set Bedrock as default provider
2. [ ] Update documentation
3. [ ] Announce migration complete
4. [ ] Monitor for 1 week
5. [ ] Verify cost savings
6. [ ] Optional: Deprecate OpenAI

**Success Criteria**:
- All AI features working with Bedrock
- Cost savings of 30-35% achieved
- No increase in error rates
- User satisfaction maintained
- Team trained on Bedrock operations

**Rollback Plan**:
- Keep OpenAI code for 1 month as emergency fallback
- Document rollback procedure

---

## 🔲 Monitoring Setup (To Verify)

### CloudWatch Metrics

- [ ] BedrockLatency metric emitting
- [ ] BedrockTokens metric emitting
- [ ] BedrockCost metric emitting
- [ ] BedrockErrors metric emitting

### CloudWatch Alarms

- [ ] High error rate alarm (>10 errors/5min)
- [ ] High latency alarm (>30s average)
- [ ] High cost alarm (>$100/day)
- [ ] Alarm notifications configured (SNS topic)

### X-Ray Tracing

- [ ] X-Ray enabled on AI Lambda functions
- [ ] Trace segments visible in X-Ray console
- [ ] Service map showing Bedrock calls

### CloudWatch Logs

- [ ] Structured logging enabled
- [ ] Log groups created
- [ ] Log retention configured
- [ ] Logs Insights queries saved

---

## 🔲 Cost Management (To Configure)

### Cost Tracking

- [ ] DynamoDB ai-usage table exists
- [ ] Cost tracking code deployed
- [ ] Usage endpoint accessible
- [ ] Cost reports configured

### Cost Budgets

- [ ] AWS Budget created for Bedrock costs
- [ ] Budget alerts configured
- [ ] Daily cost limit set ($100 recommended)
- [ ] Monthly cost tracking enabled

### Cost Optimization

- [ ] Response caching implemented
- [ ] Token usage optimization enabled
- [ ] Batch processing configured
- [ ] Cost monitoring dashboard created

---

## 🔲 Security Validation (To Verify)

### IAM Permissions

- [ ] Lambda execution roles have `bedrock:InvokeModel`
- [ ] IAM policies restrict to Claude 3.5 Sonnet only
- [ ] No API keys used (IAM role-based auth)
- [ ] Principle of least privilege followed

### Data Security

- [ ] Sensitive data not logged
- [ ] TLS 1.2+ for all API calls
- [ ] Data encrypted in transit and at rest
- [ ] Security audit completed

---

## 🔲 Operational Readiness (To Complete)

### Team Training

- [ ] Team trained on Bedrock operations
- [ ] Troubleshooting guide reviewed
- [ ] Rollback procedure practiced
- [ ] On-call rotation updated

### Documentation

- [ ] Runbooks created
- [ ] Incident response procedures documented
- [ ] Escalation paths defined
- [ ] Contact information updated

### Support

- [ ] AWS Support plan active
- [ ] Bedrock support contacts identified
- [ ] Internal support channels configured
- [ ] User communication plan ready

---

## 🔲 Final Validation (Before Go-Live)

### Pre-Deployment Checklist

- [ ] All tests passing
- [ ] Code reviewed and approved
- [ ] Documentation complete
- [ ] Monitoring configured
- [ ] Rollback plan tested
- [ ] Team ready
- [ ] Stakeholders informed

### Deployment Day Checklist

- [ ] Maintenance window scheduled (if needed)
- [ ] Team available for monitoring
- [ ] Rollback plan ready
- [ ] Communication channels open
- [ ] Monitoring dashboards open

### Post-Deployment Checklist

- [ ] Smoke tests passed
- [ ] Metrics within normal ranges
- [ ] No errors in logs
- [ ] User feedback positive
- [ ] Cost tracking working
- [ ] Documentation updated

---

## Risk Assessment

### Low Risk ✅

- Core implementation complete and tested
- Backward compatibility maintained
- Rollback procedure simple and fast
- All tests passing

### Medium Risk ⚠️

- Need to implement traffic routing for canary
- Need to validate IAM permissions in production
- Need to monitor costs closely

### High Risk ❌

- None identified

---

## Deployment Commands

### Phase 1: Deploy with OpenAI (No Behavior Change)

```bash
# Set environment variables
export AI_PROVIDER=OPENAI
export BEDROCK_REGION=us-east-1
export ENABLE_BEDROCK_MONITORING=true

# Deploy CDK stack
cd packages/backend
cdk deploy --all

# Verify deployment
aws lambda list-functions --query "Functions[?contains(FunctionName, 'ai-')].FunctionName"

# Check logs
aws logs tail /aws/lambda/aibts-ai-generate --follow
```

### Phase 2: Enable Bedrock Testing

```bash
# Enable internal testing
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,ENABLE_BEDROCK_TESTING=true}"

# Test Bedrock endpoint
curl -X POST https://api.example.com/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Use-Bedrock: true" \
  -d '{"scenario":"Test","context":{}}'
```

### Phase 3: Canary Deployment

```bash
# Route 10% to Bedrock
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI,BEDROCK_TRAFFIC_PERCENTAGE=10}"

# Monitor metrics
aws cloudwatch get-metric-statistics \
  --namespace AIBTS/Bedrock \
  --metric-name BedrockErrors \
  --start-time $(date -u -d '1 hour ago' +%Y-%m-%dT%H:%M:%S) \
  --end-time $(date -u +%Y-%m-%dT%H:%M:%S) \
  --period 300 \
  --statistics Sum
```

### Phase 4: Full Migration

```bash
# Switch to Bedrock
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=BEDROCK}"

# Verify
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'
```

### Rollback

```bash
# Emergency rollback to OpenAI
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={AI_PROVIDER=OPENAI}"

# Verify rollback
curl -X POST https://api.example.com/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scenario":"Test","context":{}}'
```

---

## Success Metrics

### Technical Metrics

- **Error Rate**: ≤ OpenAI baseline
- **Latency P95**: ≤ 30 seconds
- **Latency P99**: ≤ 45 seconds
- **Availability**: ≥ 99.9%
- **Cost Reduction**: 30-35%

### Business Metrics

- **User Satisfaction**: Maintained or improved
- **Test Quality**: No degradation
- **Support Tickets**: No increase
- **Monthly Savings**: ~$500 (based on 10K operations)

---

## Next Steps

1. **Complete AWS Prerequisites**: Verify Bedrock model access
2. **Run Pre-Deployment Tests**: Ensure all tests pass
3. **Deploy Phase 1**: Deploy with AI_PROVIDER=OPENAI
4. **Internal Testing**: Test Bedrock with team
5. **Proceed with Phases 2-4**: Follow phased rollout plan

---

## Support Contacts

- **AWS Support**: [AWS Support Portal](https://console.aws.amazon.com/support/)
- **Bedrock Documentation**: https://docs.aws.amazon.com/bedrock/
- **Internal Team**: [Your team contact info]
- **On-Call**: [On-call rotation]

---

## References

- [Setup Guide](BEDROCK_SETUP_GUIDE.md)
- [Migration Process](BEDROCK_MIGRATION_PROCESS.md)
- [Troubleshooting Guide](BEDROCK_TROUBLESHOOTING_GUIDE.md)
- [Code Examples](BEDROCK_CODE_EXAMPLES.md)
- [Design Document](design.md)
- [Requirements Document](requirements.md)

---

**Status**: Ready for Phase 1 Deployment  
**Last Reviewed**: Current Session  
**Next Review**: Before Phase 1 deployment
