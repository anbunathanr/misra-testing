# Notification System Setup Guide

## Overview

The Notification System provides real-time alerts and scheduled reports for test execution events. It integrates with AWS SNS for message delivery and optionally with n8n for advanced workflow automation.

## Architecture

```
Test Execution → EventBridge → SQS Queue → Notification Processor Lambda
                                              ↓
                                    ┌─────────┴─────────┐
                                    ↓                   ↓
                              n8n Webhook          AWS SNS
                              (optional)        (email/SMS/webhook)
                                    ↓                   ↓
                              Fallback to SNS    Delivery to Users
```

## Features

- **Multi-Channel Delivery**: Email, SMS, Slack, and custom webhooks
- **Event-Driven Notifications**: Test completion, failures, and critical alerts
- **Scheduled Reports**: Daily and weekly summary reports
- **User Preferences**: Customizable notification settings per user
- **Template System**: Flexible message templates with variable substitution
- **n8n Integration**: Optional advanced workflow automation
- **Notification History**: 90-day retention with query and filtering
- **Security**: Input sanitization, sensitive data filtering, PII redaction
- **Monitoring**: CloudWatch alarms and dashboard

## Prerequisites

- AWS Account with appropriate permissions
- AWS CLI configured
- Node.js 20.x or higher
- AWS CDK installed (`npm install -g aws-cdk`)
- (Optional) n8n instance for advanced workflows

## Environment Variables

### Required Variables

```bash
# AWS Configuration
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# DynamoDB Tables (auto-created by CDK)
NOTIFICATION_PREFERENCES_TABLE=aibts-notification-preferences
NOTIFICATION_TEMPLATES_TABLE=aibts-notification-templates
NOTIFICATION_HISTORY_TABLE=aibts-notification-history
TEST_EXECUTIONS_TABLE=aibts-test-executions

# SQS Queues (auto-created by CDK)
NOTIFICATION_QUEUE_URL=https://sqs.us-east-1.amazonaws.com/account/aibts-notification-queue

# SNS Topics (auto-created by CDK)
SNS_TOPIC_ARN_EMAIL=arn:aws:sns:us-east-1:account:aibts-notifications-email
SNS_TOPIC_ARN_SMS=arn:aws:sns:us-east-1:account:aibts-notifications-sms
SNS_TOPIC_ARN_WEBHOOK=arn:aws:sns:us-east-1:account:aibts-notifications-webhook
```

### Optional Variables (n8n Integration)

```bash
# n8n Configuration
N8N_ENABLED=true
N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/notifications
N8N_API_KEY=your-n8n-api-key
```

## Deployment Steps

### 1. Deploy Infrastructure

```bash
# Navigate to backend directory
cd packages/backend

# Install dependencies
npm install

# Bootstrap CDK (first time only)
cdk bootstrap

# Deploy the stack
cdk deploy
```

The deployment will create:
- 3 DynamoDB tables (preferences, templates, history)
- 3 SNS topics (email, SMS, webhook)
- 2 SQS queues (notification queue + DLQ)
- 8 Lambda functions (processor, scheduled reports, API endpoints)
- EventBridge rules (test completion, daily/weekly reports)
- CloudWatch alarms and dashboard
- API Gateway routes

### 2. Seed Default Templates

After deployment, invoke the seed-templates Lambda to populate default notification templates:

```bash
aws lambda invoke \
  --function-name aibts-seed-templates \
  --region us-east-1 \
  response.json

cat response.json
```

Expected output:
```json
{
  "statusCode": 200,
  "message": "Successfully seeded 7 notification templates"
}
```

### 3. Configure SNS Email Subscriptions

For email notifications, users must confirm their email subscriptions:

```bash
# Subscribe an email address to the email topic
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:aibts-notifications-email \
  --protocol email \
  --notification-endpoint user@example.com
```

Users will receive a confirmation email. They must click the confirmation link to activate notifications.

### 4. Configure SNS SMS (Optional)

For SMS notifications, ensure your AWS account has SMS sending enabled:

