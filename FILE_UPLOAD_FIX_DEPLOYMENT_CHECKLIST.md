# File Upload Fix - Deployment Checklist

## Pre-Deployment Verification

### Code Changes
- [x] upload.ts updated with proper error handling
- [x] Removed silent catch block for metadata creation
- [x] Added comprehensive logging with [UPLOAD] prefix
- [x] Error responses include fileId for debugging
- [x] SQS message only sent after metadata verified
- [x] All error types properly handled (AccessDenied, ResourceNotFoundException, ThrottlingException, ValidationException)

### Code Quality
- [ ] No TypeScript compilation errors
  ```bash
  cd packages/backend
  npm run build
  ```
- [ ] No linting errors
  ```bash
  npm run lint
  ```
- [ ] Code follows project conventions
- [ ] Comments explain critical sections

### Testing
- [ ] Unit tests pass
  ```bash
  npm run test -- packages/backend/src/functions/file/upload.ts
  ```
- [ ] Integration tests pass
  ```bash
  npm run test:integration
  ```
- [ ] Manual testing completed (see FILE_UPLOAD_FIX_TESTING_GUIDE.md)

---

## Infrastructure Verification

### IAM Permissions
- [ ] Verify upload Lambda has DynamoDB permissions
  ```bash
  ROLE_NAME=$(aws lambda get-function-configuration \
    --function-name file-upload \
    --query 'Role' --output text | cut -d'/' -f2)
  
  aws iam list-role-policies --role-name $ROLE_NAME
  ```
  
  **Expected**: Policy includes `dynamodb:PutItem` on FileMetadata table

- [ ] Verify upload Lambda has SQS permissions
  ```bash
  aws iam list-role-policies --role-name $ROLE_NAME
  ```
  
  **Expected**: Policy includes `sqs:SendMessage` on analysis queue

- [ ] Verify upload Lambda has S3 permissions
  ```bash
  aws iam list-role-policies --role-name $ROLE_NAME
  ```
  
  **Expected**: Policy includes `s3:PutObject` on file storage bucket

### Environment Variables
- [ ] FILE_METADATA_TABLE is set correctly
  ```bash
  aws lambda get-function-configuration \
    --function-name file-upload \
    --query 'Environment.Variables.FILE_METADATA_TABLE'
  ```
  
  **Expected**: `FileMetadata-dev` (or appropriate environment)

- [ ] ANALYSIS_QUEUE_URL is set correctly
  ```bash
  aws lambda get-function-configuration \
    --function-name file-upload \
    --query 'Environment.Variables.ANALYSIS_QUEUE_URL'
  ```
  
  **Expected**: Valid SQS queue URL

- [ ] AWS_REGION is set correctly
  ```bash
  aws lambda get-function-configuration \
    --function-name file-upload \
    --query 'Environment.Variables.AWS_REGION'
  ```
  
  **Expected**: Valid AWS region (e.g., us-east-1)

### DynamoDB Table
- [ ] FileMetadata table exists
  ```bash
  aws dynamodb describe-table --table-name FileMetadata-dev
  ```
  
  **Expected**: Table status is ACTIVE

- [ ] UserIndex GSI exists
  ```bash
  aws dynamodb describe-table --table-name FileMetadata-dev \
    --query 'Table.GlobalSecondaryIndexes[?IndexName==`UserIndex`]'
  ```
  
  **Expected**: Index exists with user_id partition key

- [ ] Table has sufficient capacity
  ```bash
  aws dynamodb describe-table --table-name FileMetadata-dev \
    --query 'Table.BillingModeSummary'
  ```
  
  **Expected**: PAY_PER_REQUEST or sufficient provisioned capacity

### S3 Bucket
- [ ] File storage bucket exists
  ```bash
  aws s3 ls | grep misra-platform-files
  ```
  
  **Expected**: Bucket exists

- [ ] Upload Lambda can write to bucket
  ```bash
  # Verify in IAM policy
  aws iam list-role-policies --role-name $ROLE_NAME
  ```
  
  **Expected**: Policy includes `s3:PutObject`

### SQS Queue
- [ ] Analysis queue exists
  ```bash
  aws sqs get-queue-url --queue-name analysis-queue
  ```
  
  **Expected**: Queue URL returned

- [ ] Queue is accessible
  ```bash
  aws sqs get-queue-attributes \
    --queue-url $ANALYSIS_QUEUE_URL \
    --attribute-names All
  ```
  
  **Expected**: Queue attributes returned

