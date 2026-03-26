const { execSync } = require('child_process');

const envVars = {
  Variables: {
    ENVIRONMENT: 'dev',
    AWS_REGION: 'us-east-1',
    FILE_METADATA_TABLE_NAME: 'FileMetadata-dev',
    PROJECTS_TABLE_NAME: 'TestProjects-dev',
    SUITES_TABLE_NAME: 'TestSuites-dev',
    CASES_TABLE_NAME: 'TestCases-dev',
    EXECUTIONS_TABLE_NAME: 'ExecutionMonitoring-dev',
    FILE_STORAGE_BUCKET_NAME: 'misra-platform-files-dev'
  }
};

console.log('=== SETTING LAMBDA ENVIRONMENT VARIABLES ===\n');

try {
  const functions = JSON.parse(execSync('aws lambda list-functions --output json').toString());
  const misraFuncs = functions.Functions.filter(f => f.FunctionName.startsWith('misra-'));
  
  console.log(`Found ${misraFuncs.length} functions\n`);
  
  misraFuncs.forEach(func => {
    const funcName = func.FunctionName;
    console.log(`Setting env vars for ${funcName}...`);
    
    try {
      const envJson = JSON.stringify(envVars);
      execSync(`aws lambda update-function-configuration --function-name ${funcName} --environment '${envJson}' --output json`, { stdio: 'pipe' });
      console.log(`  [OK] Set\n`);
    } catch (error) {
      console.log(`  [FAIL] ${error.message}\n`);
    }
  });
  
  console.log('[OK] Environment variables set');
} catch (error) {
  console.log(`[FAIL] ${error.message}`);
}
