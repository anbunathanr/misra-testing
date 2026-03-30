# Script to update CDK stack to use bundled Lambda functions

$stackFile = "src/infrastructure/misra-platform-stack.ts"
$content = Get-Content $stackFile -Raw

# Replace all Lambda function code references
# Pattern: handler: 'category/function/index.handler', code: lambda.Code.fromAsset('src')
# Replace with: handler: 'index.handler', code: lambda.Code.fromAsset('dist-lambdas/category/function')

# Auth functions - already done manually, but keeping for reference
# $content = $content -replace "handler: 'auth/login/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/auth/login')"

# File functions
$content = $content -replace "handler: 'file/upload/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/file/upload')"
$content = $content -replace "handler: 'file/upload-complete/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/file/upload-complete')"
$content = $content -replace "handler: 'file/get-files/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/file/get-files')"

# Project functions
$content = $content -replace "handler: 'projects/create-project/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/projects/create-project')"
$content = $content -replace "handler: 'projects/get-projects-minimal/index\.handler',\s+code: lambda\.Code\.fromAsset\('src',\s+\{[^}]+\}\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/projects/get-projects-minimal')"
$content = $content -replace "handler: 'projects/update-project/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/projects/update-project')"

# Test Suite functions
$content = $content -replace "handler: 'test-suites/create-suite/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-suites/create-suite')"
$content = $content -replace "handler: 'test-suites/get-suites/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-suites/get-suites')"
$content = $content -replace "handler: 'test-suites/update-suite/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-suites/update-suite')"

# Test Case functions
$content = $content -replace "handler: 'test-cases/create-test-case/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-cases/create-test-case')"
$content = $content -replace "handler: 'test-cases/get-test-cases/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-cases/get-test-cases')"
$content = $content -replace "handler: 'test-cases/update-test-case/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/test-cases/update-test-case')"

# AI Test Generation functions
$content = $content -replace "handler: 'ai-test-generation/analyze/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/analyze')"
$content = $content -replace "handler: 'ai-test-generation/generate/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/generate')"
$content = $content -replace "handler: 'ai-test-generation/batch/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/batch')"
$content = $content -replace "handler: 'ai-test-generation/get-usage/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai-test-generation/get-usage')"

# Execution functions
$content = $content -replace "handler: 'executions/executor/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/executor')"
$content = $content -replace "handler: 'executions/trigger/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/trigger')"
$content = $content -replace "handler: 'executions/get-status/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/get-status')"
$content = $content -replace "handler: 'executions/get-results/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/get-results')"
$content = $content -replace "handler: 'executions/get-history/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/get-history')"
$content = $content -replace "handler: 'executions/get-suite-results/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/executions/get-suite-results')"

# Notification functions
$content = $content -replace "handler: 'notifications/scheduled-reports/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/scheduled-reports')"
$content = $content -replace "handler: 'notifications/get-preferences/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/get-preferences')"
$content = $content -replace "handler: 'notifications/update-preferences/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/update-preferences')"
$content = $content -replace "handler: 'notifications/get-history/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/get-history')"
$content = $content -replace "handler: 'notifications/get-notification/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/get-notification')"
$content = $content -replace "handler: 'notifications/create-template/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/create-template')"
$content = $content -replace "handler: 'notifications/update-template/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/update-template')"
$content = $content -replace "handler: 'notifications/get-templates/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/get-templates')"
$content = $content -replace "handler: 'notifications/processor/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/processor')"
$content = $content -replace "handler: 'notifications/seed-templates/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/notifications/seed-templates')"

# Analysis functions
$content = $content -replace "handler: 'analysis/analyze-file/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/analysis/analyze-file')"
$content = $content -replace "handler: 'analysis/query-results/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/analysis/query-results')"
$content = $content -replace "handler: 'analysis/get-user-stats/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/analysis/get-user-stats')"

# AI functions
$content = $content -replace "handler: 'ai/generate-insights/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai/generate-insights')"
$content = $content -replace "handler: 'ai/submit-feedback/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/ai/submit-feedback')"

# Reports functions
$content = $content -replace "handler: 'reports/get-violation-report/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/reports/get-violation-report')"

# Auth get-profile
$content = $content -replace "handler: 'auth/get-profile/index\.handler',\s+code: lambda\.Code\.fromAsset\('src'\)", "handler: 'index.handler',`n      code: lambda.Code.fromAsset('dist-lambdas/auth/get-profile')"

# Save the updated content
Set-Content -Path $stackFile -Value $content

Write-Host "✅ CDK stack updated to use bundled Lambda functions" -ForegroundColor Green
Write-Host "Updated file: $stackFile" -ForegroundColor Cyan
