# Web Application Testing System

A comprehensive platform for automated web application testing including functional, UI, API, and performance testing with real-time notifications and reporting.

## Features

- Test project management
- Test suite and test case creation
- Automated test execution (Selenium/Playwright)
- Real-time test monitoring
- **Notification System**: Multi-channel alerts (email, SMS, Slack, webhooks)
- **Scheduled Reports**: Daily and weekly test execution summaries
- Detailed reporting and analytics
- Test scheduling and monitoring
- Cross-browser testing support

## Documentation

- [Notification System Setup Guide](./NOTIFICATION_SYSTEM_GUIDE.md) - Complete guide for setting up and configuring notifications
- [Getting Started Guide](./GETTING_STARTED.md) - Quick start guide for the platform

## Previous Version

The MISRA C/C++ Code Analysis Platform is preserved in the `misra-platform-backup` branch.

To view the old code:
```bash
git checkout misra-platform-backup
```

## Quick Start

### Prerequisites

- AWS Account with appropriate permissions
- Node.js 20.x or higher
- AWS CDK installed (`npm install -g aws-cdk`)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd misra-testing

# Install dependencies
npm install

# Deploy infrastructure
cd packages/backend
cdk deploy

# Seed notification templates
aws lambda invoke \
  --function-name aibts-seed-templates \
  --region us-east-1 \
  response.json
```

### Environment Variables

Create a `.env` file in the backend directory:

```bash
AWS_REGION=us-east-1
AWS_ACCOUNT_ID=your-account-id

# Optional: n8n Integration
N8N_ENABLED=false
N8N_WEBHOOK_URL=
N8N_API_KEY=
```

## Tech Stack

- **Frontend**: React + TypeScript + Material-UI
- **Backend**: AWS Lambda + Node.js
- **Database**: DynamoDB
- **Infrastructure**: AWS CDK
- **Testing**: Selenium/Playwright
- **Notifications**: AWS SNS + EventBridge + SQS
- **Monitoring**: CloudWatch

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│   Frontend  │────▶│  API Gateway │────▶│   Lambda    │
│  (React)    │     │              │     │  Functions  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                    ┌──────────────────────────────────┐
                    │         DynamoDB Tables          │
                    │  • Users  • Projects  • Tests    │
                    │  • Executions  • Notifications   │
                    └──────────────────────────────────┘
                                                 │
                                                 ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│ EventBridge │────▶│  SQS Queue   │────▶│Notification │
│   Events    │     │              │     │  Processor  │
└─────────────┘     └──────────────┘     └─────────────┘
                                                 │
                                                 ▼
                                          ┌─────────────┐
                                          │  AWS SNS    │
                                          │ Email/SMS   │
                                          └─────────────┘
```

## Key Components

### Test Execution System
- Browser automation with Playwright
- Screenshot capture on failures
- Detailed execution logs
- Suite and individual test execution

### Notification System
- Event-driven notifications (test completion, failures, critical alerts)
- Multi-channel delivery (email, SMS, Slack, webhooks)
- User preference management
- Template-based messaging
- Scheduled daily/weekly reports
- n8n integration for advanced workflows
- 90-day notification history

### Monitoring and Alerting
- CloudWatch dashboard for system metrics
- Alarms for queue depth, Lambda errors, delivery failures
- PII redaction in logs
- Sensitive data filtering

## API Endpoints

### Test Execution
- `POST /executions/trigger` - Trigger test execution
- `GET /executions/{executionId}` - Get execution results
- `GET /executions/{executionId}/status` - Get execution status
- `GET /executions/history` - Query execution history

### Notifications
- `GET /notifications/preferences` - Get user notification preferences
- `POST /notifications/preferences` - Update notification preferences
- `GET /notifications/history` - Query notification history
- `GET /notifications/templates` - List notification templates

### Projects and Tests
- `POST /projects` - Create project
- `GET /projects` - List projects
- `POST /test-suites` - Create test suite
- `POST /test-cases` - Create test case

## Development

### Running Locally

```bash
# Backend
cd packages/backend
npm run build
npm run test

# Frontend
cd packages/frontend
npm run dev
```

### Deploying Changes

```bash
cd packages/backend
cdk deploy
```

### Running Tests

```bash
# Unit tests
npm run test

# Integration tests
npm run test:integration

# Property-based tests
npm run test:properties
```

## Security

- Input sanitization for all user data
- Sensitive data filtering (passwords, API keys, tokens)
- PII redaction in logs
- TLS 1.2+ encryption in transit
- AWS KMS encryption at rest
- IAM least-privilege permissions

## Monitoring

Access the CloudWatch dashboard:
```
https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-Notification-System
```

## Contributing

1. Create a feature branch
2. Make your changes
3. Run tests
4. Submit a pull request

## License

[Your License Here]

## Support

For issues or questions, please check:
- [Notification System Guide](./NOTIFICATION_SYSTEM_GUIDE.md)
- CloudWatch logs for error details
- AWS support for infrastructure issues

