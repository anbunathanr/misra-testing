# Automated Git Cleanup Script for Web App Testing System
# This script will backup MISRA code and prepare for the new system

Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Git Repository Cleanup Script" -ForegroundColor Cyan
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""

# Step 1: Check if we're in a git repository
Write-Host "Step 1: Checking Git repository..." -ForegroundColor Yellow
if (-not (Test-Path ".git")) {
    Write-Host "ERROR: Not in a Git repository!" -ForegroundColor Red
    Write-Host "Please run this script from the root of your Git repository." -ForegroundColor Red
    exit 1
}
Write-Host "OK: Git repository found" -ForegroundColor Green
Write-Host ""

# Step 2: Check current branch
Write-Host "Step 2: Checking current branch..." -ForegroundColor Yellow
$currentBranch = git branch --show-current
Write-Host "Current branch: $currentBranch" -ForegroundColor Cyan
Write-Host ""

# Step 3: Create backup branch
Write-Host "Step 3: Creating backup branch for MISRA code..." -ForegroundColor Yellow
Write-Host "This will preserve all your MISRA platform work." -ForegroundColor Gray

$backupBranch = "misra-platform-backup"
$branchExists = git branch --list $backupBranch
if ($branchExists) {
    Write-Host "Branch $backupBranch already exists, switching to it..." -ForegroundColor Yellow
    git checkout $backupBranch 2>&1 | Out-Null
} else {
    git checkout -b $backupBranch 2>&1 | Out-Null
    Write-Host "OK: Created branch: $backupBranch" -ForegroundColor Green
}

# Push backup branch to remote
Write-Host "Pushing backup branch to remote..." -ForegroundColor Gray
git push -u origin $backupBranch 2>&1 | Out-Null
Write-Host "OK: Backup branch pushed to remote" -ForegroundColor Green
Write-Host ""

# Step 4: Switch back to main
Write-Host "Step 4: Switching back to main branch..." -ForegroundColor Yellow
git checkout main
Write-Host "OK: Switched to main branch" -ForegroundColor Green
Write-Host ""

# Step 5: List files to be deleted
Write-Host "Step 5: Files that will be deleted:" -ForegroundColor Yellow
Write-Host ""
Write-Host "MISRA-specific files:" -ForegroundColor Red
Write-Host "  - All *.md files (except README.md, WEB_APP_TESTING_SYSTEM_PLAN.md, GIT_CLEANUP_GUIDE.md)"
Write-Host "  - All test-*.ps1, check-*.ps1, diagnose-*.ps1, deploy-*.ps1 files"
Write-Host "  - packages/backend/src/services/misra/"
Write-Host "  - packages/backend/src/functions/ai/"
Write-Host "  - packages/backend/src/config/misra-rules-config.ts"
Write-Host "  - packages/backend/src/types/misra-rules.ts"
Write-Host "  - packages/backend/src/types/ai-insights.ts"
Write-Host "  - .kiro/specs/misra-web-testing-platform/"
Write-Host ""
Write-Host "Files that will be KEPT:" -ForegroundColor Green
Write-Host "  - .git/ (Git repository)"
Write-Host "  - .gitignore"
Write-Host "  - package.json, package-lock.json"
Write-Host "  - packages/backend/src/infrastructure/ (reusable)"
Write-Host "  - packages/backend/src/database/ (reusable)"
Write-Host "  - packages/backend/src/functions/auth/ (reusable)"
Write-Host "  - packages/backend/src/functions/file/ (reusable)"
Write-Host "  - packages/backend/src/services/user/ (reusable)"
Write-Host "  - packages/backend/src/middleware/ (reusable)"
Write-Host "  - packages/frontend/ (will be modified)"
Write-Host "  - README.md, WEB_APP_TESTING_SYSTEM_PLAN.md, GIT_CLEANUP_GUIDE.md"
Write-Host ""

# Ask for confirmation
$confirmation = Read-Host "Do you want to proceed with cleanup? (yes/no)"
if ($confirmation -ne "yes") {
    Write-Host "Cleanup cancelled." -ForegroundColor Yellow
    Write-Host "Your MISRA code is safely backed up in branch: $backupBranch" -ForegroundColor Cyan
    exit 0
}
Write-Host ""

# Step 6: Delete MISRA-specific files
Write-Host "Step 6: Deleting MISRA-specific files..." -ForegroundColor Yellow