```bash
# Check SMS spending limit
aws sns get-sms-attributes

# Set SMS spending limit (if needed)
aws sns set-sms-attributes \
  --attributes MonthlySpendLimit=10
```

Subscribe phone numbers:
```bash
aws sns subscribe \
  --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:aibts-notifications-sms \
  --protocol sms \
  --notification-endpoint +1234567890
```

### 5. Configure n8n Integration (Optional)

If using n8n for advanced workflows:

1. **Create n8n Webhook**:
   - In n8n, create a new workflow
   - Add a Webhook node as the trigger
   - Set the webhook path (e.g., `/webhook/notifications`)
   - Copy the webhook URL

2. **Set Environment Variables**:
   ```bash
   export N8N_ENABLED=true
   export N8N_WEBHOOK_URL=https://your-n8n-instance.com/webhook/notifications
   export N8N_API_KEY=your-api-key
   ```

3. **Redeploy Lambda Functions**:
   ```bash
   cdk deploy
   ```

4. **Test n8n Integration**:
   - Trigger a test execution
   - Verify webhook receives the notification event
   - Check n8n workflow execution logs

## API Endpoints

### Notification Preferences

#### Get User Preferences
```http
GET /notifications/preferences
Authorization: Bearer <jwt-token>
```

Response:
```json
{
  "userId": "user123",
  "preferences": {
    "email": "user@example.com",
    "phoneNumber": "+1234567890",
    "enabledChannels": ["email", "slack"],
    "enabledEventTypes": ["test_completion", "test_failure", "critical_alert"],
    "quietHours": {
      "enabled": true,
      "startTime": "22:00",
      "endTime": "08:00",
      "timezone": "America/New_York"
    }
  },
  "createdAt": "2024-01-01T00:00:00Z",
  "updatedAt": "2024-01-01T00:00:00Z"
}
```

#### Update User Preferences
```http
POST /notifications/preferences
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "preferences": {
    "email": "newemail@example.com",
    "enabledChannels": ["email"],
    "enabledEventTypes": ["critical_alert"]
  }
}
```

### Notification History

#### Query Notification History
```http
GET /notifications/history?eventType=test_failure&limit=20
Authorization: Bearer <jwt-token>
```

Query Parameters:
- `eventType`: Filter by event type (optional)
- `status`: Filter by delivery status (optional)
- `startDate`: Filter by start date (optional)
- `endDate`: Filter by end date (optional)
- `limit`: Number of results (default: 50, max: 100)
- `lastEvaluatedKey`: Pagination token (optional)

#### Get Single Notification
```http
GET /notifications/history/{notificationId}
Authorization: Bearer <jwt-token>
```

### Notification Templates (Admin Only)

#### List Templates
```http
GET /notifications/templates?eventType=test_completion
Authorization: Bearer <jwt-token>
```

#### Create Template
```http
POST /notifications/templates
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "eventType": "custom_event",
  "channel": "email",
  "subject": "Custom Event: {{eventName}}",
  "body": "Event occurred at {{timestamp}}"
}
```

#### Update Template
```http
PUT /notifications/templates/{templateId}
Authorization: Bearer <jwt-token>
Content-Type: application/json

{
  "subject": "Updated Subject",
  "body": "Updated body content"
}
```

## Default Notification Templates

The system includes 7 default templates:

1. **Email - Test Completion**: Sent when a test completes successfully
2. **Email - Test Failure**: Sent when a test fails
3. **Email - Critical Alert**: Sent for critical failures (3 consecutive failures or >50% suite failure rate)
4. **Email - Summary Report**: Daily/weekly test execution summaries
5. **SMS - Critical Alert**: Brief SMS for critical failures
6. **Slack - Test Failure**: Slack message with action buttons
7. **Slack - Critical Alert**: Slack message for critical failures

### Template Variables

Templates support variable substitution using `{{variableName}}` syntax:

