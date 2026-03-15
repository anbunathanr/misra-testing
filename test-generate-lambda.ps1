# Test AI Generate Lambda Function with Mock Mode

$payload = @{
    body = @{
        analysis = @{
            url = "https://example.com"
            title = "Example Site"
            elements = @()
            patterns = @()
            flows = @()
            metadata = @{
                loadTime = 1000
                resourceCount = 10
                domSize = 100
                isSPA = $false
            }
        }
        scenario = "Test login functionality"
        projectId = "test-project-123"
        suiteId = "test-suite-456"
    } | ConvertTo-Json -Depth 10
    requestContext = @{
        authorizer = @{
            claims = @{
                sub = "test-user-123"
            }
        }
    }
} | ConvertTo-Json -Depth 10

# Save payload to temp file (UTF8 without BOM)
$Utf8NoBomEncoding = New-Object System.Text.UTF8Encoding $False
[System.IO.File]::WriteAllText("$PWD\temp-payload.json", $payload, $Utf8NoBomEncoding)

# Invoke Lambda
Write-Host "Invoking Lambda function: aibts-ai-generate"
Write-Host "Using MOCK mode (no OpenAI API calls)"
Write-Host ""

aws lambda invoke `
    --function-name aibts-ai-generate `
    --payload file://temp-payload.json `
    --cli-binary-format raw-in-base64-out `
    response.json

# Display response
Write-Host ""
Write-Host "Response:"
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10

# Cleanup
Remove-Item temp-payload.json -ErrorAction SilentlyContinue
