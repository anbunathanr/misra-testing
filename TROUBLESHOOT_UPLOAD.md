# Troubleshooting File Upload Issue

## Quick Fix - Clear Browser Cache

The file upload fix has been deployed, but your browser may be using a cached version of the application.

### Option 1: Hard Refresh (Recommended)
1. Open the MISRA Platform: https://dirwx3oa3t2uk.cloudfront.net
2. Press **Ctrl + Shift + R** (Windows) or **Cmd + Shift + R** (Mac)
3. This will force reload the page without cache
4. Try uploading your file again

### Option 2: Clear Browser Cache
1. Open browser settings
2. Clear browsing data / cache
3. Reload the page
4. Try uploading again

### Option 3: Incognito/Private Window
1. Open a new incognito/private window
2. Navigate to: https://dirwx3oa3t2uk.cloudfront.net
3. Login with your credentials
4. Try uploading the file

## Verify You Have the Latest Version

After clearing cache, check the browser's Network tab (F12 → Network):
- Look for the main JavaScript file (should be `index-dbbe20cc.js`)
- If you see `index-a1ac2825.js`, you have the old version - clear cache again

## Test Upload Manually

If the web UI still doesn't work, you can test using the PowerShell script:

```powershell
.\test-file-upload.ps1
```

This script:
1. Logs in with admin credentials
2. Requests an upload URL
3. Uploads a test file
4. Verifies success

## Check Browser Console

If upload still fails after clearing cache:
1. Press F12 to open Developer Tools
2. Go to Console tab
3. Try uploading a file
4. Look for any error messages
5. Share the error message for further troubleshooting

## Expected Behavior

When working correctly:
1. Select a .c, .cpp, or .h file
2. File appears in the list with "pending" status
3. Click "Upload All"
4. File status changes to "uploading" with progress bar
5. File status changes to "success" with green checkmark
6. File is now in S3 and ready for analysis

## Common Issues

### Issue: "Upload failed" with no details
**Cause:** Browser cache showing old code  
**Fix:** Hard refresh (Ctrl + Shift + R)

### Issue: "Invalid file type"
**Cause:** File extension not in allowed list  
**Fix:** Only upload .c, .cpp, .cc, .cxx, .h, .hpp, .hxx files

### Issue: "File too large"
**Cause:** File exceeds 50MB limit  
**Fix:** Reduce file size or split into smaller files

### Issue: "Invalid or expired token"
**Cause:** Login session expired  
**Fix:** Logout and login again

## Verify Deployment

Check that the latest code is deployed:

```powershell
# Check S3 bucket contents
aws s3 ls s3://misra-platform-frontend-105014798396/assets/

# Should show:
# index-c4976811.css
# index-dbbe20cc.js
# index-dbbe20cc.js.map
```

## Still Not Working?

If none of the above works:
1. Check CloudWatch logs for the Lambda function:
   ```powershell
   aws logs tail /aws/lambda/misra-platform-file-upload --since 10m
   ```

2. Test the API directly:
   ```powershell
   .\test-file-upload.ps1
   ```

3. If the script works but web UI doesn't, it's definitely a browser cache issue

## Contact Information

If you continue to experience issues after trying all troubleshooting steps, please provide:
- Browser name and version
- Error message from browser console (F12)
- Screenshot of the upload attempt
- Result of running `.\test-file-upload.ps1`

---

**Last Updated:** February 9, 2026  
**Version:** v0.24.0
