# Create Missing Lambda Functions
# This script creates the 11 Lambda functions that were not deployed by CDK

Write-Host "=== Creating Missing Lambda Functions ===" -ForegroundColor Cyan
Write-Host ""

# Get AWS account ID
$accountId = aws sts get-caller-identity --query Account --output text
if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Failed to get AWS account ID. Make sure AWS CLI is configured." -ForegroundColor Red
    exit 1
}

Write-Host "AWS Account ID: $accountId" -ForegroundColor Green
Write-Host ""

# Get IAM role ARN (we'll use the same role pattern as existing Lambda functions)
$existingFunction = "misra-platform-login"
$roleArn = aws lambda get-function --function-name $existingFunction --query 'Configuration.Role' --output text 2>$null

if ($LASTEXITCODE -ne 0) {
    Write-Host "Error: Could not get IAM role from existing function. Creating default role..." -ForegroundColor Yellow
    
    # Create a basic Lambda execution role
    $roleName = "MisraPlatformLambdaRole"
    $trustPolicy = @"
{
  "Version": "2012-10-17",
  "Statement": [
    {
      "Effect": "Allow",
      "Principal": {
        "Service": "lambda.amazonaws.com"
      },
      "Action": "sts:AssumeRole"
    }
  ]
}
"@
    
    $trustPolicy | Out-File -FilePath "trust-policy.json" -Encoding utf8
    
    aws iam create-role --role-name $roleName --assume-role-policy-document file://trust-policy.json 2>$null
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/service-role/AWSLambdaBasicExecutionRole"
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/AmazonDynamoDBFullAccess"
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/AmazonS3FullAccess"
    aws iam attach-role-policy --role-name $roleName --policy-arn "arn:aws:iam::aws:policy/AmazonSQSFullAccess"
    
    Remove-Item "trust-policy.json" -ErrorAction SilentlyContinue
    
    $roleArn = "arn:aws:iam::${accountId}:role/${roleName}"
    
    Write-Host "Created IAM role: $roleArn" -ForegroundColor Green
    Write-Host "Waiting 10 seconds for role to propagate..." -ForegroundColor Yellow
    Start-Sleep -Seconds 10
} else {
    Write-Host "Using existing IAM role: $roleArn" -ForegroundColor Green
}

Write-Host ""

# Define the 11 missing Lambda functions with their configurations
$missingFunctions = @(
    @{
        Name = "aibts-get-profile"
        Zip = "dist-zips/auth/get-profile/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            USERS_TABLE_NAME = "misra-platform-users"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-trigger-execution"
        Zip = "dist-zips/executions/trigger/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            TEST_CASES_TABLE_NAME = "TestCases"
            TEST_SUITES_TABLE_NAME = "TestSuites"
            TEST_EXECUTION_QUEUE_URL = "https://sqs.us-east-1.amazonaws.com/$accountId/misra-platform-test-execution"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-test-executor"
        Zip = "dist-zips/executions/executor/index.zip"
        Handler = "index.handler"
        Timeout = 900
        Memory = 2048
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            TEST_CASES_TABLE_NAME = "TestCases"
            SCREENSHOTS_BUCKET_NAME = "misra-platform-screenshots-dev"
        }
    },
    @{
        Name = "aibts-get-execution-status"
        Zip = "dist-zips/executions/get-status/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-get-execution-results"
        Zip = "dist-zips/executions/get-results/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            SCREENSHOTS_BUCKET_NAME = "misra-platform-screenshots-dev"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-get-execution-history"
        Zip = "dist-zips/executions/get-history/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-get-suite-results"
        Zip = "dist-zips/executions/get-suite-results/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            TEST_EXECUTIONS_TABLE_NAME = "TestExecutions"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "aibts-ai-get-usage"
        Zip = "dist-zips/ai-test-generation/get-usage/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            AI_USAGE_TABLE = "AIUsage"
            JWT_SECRET_NAME = "misra-platform-jwt-secret"
        }
    },
    @{
        Name = "misra-platform-analyze-file"
        Zip = "dist-zips/analysis/analyze-file/index.zip"
        Handler = "index.handler"
        Timeout = 300
        Memory = 512
        Environment = @{
            ANALYSES_TABLE_NAME = "misra-platform-analyses"
            FILE_STORAGE_BUCKET_NAME = "misra-platform-files-$accountId"
            ENVIRONMENT = "dev"
        }
    },
    @{
        Name = "misra-platform-get-user-stats"
        Zip = "dist-zips/analysis/get-user-stats/index.zip"
        Handler = "index.handler"
        Timeout = 30
        Memory = 256
        Environment = @{
            ENVIRONMENT = "MisraPlatformStack"
        }
    },
    @{
        Name = "misra-platform-generate-insights"
        Zip = "dist-zips/ai/generate-insights/index.zip"
        Handler = "index.handler"
        Timeout = 60
        Memory = 512
        Environment = @{
            ENVIRONMENT = "MisraPlatformStack"
        }
    }
)

