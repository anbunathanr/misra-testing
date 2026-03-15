# AIBTS Platform - Quick Start Guide

## 🚀 Access Your Platform

**Frontend URL**: https://aibts-platform.vercel.app  
**Status**: 🟢 Live and operational

---

## 👤 User Account

You should now have a verified account that you can use to access the platform.

### Login
1. Go to https://aibts-platform.vercel.app/login
2. Enter your email and password
3. Click "Sign In"
4. You'll be redirected to the dashboard

---

## 📋 What You Can Do

### 1. Create Projects
- Navigate to "Projects" in the sidebar
- Click "Create Project"
- Fill in project details (name, description, target URL)
- Click "Create"

### 2. Create Test Cases
- Navigate to "Test Cases"
- Click "Create Test Case"
- Fill in test case details
- Add test steps
- Click "Create"

### 3. Create Test Suites
- Navigate to "Test Suites"
- Click "Create Test Suite"
- Add test cases to the suite
- Click "Create"

### 4. Execute Tests
- Navigate to "Test Executions"
- Select a test suite
- Click "Execute"
- View results in real-time

### 5. View Dashboard
- See overview of all projects
- View recent test executions
- Check AI usage statistics
- Monitor system health

---

## 🤖 AI Test Generation (Optional)

If you want to use AI-powered test generation:

1. Navigate to "Test Cases"
2. Click "Generate with AI"
3. Enter target URL
4. Click "Generate"
5. Wait 10-30 seconds
6. Review generated test case

**Note**: Requires Hugging Face quota (1,000 free requests/day)

---

## 📊 System Information

### Infrastructure
- **Backend**: AWS Lambda + API Gateway
- **Database**: DynamoDB
- **Authentication**: AWS Cognito
- **AI Provider**: Hugging Face (Free tier)
- **Frontend**: Vercel

### Costs
- **Monthly Cost**: ~$1.35
- **AI Requests**: 1,000/day (free)
- **Storage**: 25 GB (free)
- **Compute**: 1M requests/month (free)

---

## 🔧 Troubleshooting

### Can't Login?
- Verify your email was confirmed
- Check password meets requirements (8+ chars, uppercase, lowercase, digits)
- Try "Forgot Password" to reset

### Email Not Received?
- Check spam folder
- Click "Resend" on verification page
- Wait a few minutes and try again

### API Errors?
- Check you're logged in
- Refresh the page
- Clear browser cache
- Try logging out and back in

---

## 📚 Documentation

### Key Documents
- `PROJECT_COMPLETE_SUMMARY.md` - Complete project overview
- `DEPLOYMENT_COMPLETE_SUMMARY.md` - Deployment details
- `MANUAL_TESTING_GUIDE.md` - Testing procedures
- `HOW_TO_USE_AIBTS.md` - Detailed usage guide

### Technical Docs
- `PHASE5_TESTING_GUIDE.md` - Testing guide
- `DEPLOYMENT_GUIDE.md` - Deployment procedures
- `API_TESTING_SUMMARY.md` - API documentation

---

## 🎯 Next Steps

### Immediate
1. ✅ Login to your account
2. ✅ Explore the dashboard
3. ✅ Create your first project
4. ✅ Create a test case
5. ✅ Execute a test

### Short Term
1. Create multiple projects
2. Build test suites
3. Try AI generation (if quota available)
4. Monitor test results
5. Explore all features

### Long Term
1. Integrate with your workflow
2. Build comprehensive test suites
3. Monitor system performance
4. Provide feedback for improvements
5. Scale usage as needed

---

## 💡 Tips

### Best Practices
- Use descriptive project names
- Organize test cases by feature
- Group related tests in suites
- Review AI-generated tests before using
- Monitor your AI usage quota

### Performance
- Frontend loads in < 3 seconds
- API responds in < 2 seconds
- AI generation takes 10-30 seconds
- Test execution time varies by complexity

### Security
- Always logout when done
- Don't share your credentials
- Use strong passwords
- Enable 2FA if available (future feature)

---

## 🆘 Support

### Self-Help
1. Check documentation files
2. Review error messages
3. Check CloudWatch logs (if admin)
4. Try clearing browser cache

### AWS Console Access
- **CloudWatch Logs**: Monitor Lambda functions
- **Cognito**: Manage users
- **DynamoDB**: View data
- **API Gateway**: Check API metrics

---

## 🎉 Congratulations!

You now have a fully functional AI-powered testing platform!

**What You've Achieved**:
- ✅ Complete SaaS platform deployed
- ✅ User authentication working
- ✅ AI integration configured
- ✅ Test management system operational
- ✅ Cost-effective infrastructure (~$1.35/month)

**Start testing and enjoy your new platform!** 🚀

---

**Platform URL**: https://aibts-platform.vercel.app  
**Status**: 🟢 Operational  
**Version**: 1.0.0  
**Last Updated**: March 3, 2026
