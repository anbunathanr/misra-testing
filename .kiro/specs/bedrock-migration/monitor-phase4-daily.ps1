# Phase 4: Daily Monitoring Script
# Monitors Bedrock stability during 1-week monitoring period

param(
    [Parameter(Mandatory=$true)]
    [ValidateRange(1,7)]
    [int]$Day,
    
    [Parameter(Mandatory=$false)]
    [int]$Hours = 24
)

$ErrorActionPreference = "Stop"

Write-Host "=== Phase 4: Day $Day Monitoring ===" -ForegroundColor Cyan
Write-Host "Time Range: Last $Hours hour(s)" -ForegroundColor Gray
Write-Host ""

# Calculate time range
$endTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
$startTime = (Get-Date).AddHours(-$Hours).ToString("yyyy-MM-ddTHH:mm:ss")

Write-Host "Current Configuration:" -ForegroundColor Yellow
Write-Host "---------------------"

# Get current AI provider
$config = aws lambda get-function-configuration --function-name aibts-ai-generate --query 'Environment.Variables' --output json | ConvertFrom-Json
Write-Host "AI Provider: $($config.AI_PROVIDER)" -ForegroundColor $(if ($config.AI_PROVIDER -eq "BEDROCK") { "Green" } else { "Red" })
Write-Host ""

Write-Host "Bedrock Metrics (Last $Hours hours):" -ForegroundColor Yellow
Write-Host "------------------------------------"

# Latency
$latency = aws cloudwatch get-metric-statistics `
    --namespace "AIBTS/Bedrock" `
    --metric-name "BedrockLatency" `
    --statistics Average,Maximum,Minimum `
    --start-time $startTime `
    --end-time $endTime `
    --period $($Hours * 3600) `
    --output json | ConvertFrom-Json

if ($latency.Datapoints.Count -gt 0) {
    $dp = $latency.Datapoints[0]
    Write-Host "Latency (ms):"
    Write-Host "  Average: $([math]::Round($dp.Average, 2))" -ForegroundColor Green
    Write-Host "  Maximum: $([math]::Round($dp.Maximum, 2))" -ForegroundColor Yellow
    Write-Host "  Minimum: $([math]::Round($dp.Minimum, 2))" -ForegroundColor Green
} else {
    Write-Host "Latency: No data" -ForegroundColor Gray
}

# Errors
$errors = aws cloudwatch get-metric-statistics `
    --namespace "AIBTS/Bedrock" `
    --metric-name "BedrockErrors" `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $($Hours * 3600) `
    --output json | ConvertFrom-Json

if ($errors.Datapoints.Count -gt 0) {
    $errorCount = $errors.Datapoints[0].Sum
    Write-Host "Errors: $errorCount" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
} else {
    Write-Host "Errors: No data" -ForegroundColor Gray
}

# Cost
$cost = aws cloudwatch get-metric-statistics `
    --namespace "AIBTS/Bedrock" `
    --metric-name "BedrockCost" `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $($Hours * 3600) `
    --output json | ConvertFrom-Json

if ($cost.Datapoints.Count -gt 0) {
    $costValue = [math]::Round($cost.Datapoints[0].Sum, 4)
    Write-Host "Cost: `$$costValue" -ForegroundColor Green
} else {
    Write-Host "Cost: No data" -ForegroundColor Gray
}

# Requests
$requests = aws cloudwatch get-metric-statistics `
    --namespace "AIBTS/Bedrock" `
    --metric-name "BedrockRequests" `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $($Hours * 3600) `
    --output json | ConvertFrom-Json

if ($requests.Datapoints.Count -gt 0) {
    $requestCount = $requests.Datapoints[0].Sum
    Write-Host "Requests: $requestCount" -ForegroundColor Green
} else {
    Write-Host "Requests: No data" -ForegroundColor Gray
}

Write-Host ""
Write-Host "Alarm Status:" -ForegroundColor Yellow
Write-Host "-------------"

# Check alarms
$alarms = aws cloudwatch describe-alarms `
    --alarm-names "AIBTS-Bedrock-HighErrorRate" "AIBTS-Bedrock-HighLatency" "AIBTS-Bedrock-HighCost" `
    --output json | ConvertFrom-Json

foreach ($alarm in $alarms.MetricAlarms) {
    $color = switch ($alarm.StateValue) {
        "OK" { "Green" }
        "ALARM" { "Red" }
        "INSUFFICIENT_DATA" { "Yellow" }
        default { "Gray" }
    }
    Write-Host "$($alarm.AlarmName): $($alarm.StateValue)" -ForegroundColor $color
}

Write-Host ""
Write-Host "Day $Day Summary:" -ForegroundColor Yellow
Write-Host "----------------"
Write-Host "Status: $(if ($errorCount -eq 0 -and $alarms.MetricAlarms | Where-Object { $_.StateValue -eq 'ALARM' } | Measure-Object | Select-Object -ExpandProperty Count -eq 0) { 'STABLE' } else { 'NEEDS ATTENTION' })" -ForegroundColor $(if ($errorCount -eq 0) { "Green" } else { "Red" })
Write-Host ""
Write-Host "CloudWatch Dashboard:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=us-east-1#dashboards:name=AIBTS-AI-Monitoring"
Write-Host ""
Write-Host "Next Steps:" -ForegroundColor Cyan
if ($Day -lt 7) {
    Write-Host "- Continue monitoring for Day $($Day + 1)"
    Write-Host "- Run: .\monitor-phase4-daily.ps1 -Day $($Day + 1)"
} else {
    Write-Host "- Week 1 monitoring complete!"
    Write-Host "- Review weekly report"
    Write-Host "- Proceed to Task 14.3 (OpenAI deprecation) if stable"
}
