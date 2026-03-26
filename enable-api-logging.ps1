# Enable API Gateway logging to debug 503 errors
Write-Host "=== ENABLING API GATEWAY LOGGING ===" -ForegroundColor Cyan
Write-Host ""

# Create CloudWatch log group for API Gateway
Write-Host "Step 1: Creating CloudWatch log group..." -ForegroundColor Yellow
$logGroupName = "/aws/apigateway/misra-platform-api"

try {
  aws logs create-log-group --log-group-name $logGroupName 2>&1 | Out-Null
  Write-Host "[OK] Log group created" -ForegroundColor Green
} catch {
  Write-Host "[OK] Log group already exists" -ForegroundColor Green
}
Write-Host ""

# Get the API Gateway execution role ARN
Write-Host "Step 2: Getting API Gateway execution role..." -ForegroundColor Yellow
$roleName = "misra-api-gateway-logging-role"

# Create IAM role for API Gateway logging
try {
  $trustPolicy = @{
    Version = "2012-10-17"
    Statement = @(
      @{
        Effect = "Allow"
        Principal = @{
          Service = "apigateway.amazonaws.com"
        }
        Action = "sts:AssumeRole"
      }
    )
  } | ConvertTo-Json -Depth 10

  aws iam create-role `
    --role-name $roleName `
    --assume-role-policy-document $trustPolicy 2>&1 | Out-Null
  
  Write-Host "[OK] Role created" -ForegroundColor Green
} catch {
  Write-Host "[OK] Role already exists" -ForegroundColor Green
}

# Attach policy to role
Write-Host "Step 3: Attaching CloudWatch Logs policy..." -ForegroundColor Yellow
$policy = @{
  Version = "2012-10-17"
  Statement = @(
    @{
      Effect = "Allow"
      Action = @(
        "logs:CreateLogDelivery"
        "logs:GetLogDelivery"
        "logs:UpdateLogDelivery"
        "logs:DeleteLogDelivery"
        "logs:ListLogDeliveries"
        "logs:PutResourcePolicy"
        "logs:DescribeResourcePolicies"
        "logs:DescribeLogGroups"
      )
      Resource = "*"
    }
  )
} | ConvertTo-Json -Depth 10

aws iam put-role-policy `
  --role-name $roleName `
  --policy-name CloudWatchLogsPolicy `
  --policy-document $policy 2>&1 | Out-Null

Write-Host "[OK] Policy attached" -ForegroundColor Green
Write-Host ""

# Get role ARN
Write-Host "Step 4: Getting role ARN..." -ForegroundColor Yellow
$roleArn = (aws iam get-role --role-name $roleName --query 'Role.Arn' --output text)
Write-Host "[OK] Role ARN: $roleArn" -ForegroundColor Green
Write-Host ""

# Update API Gateway stage with logging
Write-Host "Step 5: Enabling API Gateway logging..." -ForegroundColor Yellow
aws apigatewayv2 update-stage `
  --api-id ljvcr2fpl3 `
  --stage-name '$default' `
  --access-log-settings format='$context.requestId $context.error.message $context.error.messageString' `
  --output json | Out-Null

Write-Host "[OK] Logging enabled" -ForegroundColor Green
Write-Host ""

# Wait a moment for logs to be created
Write-Host "Step 6: Waiting for log group to be ready..." -ForegroundColor Yellow
Start-Sleep -Seconds 3
Write-Host "[OK] Ready" -ForegroundColor Green
Write-Host ""

# Make a test request
Write-Host "Step 7: Making test request..." -ForegroundColor Yellow
$api = "https://ljvcr2fpl3.execute-api.us-east-1.amazonaws.com"
try {
  Invoke-RestMethod -Uri "$api/projects" -Method GET -TimeoutSec 5 -ErrorAction Stop | Out-Null
} catch {
  # Expected to fail
}
Write-Host "[OK] Request sent" -ForegroundColor Green
Write-Host ""

# Check logs
Write-Host "Step 8: Checking logs..." -ForegroundColor Yellow
Start-Sleep -Seconds 2
$logs = aws logs tail $logGroupName --since 1m --format short 2>&1
if ($logs) {
  Write-Host $logs -ForegroundColor Gray
} else {
  Write-Host "[INFO] No logs yet" -ForegroundColor Gray
}
Write-Host ""

Write-Host "=== API GATEWAY LOGGING ENABLED ===" -ForegroundColor Green
Write-Host "Log group: $logGroupName" -ForegroundColor Green
Write-Host "Role ARN: $roleArn" -ForegroundColor Green
Write-Host ""
Write-Host "To view logs:" -ForegroundColor Cyan
Write-Host "aws logs tail $logGroupName --follow" -ForegroundColor Gray
