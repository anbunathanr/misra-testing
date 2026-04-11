#!/usr/bin/env ts-node

/**
 * MISRA Compliance E2E Test Runner
 * 
 * Usage:
 *   npm run test:misra
 *   
 * Environment Variables:
 *   APP_URL - Frontend URL (default: https://misra.digitransolutions.in)
 *   BACKEND_URL - Backend API URL (default: https://api.misra.digitransolutions.in)
 *   TEST_EMAIL - Test account email (default: test@example.com)
 *   TEST_PASSWORD - Test account password (default: TestPassword123!)
 *   HEADLESS - Run in headless mode (default: true)
 */

import { MisraComplianceE2ETest } from './src/__tests__/integration/misra-compliance-e2e.test';

async function main() {
  console.log('\n╔════════════════════════════════════════════════════════════╗');
  console.log('║     MISRA Compliance Automated Test Application            ║');
  console.log('║                                                            ║');
  console.log('║  This test will:                                           ║');
  console.log('║  1. Login with test credentials                            ║');
  console.log('║  2. Upload a C file                                        ║');
  console.log('║  3. Trigger MISRA compliance analysis                      ║');
  console.log('║  4. Wait for analysis completion                           ║');
  console.log('║  5. Verify the compliance report                           ║');
  console.log('╚════════════════════════════════════════════════════════════╝\n');

  const config = {
    baseUrl: process.env.APP_URL || 'https://misra.digitransolutions.in',
    testEmail: process.env.TEST_EMAIL || 'test@example.com',
    testPassword: process.env.TEST_PASSWORD || 'TestPassword123!',
    backendUrl: process.env.BACKEND_URL || 'https://api.misra.digitransolutions.in',
  };

  console.log('Configuration:');
  console.log(`  Frontend URL: ${config.baseUrl}`);
  console.log(`  Backend URL: ${config.backendUrl}`);
  console.log(`  Test Email: ${config.testEmail}`);
  console.log(`  Headless Mode: ${process.env.HEADLESS !== 'false'}`);
  console.log('\n');

  const test = new MisraComplianceE2ETest(config);

  try {
    const startTime = Date.now();
    await test.runCompleteTest();
    const duration = ((Date.now() - startTime) / 1000).toFixed(2);
    
    console.log(`\n✓ Test completed in ${duration}s`);
    process.exit(0);
  } catch (error) {
    console.error('\n✗ Test failed:', error);
    process.exit(1);
  }
}

main();
