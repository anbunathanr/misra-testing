# Create DynamoDB tables
Write-Host "=== CREATING DYNAMODB TABLES ===" -ForegroundColor Cyan
Write-Host ""

$tables = @(
  @{Name = "FileMetadata-dev"; PartitionKey = "file_id"; SortKey = "user_id"}
  @{Name = "TestProjects-dev"; PartitionKey = "projectId"; SortKey = $null}
  @{Name = "TestSuites-dev"; PartitionKey = "suiteId"; SortKey = $null}
  @{Name = "TestCases-dev"; PartitionKey = "testCaseId"; SortKey = $null}
  @{Name = "ExecutionMonitoring-dev"; PartitionKey = "executionId"; SortKey = $null}
)

foreach ($table in $tables) {
  Write-Host "Creating $($table.Name)..." -ForegroundColor Yellow
  
  $keySchema = @(
    @{AttributeName = $table.PartitionKey; KeyType = "HASH"}
  )
  
  $attributeDefinitions = @(
    @{AttributeName = $table.PartitionKey; AttributeType = "S"}
  )
  
  if ($table.SortKey) {
    $keySchema += @{AttributeName = $table.SortKey; KeyType = "RANGE"}
    $attributeDefinitions += @{AttributeName = $table.SortKey; AttributeType = "S"}
  }
  
  $params = @{
    TableName = $table.Name
    KeySchema = $keySchema
    AttributeDefinitions = $attributeDefinitions
    BillingMode = "PAY_PER_REQUEST"
  }
  
  $json = $params | ConvertTo-Json -Depth 10
  
  try {
    aws dynamodb create-table --cli-input-json $json --output json | Out-Null
    Write-Host "  [OK] Created" -ForegroundColor Green
  } catch {
    Write-Host "  [SKIP] Already exists" -ForegroundColor Gray
  }
}

Write-Host ""
Write-Host "[OK] DynamoDB tables ready" -ForegroundColor Green
