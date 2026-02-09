# MISRA Web Testing Platform

🎉 **Now Live on AWS!** - AI-powered SaaS platform for automating MISRA C/C++ compliance analysis.

[![Deployment Status](https://img.shields.io/badge/deployment-live-brightgreen)](https://dirwx3oa3t2uk.cloudfront.net)
[![Version](https://img.shields.io/badge/version-v0.22.0-blue)](https://github.com/anbunathanr/misra-testing/releases)
[![AWS](https://img.shields.io/badge/AWS-deployed-orange)](https://aws.amazon.com)

## 🌐 Live Application

- **Frontend:** https://dirwx3oa3t2uk.cloudfront.net
- **API:** https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com

### Test Credentials
- **Admin:** admin@misra-platform.com / password123
- **Developer:** developer@misra-platform.com / password123
- **Viewer:** viewer@misra-platform.com / password123

## ✨ Features

- ✅ **MISRA Compliance Analysis** - Support for MISRA C 2004, 2012, and C++ 2008
- ✅ **AI-Powered Insights** - Pattern detection and intelligent recommendations
- ✅ **File Upload System** - Drag-and-drop with validation
- ✅ **Real-time Dashboard** - Statistics, charts, and analytics
- ✅ **Role-Based Access** - Admin, Developer, and Viewer roles
- ✅ **Violation Reports** - Detailed analysis with code snippets
- ✅ **Serverless Architecture** - AWS Lambda, DynamoDB, S3
- ✅ **Modern UI** - React 18 with Material-UI

## 🚀 Quick Start

### Try the Live Application

1. Visit https://dirwx3oa3t2uk.cloudfront.net
2. Login with test credentials (see above)
3. Upload a C/C++ file
4. Run MISRA analysis
5. View results and AI insights

### Local Development

#### Prerequisites
- Node.js 20+
- AWS CLI configured
- AWS CDK installed (`npm install -g aws-cdk`)

#### Installation

```bash
# Clone the repository
git clone https://github.com/anbunathanr/misra-testing.git
cd misra-testing

# Install dependencies
npm install

# Install backend dependencies
cd packages/backend
npm install

# Install frontend dependencies
cd ../frontend
npm install
```

#### Backend Development

```bash
cd packages/backend

# Build TypeScript
npm run build

# Deploy to AWS
cdk deploy --require-approval never
```

#### Frontend Development

```bash
cd packages/frontend

# Create .env file
echo "VITE_API_URL=https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com" > .env

# Start development server
npm run dev

# Build for production
npm run build
```

## 📁 Project Structure

```
misra-testing/
├── packages/
│   ├── backend/              # AWS Lambda backend
│   │   ├── src/
│   │   │   ├── functions/    # Lambda function handlers
│   │   │   ├── services/     # Business logic services
│   │   │   ├── infrastructure/ # CDK infrastructure
│   │   │   ├── types/        # TypeScript types
│   │   │   └── config/       # Configuration files
│   │   └── cdk.json          # CDK configuration
│   │
│   ├── frontend/             # React frontend
│   │   ├── src/
│   │   │   ├── components/   # React components
│   │   │   ├── pages/        # Page components
│   │   │   ├── store/        # Redux store
│   │   │   └── theme.ts      # Material-UI theme
│   │   └── vite.config.ts    # Vite configuration
│   │
│   └── shared/               # Shared types and utilities
│
├── test-users/               # Test user JSON files
├── .kiro/specs/              # Feature specifications
├── DEPLOYMENT_GUIDE.md       # Detailed deployment guide
├── TESTING_GUIDE.md          # Testing instructions
├── QUICK_REFERENCE.md        # Quick reference card
├── DEPLOYMENT_COMPLETE.md    # Deployment summary
└── README.md                 # This file
```

## 🏗️ Architecture

### Technology Stack

**Backend:**
- AWS Lambda (Node.js 20)
- AWS CDK (Infrastructure as Code)
- DynamoDB (NoSQL Database)
- S3 (File Storage)
- SQS (Message Queue)
- Step Functions (Workflow Orchestration)
- API Gateway v2 (HTTP API)
- TypeScript 5.0

**Frontend:**
- React 18
- TypeScript 5.0
- Vite (Build Tool)
- Material-UI 5
- Redux Toolkit + RTK Query
- React Router 6

### AWS Resources

- **Lambda Functions:** 12 deployed
- **DynamoDB Tables:** 6 created
- **S3 Buckets:** 2 (files + frontend)
- **API Endpoints:** 9 active
- **Step Functions:** 1 state machine
- **SQS Queue:** 1 processing queue

## 📚 Documentation

- **[DEPLOYMENT_COMPLETE.md](DEPLOYMENT_COMPLETE.md)** - Deployment summary and quick start
- **[QUICK_REFERENCE.md](QUICK_REFERENCE.md)** - Quick access to URLs and commands
- **[TESTING_GUIDE.md](TESTING_GUIDE.md)** - Comprehensive testing instructions
- **[DEPLOYMENT_GUIDE.md](DEPLOYMENT_GUIDE.md)** - Full deployment process
- **[QUICK_START.md](QUICK_START.md)** - 3-step deployment guide
- **[PROJECT_SUMMARY.md](PROJECT_SUMMARY.md)** - Complete project overview

## 🔧 Deployment

### Automated Deployment

```bash
# Run the automated deployment script
.\deploy.ps1
```

### Manual Deployment

#### 1. Configure AWS Secrets
```bash
.\setup-secrets.ps1
```

#### 2. Deploy Backend
```bash
cd packages/backend
npm run build
cdk deploy --require-approval never
```

#### 3. Deploy Frontend
```bash
cd packages/frontend
npm run build
aws s3 sync dist/ s3://misra-platform-frontend-105014798396/ --delete
```

#### 4. Create Test Users
```bash
.\create-test-users.ps1
```

## 🧪 Testing

### Test the API

```bash
# Login
curl -X POST https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@misra-platform.com","password":"password123"}'

# Get user profile
curl -X GET https://ucy8ohc4vk.execute-api.us-east-1.amazonaws.com/auth/profile \
  -H "Authorization: Bearer YOUR_TOKEN"
```

### Test the Frontend

1. Open https://dirwx3oa3t2uk.cloudfront.net
2. Login with test credentials
3. Upload a C/C++ file
4. Run analysis
5. View results

See [TESTING_GUIDE.md](TESTING_GUIDE.md) for detailed testing instructions.

## 📊 Monitoring

### View Lambda Logs
```bash
aws logs tail /aws/lambda/LoginFunction --follow
```

### Check DynamoDB Tables
```bash
aws dynamodb list-tables
aws dynamodb scan --table-name misra-platform-users --limit 10
```

### Monitor API Gateway
```bash
aws apigateway get-rest-apis
```

## 🔐 Security

- ✅ JWT authentication with refresh tokens
- ✅ Role-based access control (RBAC)
- ✅ S3 encryption at rest (AES256)
- ✅ HTTPS/TLS for all API calls
- ✅ Presigned URLs for secure file uploads
- ✅ AWS Secrets Manager for sensitive data
- ✅ CORS configuration on API Gateway

## 💰 Cost Estimate

Estimated monthly cost for low usage:
- Lambda: ~$5-10
- DynamoDB: ~$2-5
- S3: ~$1-2
- API Gateway: ~$3-5
- CloudFront: ~$1-3
- **Total: ~$12-25/month**

## 🎯 Roadmap

### Completed ✅
- [x] Authentication & Authorization
- [x] File Upload System
- [x] MISRA Analysis Engine
- [x] Violation Reports
- [x] AI Insights
- [x] Frontend Dashboard
- [x] AWS Deployment

### Planned 🚧
- [ ] Unit & Integration Tests
- [ ] n8n Integration
- [ ] Real MISRA Tool Integration
- [ ] OpenAI API Integration
- [ ] Custom Domain & SSL
- [ ] Performance Optimization
- [ ] Advanced Analytics

## 🤝 Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit your changes (`git commit -m 'Add amazing feature'`)
4. Push to the branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

## 📝 License

MIT License - see [LICENSE](LICENSE) file for details.

## 🙏 Acknowledgments

- AWS for serverless infrastructure
- React and Material-UI teams
- MISRA standards organization
- Open source community

## 📞 Support

- **GitHub Issues:** https://github.com/anbunathanr/misra-testing/issues
- **Documentation:** See docs folder
- **AWS Support:** AWS Console → Support Center

---

**Built with ❤️ using AWS Serverless, React, and TypeScript**

*Last Updated: February 2026*  
*Version: v0.22.0*  
*Status: ✅ Live and Operational*