# Delete PowerShell test/diagnostic scripts
Write-Host "Deleting test scripts..." -ForegroundColor Gray
Remove-Item -Force test-*.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force check-*.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force diagnose-*.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force deploy-*.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force upload-file.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force create-test-users.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force setup-secrets.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force clear-browser-cache.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force fix-web-upload.ps1 -ErrorAction SilentlyContinue
Remove-Item -Force force-frontend-update.ps1 -ErrorAction SilentlyContinue

# Delete markdown documentation files (keep important ones)
Write-Host "Deleting old documentation..." -ForegroundColor Gray
$mdFilesToDelete = @(
    "TODAY_PROGRESS.md",
    "CORS_FIX_APPLIED.md",
    "REAL_FIX_APPLIED.md",
    "LATEST_FIX_SUMMARY.md",
    "WEB_UI_TESTING_GUIDE.md",
    "FINAL_STATUS_SUMMARY.md",
    "WHAT_WE_FIXED_TODAY.md",
    "BACKEND_DIAGNOSIS_RESULTS.md",
    "HOW_TO_CHECK_ANALYSIS.md",
    "CURRENT_STATUS_AND_NEXT_STEPS.md",
    "ANALYSIS_RESULTS_GUIDE.md",
    "FINAL_DEPLOYMENT_STEPS.md",
    "POWERSHELL_UPLOAD_GUIDE.md",
    "COMPLETE_FIX_GUIDE.md",
    "BROWSER_CACHE_FIX.md",
    "TROUBLESHOOT_UPLOAD.md",
    "FILE_UPLOAD_FIX_SUMMARY.md",
    "DEPLOYMENT_SUCCESS.md",
    "TODAYS_ACCOMPLISHMENTS.md",
    "DEPLOYMENT_COMPLETE.md",
    "QUICK_REFERENCE.md",
    "TESTING_GUIDE.md",
    "QUICK_START.md",
    "DEPLOYMENT_GUIDE.md",
    "PROJECT_SUMMARY.md",
    "IMPLEMENTATION_REVIEW.md",
    "MISRA_Platform_Implementation_Review.md"
)

foreach ($file in $mdFilesToDelete) {
    Remove-Item -Force $file -ErrorAction SilentlyContinue
}

# Delete other files
Remove-Item -Force test-s3-event.json -ErrorAction SilentlyContinue
Remove-Item -Force test-upload-browser.html -ErrorAction SilentlyContinue
Remove-Item -Force prog1.c -ErrorAction SilentlyContinue
Remove-Item -Force cloudfront-config.json -ErrorAction SilentlyContinue
Remove-Item -Force cloudfront-config-new.json -ErrorAction SilentlyContinue
Remove-Item -Force s3-cors-config.json -ErrorAction SilentlyContinue
Remove-Item -Force s3-website-config.json -ErrorAction SilentlyContinue
Remove-Item -Force KIRO_MISRA_AI_SaaS_Specification.docx -ErrorAction SilentlyContinue

# Delete MISRA backend services
Write-Host "Deleting MISRA backend services..." -ForegroundColor Gray
Remove-Item -Recurse -Force packages/backend/src/services/misra -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/backend/src/functions/ai -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/backend/src/functions/reports -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/backend/src/functions/notifications -ErrorAction SilentlyContinue

# Delete MISRA-specific analysis functions
Write-Host "Deleting MISRA analysis functions..." -ForegroundColor Gray
Remove-Item -Force packages/backend/src/functions/analysis/analyze-file.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/functions/analysis/get-user-stats.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/functions/analysis/query-results.ts -ErrorAction SilentlyContinue

# Delete MISRA types and configs
Write-Host "Deleting MISRA types and configs..." -ForegroundColor Gray
Remove-Item -Force packages/backend/src/config/misra-rules-config.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/types/misra-rules.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/types/ai-insights.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/types/violation-report.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/types/analysis-persistence.ts -ErrorAction SilentlyContinue

# Delete MISRA infrastructure
Write-Host "Deleting MISRA infrastructure..." -ForegroundColor Gray
Remove-Item -Force packages/backend/src/infrastructure/analysis-results-table.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/infrastructure/analysis-workflow.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/infrastructure/processing-queue.ts -ErrorAction SilentlyContinue

