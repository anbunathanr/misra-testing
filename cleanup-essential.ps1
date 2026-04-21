# Aggressive Project Cleanup - Keep Only Essential Files
Write-Host "Starting Aggressive Cleanup..." -ForegroundColor Cyan
Write-Host ""

# Get all .md files in root directory
$allMdFiles = Get-ChildItem -Path "." -Filter "*.md" -File

# Essential files to KEEP
$keepFiles = @(
    "README.md",
    "DEPLOYMENT_GUIDE.md",
    "GETTING_STARTED.md"
)

# Remove all other .md files
Write-Host "Removing unnecessary .md files..." -ForegroundColor Yellow
$removedCount = 0
foreach ($file in $allMdFiles) {
    if ($keepFiles -notcontains $file.Name) {
        Remove-Item -Path $file.FullName -Force
        $removedCount++
        Write-Host "  Removed: $($file.Name)" -ForegroundColor Green
    }
}
Write-Host "  Removed $removedCount .md files" -ForegroundColor Green

# Remove all .ps1 scripts except essential ones
Write-Host ""
Write-Host "Removing unnecessary PowerShell scripts..." -ForegroundColor Yellow
$allPs1Files = Get-ChildItem -Path "." -Filter "*.ps1" -File
$keepPs1 = @(
    "deploy.ps1",
    "deploy-production.ps1",
    "cleanup-essential.ps1"
)

$removedPs1 = 0
foreach ($file in $allPs1Files) {
    if ($keepPs1 -notcontains $file.Name) {
        Remove-Item -Path $file.FullName -Force
        $removedPs1++
    }
}
Write-Host "  Removed $removedPs1 .ps1 files" -ForegroundColor Green

# Remove all .json test/config files in root
Write-Host ""
Write-Host "Removing test/config JSON files..." -ForegroundColor Yellow
$jsonFiles = @(
    "api-cert-validation.json",
    "api-gateway-logging.json",
    "cloudwatch-dashboard.json",
    "cors-config.json",
    "create-cases-table.json",
    "create-dynamodb-tables.js",
    "create-executions-table.json",
    "create-lambda-layer.js",
    "create-projects-table.json",
    "create-suites-table.json",
    "create-tables.json",
    "empty-payload.json",
    "env-config.json",
    "env.json",
    "event.json",
    "frontend-cert-validation.json",
    "lambda-env.json",
    "lambda-payload.json",
    "login.json",
    "output.json",
    "payload.json",
    "response-generate.json",
    "test-create-project-payload.json",
    "test-event.json",
    "test-generate-payload.json",
    "test-lambda-payload.json",
    "test-payload.json",
    "test-usage-payload.json",
    "update-stage.json",
    "upload-test.json"
)

$removedJson = 0
foreach ($file in $jsonFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        $removedJson++
    }
}
Write-Host "  Removed $removedJson JSON files" -ForegroundColor Green

# Remove other unnecessary files
Write-Host ""
Write-Host "Removing other unnecessary files..." -ForegroundColor Yellow
$otherFiles = @(
    "demo-ai-test-generation.ts",
    "docker-compose.yml",
    "function.zip",
    "lambda-url.txt",
    "VERCEL_ENV_VARS_QUICK_REFERENCE.txt",
    "VERCEL_ENV_VARS_CORRECT.txt",
    "VERCEL_ENV_VARS_CORRECTED.txt",
    "VERCEL_ENV_VARS_UPDATE.txt",
    "WEB_APP_QUICK_REFERENCE.txt",
    "COMPLETE_FIX_SUMMARY.txt",
    "FULL_STACK_DEPLOYMENT_INFO.txt",
    "COMMANDS_QUICK_START.txt"
)

$removedOther = 0
foreach ($file in $otherFiles) {
    if (Test-Path $file) {
        Remove-Item -Path $file -Force
        $removedOther++
    }
}
Write-Host "  Removed $removedOther other files" -ForegroundColor Green

# Remove unnecessary folders
Write-Host ""
Write-Host "Removing unnecessary folders..." -ForegroundColor Yellow
$foldersToRemove = @(
    "cdk.out",
    "docs",
    "function-code",
    "hooks",
    "info",
    "lambda-code-extracted",
    "lambda-extracted",
    "objects",
    "refs",
    "temp_git",
    "temp-register-check"
)

$removedFolders = 0
foreach ($folder in $foldersToRemove) {
    if (Test-Path $folder) {
        Remove-Item -Path $folder -Recurse -Force
        $removedFolders++
        Write-Host "  Removed folder: $folder" -ForegroundColor Green
    }
}
Write-Host "  Removed $removedFolders folders" -ForegroundColor Green

Write-Host ""
Write-Host "Cleanup Complete!" -ForegroundColor Green
Write-Host ""
Write-Host "Files Kept:" -ForegroundColor Cyan
Write-Host "  Root Documentation:" -ForegroundColor White
Write-Host "    - README.md" -ForegroundColor Gray
Write-Host "    - DEPLOYMENT_GUIDE.md" -ForegroundColor Gray
Write-Host "    - GETTING_STARTED.md" -ForegroundColor Gray
Write-Host ""
Write-Host "  Deployment Scripts:" -ForegroundColor White
Write-Host "    - deploy.ps1" -ForegroundColor Gray
Write-Host "    - deploy-production.ps1" -ForegroundColor Gray
Write-Host ""
Write-Host "  Source Code:" -ForegroundColor White
Write-Host "    - packages/backend/src/" -ForegroundColor Gray
Write-Host "    - packages/frontend/src/" -ForegroundColor Gray
Write-Host ""
Write-Host "  Spec:" -ForegroundColor White
Write-Host "    - .kiro/specs/production-misra-platform/" -ForegroundColor Gray
Write-Host ""
Write-Host "Project is now clean and focused!" -ForegroundColor Cyan
