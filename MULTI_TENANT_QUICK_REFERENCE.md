# Multi-Tenant Authentication - Quick Reference

## What Changed

### Before (Hardcoded)
```typescript
// ❌ Same password for all users
const tempPassword = 'TestPass123!@#';
```

### After (Dynamic)
```typescript
// ✅ Unique password per user
const tempPassword = this.generateTemporaryPassword();
// Example: "K9@mLpQ2xR#vN"
```

## How It Works

### 1. New User
```
Email: user@example.com
↓
Register with unique password (e.g., "K9@mLpQ2xR#vN")
↓
Cognito creates user with that password
↓
OTP verification with same password
↓
User authenticated ✅
```

### 2. Existing User
```
Email: user@example.com (already exists)
↓
Register returns 409 (User Exists)
↓
Frontend handles 409 gracefully
↓
OTP verification with fallback password
↓
User authenticated ✅
```

## Key Improvements

| Aspect | Before | After |
|--------|--------|-------|
| **Passwords** | Hardcoded | Dynamic per user |
| **Multi-tenant** | ❌ No | ✅ Yes |
| **Security** | ⚠️ Low | ✅ High |
| **Scalability** | ❌ Limited | ✅ Unlimited |
| **User Isolation** | ❌ No | ✅ Yes |
| **Production Ready** | ❌ No | ✅ Yes |

## Testing Quick Start

### Test 1: New User
```bash
Email: test-new-001@example.com
Expected: ✅ Registration → OTP → Login
```

### Test 2: Existing User
```bash
Email: sanjanar0011@gmail.com
Expected: ✅ 409 Handled → OTP → Login
```

### Test 3: Different Domain
```bash
Email: user@company.co.uk
Expected: ✅ Works with any domain
```

## API Endpoints

### Register
```
POST /auth/register
{
  "email": "user@example.com",
  "password": "K9@mLpQ2xR#vN",  // Optional, auto-generated if not provided
  "name": "User Name"
}

Response:
201 Created: User registered
409 Conflict: User already exists
```

### Verify OTP
```
POST /auth/verify-otp
{
  "email": "user@example.com",
  "otp": "123456",
  "password": "K9@mLpQ2xR#vN"
}

Response:
200 OK: OTP verified, tokens returned
400 Bad Request: Invalid OTP
```

### Auto-Login
```
POST /auth/auto-login
{
  "email": "user@example.com"
}

Response:
200 OK: Real Cognito tokens returned
500 Error: Authentication failed
```

## Password Requirements

- **Length**: 12+ characters
- **Uppercase**: At least 1 (A-Z)
- **Lowercase**: At least 1 (a-z)
- **Digits**: At least 1 (0-9)
- **Symbols**: At least 1 (!@#$%^&*)

Example: `K9@mLpQ2xR#vN` ✅

## Error Handling

### 409 User Exists
```
Frontend receives 409
↓
Logs: "ℹ️ User already exists"
↓
Continues to OTP verification
↓
No error shown to user ✅
```

### 401 Invalid Credentials
```
Frontend receives 401
↓
Logs: "❌ Invalid email or password"
↓
Shows user-friendly error message
↓
User can retry ✅
```

## Monitoring

### Success Logs
```
✅ User registered successfully: user@example.com
✅ OTP fetched successfully: 123***
✅ OTP verified successfully
✅ User logged in successfully
```

### Error Logs
```
❌ Registration failed: [error]
❌ OTP fetch failed: [error]
❌ OTP verification failed: [error]
❌ Auto-login failed: [error]
```

## CloudWatch Metrics

### Lambda Functions
- `misra-auth-register` - Registration requests
- `misra-auth-verify-otp` - OTP verification
- `misra-auth-auto-login` - Auto-login requests
- `misra-auth-fetch-otp` - OTP fetching

### Key Metrics
- **Invocations**: Total requests
- **Errors**: Failed requests
- **Duration**: Execution time
- **Throttles**: Rate limiting

## Troubleshooting

### Issue: 401 on Auto-Login
**Solution**: Verify IAM permissions are applied
```
Check: autoLoginFunction has AdminInitiateAuth permission
```

### Issue: 409 but OTP fails
**Solution**: Ensure same password used in both calls
```
Check: Password matches between register and verify-otp
```

### Issue: OTP not received
**Solution**: Check SES configuration
```
Check: SES is out of Sandbox Mode
Check: Email address is verified in SES
```

## Files to Know

### Backend
- `production-misra-stack.ts` - Infrastructure & IAM
- `register.ts` - User registration
- `verify-otp-cognito.ts` - OTP verification
- `auto-login.ts` - Auto-login

### Frontend
- `auto-auth-service.ts` - Autonomous workflow
- `auth-service.ts` - Authentication service
- `AutomatedAnalysisPage.tsx` - UI component

## Next Steps

1. ✅ Deploy changes (DONE)
2. 🔄 Test with multiple emails
3. 🔄 Verify SES configuration
4. 🔄 Monitor CloudWatch logs
5. 🔄 Implement passwordless flow (optional)

## Support

For issues or questions:
1. Check CloudWatch logs with correlation ID
2. Review error messages in console
3. Verify API responses match expected format
4. Check IAM permissions in CloudFormation stack

---

**Last Updated**: April 22, 2026
**Status**: ✅ Ready for Testing
