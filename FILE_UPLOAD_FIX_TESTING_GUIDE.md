# File Upload Fix - Testing Guide

## Overview

This guide provides step-by-step instructions to test the file upload fix and verify that files no longer vanish after upload.

---

## Prerequisites

- AWS CLI configured with appropriate credentials
- Access to CloudWatch Logs
- Test C/C++ files ready
- Frontend application deployed and accessible

---

## Test 1: Successful Upload Flow

### Objective
Verify that files upload successfully and appear in the UI.

### Steps

1. **Prepare test file**
   ```bash
   # Create a simple C file
   cat > test.c << 'EOF'
   #include <stdio.h>
   int main() {
       printf("Hello, World!\n");
       return 0;
   }
   EOF
   ```

2. **Upload file via UI**
   - Navigate to Dashboard
   - Click "Upload File"
   - Select `test.c`
   - Verify upload completes with 200 status

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] Starting file upload handler
   [UPLOAD] User authenticated: user-123, Organization: org-456
   [UPLOAD] Request parsed: fileName=test.c, fileSize=...
   [UPLOAD] ✓ Validation passed: file type=.c, size=...
   [UPLOAD] ✓ Presigned URL generated: fileId=...
   [UPLOAD] Creating FileMetadata for file ...
   [UPLOAD] ✓ FileMetadata record created successfully for file ...
   [UPLOAD] Queuing analysis for file ...
   [UPLOAD] ✓ Analysis queued successfully for file ...
   [UPLOAD] ✓ Upload complete for file ...
   ```

4. **Verify file in UI**
   - Switch to "Files" tab
   - Verify uploaded file appears in list
   - Verify file status is "pending" or "analyzing"

5. **Verify file in DynamoDB**
   ```bash
   aws dynamodb get-item \
     --table-name FileMetadata-dev \
     --key '{"file_id": {"S": "<fileId>"}}'
   ```
   
   **Expected**: Item exists with correct metadata

### Success Criteria
- ✓ Upload returns 200 status
- ✓ CloudWatch logs show all success messages
- ✓ File appears in UI immediately
- ✓ File exists in DynamoDB
- ✓ File does NOT vanish when switching tabs

---

## Test 2: Missing IAM Permissions

### Objective
Verify that upload fails gracefully when Lambda lacks DynamoDB permissions.

### Steps

1. **Remove DynamoDB permissions**
   ```bash
   # Get the Lambda role
   ROLE_NAME=$(aws lambda get-function-configuration \
     --function-name file-upload \
     --query 'Role' --output text | cut -d'/' -f2)
   
   # Remove DynamoDB policy
   aws iam delete-role-policy \
     --role-name $ROLE_NAME \
     --policy-name DynamoDBAccess
   ```

2. **Attempt upload**
   - Upload a test file
   - Verify upload returns 500 status

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] ✗ CRITICAL: Failed to create FileMetadata for file ...
   [UPLOAD] ✗ IAM Permission Error: Lambda does not have permission to write to DynamoDB table FileMetadata-dev
   ```

4. **Verify error response**
   ```json
   {
     "error": {
       "code": "METADATA_PERMISSION_ERROR",
       "message": "Failed to save file metadata: Permission denied. FileId: ... Ensure Lambda has dynamodb:PutItem permission.",
       "timestamp": "2024-01-15T10:30:00.000Z",
       "requestId": "abc123"
     }
   }
   ```

5. **Verify file NOT in DynamoDB**
   ```bash
   aws dynamodb get-item \
     --table-name FileMetadata-dev \
     --key '{"file_id": {"S": "<fileId>"}}'
   ```
   
   **Expected**: Item does not exist

6. **Restore permissions**
   ```bash
   # Re-attach the policy
   aws iam put-role-policy \
     --role-name $ROLE_NAME \
     --policy-name DynamoDBAccess \
     --policy-document file://policy.json
   ```