$successCount = 0
$failCount = 0
$skippedCount = 0
$currentIndex = 0

foreach ($func in $missingFunctions) {
    $currentIndex++
    $functionName = $func.Name
    $zipPath = $func.Zip
    
    Write-Host "[$currentIndex/11] Creating: $functionName" -ForegroundColor Yellow
    
    # Check if zip file exists
    if (-not (Test-Path $zipPath)) {
        Write-Host "  Error: Zip file not found at $zipPath" -ForegroundColor Red
        $failCount++
        continue
    }
    
    # Check if function already exists
    $functionExists = $false
    try {
        aws lambda get-function --function-name $functionName --query 'Configuration.FunctionName' --output text 2>&1 | Out-Null
        if ($LASTEXITCODE -eq 0) {
            $functionExists = $true
        }
    } catch {
        # Function doesn't exist
    }
    
    if ($functionExists) {
        Write-Host "  Warning: Function already exists, skipping..." -ForegroundColor DarkYellow
        $skippedCount++
        continue
    }
    
    # Build environment variables JSON
    $envVars = @{}
    foreach ($key in $func.Environment.Keys) {
        $envVars[$key] = $func.Environment[$key]
    }
    $envJson = ($envVars | ConvertTo-Json -Compress).Replace('"', '\"')
    
    # Create the Lambda function
    $createResult = aws lambda create-function `
        --function-name $functionName `
        --runtime nodejs20.x `
        --role $roleArn `
        --handler $func.Handler `
        --zip-file "fileb://$zipPath" `
        --timeout $func.Timeout `
        --memory-size $func.Memory `
        --environment "Variables={$($func.Environment.Keys | ForEach-Object { "$_=$($func.Environment[$_])" } | Join-String -Separator ',')}" `
        --query 'FunctionArn' `
        --output text 2>&1
    
    if ($LASTEXITCODE -eq 0) {
        Write-Host "  Success: Created function" -ForegroundColor Green
        Write-Host "  ARN: $createResult" -ForegroundColor Gray
        $successCount++
    } else {
        Write-Host "  Error: Failed to create function" -ForegroundColor Red
        Write-Host "  $createResult" -ForegroundColor Red
        $failCount++
    }
    
    # Small delay to avoid rate limiting
    Start-Sleep -Milliseconds 500
}

Write-Host ""
Write-Host "=== Creation Summary ===" -ForegroundColor Cyan
Write-Host "Successfully created: $successCount" -ForegroundColor Green
Write-Host "Failed: $failCount" -ForegroundColor Red
Write-Host "Skipped (already exist): $skippedCount" -ForegroundColor Yellow
Write-Host ""

if ($failCount -eq 0 -and $successCount -gt 0) {
    Write-Host "All missing Lambda functions created successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "Next steps:" -ForegroundColor Cyan
    Write-Host "1. Add API Gateway integrations for these functions" -ForegroundColor White
    Write-Host "2. Configure SQS trigger for aibts-test-executor" -ForegroundColor White
    Write-Host "3. Test the endpoints" -ForegroundColor White
} elseif ($failCount -gt 0) {
    Write-Host "Some functions failed to create. Please check the errors above." -ForegroundColor Red
    exit 1
} else {
    Write-Host "No new functions were created." -ForegroundColor Yellow
}