---

## Deployment Steps

### Step 1: Build Lambda Function
```bash
cd packages/backend

# Install dependencies
npm install

# Build TypeScript
npm run build

# Bundle for Lambda
npm run bundle:upload
```

**Verify**: No errors in build output

### Step 2: Deploy to Dev Environment
```bash
# Deploy using CDK
npm run deploy -- --context environment=dev

# Or deploy specific Lambda
aws lambda update-function-code \
  --function-name file-upload \
  --zip-file fileb://dist/upload.zip
```

**Verify**: Deployment completes successfully

### Step 3: Verify Deployment
```bash
# Check function configuration
aws lambda get-function-configuration --function-name file-upload

# Check environment variables
aws lambda get-function-configuration \
  --function-name file-upload \
  --query 'Environment.Variables'

# Check recent logs
aws logs tail /aws/lambda/file-upload --follow --since 5m
```

**Verify**: Configuration is correct, no errors in logs

### Step 4: Run Smoke Tests
```bash
# Test successful upload
curl -X POST https://api-dev.example.com/upload \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fileName":"test.c","fileSize":100,"contentType":"text/plain"}'

# Verify response is 200
# Verify fileId is in response
# Verify file appears in UI
```

**Verify**: Upload succeeds, file appears in UI

### Step 5: Monitor for Errors
```bash
# Watch logs for errors
aws logs tail /aws/lambda/file-upload --follow

# Watch for METADATA_CREATION_FAILED errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/file-upload \
  --filter-pattern "METADATA_CREATION_FAILED"

# Watch for permission errors
aws logs filter-log-events \
  --log-group-name /aws/lambda/file-upload \
  --filter-pattern "METADATA_PERMISSION_ERROR"
```

**Verify**: No errors in logs, all uploads succeed

---

## Post-Deployment Validation

### Functional Tests
- [ ] Test 1: Successful Upload
  - Upload valid C file
  - Verify 200 response
  - Verify file appears in UI
  - Verify file in DynamoDB

- [ ] Test 2: Invalid File Type
  - Upload .txt file
  - Verify 400 response
  - Verify file NOT in DynamoDB

- [ ] Test 3: Oversized File
  - Upload 11MB file
  - Verify 400 response
  - Verify file NOT in DynamoDB

- [ ] Test 4: Missing Auth
  - Upload without token
  - Verify 401 response

- [ ] Test 5: File Persistence
  - Upload file
  - Switch tabs multiple times
  - Verify file still appears
  - Verify file does NOT vanish

### Performance Tests
- [ ] Upload latency < 5 seconds
  ```bash
  time curl -X POST https://api-dev.example.com/upload \
    -H "Authorization: Bearer $TOKEN" \
    -d '{"fileName":"test.c","fileSize":1000,"contentType":"text/plain"}'
  ```

- [ ] Multiple concurrent uploads succeed
  ```bash
  for i in {1..10}; do
    curl -X POST https://api-dev.example.com/upload \
      -H "Authorization: Bearer $TOKEN" \
      -d '{"fileName":"test'$i'.c","fileSize":1000,"contentType":"text/plain"}' &
  done
  wait
  ```

### Logging Tests
- [ ] All uploads logged with [UPLOAD] prefix
- [ ] Success logs include ✓ symbol
- [ ] Error logs include ✗ symbol
- [ ] All logs include fileId
- [ ] All logs include userId
- [ ] Error logs include error code

### Error Handling Tests
- [ ] Metadata creation errors return 500 (not 200)
- [ ] Error responses include fileId
- [ ] Error responses include error code
- [ ] Error responses include helpful message
- [ ] SQS failures don't fail upload (return 200)

---

## Rollback Plan

If critical issues are discovered:

### Immediate Rollback
```bash
# Revert to previous version
git checkout HEAD~1 packages/backend/src/functions/file/upload.ts

# Rebuild
npm run build

# Redeploy
aws lambda update-function-code \
  --function-name file-upload \
  --zip-file fileb://dist/upload.zip

# Verify
aws logs tail /aws/lambda/file-upload --follow
```

### Verify Rollback
- [ ] Upload returns 200 (even if metadata fails)
- [ ] Files appear in UI (even if metadata failed)
- [ ] No error responses with fileId
- [ ] Logs show old behavior

### Post-Rollback Investigation
1. Check CloudWatch logs for error patterns
2. Check DynamoDB metrics for throttling
3. Check IAM permissions
4. Check environment variables
5. Create incident report