### Success Criteria
- ✓ Upload returns 500 status (not 200!)
- ✓ Error code is METADATA_PERMISSION_ERROR
- ✓ Error message includes fileId
- ✓ CloudWatch logs show permission error
- ✓ File NOT created in DynamoDB
- ✓ File does NOT appear in UI

---

## Test 3: Missing Environment Variable

### Objective
Verify that upload fails when FILE_METADATA_TABLE is not set.

### Steps

1. **Update Lambda environment**
   ```bash
   aws lambda update-function-configuration \
     --function-name file-upload \
     --environment 'Variables={FILE_METADATA_TABLE=}'
   ```

2. **Attempt upload**
   - Upload a test file
   - Verify upload returns 500 status

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] ✗ CRITICAL: Failed to create FileMetadata for file ...
   [UPLOAD] ✗ Table Not Found: DynamoDB table  does not exist
   ```

4. **Verify error response**
   ```json
   {
     "error": {
       "code": "METADATA_TABLE_ERROR",
       "message": "Failed to save file metadata: Table not found. FileId: ... Table: ",
       "timestamp": "2024-01-15T10:30:00.000Z",
       "requestId": "abc123"
     }
   }
   ```

5. **Restore environment variable**
   ```bash
   aws lambda update-function-configuration \
     --function-name file-upload \
     --environment 'Variables={FILE_METADATA_TABLE=FileMetadata-dev}'
   ```

### Success Criteria
- ✓ Upload returns 500 status
- ✓ Error code is METADATA_TABLE_ERROR
- ✓ Error message includes fileId
- ✓ CloudWatch logs show table not found error

---

## Test 4: DynamoDB Throttling

### Objective
Verify that upload fails gracefully when DynamoDB is throttled.

### Steps

1. **Simulate throttling** (using AWS SDK mock or by reducing capacity)
   ```bash
   # Reduce DynamoDB capacity to trigger throttling
   aws dynamodb update-table \
     --table-name FileMetadata-dev \
     --billing-mode PROVISIONED \
     --provisioned-throughput ReadCapacityUnits=1,WriteCapacityUnits=1
   ```

2. **Attempt multiple uploads rapidly**
   ```bash
   for i in {1..10}; do
     curl -X POST https://api.example.com/upload \
       -H "Authorization: Bearer $TOKEN" \
       -d '{"fileName":"test'$i'.c","fileSize":1000,"contentType":"text/plain"}'
   done
   ```

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs** (for throttled requests):
   ```
   [UPLOAD] ✗ CRITICAL: Failed to create FileMetadata for file ...
   [UPLOAD] ✗ Throttling: DynamoDB is temporarily unavailable
   ```

4. **Verify error response**
   ```json
   {
     "error": {
       "code": "METADATA_THROTTLED",
       "message": "Failed to save file metadata: Service temporarily unavailable. FileId: ... Please retry.",
       "timestamp": "2024-01-15T10:30:00.000Z",
       "requestId": "abc123"
     }
   }
   ```

5. **Restore capacity**
   ```bash
   aws dynamodb update-table \
     --table-name FileMetadata-dev \
     --billing-mode PAY_PER_REQUEST
   ```

### Success Criteria
- ✓ Upload returns 503 status (not 200!)
- ✓ Error code is METADATA_THROTTLED
- ✓ Error message includes fileId
- ✓ CloudWatch logs show throttling error
- ✓ Retry succeeds after capacity restored

---

## Test 5: SQS Failure (Non-Critical)

### Objective
Verify that upload succeeds even if SQS message fails to send.

### Steps

1. **Make SQS queue unavailable**
   ```bash
   # Delete the analysis queue
   aws sqs delete-queue --queue-url $ANALYSIS_QUEUE_URL
   ```

2. **Attempt upload**
   - Upload a test file
   - Verify upload returns 200 status (not 500!)

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] ✓ FileMetadata record created successfully for file ...
   [UPLOAD] Queuing analysis for file ...
   [UPLOAD] ✗ Failed to queue analysis for file ...
   [UPLOAD] ⚠ Analysis not queued for file ..., but metadata was saved. File will be available in UI.
   [UPLOAD] ✓ Upload complete for file ...
   ```

