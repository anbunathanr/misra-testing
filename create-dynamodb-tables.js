const { execSync } = require('child_process');

const tables = [
  {
    TableName: 'FileMetadata-dev',
    KeySchema: [
      { AttributeName: 'file_id', KeyType: 'HASH' },
      { AttributeName: 'user_id', KeyType: 'RANGE' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'file_id', AttributeType: 'S' },
      { AttributeName: 'user_id', AttributeType: 'S' },
      { AttributeName: 'upload_timestamp', AttributeType: 'N' },
      { AttributeName: 'analysis_status', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'upload_timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'StatusIndex',
        KeySchema: [
          { AttributeName: 'analysis_status', KeyType: 'HASH' },
          { AttributeName: 'upload_timestamp', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      },
      {
        IndexName: 'UserStatusIndex',
        KeySchema: [
          { AttributeName: 'user_id', KeyType: 'HASH' },
          { AttributeName: 'analysis_status', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'TestProjects-dev',
    KeySchema: [
      { AttributeName: 'projectId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'projectId', AttributeType: 'S' }
    ],
    GlobalSecondaryIndexes: [
      {
        IndexName: 'UserIndex',
        KeySchema: [
          { AttributeName: 'userId', KeyType: 'HASH' },
          { AttributeName: 'createdAt', KeyType: 'RANGE' }
        ],
        Projection: { ProjectionType: 'ALL' }
      }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'TestSuites-dev',
    KeySchema: [
      { AttributeName: 'suiteId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'suiteId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'TestCases-dev',
    KeySchema: [
      { AttributeName: 'testCaseId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'testCaseId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  },
  {
    TableName: 'ExecutionMonitoring-dev',
    KeySchema: [
      { AttributeName: 'executionId', KeyType: 'HASH' }
    ],
    AttributeDefinitions: [
      { AttributeName: 'executionId', AttributeType: 'S' }
    ],
    BillingMode: 'PAY_PER_REQUEST'
  }
];

console.log('=== CREATING DYNAMODB TABLES ===\n');

tables.forEach(table => {
  console.log(`Creating ${table.TableName}...`);
  
  try {
    const json = JSON.stringify(table);
    execSync(`aws dynamodb create-table --cli-input-json "${json}" --output json`, { stdio: 'pipe' });
    console.log(`  [OK] Created\n`);
  } catch (error) {
    if (error.message.includes('ResourceInUseException')) {
      console.log(`  [SKIP] Already exists\n`);
    } else {
      console.log(`  [FAIL] ${error.message}\n`);
    }
  }
});

console.log('[OK] DynamoDB tables ready');