- `{{testName}}`: Name of the test
- `{{executionId}}`: Unique execution ID
- `{{status}}`: Test status (passed/failed/error)
- `{{result}}`: Detailed result information
- `{{duration}}`: Test execution duration
- `{{timestamp}}`: Event timestamp
- `{{errorMessage}}`: Error message (if failed)
- `{{screenshotUrls}}`: Screenshot URLs (if available)
- `{{userName}}`: User who triggered the test
- `{{projectName}}`: Project name

## Scheduled Reports

### Daily Report
- **Schedule**: Every day at 09:00 UTC
- **Content**: Last 24 hours of test executions
- **Includes**: Total tests, pass rate, fail rate, average duration, top 10 failing tests, trends

### Weekly Report
- **Schedule**: Every Monday at 09:00 UTC
- **Content**: Last 7 days of test executions
- **Includes**: Same as daily report with weekly trends

### Manual Trigger

To manually trigger a report:

```bash
# Daily report
aws lambda invoke \
  --function-name aibts-scheduled-reports \
  --payload '{"reportType":"daily"}' \
  response.json

# Weekly report
aws lambda invoke \
  --function-name aibts-scheduled-reports \
  --payload '{"reportType":"weekly"}' \
  response.json
```

## Monitoring and Alerting

### CloudWatch Dashboard

Access the notification system dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Notification-System
```

The dashboard displays:
- Notification queue depth and in-flight messages
- DLQ depth (failed notifications)
- Lambda performance metrics (invocations, errors, duration)
- SNS delivery metrics (published, delivered, failed)

### CloudWatch Alarms

The system includes 6 alarms:

1. **DLQ Depth Alarm**: Triggers when DLQ has messages (failed notifications)
2. **Queue Depth Alarm**: Triggers when queue depth exceeds 1000 (processing backlog)
3. **Processor Error Alarm**: Triggers when notification processor has errors
4. **Scheduled Reports Error Alarm**: Triggers when scheduled reports Lambda has errors
5. **SNS Email Failure Alarm**: Triggers when email delivery fails
6. **SNS SMS Failure Alarm**: Triggers when SMS delivery fails

Configure alarm actions (SNS topic for alerts):
```bash
aws cloudwatch put-metric-alarm \
  --alarm-name aibts-notification-dlq-depth \
  --alarm-actions arn:aws:sns:us-east-1:ACCOUNT_ID:ops-alerts