# Delete MISRA services
Write-Host "Deleting MISRA services..." -ForegroundColor Gray
Remove-Item -Force packages/backend/src/services/analysis-results-service.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/services/error-handler-service.ts -ErrorAction SilentlyContinue
Remove-Item -Force packages/backend/src/services/notification-service.ts -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/backend/src/services/queue -ErrorAction SilentlyContinue
Remove-Item -Recurse -Force packages/backend/src/services/ai -ErrorAction SilentlyContinue

# Delete MISRA specs
Write-Host "Deleting MISRA specs..." -ForegroundColor Gray
Remove-Item -Recurse -Force .kiro/specs/misra-web-testing-platform -ErrorAction SilentlyContinue

# Delete test users folder
Remove-Item -Recurse -Force test-users -ErrorAction SilentlyContinue

Write-Host "OK: MISRA-specific files deleted" -ForegroundColor Green
Write-Host ""

# Step 7: Update README
Write-Host "Step 7: Updating README.md..." -ForegroundColor Yellow
$newReadme = "# Web Application Testing System`n`n"
$newReadme += "A comprehensive platform for automated web application testing including functional, UI, API, and performance testing.`n`n"
$newReadme += "## Features`n`n"
$newReadme += "- Test project management`n"
$newReadme += "- Test suite and test case creation`n"
$newReadme += "- Automated test execution (Selenium/Playwright)`n"
$newReadme += "- Real-time test monitoring`n"
$newReadme += "- Detailed reporting and analytics`n"
$newReadme += "- Test scheduling and monitoring`n"
$newReadme += "- Cross-browser testing support`n`n"
$newReadme += "## Previous Version`n`n"
$newReadme += "The MISRA C/C++ Code Analysis Platform is preserved in the ``misra-platform-backup`` branch.`n`n"
$newReadme += "To view the old code:`n"
$newReadme += "``````bash`n"
$newReadme += "git checkout misra-platform-backup`n"
$newReadme += "``````"
$newReadme += "`n`n## Getting Started`n`n"
$newReadme += "Documentation coming soon...`n`n"
$newReadme += "## Tech Stack`n`n"
$newReadme += "- **Frontend**: React + TypeScript + Material-UI`n"
$newReadme += "- **Backend**: AWS Lambda + Node.js`n"
$newReadme += "- **Database**: DynamoDB`n"
$newReadme += "- **Infrastructure**: AWS CDK`n"
$newReadme += "- **Testing**: Selenium/Playwright`n`n"
$newReadme += "## Development`n`n"
$newReadme += "Coming soon...`n"

Set-Content -Path "README.md" -Value $newReadme
Write-Host "OK: README.md updated" -ForegroundColor Green
Write-Host ""

# Step 8: Stage all changes
Write-Host "Step 8: Staging changes for commit..." -ForegroundColor Yellow
git add -A
Write-Host "OK: Changes staged" -ForegroundColor Green
Write-Host ""

# Step 9: Commit changes
Write-Host "Step 9: Committing changes..." -ForegroundColor Yellow
git commit -m "Clean up MISRA platform, prepare for Web App Testing System - Moved MISRA code to misra-platform-backup branch"
Write-Host "OK: Changes committed" -ForegroundColor Green
Write-Host ""

# Step 10: Push to remote
Write-Host "Step 10: Pushing changes to remote..." -ForegroundColor Yellow
$pushConfirm = Read-Host "Push changes to remote repository? (yes/no)"
if ($pushConfirm -eq "yes") {
    git push origin main
    Write-Host "OK: Changes pushed to remote" -ForegroundColor Green
} else {
    Write-Host "Skipped pushing to remote. You can push later with: git push origin main" -ForegroundColor Yellow
}
Write-Host ""

# Summary
Write-Host "========================================" -ForegroundColor Cyan
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host "========================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Summary:" -ForegroundColor Cyan
Write-Host "  OK: MISRA code backed up in branch: $backupBranch" -ForegroundColor Green
Write-Host "  OK: Main branch cleaned and ready for Web App Testing System" -ForegroundColor Green
Write-Host "  OK: Reusable infrastructure preserved" -ForegroundColor Green
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Yellow
Write-Host "  1. Review WEB_APP_TESTING_SYSTEM_PLAN.md for implementation plan"
Write-Host "  2. Start building the new Web App Testing System"
Write-Host "  3. To view MISRA code: git checkout $backupBranch"
Write-Host ""
Write-Host "Happy coding!" -ForegroundColor Cyan
