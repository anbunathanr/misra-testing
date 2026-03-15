# ✅ Deployment Checklist

Quick reference checklist for deploying AIBTS Platform to AWS.

---

## Pre-Deployment

- [ ] AWS account created and verified
- [ ] Credit card added to AWS account
- [ ] Node.js 20.x+ installed (`node --version`)
- [ ] AWS CLI installed (`aws --version`)
- [ ] Git installed (`git --version`)

---

## AWS Setup

- [ ] IAM user created with AdministratorAccess
- [ ] Access keys generated and saved securely
- [ ] AWS CLI configured (`aws configure`)
- [ ] AWS account ID obtained (`aws sts get-caller-identity`)
- [ ] Hugging Face account created
- [ ] Hugging Face API token generated

---

## Environment Setup

- [ ] Project dependencies installed (`npm install`)
- [ ] Backend dependencies installed (`cd packages/backend && npm install`)
- [ ] Frontend dependencies installed (`cd packages/frontend && npm install`)
- [ ] AWS CDK installed globally (`npm install -g aws-cdk`)
- [ ] Vercel CLI installed (`npm install -g vercel`)
- [ ] Environment variables set (CDK_DEFAULT_ACCOUNT, CDK_DEFAULT_REGION)

---

## Backend Deployment

- [ ] CDK bootstrapped (`cdk bootstrap`)
- [ ] Hugging Face API key stored in Secrets Manager
- [ ] Backend built (`npm run build`)
- [ ] CDK stack deployed (`cdk deploy MinimalStack`)
- [ ] Stack outputs saved (API URL, User Pool ID, Client ID)
- [ ] Notification templates seeded (`aws lambda invoke`)

---

## Frontend Deployment

- [ ] Vercel account created/logged in
- [ ] `.env.production` file created
- [ ] Environment variables configured (API URL, Cognito details)
- [ ] Frontend built (`npm run build`)
- [ ] Deployed to Vercel (`vercel --prod`)
- [ ] Frontend URL saved

---

## Configuration

- [ ] CORS configured with Vercel URL
- [ ] API Gateway CORS settings updated
- [ ] Frontend can connect to backend

---

## Testing

- [ ] Frontend loads without errors
- [ ] User registration works
- [ ] Email verification received
- [ ] User login successful
- [ ] Dashboard displays correctly
- [ ] Can create a project
- [ ] API calls succeed (check browser console)

---

## Verification

- [ ] DynamoDB tables exist (`aws dynamodb list-tables`)
- [ ] Lambda functions deployed (`aws lambda list-functions`)
- [ ] Cognito user pool created (`aws cognito-idp list-user-pools`)
- [ ] CloudWatch logs available
- [ ] No errors in CloudWatch logs

---

## Documentation

- [ ] API Gateway URL documented
- [ ] Frontend URL documented
- [ ] User Pool ID documented
- [ ] User Pool Client ID documented
- [ ] AWS Account ID documented
- [ ] Deployment date documented

---

## Post-Deployment

- [ ] Test user account created
- [ ] Sample project created
- [ ] Sample test case created
- [ ] Test execution verified
- [ ] AI generation tested (optional)
- [ ] Notifications configured (optional)

---

## Monitoring Setup (Optional)

- [ ] CloudWatch dashboard created
- [ ] Alarms configured for errors
- [ ] Cost alerts set up
- [ ] Log retention configured

---

## Security Review (Optional)

- [ ] IAM policies reviewed
- [ ] Secrets Manager permissions verified
- [ ] API Gateway authentication verified
- [ ] CORS settings reviewed
- [ ] Security groups configured

---

## Backup & Recovery (Optional)

- [ ] DynamoDB backup enabled
- [ ] Deployment artifacts saved
- [ ] Configuration files backed up
- [ ] Rollback procedure documented

---

## Team Onboarding (If Applicable)

- [ ] Team members added to AWS account
- [ ] Team members added to Vercel project
- [ ] Documentation shared with team
- [ ] Access credentials distributed securely
- [ ] Training session scheduled

---

## Success Criteria

✅ All items above checked  
✅ Application accessible via public URL  
✅ Users can register and login  
✅ Core features working  
✅ No critical errors in logs  
✅ Monthly cost within budget (~$1.50)  

---

## Quick Commands Reference

### Check Deployment Status
```bash
# Check AWS identity
aws sts get-caller-identity

# List DynamoDB tables
aws dynamodb list-tables --region us-east-1

# List Lambda functions
aws lambda list-functions --region us-east-1 --query 'Functions[?starts_with(FunctionName, `aibts`)].FunctionName'

# Check CloudWatch logs
aws logs describe-log-groups --region us-east-1 --log-group-name-prefix /aws/lambda/aibts
```

### Redeploy Backend
```bash
cd packages/backend
npm run build
cdk deploy MinimalStack --require-approval never
```

### Redeploy Frontend
```bash
cd packages/frontend
npm run build
vercel --prod
```

### View Logs
```bash
# View specific Lambda function logs
aws logs tail /aws/lambda/aibts-FUNCTION-NAME --follow --region us-east-1
```

---

**Deployment Date**: _________________  
**Deployed By**: _________________  
**Frontend URL**: _________________  
**API Gateway URL**: _________________  
**Notes**: _________________
