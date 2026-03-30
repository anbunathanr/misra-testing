# Test Lambda function directly
$payload = @{
    body = '{"email":"test@example.com","password":"123456"}' | ConvertTo-Json -Compress
} | ConvertTo-Json -Compress

aws lambda invoke --function-name misra-platform-login --region us-east-1 --payload $payload response.json
if (Test-Path response.json) {
    Get-Content response.json
    Remove-Item response.json
}