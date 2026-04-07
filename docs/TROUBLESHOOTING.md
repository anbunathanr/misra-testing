# MISRA Platform Troubleshooting Guide

## Overview

This guide helps you diagnose and resolve common issues with the MISRA Platform. Issues are organized by category with step-by-step solutions.

## Table of Contents

1. [File Upload Issues](#file-upload-issues)
2. [Analysis Problems](#analysis-problems)
3. [Results and Reports](#results-and-reports)
4. [Authentication Issues](#authentication-issues)
5. [Performance Issues](#performance-issues)
6. [API Integration Issues](#api-integration-issues)
7. [Browser Compatibility](#browser-compatibility)
8. [Error Messages](#error-messages)

---

## File Upload Issues

### Issue: Upload Button Disabled

**Symptoms**:
- Upload button is grayed out
- Cannot select files

**Possible Causes**:
1. Not logged in
2. File size too large
3. Invalid file type
4. Browser permissions

**Solutions**:

**Step 1**: Verify Authentication
```
1. Check if you're logged in (look for username in header)
2. If not logged in, click "Login" and enter credentials
3. Refresh the page after logging in
```

**Step 2**: Check File Requirements
```
1. File size must be ≤ 10 MB
2. File extension must be: .c, .cpp, .h, or .hpp
3. File must not be corrupted
```

**Step 3**: Browser Permissions
```
1. Check browser console (F12) for errors
2. Allow file access permissions if prompted
3. Disable browser extensions that might block uploads
4. Try incognito/private mode
```

---

### Issue: Upload Fails with "Invalid File Type"

**Symptoms**:
- Error message: "Invalid file type"
- Upload rejected immediately

**Possible Causes**:
1. Wrong file extension
2. File renamed incorrectly
3. Hidden file extension

**Solutions**:

**Step 1**: Verify File Extension
```bash
# On Windows (PowerShell)
Get-Item "yourfile.cpp" | Select-Object Name, Extension

# On Linux/Mac
ls -la yourfile.cpp
file yourfile.cpp
```

**Step 2**: Show File Extensions (Windows)
```
1. Open File Explorer
2. Click "View" tab
3. Check "File name extensions"
4. Verify actual extension
```

**Step 3**: Rename File Correctly
```
Correct extensions:
✓ source.c
✓ source.cpp
✓ header.h
✓ header.hpp

Incorrect extensions:
✗ source.txt
✗ source.c.txt
✗ source.cc (use .cpp instead)
```

---

### Issue: Upload Fails with "File Too Large"

**Symptoms**:
- Error: "File size exceeds maximum limit of 10MB"
- Upload progress stops

**Possible Causes**:
1. File exceeds 10 MB limit
2. File includes large comments or data

**Solutions**:

**Step 1**: Check File Size
```bash
# On Windows (PowerShell)
(Get-Item "yourfile.cpp").Length / 1MB

# On Linux/Mac
ls -lh yourfile.cpp
du -h yourfile.cpp
```

**Step 2**: Reduce File Size
```
Options:
1. Split large file into smaller modules
2. Remove large comment blocks
3. Remove embedded data arrays
4. Extract constants to separate header
```

**Step 3**: Alternative Approach
```
If file must remain large:
1. Contact support for size limit increase
2. Use API with chunked upload (coming soon)
3. Compress file (not recommended for analysis)
```

---

### Issue: Upload Hangs or Times Out

**Symptoms**:
- Progress bar stuck at certain percentage
- Upload never completes
- Browser shows "waiting for response"

**Possible Causes**:
1. Slow internet connection
2. Server timeout
3. Large file size
4. Network interruption

**Solutions**:

**Step 1**: Check Internet Connection
```
1. Test internet speed: https://fast.com
2. Minimum recommended: 5 Mbps upload
3. Try wired connection instead of WiFi
4. Disable VPN temporarily
```

**Step 2**: Retry Upload
```
1. Refresh the page
2. Clear browser cache (Ctrl+Shift+Delete)
3. Try again with smaller file first
4. Use different browser
```

**Step 3**: Monitor Network
```
1. Open browser DevTools (F12)
2. Go to Network tab
3. Watch for failed requests
4. Check for timeout errors
5. Screenshot any errors for support
```

---

## Analysis Problems

### Issue: Analysis Stuck at "Pending"

**Symptoms**:
- Status shows "Pending" for > 5 minutes
- No progress indicator
- Analysis never starts

**Possible Causes**:
1. High server load
2. Queue backlog
3. System maintenance
4. File processing error

**Solutions**:

**Step 1**: Wait and Monitor
```
Normal wait times:
- Off-peak hours: < 30 seconds
- Peak hours: 1-2 minutes
- High load: up to 5 minutes

If > 5 minutes, proceed to Step 2
```

**Step 2**: Check System Status
```
1. Visit: https://status.misra-platform.com
2. Look for ongoing incidents
3. Check scheduled maintenance
4. View current queue depth
```

**Step 3**: Refresh Status
```
1. Refresh the page
2. Check status via API:
   GET /analysis/status/{fileId}
3. If still pending after 10 minutes, contact support
```

**Step 4**: Re-upload if Necessary
```
1. Note the File ID
2. Upload file again
3. Compare results
4. Report issue to support with both File IDs
```

---

### Issue: Analysis Fails with "Parse Error"

**Symptoms**:
- Status changes to "Failed"
- Error message mentions "parse error" or "syntax error"
- Specific line number mentioned

**Possible Causes**:
1. Syntax errors in code
2. Non-standard C/C++ syntax
3. Compiler-specific extensions
4. Incomplete code

**Solutions**:

**Step 1**: Compile Code Locally
```bash
# For C files
gcc -std=c11 -fsyntax-only yourfile.c

# For C++ files
g++ -std=c++11 -fsyntax-only yourfile.cpp

# Check for errors
```

**Step 2**: Fix Syntax Errors
```
Common issues:
1. Missing semicolons
2. Unmatched braces { }
3. Missing #include directives
4. Undefined types or functions
```

**Step 3**: Remove Non-Standard Extensions
```cpp
// Remove compiler-specific code
#ifdef __GNUC__
    // GCC-specific code
#endif

// Replace with standard C/C++
```

**Step 4**: Validate Code Structure
```
Ensure:
1. All functions have return types
2. All variables are declared
3. All includes are present
4. Preprocessor directives are valid
```

---

### Issue: Analysis Takes Too Long

**Symptoms**:
- Analysis "In Progress" for > 2 minutes
- Large file (> 5 MB)
- Complex code structure

**Possible Causes**:
1. Large file size
2. Complex AST
3. Many rules to check
4. Server load

**Solutions**:

**Step 1**: Understand Expected Times
```
File Size    | Expected Time
-------------|---------------
< 1 MB       | 5-15 seconds
1-5 MB       | 15-45 seconds
5-10 MB      | 45-90 seconds
```

**Step 2**: Optimize Code for Analysis
```
1. Remove large comment blocks
2. Split into smaller files
3. Reduce nested complexity
4. Remove dead code
```

**Step 3**: Monitor Progress
```
1. Keep browser tab open
2. Don't navigate away
3. Check status periodically
4. Wait up to 5 minutes for large files
```

**Step 4**: Contact Support if Timeout
```
If analysis exceeds 5 minutes:
1. Note File ID
2. Note file size
3. Contact support
4. Provide code sample (if possible)
```

---

### Issue: Unexpected Violations Reported

**Symptoms**:
- Violations seem incorrect
- Code appears compliant
- False positives

**Possible Causes**:
1. Misunderstanding of rule
2. Context not considered
3. Edge case in rule implementation
4. Code actually violates rule

**Solutions**:

**Step 1**: Review Rule Documentation
```
1. Read rule description in results
2. Check MISRA_RULES_REFERENCE.md
3. Review official MISRA guidelines
4. Understand rule rationale
```

**Step 2**: Examine Code Context
```
1. Look at surrounding code
2. Check variable usage
3. Verify type declarations
4. Review control flow
```

**Step 3**: Verify with Examples
```
Compare your code with:
1. Compliant examples in documentation
2. Non-compliant examples
3. Similar code patterns
```

**Step 4**: Report False Positive
```
If you believe it's a false positive:
1. Document why you think it's incorrect
2. Provide code snippet
3. Reference rule documentation
4. Submit feedback via support
```

---

## Results and Reports

### Issue: Cannot View Analysis Results

**Symptoms**:
- 404 error when accessing results
- "Analysis not found" message
- Blank results page

**Possible Causes**:
1. Analysis not completed
2. Wrong File ID
3. Permission issue
4. Session expired

**Solutions**:

**Step 1**: Verify Analysis Completion
```
1. Check analysis status first
2. Ensure status is "Completed"
3. Wait if still "In Progress"
```

**Step 2**: Check File ID
```
1. Verify File ID is correct
2. Check for typos in URL
3. Use File ID from upload confirmation
```

**Step 3**: Verify Permissions
```
1. Ensure you're logged in
2. Verify you own the file
3. Check organization access
4. Re-authenticate if needed
```

**Step 4**: Clear Cache and Retry
```
1. Clear browser cache
2. Log out and log back in
3. Try accessing results again
```

---

### Issue: PDF Report Won't Download

**Symptoms**:
- Download button doesn't work
- PDF fails to generate
- Blank PDF file

**Possible Causes**:
1. Pop-up blocker
2. Browser settings
3. Report generation error
4. Network issue

**Solutions**:

**Step 1**: Check Pop-up Blocker
```
1. Look for blocked pop-up notification
2. Allow pop-ups for misra-platform.com
3. Try download again
```

**Step 2**: Try Alternative Download
```
1. Right-click download link
2. Select "Save link as..."
3. Choose download location
4. Save file
```

**Step 3**: Use API to Download
```bash
curl -X GET \
  "https://api.misra-platform.com/reports/{fileId}" \
  -H "Authorization: Bearer {token}" \
  -o report.pdf
```

**Step 4**: Check Browser Console
```
1. Open DevTools (F12)
2. Check Console tab for errors
3. Look for network errors
4. Screenshot errors for support
```

---

### Issue: Report Missing Violations

**Symptoms**:
- PDF report incomplete
- Some violations not shown
- Report doesn't match web results

**Possible Causes**:
1. Report generation error
2. Filtering applied
3. Old cached report
4. Pagination issue

**Solutions**:

**Step 1**: Regenerate Report
```
1. Delete old report
2. Click "Generate Report" again
3. Wait for new generation
4. Download fresh report
```

**Step 2**: Check Filters
```
1. Ensure no filters are applied
2. Select "All Violations"
3. Include all severity levels
4. Regenerate report
```

**Step 3**: Compare with Web Results
```
1. Count violations in web interface
2. Count violations in PDF
3. Verify they match
4. Report discrepancy if different
```

---

## Authentication Issues

### Issue: Cannot Log In

**Symptoms**:
- "Invalid credentials" error
- Login button doesn't work
- Redirected back to login page

**Possible Causes**:
1. Wrong username/password
2. Account not activated
3. Session expired
4. Account locked

**Solutions**:

**Step 1**: Verify Credentials
```
1. Check username (usually email)
2. Verify password (case-sensitive)
3. Check for typos
4. Try copy-paste to avoid errors
```

**Step 2**: Reset Password
```
1. Click "Forgot Password"
2. Enter email address
3. Check email for reset link
4. Create new password
5. Try logging in again
```

**Step 3**: Check Account Status
```
1. Look for activation email
2. Click activation link if present
3. Contact support if no email received
4. Verify email address is correct
```

**Step 4**: Clear Browser Data
```
1. Clear cookies and cache
2. Close all browser tabs
3. Restart browser
4. Try logging in again
```

---

### Issue: Session Expires Frequently

**Symptoms**:
- Logged out unexpectedly
- "Session expired" message
- Need to re-login often

**Possible Causes**:
1. Short session timeout
2. Browser settings
3. Multiple tabs/devices
4. Security policy

**Solutions**:

**Step 1**: Check "Remember Me"
```
1. Enable "Remember Me" at login
2. Allow cookies in browser
3. Don't use incognito mode
```

**Step 2**: Browser Settings
```
1. Allow cookies for misra-platform.com
2. Don't clear cookies on exit
3. Disable "Clear on close" settings
```

**Step 3**: Single Session
```
1. Use only one browser tab
2. Don't log in from multiple devices
3. Log out properly when done
```

---

## Performance Issues

### Issue: Slow Page Loading

**Symptoms**:
- Pages take long to load
- Slow response times
- Laggy interface

**Possible Causes**:
1. Slow internet connection
2. Large result sets
3. Browser performance
4. Server load

**Solutions**:

**Step 1**: Check Internet Speed
```
1. Test at https://fast.com
2. Minimum recommended: 10 Mbps
3. Close bandwidth-heavy applications
4. Use wired connection if possible
```

**Step 2**: Optimize Browser
```
1. Close unnecessary tabs
2. Disable heavy extensions
3. Clear browser cache
4. Update browser to latest version
```

**Step 3**: Reduce Result Size
```
1. Apply filters to violations
2. View results in pages
3. Download report for offline viewing
```

**Step 4**: Try Different Browser
```
Recommended browsers:
- Chrome 90+
- Firefox 88+
- Edge 90+
- Safari 14+
```

---

### Issue: High Memory Usage

**Symptoms**:
- Browser becomes slow
- System memory full
- Browser crashes

**Possible Causes**:
1. Large files analyzed
2. Many violations displayed
3. Memory leak
4. Browser issue

**Solutions**:

**Step 1**: Close Unused Tabs
```
1. Keep only MISRA Platform tab open
2. Close other applications
3. Restart browser if needed
```

**Step 2**: Use Pagination
```
1. View violations in smaller batches
2. Use filters to reduce displayed items
3. Download report instead of viewing all
```

**Step 3**: Increase System Memory
```
1. Close memory-heavy applications
2. Restart computer if needed
3. Consider upgrading RAM
```

---

## API Integration Issues

### Issue: API Returns 401 Unauthorized

**Symptoms**:
- API requests fail with 401
- "Unauthorized" error message
- Cannot access endpoints

**Possible Causes**:
1. Missing Authorization header
2. Invalid token
3. Expired token
4. Wrong token format

**Solutions**:

**Step 1**: Verify Token Format
```bash
# Correct format
Authorization: Bearer eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...

# Common mistakes
Authorization: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Missing "Bearer"
Authorization: Bearer: eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...  # Extra colon
```

**Step 2**: Check Token Expiration
```javascript
// Decode JWT to check expiration
const token = 'your-jwt-token';
const payload = JSON.parse(atob(token.split('.')[1]));
const expirationDate = new Date(payload.exp * 1000);
console.log('Token expires:', expirationDate);
```

**Step 3**: Obtain New Token
```bash
# Login to get new token
curl -X POST https://api.misra-platform.com/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"your-email","password":"your-password"}'
```

---

### Issue: API Rate Limit Exceeded

**Symptoms**:
- 429 error code
- "Too many requests" message
- Requests blocked

**Possible Causes**:
1. Too many requests in short time
2. Exceeded rate limit
3. No rate limit handling

**Solutions**:

**Step 1**: Check Rate Limit Headers
```javascript
const response = await fetch(url, options);
console.log('Limit:', response.headers.get('X-RateLimit-Limit'));
console.log('Remaining:', response.headers.get('X-RateLimit-Remaining'));
console.log('Reset:', response.headers.get('X-RateLimit-Reset'));
```

**Step 2**: Implement Backoff
```javascript
async function apiCallWithRetry(url, options, maxRetries = 3) {
  for (let i = 0; i < maxRetries; i++) {
    const response = await fetch(url, options);
    
    if (response.status === 429) {
      const resetTime = response.headers.get('X-RateLimit-Reset');
      const waitTime = (resetTime * 1000) - Date.now();
      await new Promise(resolve => setTimeout(resolve, waitTime));
      continue;
    }
    
    return response;
  }
  throw new Error('Max retries exceeded');
}
```

**Step 3**: Reduce Request Frequency
```
Rate limits:
- File uploads: 10/minute
- Analysis results: 100/minute
- Report generation: 20/minute

Solution: Add delays between requests
```

---

## Browser Compatibility

### Supported Browsers

| Browser | Minimum Version | Recommended |
|---------|----------------|-------------|
| Chrome | 90+ | Latest |
| Firefox | 88+ | Latest |
| Edge | 90+ | Latest |
| Safari | 14+ | Latest |
| Opera | 76+ | Latest |

### Unsupported Browsers

- Internet Explorer (all versions)
- Chrome < 90
- Firefox < 88
- Safari < 14

### Browser-Specific Issues

**Chrome**:
- Enable JavaScript
- Allow cookies
- Disable aggressive ad blockers

**Firefox**:
- Enable JavaScript
- Set tracking protection to Standard
- Allow pop-ups for site

**Safari**:
- Enable JavaScript
- Allow cross-site tracking for site
- Enable pop-ups

---

## Error Messages

### Common Error Codes

| Code | Message | Solution |
|------|---------|----------|
| 400 | Bad Request | Check request parameters |
| 401 | Unauthorized | Verify authentication token |
| 403 | Forbidden | Check permissions |
| 404 | Not Found | Verify resource ID |
| 413 | Payload Too Large | Reduce file size |
| 429 | Too Many Requests | Implement rate limiting |
| 500 | Internal Server Error | Contact support |
| 503 | Service Unavailable | Check status page |

### Error Message Examples

**"PARSE_ERROR: Expected ';' before '}' token"**
```
Cause: Syntax error in code
Solution: Add missing semicolon at indicated line
```

**"ANALYSIS_TIMEOUT: Analysis exceeded time limit"**
```
Cause: File too complex or large
Solution: Split file into smaller modules
```

**"INVALID_TOKEN: JWT token is invalid or expired"**
```
Cause: Authentication token expired
Solution: Log in again to get new token
```

---

## Getting Additional Help

### Before Contacting Support

Gather this information:
1. **File ID**: From upload confirmation
2. **Error Message**: Exact text of error
3. **Browser**: Name and version
4. **Steps to Reproduce**: What you did before error
5. **Screenshots**: Of error messages
6. **Network Log**: From browser DevTools

### Contact Methods

**Email Support**:
- Address: support@misra-platform.com
- Response time: 24-48 hours
- Include all gathered information

**Live Chat**:
- Available in platform (bottom right)
- Hours: Mon-Fri, 9 AM - 5 PM EST
- Instant responses during business hours

**Phone Support**:
- Number: +1-555-MISRA-01
- Hours: Mon-Fri, 9 AM - 5 PM EST
- For urgent issues only

**Community Forum**:
- URL: https://community.misra-platform.com
- Search existing topics
- Post new questions
- Community-driven support

### Status and Updates

**System Status**:
- URL: https://status.misra-platform.com
- Real-time system status
- Incident history
- Scheduled maintenance

**Documentation**:
- URL: https://docs.misra-platform.com
- User guides
- API documentation
- Video tutorials

---

## Preventive Measures

### Best Practices

1. **Regular Backups**
   - Save analysis results
   - Download reports regularly
   - Keep local copies of source files

2. **Code Quality**
   - Compile code before uploading
   - Fix syntax errors first
   - Use standard C/C++ syntax

3. **Account Security**
   - Use strong passwords
   - Enable two-factor authentication
   - Log out when done

4. **Browser Maintenance**
   - Keep browser updated
   - Clear cache regularly
   - Use supported browsers

5. **Network Stability**
   - Use reliable internet connection
   - Avoid public WiFi for uploads
   - Consider wired connection

---

**Last Updated**: 2024

For the latest troubleshooting information, visit: https://docs.misra-platform.com/troubleshooting