4. **Verify file in UI**
   - Switch to "Files" tab
   - Verify file appears in list
   - File should be visible even though analysis wasn't queued

5. **Verify file in DynamoDB**
   ```bash
   aws dynamodb get-item \
     --table-name FileMetadata-dev \
     --key '{"file_id": {"S": "<fileId>"}}'
   ```
   
   **Expected**: Item exists with correct metadata

6. **Recreate SQS queue**
   ```bash
   aws sqs create-queue --queue-name analysis-queue
   ```

### Success Criteria
- ✓ Upload returns 200 status (not 500!)
- ✓ CloudWatch logs show SQS error but upload succeeds
- ✓ File appears in UI
- ✓ File exists in DynamoDB
- ✓ Error is logged but doesn't fail the upload

---

## Test 6: Invalid File Type

### Objective
Verify that invalid file types are rejected before metadata creation.

### Steps

1. **Attempt upload with invalid file type**
   ```bash
   curl -X POST https://api.example.com/upload \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"fileName":"test.txt","fileSize":1000,"contentType":"text/plain"}'
   ```

2. **Verify upload returns 400 status**

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] ✗ Invalid file type: .txt
   ```

4. **Verify error response**
   ```json
   {
     "error": {
       "code": "INVALID_FILE_TYPE",
       "message": "Only .c, .cpp, .h, .hpp files are allowed",
       "timestamp": "2024-01-15T10:30:00.000Z",
       "requestId": "abc123"
     }
   }
   ```

5. **Verify file NOT in DynamoDB**
   - File should not be created since validation failed before metadata creation

### Success Criteria
- ✓ Upload returns 400 status
- ✓ Error code is INVALID_FILE_TYPE
- ✓ File NOT created in DynamoDB
- ✓ File does NOT appear in UI

---

## Test 7: File Size Validation

### Objective
Verify that oversized files are rejected.

### Steps

1. **Attempt upload with oversized file**
   ```bash
   curl -X POST https://api.example.com/upload \
     -H "Authorization: Bearer $TOKEN" \
     -d '{"fileName":"test.c","fileSize":11000000,"contentType":"text/plain"}'
   ```

2. **Verify upload returns 400 status**

3. **Check CloudWatch logs**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```
   
   **Expected logs**:
   ```
   [UPLOAD] ✗ File too large: 11000000 bytes (max: 10485760)
   ```

4. **Verify error response**
   ```json
   {
     "error": {
       "code": "FILE_TOO_LARGE",
       "message": "File size must not exceed 10MB (10485760 bytes)",
       "timestamp": "2024-01-15T10:30:00.000Z",
       "requestId": "abc123"
     }
   }
   ```

### Success Criteria
- ✓ Upload returns 400 status
- ✓ Error code is FILE_TOO_LARGE
- ✓ File NOT created in DynamoDB

---

## Test 8: End-to-End Flow with Analysis

### Objective
Verify complete flow from upload through analysis.

### Steps

1. **Upload file**
   - Upload a valid C file
   - Verify 200 response

2. **Verify metadata created**
   ```bash
   aws dynamodb get-item \
     --table-name FileMetadata-dev \
     --key '{"file_id": {"S": "<fileId>"}}'
   ```
   
   **Expected**: Item exists with `analysis_status: "pending"`

3. **Verify SQS message sent**
   ```bash
   aws sqs receive-message \
     --queue-url $ANALYSIS_QUEUE_URL \
     --max-number-of-messages 1
   ```
   
   **Expected**: Message contains fileId, fileName, s3Key, language, userId

4. **Monitor analysis progress**
   - Check CloudWatch logs for analysis Lambda
   - Verify analysis completes
   - Verify metadata updated with `analysis_status: "completed"`

5. **Verify results in UI**
   - Navigate to file details
   - Verify analysis results appear
   - Verify violations are displayed

### Success Criteria
- ✓ Upload returns 200
- ✓ Metadata created with pending status
- ✓ SQS message sent with correct data
- ✓ Analysis Lambda processes message
- ✓ Results appear in UI
- ✓ No files vanish

