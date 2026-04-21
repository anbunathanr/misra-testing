# PowerShell script to update all Lambda function names with environment suffix
# This script updates the misra-platform-stack.ts file to add environment-specific naming

$stackFile = "src/infrastructure/misra-platform-stack.ts"

# Read the file content
$content = Get-Content $stackFile -Raw

# Define all Lambda function name replacements
$replacements = @{
    "functionName: 'aibts-get-preferences'" = "functionName: ``aibts-get-preferences-`${environment}``"
    "functionName: 'aibts-update-preferences'" = "functionName: ``aibts-update-preferences-`${environment}``"
    "functionName: 'aibts-get-history'" = "functionName: ``aibts-get-history-`${environment}``"
    "functionName: 'aibts-get-notification'" = "functionName: ``aibts-get-notification-`${environment}``"
    "functionName: 'aibts-create-template'" = "functionName: ``aibts-create-template-`${environment}``"
    "functionName: 'aibts-update-template'" = "functionName: ``aibts-update-template-`${environment}``"
    "functionName: 'aibts-get-templates'" = "functionName: ``aibts-get-templates-`${environment}``"
    "functionName: 'misra-platform-authorizer'" = "functionName: ``misra-platform-authorizer-`${environment}``"
    "functionName: 'misra-platform-login'" = "functionName: ``misra-platform-login-`${environment}``"
    "functionName: 'misra-platform-register'" = "functionName: ``misra-platform-register-`${environment}``"
    "functionName: 'misra-platform-refresh'" = "functionName: ``misra-platform-refresh-`${environment}``"
    "functionName: 'misra-platform-initiate-flow'" = "functionName: ``misra-platform-initiate-flow-`${environment}``"
    "functionName: 'misra-platform-verify-email-with-otp'" = "functionName: ``misra-platform-verify-email-with-otp-`${environment}``"
    "functionName: 'misra-platform-complete-otp-setup'" = "functionName: ``misra-platform-complete-otp-setup-`${environment}``"
    "functionName: 'misra-platform-file-upload'" = "functionName: ``misra-platform-file-upload-`${environment}``"
    "functionName: 'misra-platform-upload-complete'" = "functionName: ``misra-platform-upload-complete-`${environment}``"
    "functionName: 'misra-platform-get-files'" = "functionName: ``misra-platform-get-files-`${environment}``"
    "functionName: 'misra-platform-get-sample-files'" = "functionName: ``misra-platform-get-sample-files-`${environment}``"
    "functionName: 'misra-platform-upload-sample-file'" = "functionName: ``misra-platform-upload-sample-file-`${environment}``"
    "functionName: 'misra-platform-get-upload-progress'" = "functionName: ``misra-platform-get-upload-progress-`${environment}``"
    "functionName: 'misra-platform-initialize-sample-library'" = "functionName: ``misra-platform-initialize-sample-library-`${environment}``"
    "functionName: 'misra-platform-create-project'" = "functionName: ``misra-platform-create-project-`${environment}``"
    "functionName: 'misra-platform-get-projects'" = "functionName: ``misra-platform-get-projects-`${environment}``"
    "functionName: 'misra-platform-update-project'" = "functionName: ``misra-platform-update-project-`${environment}``"
    "functionName: 'misra-platform-create-test-suite'" = "functionName: ``misra-platform-create-test-suite-`${environment}``"
    "functionName: 'misra-platform-get-test-suites'" = "functionName: ``misra-platform-get-test-suites-`${environment}``"
    "functionName: 'misra-platform-update-test-suite'" = "functionName: ``misra-platform-update-test-suite-`${environment}``"
    "functionName: 'misra-platform-create-test-case'" = "functionName: ``misra-platform-create-test-case-`${environment}``"
    "functionName: 'misra-platform-get-test-cases'" = "functionName: ``misra-platform-get-test-cases-`${environment}``"
    "functionName: 'misra-platform-update-test-case'" = "functionName: ``misra-platform-update-test-case-`${environment}``"
    "functionName: 'aibts-ai-analyze'" = "functionName: ``aibts-ai-analyze-`${environment}``"
    "functionName: 'aibts-ai-generate'" = "functionName: ``aibts-ai-generate-`${environment}``"
    "functionName: 'aibts-ai-batch'" = "functionName: ``aibts-ai-batch-`${environment}``"
    "functionName: 'aibts-ai-usage'" = "functionName: ``aibts-ai-usage-`${environment}``"
    "functionName: 'misra-platform-test-executor'" = "functionName: ``misra-platform-test-executor-`${environment}``"
    "functionName: 'misra-platform-trigger-execution'" = "functionName: ``misra-platform-trigger-execution-`${environment}``"
    "functionName: 'misra-platform-get-execution-status'" = "functionName: ``misra-platform-get-execution-status-`${environment}``"
    "functionName: 'misra-platform-get-execution-results'" = "functionName: ``misra-platform-get-execution-results-`${environment}``"
    "functionName: 'misra-platform-get-execution-history'" = "functionName: ``misra-platform-get-execution-history-`${environment}``"
    "functionName: 'misra-platform-get-suite-results'" = "functionName: ``misra-platform-get-suite-results-`${environment}``"
    "functionName: 'aibts-notification-processor'" = "functionName: ``aibts-notification-processor-`${environment}``"
    "functionName: 'aibts-seed-templates'" = "functionName: ``aibts-seed-templates-`${environment}``"
    "functionName: 'misra-platform-notification'" = "functionName: ``misra-platform-notification-`${environment}``"
    "functionName: 'misra-platform-analyze-file'" = "functionName: ``misra-platform-analyze-file-`${environment}``"
    "functionName: 'misra-platform-query-results'" = "functionName: ``misra-platform-query-results-`${environment}``"
    "functionName: 'misra-platform-user-stats'" = "functionName: ``misra-platform-user-stats-`${environment}``"
    "functionName: 'misra-platform-get-report'" = "functionName: ``misra-platform-get-report-`${environment}``"
    "functionName: 'misra-platform-analysis-status'" = "functionName: ``misra-platform-analysis-status-`${environment}``"
    "functionName: 'misra-platform-ai-insights'" = "functionName: ``misra-platform-ai-insights-`${environment}``"
}

# Apply all replacements
foreach ($key in $replacements.Keys) {
    $content = $content -replace [regex]::Escape($key), $replacements[$key]
}

# Write the updated content back to the file
Set-Content -Path $stackFile -Value $content -NoNewline

Write-Host "✅ Updated all Lambda function names with environment suffix" -ForegroundColor Green
Write-Host "File: $stackFile" -ForegroundColor Cyan
