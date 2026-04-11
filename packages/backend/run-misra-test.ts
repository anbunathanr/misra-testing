#!/usr/bin/env node

import { spawn } from 'child_process';
import * as path from 'path';

const args = process.argv.slice(2);
const headless = !args.includes('--debug');
const mode = args.includes('--headless') ? 'headless' : 'normal';

console.log('========================================');
console.log('MISRA Compliance E2E Test Runner');
console.log('========================================\n');

console.log('Configuration:');
console.log(`  Mode: ${mode}`);
console.log(`  Headless: ${headless}`);
console.log(`  App URL: ${process.env.APP_URL || 'https://misra.digitransolutions.in'}`);
console.log(`  Backend URL: ${process.env.BACKEND_URL || 'https://api.misra.digitransolutions.in'}`);
console.log(`  Test Mode Enabled: ${process.env.TEST_MODE_ENABLED || 'false'}`);
console.log('');

// Set environment variables
process.env.PLAYWRIGHT_HEADLESS = headless ? '1' : '0';

// Run Playwright tests
const testProcess = spawn('npx', [
  'playwright',
  'test',
  path.join(__dirname, 'src/__tests__/integration/misra-compliance-e2e.test.ts'),
  '--reporter=list',
], {
  stdio: 'inherit',
  env: {
    ...process.env,
    PLAYWRIGHT_HEADLESS: headless ? '1' : '0',
  },
});

testProcess.on('exit', (code) => {
  if (code === 0) {
    console.log('\n========================================');
    console.log('✓ All tests passed!');
    console.log('========================================\n');
  } else {
    console.log('\n========================================');
    console.log('✗ Tests failed with exit code:', code);
    console.log('========================================\n');
  }
  process.exit(code || 0);
});

testProcess.on('error', (error) => {
  console.error('Failed to start test process:', error);
  process.exit(1);
});