---

## Monitoring Setup

### CloudWatch Alarms

Create alarms to monitor for issues:

```bash
# Alarm for upload errors
aws cloudwatch put-metric-alarm \
  --alarm-name file-upload-errors \
  --alarm-description "Alert when file upload errors exceed threshold" \
  --metric-name Errors \
  --namespace AWS/Lambda \
  --statistic Sum \
  --period 300 \
  --threshold 5 \
  --comparison-operator GreaterThanThreshold \
  --evaluation-periods 1 \
  --dimensions Name=FunctionName,Value=file-upload \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts

# Alarm for metadata creation failures
aws logs put-metric-filter \
  --log-group-name /aws/lambda/file-upload \
  --filter-name MetadataCreationFailures \
  --filter-pattern "[UPLOAD] ✗ CRITICAL: Failed to create FileMetadata" \
  --metric-transformations metricName=MetadataCreationFailures,metricValue=1

aws cloudwatch put-metric-alarm \
  --alarm-name metadata-creation-failures \
  --alarm-description "Alert when metadata creation fails" \
  --metric-name MetadataCreationFailures \
  --namespace /aws/lambda/file-upload \
  --statistic Sum \
  --period 300 \
  --threshold 1 \
  --comparison-operator GreaterThanOrEqualToThreshold \
  --evaluation-periods 1 \
  --alarm-actions arn:aws:sns:us-east-1:123456789:alerts
```

### CloudWatch Dashboards

Create dashboard to monitor upload health:

```bash
aws cloudwatch put-dashboard \
  --dashboard-name FileUploadHealth \
  --dashboard-body file://dashboard.json
```

**dashboard.json**:
```json
{
  "widgets": [
    {
      "type": "metric",
      "properties": {
        "metrics": [
          ["AWS/Lambda", "Invocations", {"stat": "Sum"}],
          ["AWS/Lambda", "Errors", {"stat": "Sum"}],
          ["AWS/Lambda", "Duration", {"stat": "Average"}],
          ["AWS/DynamoDB", "ConsumedWriteCapacityUnits", {"stat": "Sum"}],
          ["AWS/DynamoDB", "UserErrors", {"stat": "Sum"}]
        ],
        "period": 300,
        "stat": "Average",
        "region": "us-east-1",
        "title": "File Upload Health"
      }
    }
  ]
}
```

---

## Sign-Off

### Development Team
- [ ] Code reviewed and approved
- [ ] Tests passed
- [ ] Deployment checklist completed
- [ ] Ready for deployment

**Reviewed by**: _________________ **Date**: _________

### QA Team
- [ ] Functional tests passed
- [ ] Performance tests passed
- [ ] Error handling verified
- [ ] Logging verified

**Tested by**: _________________ **Date**: _________

### DevOps Team
- [ ] Infrastructure verified
- [ ] IAM permissions verified
- [ ] Environment variables verified
- [ ] Monitoring setup completed
- [ ] Rollback plan tested

**Deployed by**: _________________ **Date**: _________

### Product Team
- [ ] User impact assessed
- [ ] Documentation updated
- [ ] Support team notified
- [ ] Ready for production

**Approved by**: _________________ **Date**: _________

---

## Post-Deployment Monitoring (24 hours)

### Metrics to Monitor
- [ ] Upload success rate > 99%
- [ ] Upload latency < 5 seconds (p95)
- [ ] No metadata creation failures
- [ ] No permission errors
- [ ] No table not found errors
- [ ] No throttling errors

### Logs to Monitor
- [ ] Search for `✗ CRITICAL` - should be 0
- [ ] Search for `METADATA_PERMISSION_ERROR` - should be 0
- [ ] Search for `METADATA_TABLE_ERROR` - should be 0
- [ ] Search for `METADATA_CREATION_FAILED` - should be 0
- [ ] Search for `✓ Upload complete` - should be high

### User Feedback
- [ ] No reports of files vanishing
- [ ] No reports of upload failures
- [ ] No reports of missing files
- [ ] User satisfaction maintained

---

## Success Criteria

✓ All pre-deployment checks passed
✓ All deployment steps completed successfully
✓ All post-deployment tests passed
✓ No critical errors in logs
✓ Upload success rate > 99%
✓ No files vanishing
✓ Monitoring alerts configured
✓ Team sign-off obtained
✓ Ready for production deployment
