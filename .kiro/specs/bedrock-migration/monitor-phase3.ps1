# Monitor Phase 3 Deployment
# This script collects and displays key metrics for Phase 3 monitoring

param(
    [string]$Region = "us-east-1",
    [int]$Hours = 1
)

Write-Host "=== Phase 3: Monitoring Dashboard ===" -ForegroundColor Cyan
Write-Host "Time Range: Last $Hours hour(s)" -ForegroundColor Yellow
Write-Host ""

# Get current configuration
Write-Host "Current Configuration:" -ForegroundColor Cyan
Write-Host "---------------------" -ForegroundColor Cyan
$provider = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.AI_PROVIDER' `
    --output text

$percentage = aws lambda get-function-configuration `
    --function-name aibts-ai-generate `
    --query 'Environment.Variables.BEDROCK_TRAFFIC_PERCENTAGE' `
    --output text

Write-Host "AI Provider: $provider" -ForegroundColor White
Write-Host "Traffic Percentage: $percentage%" -ForegroundColor White
Write-Host ""

# Calculate time range
$endTime = Get-Date -Format "yyyy-MM-ddTHH:mm:ss"
$startTime = (Get-Date).AddHours(-$Hours).ToString("yyyy-MM-ddTHH:mm:ss")
$period = $Hours * 3600

# Bedrock Metrics
Write-Host "Bedrock Metrics:" -ForegroundColor Cyan
Write-Host "----------------" -ForegroundColor Cyan

# Latency
$bedrockLatency = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/Bedrock `
    --metric-name BedrockLatency `
    --statistics Average,Maximum,Minimum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0]' `
    --output json | ConvertFrom-Json

if ($bedrockLatency) {
    Write-Host "Latency (ms):" -ForegroundColor White
    Write-Host "  Average: $([math]::Round($bedrockLatency.Average, 2))" -ForegroundColor Green
    Write-Host "  Maximum: $([math]::Round($bedrockLatency.Maximum, 2))" -ForegroundColor Yellow
    Write-Host "  Minimum: $([math]::Round($bedrockLatency.Minimum, 2))" -ForegroundColor Green
} else {
    Write-Host "Latency: No data" -ForegroundColor Gray
}

# Errors
$bedrockErrors = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/Bedrock `
    --metric-name BedrockErrors `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Sum' `
    --output text

Write-Host "Errors: $bedrockErrors" -ForegroundColor $(if ($bedrockErrors -eq "0" -or $bedrockErrors -eq "None") { "Green" } else { "Red" })

# Cost
$bedrockCost = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/Bedrock `
    --metric-name BedrockCost `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Sum' `
    --output text

if ($bedrockCost -and $bedrockCost -ne "None") {
    Write-Host "Cost: `$$([math]::Round([double]$bedrockCost, 4))" -ForegroundColor Green
} else {
    Write-Host "Cost: No data" -ForegroundColor Gray
}

# Requests
$bedrockRequests = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/Bedrock `
    --metric-name BedrockRequests `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Sum' `
    --output text

Write-Host "Requests: $bedrockRequests" -ForegroundColor White
Write-Host ""

# OpenAI Metrics (for comparison)
Write-Host "OpenAI Metrics (for comparison):" -ForegroundColor Cyan
Write-Host "--------------------------------" -ForegroundColor Cyan

$openaiLatency = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/OpenAI `
    --metric-name OpenAILatency `
    --statistics Average `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Average' `
    --output text

if ($openaiLatency -and $openaiLatency -ne "None") {
    Write-Host "Latency (avg): $([math]::Round([double]$openaiLatency, 2)) ms" -ForegroundColor White
} else {
    Write-Host "Latency: No data" -ForegroundColor Gray
}

$openaiErrors = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/OpenAI `
    --metric-name OpenAIErrors `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Sum' `
    --output text

Write-Host "Errors: $openaiErrors" -ForegroundColor White

$openaiCost = aws cloudwatch get-metric-statistics `
    --namespace AIBTS/OpenAI `
    --metric-name OpenAICost `
    --statistics Sum `
    --start-time $startTime `
    --end-time $endTime `
    --period $period `
    --query 'Datapoints[0].Sum' `
    --output text

if ($openaiCost -and $openaiCost -ne "None") {
    Write-Host "Cost: `$$([math]::Round([double]$openaiCost, 4))" -ForegroundColor White
} else {
    Write-Host "Cost: No data" -ForegroundColor Gray
}

Write-Host ""

# Alarm Status
Write-Host "Alarm Status:" -ForegroundColor Cyan
Write-Host "-------------" -ForegroundColor Cyan

$alarms = aws cloudwatch describe-alarms `
    --alarm-names AIBTS-Bedrock-HighErrorRate AIBTS-Bedrock-HighLatency AIBTS-Bedrock-HighCost `
    --query 'MetricAlarms[*].[AlarmName,StateValue]' `
    --output text

if ($alarms) {
    $alarms -split "`n" | ForEach-Object {
        $parts = $_ -split "`t"
        $name = $parts[0]
        $state = $parts[1]
        $color = if ($state -eq "OK") { "Green" } elseif ($state -eq "ALARM") { "Red" } else { "Yellow" }
        Write-Host "$name : $state" -ForegroundColor $color
    }
} else {
    Write-Host "No alarms found" -ForegroundColor Gray
}

Write-Host ""

# Dashboard Link
Write-Host "CloudWatch Dashboard:" -ForegroundColor Cyan
Write-Host "https://console.aws.amazon.com/cloudwatch/home?region=$Region#dashboards:name=AIBTS-Bedrock-Migration" -ForegroundColor Blue
Write-Host ""

# Refresh option
Write-Host "Run this script periodically to monitor metrics" -ForegroundColor Yellow
Write-Host "Example: .\monitor-phase3.ps1 -Hours 4" -ForegroundColor Yellow
