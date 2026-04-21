# PowerShell script to update all CloudWatch alarm names with environment suffix

$stackFile = "src/infrastructure/misra-platform-stack.ts"

# Read the file content
$content = Get-Content $stackFile -Raw

# Define all CloudWatch alarm name replacements
$replacements = @{
    "alarmName: 'AIBTS-Bedrock-HighErrorRate'" = "alarmName: ``AIBTS-Bedrock-HighErrorRate-`${environment}``"
    "alarmName: 'AIBTS-Bedrock-HighLatency'" = "alarmName: ``AIBTS-Bedrock-HighLatency-`${environment}``"
    "alarmName: 'AIBTS-Bedrock-HighCost'" = "alarmName: ``AIBTS-Bedrock-HighCost-`${environment}``"
    "alarmName: 'aibts-notification-dlq-depth'" = "alarmName: ``aibts-notification-dlq-depth-`${environment}``"
    "alarmName: 'aibts-notification-queue-depth'" = "alarmName: ``aibts-notification-queue-depth-`${environment}``"
    "alarmName: 'aibts-notification-processor-errors'" = "alarmName: ``aibts-notification-processor-errors-`${environment}``"
    "alarmName: 'aibts-scheduled-reports-errors'" = "alarmName: ``aibts-scheduled-reports-errors-`${environment}``"
    "alarmName: 'aibts-sns-email-failures'" = "alarmName: ``aibts-sns-email-failures-`${environment}``"
    "alarmName: 'aibts-sns-sms-failures'" = "alarmName: ``aibts-sns-sms-failures-`${environment}``"
}

# Apply all replacements
foreach ($key in $replacements.Keys) {
    $content = $content -replace [regex]::Escape($key), $replacements[$key]
}

# Write the updated content back to the file
Set-Content -Path $stackFile -Value $content -NoNewline

Write-Host "✅ Updated all CloudWatch alarm names with environment suffix" -ForegroundColor Green
Write-Host "File: $stackFile" -ForegroundColor Cyan
