# ⚡ Quick Deployment Reference Card

One-page reference for deploying AIBTS Platform to AWS.

---

## 🎯 Prerequisites (5 minutes)

```bash
# Check versions
node --version    # Need 20.x+
aws --version     # Need AWS CLI
git --version     # Need Git

# Configure AWS
aws configure
# Enter: Access Key, Secret Key, us-east-1, json

# Verify
aws sts get-caller-identity
```

---

## 🚀 Automated Deployment (30 minutes)

```powershell
# Run deployment script
.\deploy-to-aws.ps1

# Follow prompts:
# - AWS Region: us-east-1
# - Hugging Face API Key: [your-token]

# Wait for completion
# Save outputs: API URL, User Pool ID, Client ID
```

---

## 📝 Manual Deployment (45 minutes)

### 1. Install Global Tools
```bash
npm install -g aws-cdk vercel
```

### 2. Install Dependencies
```bash
npm install
cd packages/backend && npm install
cd ../frontend && npm install
cd ../..
```

### 3. Bootstrap CDK
```bash
cd packages/backend
export CDK_DEFAULT_ACCOUNT="YOUR_ACCOUNT_ID"
export CDK_DEFAULT_REGION="us-east-1"
cdk bootstrap
```

### 4. Store Hugging Face Key
```bash
aws secretsmanager create-secret \
  --name aibts/huggingface-api-key \
  --secret-string "YOUR_HF_TOKEN" \
  --region us-east-1
```

### 5. Deploy Backend
```bash
npm run build
cdk deploy MinimalStack --require-approval never
```

### 6. Seed Templates
```bash
aws lambda invoke \
  --function-name aibts-seed-templates \
  --region us-east-1 \
  response.json
```

### 7. Configure Frontend
```bash
cd ../frontend
cat > .env.production << EOF
VITE_API_URL=YOUR_API_GATEWAY_URL
VITE_AWS_REGION=us-east-1
VITE_USER_POOL_ID=YOUR_USER_POOL_ID
VITE_USER_POOL_CLIENT_ID=YOUR_CLIENT_ID
EOF
```

### 8. Deploy Frontend
```bash
npm run build
vercel --prod
```

---

## ✅ Verification Commands

```bash
# Check DynamoDB tables
aws dynamodb list-tables --region us-east-1

# Check Lambda functions
aws lambda list-functions --region us-east-1 \
  --query 'Functions[?starts_with(FunctionName, `aibts`)].FunctionName'

# Check Cognito
aws cognito-idp list-user-pools --max-results 10 --region us-east-1

# View logs
aws logs tail /aws/lambda/aibts-FUNCTION-NAME --follow
```

---

## 🔧 Common Issues & Fixes

### AWS CLI Not Configured
```bash
aws configure
```

### CDK Bootstrap Fails
```bash
cdk bootstrap --force
```

### Frontend Can't Connect
- Check CORS in API Gateway
- Verify API URL in .env.production
- Check browser console (F12)

### Cognito Email Not Received
- Check spam folder
- Verify email in Cognito console
- Resend verification code

---

## 📊 Stack Outputs (Save These!)

After `cdk deploy`, save:
- **API Gateway URL**: https://xxxxx.execute-api.us-east-1.amazonaws.com/
- **User Pool ID**: us-east-1_xxxxx
- **User Pool Client ID**: xxxxxxxxxxxxx
- **Frontend URL**: https://xxxxx.vercel.app

---

## 💰 Cost Estimate

| Service | Cost |
|---------|------|
| Lambda | $0 (free tier) |
| DynamoDB | $0 (free tier) |
| API Gateway | $0 (free tier) |
| Cognito | $0 (free tier) |
| Secrets Manager | $0.40/month |
| Hugging Face | $0 (free tier) |
| Vercel | $0 (hobby) |
| **Total** | **~$1.50/month** |

---

## 🎯 Success Checklist

- [ ] Frontend loads
- [ ] User registration works
- [ ] Email verification received
- [ ] Login successful
- [ ] Dashboard displays
- [ ] Can create project
- [ ] No console errors
- [ ] API calls succeed

---

## 📚 Key Documents

| Document | Purpose |
|----------|---------|
| START_HERE.md | Main entry point |
| FRESH_AWS_DEPLOYMENT_GUIDE.md | Complete guide |
| DEPLOYMENT_CHECKLIST.md | Task checklist |
| QUICK_START_GUIDE.md | Using the platform |
| CDK_DEPLOYMENT_TROUBLESHOOTING.md | Fix issues |

---

## 🔗 Important URLs

- **AWS Console**: https://console.aws.amazon.com
- **Hugging Face**: https://huggingface.co/settings/tokens
- **Vercel**: https://vercel.com/dashboard
- **Node.js**: https://nodejs.org

---

## ⚡ Quick Commands

```bash
# Redeploy backend
cd packages/backend
npm run build
cdk deploy MinimalStack

# Redeploy frontend
cd packages/frontend
npm run build
vercel --prod

# View logs
aws logs tail /aws/lambda/aibts-FUNCTION-NAME --follow

# Check AWS identity
aws sts get-caller-identity

# List all resources
aws resourcegroupstaggingapi get-resources \
  --tag-filters Key=Project,Values=AIBTS
```

---

## 🆘 Emergency Commands

```bash
# Destroy everything (careful!)
cd packages/backend
cdk destroy MinimalStack

# Reset AWS credentials
aws configure

# Clear CDK cache
rm -rf cdk.out

# Reinstall dependencies
rm -rf node_modules package-lock.json
npm install
```

---

## 📞 Get Help

1. Check CloudWatch logs
2. Check browser console (F12)
3. Read troubleshooting guides
4. Review AWS documentation

---

**Print this page for quick reference during deployment!**