```

## Security Best Practices

### 1. Input Sanitization
All user input is automatically sanitized:
- Email addresses validated and normalized
- Phone numbers validated and formatted
- URLs validated (HTTPS only, no private IPs)
- Strings sanitized to prevent injection attacks

### 2. Sensitive Data Filtering
Notification content is automatically scanned and filtered:
- Passwords redacted
- API keys redacted
- JWT tokens redacted
- AWS access keys redacted
- Bearer tokens redacted

### 3. PII Redaction
All logs automatically redact PII:
- Email addresses → `[EMAIL_REDACTED]`
- Phone numbers → `[PHONE_REDACTED]`
- Credit card numbers → `[CC_REDACTED]`
- SSNs → `[SSN_REDACTED]`

### 4. IAM Permissions
Use least-privilege IAM roles:
```json
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Action": [
        "dynamodb:GetItem",
        "dynamodb:PutItem",
        "dynamodb:Query"
      ],
      "Resource": "arn:aws:dynamodb:*:*:table/aibts-notification-*"
    },
    {
      "Effect": "Allow",
      "Action": [
        "sns:Publish"
      ],
      "Resource": "arn:aws:sns:*:*:aibts-notifications-*"
    }
  ]
}
```

### 5. Encryption
- **In Transit**: All data encrypted with TLS 1.2+
- **At Rest**: DynamoDB tables encrypted with AWS KMS
- **SNS Messages**: Encrypted in transit

## Troubleshooting

### Notifications Not Delivered

1. **Check Queue Depth**:
   ```bash
   aws sqs get-queue-attributes \
     --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/aibts-notification-queue \
     --attribute-names ApproximateNumberOfMessages
   ```

2. **Check DLQ for Failed Messages**:
   ```bash
   aws sqs receive-message \
     --queue-url https://sqs.us-east-1.amazonaws.com/ACCOUNT_ID/aibts-notification-dlq \
     --max-number-of-messages 10
   ```

3. **Check Lambda Logs**:
   ```bash
   aws logs tail /aws/lambda/aibts-notification-processor --follow
   ```

4. **Verify SNS Subscriptions**:
   ```bash
   aws sns list-subscriptions-by-topic \
     --topic-arn arn:aws:sns:us-east-1:ACCOUNT_ID:aibts-notifications-email
   ```

### Email Notifications Not Received

1. **Verify Email Subscription Confirmed**:
   - Check subscription status in SNS console
   - Resend confirmation email if needed

2. **Check Spam Folder**:
   - SNS emails may be marked as spam
   - Add AWS SNS to email whitelist

3. **Verify Email Address**:
   - Ensure email is correctly configured in user preferences
   - Check for typos

### n8n Integration Not Working

1. **Verify n8n Webhook URL**:
   ```bash
   curl -X POST https://your-n8n-instance.com/webhook/notifications \
     -H "Content-Type: application/json" \
     -d '{"test": "data"}'
   ```

2. **Check Lambda Environment Variables**:
   ```bash
   aws lambda get-function-configuration \
     --function-name aibts-notification-processor \
     --query 'Environment.Variables'
   ```

3. **Review n8n Workflow Logs**:
   - Check n8n execution history
   - Verify webhook trigger is active

### High Queue Depth

1. **Increase Lambda Concurrency**:
   ```bash
   aws lambda put-function-concurrency \
     --function-name aibts-notification-processor \
     --reserved-concurrent-executions 200
   ```

2. **Check Lambda Errors**:
   ```bash
   aws cloudwatch get-metric-statistics \
     --namespace AWS/Lambda \
     --metric-name Errors \
     --dimensions Name=FunctionName,Value=aibts-notification-processor \
     --start-time 2024-01-01T00:00:00Z \
     --end-time 2024-01-02T00:00:00Z \
     --period 3600 \
     --statistics Sum
   ```

## Cost Optimization

### Estimated Monthly Costs

Based on 10,000 test executions per month:

- **DynamoDB**: ~$5 (on-demand pricing)
- **Lambda**: ~$2 (100ms average duration)
- **SNS**: ~$2 (email) + ~$10 (SMS, if used)
- **SQS**: ~$0.50
- **CloudWatch**: ~$3 (logs + metrics)
- **Total**: ~$12-22/month

### Cost Reduction Tips

1. **Use Email Over SMS**: SMS costs $0.00645 per message
2. **Batch Notifications**: Use frequency limits to batch notifications
3. **Configure Quiet Hours**: Reduce unnecessary notifications
4. **Set DynamoDB TTL**: Automatically delete old history records
5. **Use Reserved Concurrency**: Prevent Lambda over-provisioning

## Maintenance

### Regular Tasks

1. **Monitor DLQ**: Check weekly for failed messages
2. **Review Alarms**: Investigate triggered alarms
3. **Update Templates**: Refine templates based on user feedback
4. **Audit Preferences**: Review user notification preferences
5. **Check Costs**: Monitor AWS billing dashboard

### Backup and Recovery

1. **DynamoDB Backups**:
   ```bash
   aws dynamodb create-backup \
     --table-name aibts-notification-preferences \
     --backup-name preferences-backup-$(date +%Y%m%d)
   ```

2. **Template Export**:
   ```bash
   aws dynamodb scan \
     --table-name aibts-notification-templates \
     --output json > templates-backup.json
   ```

## Support

For issues or questions:
- Check CloudWatch logs for error details
- Review this guide for troubleshooting steps
- Contact your AWS support team for infrastructure issues

## Changelog

### Version 1.0.0 (2024-01-01)
- Initial release
- Multi-channel notification delivery
- Scheduled reports
- User preferences management
- Template system
- n8n integration
- Security features
- Monitoring and alerting
