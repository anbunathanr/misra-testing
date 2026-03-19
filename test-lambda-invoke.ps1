$event = @{
    version = "2.0"
    routeKey = "GET /projects"
    rawPath = "/projects"
    headers = @{
        authorization = "Bearer test"
        "content-type" = "application/json"
    }
    requestContext = @{
        http = @{
            method = "GET"
            path = "/projects"
            sourceIp = "127.0.0.1"
        }
        routeKey = "GET /projects"
        stage = "`$default"
        timeEpoch = 1710656400000
    }
} | ConvertTo-Json -Depth 10

Write-Host "Event:"
Write-Host $event
Write-Host ""

$eventFile = "event.json"
$event | Out-File -FilePath $eventFile -Encoding UTF8

Write-Host "Invoking Lambda function..."
aws lambda invoke --function-name misra-platform-get-projects --region us-east-1 --payload file://$eventFile response.json 2>&1

Write-Host ""
Write-Host "Response:"
Get-Content response.json | ConvertFrom-Json | ConvertTo-Json -Depth 10
