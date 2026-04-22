# OTP Webhook Setup Guide

## Overview

The OTP webhook system automatically captures OTP codes from Cognito emails and stores them in DynamoDB. This enables the frontend to fetch OTPs without requiring manual email access.

## Architecture

```
Cognito sends OTP email
    ↓
SES receives email (via receipt rule)
    ↓
Email stored in S3
    ↓
S3 triggers Lambda (otp-webhook)
    ↓
Lambda extracts OTP from email
    ↓
OTP stored in DynamoDB (OTPStorage table)
    ↓
Frontend calls /auth/fetch-otp
    ↓
OTP retrieved from DynamoDB and returned
```

## Setup Steps

### 1. Configure SES Email Receiving

First, verify your domain in SES:

```bash
# Verify domain in SES (AWS Console)
# Go to SES → Verified identities → Add identity
# Select "Domain" and enter your domain
# Add DKIM records to your DNS
```

### 2. Create S3 Bucket for Email Storage

```bash
# Create bucket for received emails
aws s3 mb s3://misra-otp-emails-${ACCOUNT_ID}

# Block public access
aws s3api put-public-access-block \
  --bucket misra-otp-emails-${ACCOUNT_ID} \
  --public-access-block-configuration \
  "BlockPublicAcls=true,IgnorePublicAcls=true,BlockPublicPolicy=true,RestrictPublicBuckets=true"
```

### 3. Create SES Receipt Rule Set

```bash
# Create receipt rule set
aws ses create-receipt-rule-set --rule-set-name misra-otp-rules

# Set as active
aws ses set-active-receipt-rule-set --rule-set-name misra-otp-rules
```

### 4. Create SES Receipt Rule

```bash
# Create rule to capture OTP emails
aws ses create-receipt-rule \
  --rule-set-name misra-otp-rules \
  --rule '{
    "Name": "CaptureOTPEmails",
    "Enabled": true,
    "TlsPolicy": "Optional",
    "Recipients": ["otp@yourdomain.com"],
    "Actions": [
      {
        "S3Action": {
          "BucketName": "misra-otp-emails-'${ACCOUNT_ID}'",
          "ObjectKeyPrefix": "otp-emails/"
        }
      },
      {
        "LambdaAction": {
          "FunctionArn": "arn:aws:lambda:us-east-1:'${ACCOUNT_ID}':function:misra-auth-otp-webhook",
          "InvocationType": "Event"
        }
      }
    ]
  }'
```

### 5. Grant SES Permission to Invoke Lambda

```bash
aws lambda add-permission \
  --function-name misra-auth-otp-webhook \
  --statement-id AllowSESInvoke \
  --action lambda:InvokeFunction \
  --principal ses.amazonaws.com \
  --source-arn arn:aws:ses:us-east-1:${ACCOUNT_ID}:receipt-rule-set/misra-otp-rules
```

### 6. Grant SES Permission to Write to S3

```bash
# Create IAM policy for SES
aws iam put-role-policy \
  --role-name SESReceiptRuleRole \
  --policy-name SESWriteToS3 \
  --policy-document '{
    "Version": "2012-10-17",
    "Statement": [
      {
        "Effect": "Allow",
        "Action": "s3:PutObject",
        "Resource": "arn:aws:s3:::misra-otp-emails-'${ACCOUNT_ID}'/otp-emails/*"
      }
    ]
  }'
```

### 7. Configure Cognito to Send OTP to Webhook Email

In your Cognito User Pool settings:
- Set email sender to: `otp@yourdomain.com`
- Cognito will send OTP emails to this address
- SES receipt rule will capture them
- Lambda will extract and store OTP

## How It Works

### Email Flow

1. **User registers** → Cognito sends OTP email to `otp@yourdomain.com`
2. **SES receives email** → Stores in S3 and triggers Lambda
3. **Lambda processes email**:
   - Reads email from S3
   - Extracts OTP using regex patterns
   - Stores in DynamoDB with 15-minute TTL
4. **Frontend fetches OTP** → Calls `/auth/fetch-otp` endpoint
5. **Backend retrieves** → Queries DynamoDB and returns OTP

### OTP Storage

OTPs are stored in DynamoDB with:
- **Partition key**: email address
- **Sort key**: timestamp
- **TTL**: 15 minutes (auto-delete)
- **Attributes**: otp, timestamp, ttl

### Fallback Behavior

If no OTP is found in DynamoDB (email not received yet):
- System generates a mock OTP for testing
- Returns message: "OTP generated (no email received yet - using mock for testing)"
- This allows testing without email setup

## Testing

### Test OTP Extraction

```bash
# Send test email to otp@yourdomain.com
# Email body should contain: "Your OTP is: 123456"

# Check DynamoDB for stored OTP
aws dynamodb query \
  --table-name OTPStorage \
  --key-condition-expression "email = :email" \
  --expression-attribute-values '{":email":{"S":"test@example.com"}}'
```

### Test Fetch OTP Endpoint

```bash
curl -X POST https://sxpdzk5j44.execute-api.us-east-1.amazonaws.com/auth/fetch-otp \
  -H "Content-Type: application/json" \
  -d '{"email":"test@example.com"}'
```

## Troubleshooting

### OTP Not Being Captured

1. **Check SES receipt rule is active**:
   ```bash
   aws ses describe-receipt-rule-set --rule-set-name misra-otp-rules
   ```

2. **Check Lambda permissions**:
   ```bash
   aws lambda get-policy --function-name misra-auth-otp-webhook
   ```

3. **Check S3 bucket permissions**:
   ```bash
   aws s3api get-bucket-policy --bucket misra-otp-emails-${ACCOUNT_ID}
   ```

4. **Check Lambda logs**:
   ```bash
   aws logs tail /aws/lambda/misra-auth-otp-webhook --follow
   ```

### OTP Extraction Failing

1. **Check email format** - Email must contain 6-digit code
2. **Check regex patterns** - Update patterns in `otp-webhook.ts` if needed
3. **Check DynamoDB table** - Verify OTPStorage table exists and has TTL enabled

## Production Considerations

1. **Email Domain**: Use a dedicated domain for OTP emails
2. **Rate Limiting**: Add rate limiting to prevent abuse
3. **Monitoring**: Set up CloudWatch alarms for failed extractions
4. **Retention**: OTPs auto-delete after 15 minutes (configurable)
5. **Security**: Ensure S3 bucket is private and encrypted

## Environment Variables

- `OTP_STORAGE_TABLE`: DynamoDB table name (default: "OTPStorage")
- `AWS_REGION`: AWS region (default: "us-east-1")

## Related Files

- `packages/backend/src/functions/auth/otp-webhook.ts` - Webhook Lambda
- `packages/backend/src/functions/auth/fetch-otp.ts` - Fetch OTP endpoint
- `packages/backend/src/infrastructure/production-misra-stack.ts` - CDK stack
