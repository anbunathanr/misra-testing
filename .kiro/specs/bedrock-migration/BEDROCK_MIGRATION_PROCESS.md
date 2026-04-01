# Amazon Bedrock Migration Process

## Overview

This document outlines the phased migration process from OpenAI to Amazon Bedrock with Claude 3.5 Sonnet. The migration follows a 4-phase deployment strategy to ensure zero downtime and maintain backward compatibility.

**Migration Timeline**: 4-6 weeks  
**Rollback Time**: <5 minutes at any phase  
**Expected Cost Savings**: 33% reduction

---

## Table of Contents

1. [Migration Phases](#migration-phases)
2. [Phase 1: Parallel Deployment](#phase-1-parallel-deployment)
3. [Phase 2: Canary Deployment](#phase-2-canary-deployment)
4. [Phase 3: Gradual Rollout](#phase-3-gradual-rollout)
5. [Phase 4: Full Migration](#phase-4-full-migration)
6. [Rollback Procedures](#rollback-procedures)
7. [Monitoring and Validation](#monitoring-and-validation)
8. [Success Criteria](#success-criteria)

---

## Migration Phases

### Phase Overview

| Phase | Duration | Traffic to Bedrock | Monitoring Period | Rollback Risk |
|-------|----------|-------------------|-------------------|---------------|
| Phase 1 | Week 1 | 0% (testing only) | Continuous | Very Low |
| Phase 2 | Week 2-3 | 10% | 48 hours | Low |
| Phase 3 | Week 4-5 | 50% → 100% | 48 hours each | Medium |
| Phase 4 | Week 6+ | 100% | 1 week | Low |

### Key Principles

1. **Incremental Changes**: Small, controlled increases in traffic
2. **Continuous Monitoring**: Real-time metrics and alerts
3. **Fast Rollback**: Ability to revert within 5 minutes
4. **Data-Driven Decisions**: Proceed only when metrics are healthy
5. **User Impact Minimization**: No service disruption

---

## Phase 1: Parallel Deployment

**Goal**: Deploy Bedrock engine alongside OpenAI without changing user traffic

**Duration**: Week 1  
**Traffic to Bedrock**: 0% (internal testing only)  
**Rollback Risk**: Very Low

### Prerequisites

- ✅ All implementation tasks complete (Tasks 1-10)
- ✅ All tests passing (unit, integration)
- ✅ IAM permissions configured
- ✅ CloudWatch monitoring enabled
- ✅ Documentation complete

### Deployment Steps

#### 1. Deploy Infrastructure

```bash
# Set environment to keep OpenAI as default
export AI_PROVIDER=OPENAI
export BEDROCK_REGION=us-east-1
export BEDROCK_MODEL_ID=anthropic.claude-3-5-sonnet-20241022-v2:0

# Deploy CDK stack
cd packages/backend
cdk deploy --all

# Verify deployment
aws lambda list-functions --query "Functions[?contains(FunctionName, 'aibts-ai')]"
```

#### 2. Verify Configuration

```bash
# Check Lambda environment variables
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables'

# Expected output:
# {
#   "AI_PROVIDER": "OPENAI",
#   "BEDROCK_REGION": "us-east-1",
#   "BEDROCK_MODEL_ID": "anthropic.claude-3-5-sonnet-20241022-v2:0",
#   ...
# }
```

#### 3. Enable Feature Flag for Testing

Add feature flag to enable Bedrock testing for internal users:

```typescript
// Add to Lambda environment
ENABLE_BEDROCK_TESTING=true
BEDROCK_TEST_USER_IDS=user1,user2,user3
```

#### 4. Internal Testing

Test Bedrock with internal users:

```bash
# Test analyze endpoint
curl -X POST https://api.example.com/ai-test-generation/analyze \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Use-Bedrock: true" \
  -d '{"url":"https://example.com"}'

# Test generate endpoint
curl -X POST https://api.example.com/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -H "X-Use-Bedrock: true" \
  -d '{"scenario":"Login test","context":{"url":"https://example.com"}}'
```

#### 5. Collect Feedback

- Test all AI operations (analyze, generate, complete)
- Compare output quality with OpenAI
- Check latency and error rates
- Verify cost tracking

### Validation Checklist

- [ ] All Lambda functions deployed successfully
- [ ] Environment variables configured correctly
- [ ] IAM permissions working (no AccessDenied errors)
- [ ] CloudWatch metrics being emitted
- [ ] X-Ray traces visible
- [ ] Internal testing successful
- [ ] No regressions in OpenAI functionality

### Monitoring

Monitor these metrics during Phase 1:

- **Error Rate**: Should be 0% for OpenAI (unchanged)
- **Latency**: OpenAI latency should remain stable
- **Cost**: Track Bedrock test costs (should be minimal)
- **Test Coverage**: Ensure all operations tested

### Proceed to Phase 2 When

- ✅ All validation checks pass
- ✅ Internal testing shows comparable quality
- ✅ No critical issues found
- ✅ Team confident in Bedrock implementation

---

## Phase 2: Canary Deployment

**Goal**: Route 10% of production traffic to Bedrock

**Duration**: Week 2-3  
**Traffic to Bedrock**: 10%  
**Rollback Risk**: Low

### Prerequisites

- ✅ Phase 1 complete and validated
- ✅ Internal testing successful
- ✅ Monitoring dashboards configured
- ✅ On-call team briefed

### Deployment Steps

#### 1. Implement Traffic Routing

Add traffic routing logic to AI Engine Factory:

```typescript
// ai-engine-factory.ts
export function createAIEngine(): IAIEngine {
  const provider = getProviderForRequest();
  
  switch (provider) {
    case 'BEDROCK':
      return new BedrockEngine();
    case 'OPENAI':
      return new OpenAIEngine();
    default:
      return new BedrockEngine();
  }
}

function getProviderForRequest(): AIProvider {
  // 10% traffic to Bedrock
  const bedrockPercentage = parseInt(process.env.BEDROCK_TRAFFIC_PERCENTAGE || '0');
  const random = Math.random() * 100;
  
  if (random < bedrockPercentage) {
    return 'BEDROCK';
  }
  
  return process.env.AI_PROVIDER as AIProvider || 'OPENAI';
}
```

#### 2. Deploy with 10% Traffic

```bash
# Set traffic percentage
export BEDROCK_TRAFFIC_PERCENTAGE=10
export AI_PROVIDER=OPENAI  # Still default to OpenAI

# Deploy
cdk deploy --all
```

#### 3. Monitor Closely

Watch metrics for 48 hours:

```bash
# Create CloudWatch dashboard
aws cloudwatch put-dashboard \
  --dashboard-name Bedrock-Migration-Phase2 \
  --dashboard-body file://dashboard-phase2.json
```

### Comparison Metrics

Compare Bedrock vs OpenAI across these dimensions:

| Metric | OpenAI Baseline | Bedrock Target | Actual |
|--------|----------------|----------------|--------|
| Error Rate | <1% | <1% | _Monitor_ |
| Avg Latency | ~2.5s | <3s | _Monitor_ |
| P95 Latency | ~5s | <6s | _Monitor_ |
| Cost per Operation | $0.12 | $0.08 | _Monitor_ |
| Test Quality Score | 8.5/10 | >8/10 | _Monitor_ |

### Validation Checklist

- [ ] 10% of traffic routing to Bedrock
- [ ] Error rates comparable to OpenAI
- [ ] Latency within acceptable range
- [ ] Cost savings visible (~33%)
- [ ] No user complaints
- [ ] CloudWatch alarms not triggered

### Monitoring

**Critical Metrics** (check every hour):
- Error rate by provider
- Latency percentiles (P50, P95, P99)
- Cost per operation
- Circuit breaker state

**Daily Review**:
- User feedback
- Test quality comparison
- Cost savings analysis
- Error log analysis

### Rollback Trigger Conditions

Roll back immediately if:
- Error rate >5% for Bedrock
- P95 latency >10 seconds
- Circuit breaker opens frequently (>5 times/hour)
- Critical user complaints
- Cost anomalies

### Proceed to Phase 3 When

- ✅ 48 hours of stable operation
- ✅ Error rates comparable to OpenAI
- ✅ Latency acceptable
- ✅ Cost savings confirmed
- ✅ No critical issues

---

## Phase 3: Gradual Rollout

**Goal**: Increase Bedrock traffic from 10% → 50% → 100%

**Duration**: Week 4-5  
**Traffic to Bedrock**: 50% then 100%  
**Rollback Risk**: Medium

### Step 1: Increase to 50% (Week 4)

#### Deployment

```bash
# Increase traffic to 50%
export BEDROCK_TRAFFIC_PERCENTAGE=50

# Deploy
cdk deploy --all
```

#### Monitoring Period

Monitor for 48 hours before proceeding.

#### Validation

- [ ] Error rates remain stable
- [ ] Latency acceptable
- [ ] Cost savings scaling linearly
- [ ] No increase in support tickets

### Step 2: Increase to 100% (Week 5)

#### Deployment

```bash
# Switch default provider to Bedrock
export AI_PROVIDER=BEDROCK
export BEDROCK_TRAFFIC_PERCENTAGE=100

# Deploy
cdk deploy --all
```

#### Keep OpenAI as Fallback

Maintain OpenAI configuration for emergency rollback:

```typescript
// Keep OpenAI engine available
if (process.env.ENABLE_OPENAI_FALLBACK === 'true') {
  // OpenAI still accessible if needed
}
```

#### Monitoring Period

Monitor for 48 hours before declaring success.

### Validation Checklist

- [ ] 100% traffic on Bedrock
- [ ] Error rates stable or improved
- [ ] Latency stable or improved
- [ ] Cost savings achieved (~33%)
- [ ] User satisfaction maintained
- [ ] All tests passing

### Rollback Procedure

If issues arise:

```bash
# Immediate rollback to OpenAI
export AI_PROVIDER=OPENAI
export BEDROCK_TRAFFIC_PERCENTAGE=0

# Deploy (takes ~5 minutes)
cdk deploy --all --require-approval never

# Verify rollback
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'
```

### Proceed to Phase 4 When

- ✅ 48 hours at 100% traffic
- ✅ All metrics healthy
- ✅ No critical issues
- ✅ Team confident in stability

---

## Phase 4: Full Migration

**Goal**: Finalize migration and deprecate OpenAI

**Duration**: Week 6+  
**Traffic to Bedrock**: 100%  
**Rollback Risk**: Low

### Activities

#### 1. Set Bedrock as Default

Update default configuration:

```typescript
// bedrock-config.ts
const DEFAULT_CONFIG = {
  provider: 'BEDROCK' as const,  // Changed from OPENAI
  region: 'us-east-1',
  modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
  timeout: 30000,
};
```

#### 2. Monitor for Stability

Monitor for 1 week:

- Daily error rate review
- Weekly cost analysis
- User satisfaction surveys
- Performance benchmarks

#### 3. Measure Cost Savings

Calculate actual savings:

```sql
-- CloudWatch Logs Insights query
fields @timestamp, operation, metrics.cost
| filter service = "BedrockEngine"
| stats sum(metrics.cost) as totalCost by bin(1d)
```

Expected savings: ~33% compared to OpenAI baseline

#### 4. Update Documentation

- Update README with Bedrock as default
- Update deployment guides
- Update troubleshooting docs
- Archive OpenAI-specific docs

#### 5. Optional: Deprecate OpenAI

After 1 month of stable operation:

```bash
# Remove OpenAI API key (optional)
aws lambda update-function-configuration \
  --function-name aibts-ai-generate \
  --environment "Variables={OPENAI_API_KEY=}"

# Keep OpenAI code for emergency fallback
# Do not delete OpenAIEngine class
```

### Final Validation

- [ ] 1 week of stable operation at 100%
- [ ] Cost savings achieved and documented
- [ ] Error rates equal or better than baseline
- [ ] Latency equal or better than baseline
- [ ] User satisfaction maintained or improved
- [ ] All documentation updated
- [ ] Team trained on Bedrock operations

### Success Metrics

| Metric | Target | Actual |
|--------|--------|--------|
| Cost Reduction | 30-35% | _Measure_ |
| Error Rate | ≤ OpenAI baseline | _Measure_ |
| Latency | ≤ OpenAI baseline | _Measure_ |
| User Satisfaction | ≥ OpenAI baseline | _Measure_ |
| Uptime | 99.9% | _Measure_ |

---

## Rollback Procedures

### Emergency Rollback (Any Phase)

If critical issues arise, rollback immediately:

#### Step 1: Switch to OpenAI

```bash
# Set environment variable
export AI_PROVIDER=OPENAI

# Deploy immediately
cd packages/backend
cdk deploy --all --require-approval never
```

**Time to Complete**: ~5 minutes

#### Step 2: Verify Rollback

```bash
# Check Lambda configuration
aws lambda get-function-configuration \
  --function-name aibts-ai-generate \
  --query 'Environment.Variables.AI_PROVIDER'

# Test endpoint
curl -X POST https://api.example.com/ai-test-generation/generate \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"scenario":"Test","context":{}}'
```

#### Step 3: Investigate Issues

- Review CloudWatch Logs
- Check X-Ray traces
- Analyze error patterns
- Identify root cause

#### Step 4: Fix and Retry

- Fix identified issues
- Test in Phase 1 environment
- Resume migration when ready

### Partial Rollback

If issues affect only specific operations:

```typescript
// Selective rollback for specific operations
export function createAIEngine(operation: string): IAIEngine {
  // Use OpenAI for problematic operations
  if (operation === 'analyze' && process.env.BEDROCK_ANALYZE_DISABLED === 'true') {
    return new OpenAIEngine();
  }
  
  return new BedrockEngine();
}
```

---

## Monitoring and Validation

### Real-Time Monitoring

**CloudWatch Dashboard**: Monitor these metrics in real-time

- Error rate by provider
- Latency percentiles
- Cost per operation
- Circuit breaker state
- Token usage

**CloudWatch Alarms**: Configured alarms

1. High Error Rate (>10 errors in 5 minutes)
2. High Latency (>30 seconds average)
3. High Cost (>$100/day)

### Daily Reviews

- Error log analysis
- Cost trend analysis
- User feedback review
- Performance comparison

### Weekly Reviews

- Migration progress assessment
- Cost savings calculation
- Quality comparison
- Team retrospective

---

## Success Criteria

The migration is successful when:

### Technical Criteria

- ✅ All AI operations work with Bedrock
- ✅ Error rates ≤ OpenAI baseline
- ✅ Latency ≤ OpenAI baseline
- ✅ Cost reduced by 30-35%
- ✅ All tests passing
- ✅ No critical bugs

### Operational Criteria

- ✅ 1 week of stable operation at 100%
- ✅ CloudWatch alarms not triggered
- ✅ Circuit breaker stable (CLOSED state)
- ✅ No emergency rollbacks needed

### Business Criteria

- ✅ User satisfaction maintained or improved
- ✅ Cost savings documented
- ✅ Team trained and confident
- ✅ Documentation complete

### Final Sign-Off

Migration complete when:
- All criteria met
- Stakeholders approve
- Team confident in stability
- Rollback plan documented

---

## Lessons Learned

Document lessons learned after migration:

1. What went well?
2. What could be improved?
3. Unexpected challenges?
4. Recommendations for future migrations?

---

## References

- [Setup Guide](BEDROCK_SETUP_GUIDE.md)
- [Troubleshooting Guide](BEDROCK_TROUBLESHOOTING_GUIDE.md)
- [Code Examples](BEDROCK_CODE_EXAMPLES.md)
- [Design Document](design.md)
- [Requirements Document](requirements.md)