---

## Automated Test Script

Create a test script to automate these tests:

```bash
#!/bin/bash

# test-upload-fix.sh

set -e

API_URL="https://api.example.com"
TOKEN="your-auth-token"
TABLE_NAME="FileMetadata-dev"

echo "=== Test 1: Successful Upload ==="
RESPONSE=$(curl -s -X POST $API_URL/upload \
  -H "Authorization: Bearer $TOKEN" \
  -d '{"fileName":"test.c","fileSize":100,"contentType":"text/plain"}')

FILE_ID=$(echo $RESPONSE | jq -r '.fileId')
echo "Uploaded file: $FILE_ID"

# Verify in DynamoDB
ITEM=$(aws dynamodb get-item \
  --table-name $TABLE_NAME \
  --key "{\"file_id\": {\"S\": \"$FILE_ID\"}}" \
  --query 'Item')

if [ "$ITEM" != "null" ]; then
  echo "✓ File metadata exists in DynamoDB"
else
  echo "✗ File metadata NOT found in DynamoDB"
  exit 1
fi

echo ""
echo "=== All tests passed! ==="
```

---

## Monitoring & Alerts

### CloudWatch Metrics to Monitor

```bash
# Monitor upload errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/Lambda \
  --metric-name Errors \
  --dimensions Name=FunctionName,Value=file-upload \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 300 \
  --statistics Sum

# Monitor DynamoDB errors
aws cloudwatch get-metric-statistics \
  --namespace AWS/DynamoDB \
  --metric-name UserErrors \
  --dimensions Name=TableName,Value=FileMetadata-dev \
  --start-time 2024-01-15T00:00:00Z \
  --end-time 2024-01-15T23:59:59Z \
  --period 300 \
  --statistics Sum
```

### CloudWatch Alarms

```bash
# Create alarm for upload errors
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
  --dimensions Name=FunctionName,Value=file-upload
```

---

## Troubleshooting

### Issue: Files still vanishing

**Check**:
1. CloudWatch logs for `✗ CRITICAL: Failed to create FileMetadata`
2. Error code in response (METADATA_PERMISSION_ERROR, METADATA_TABLE_ERROR, etc.)
3. IAM permissions on Lambda role
4. FILE_METADATA_TABLE environment variable

### Issue: Upload returns 500 but should return 200

**Check**:
1. Is this a metadata creation error? (Expected 500)
2. Is this an SQS error? (Should still return 200)
3. Check CloudWatch logs for error type

### Issue: Files appear but analysis doesn't run

**Check**:
1. ANALYSIS_QUEUE_URL environment variable is set
2. SQS queue exists and is accessible
3. Analysis Lambda has permission to read from queue
4. Check SQS queue for messages

---

## Rollback Procedure

If issues occur:

1. **Revert upload.ts**
   ```bash
   git checkout HEAD~1 packages/backend/src/functions/file/upload.ts
   ```

2. **Rebuild and redeploy**
   ```bash
   npm run build
   npm run deploy
   ```

3. **Monitor error rates**
   ```bash
   aws logs tail /aws/lambda/file-upload --follow
   ```

4. **Investigate root cause**
   - Check CloudWatch logs
   - Check DynamoDB metrics
   - Check IAM permissions

---

## Sign-Off

- [ ] Test 1: Successful Upload - PASSED
- [ ] Test 2: Missing IAM Permissions - PASSED
- [ ] Test 3: Missing Environment Variable - PASSED
- [ ] Test 4: DynamoDB Throttling - PASSED
- [ ] Test 5: SQS Failure (Non-Critical) - PASSED
- [ ] Test 6: Invalid File Type - PASSED
- [ ] Test 7: File Size Validation - PASSED
- [ ] Test 8: End-to-End Flow with Analysis - PASSED
- [ ] CloudWatch Logs reviewed - OK
- [ ] No silent failures observed - OK
- [ ] Ready for production deployment - YES
