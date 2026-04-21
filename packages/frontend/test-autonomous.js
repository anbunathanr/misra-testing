#!/usr/bin/env node

// Simple test runner for Autonomous Compliance Pipeline tests
import { execSync } from 'child_process';

console.log('🚀 Running Autonomous Compliance Pipeline Tests...');

try {
  // Run specific test files
  const result = execSync('npx jest src/__tests__/fire-and-forget-integration.test.ts src/__tests__/enhanced-bug-condition-exploration.test.ts src/__tests__/enhanced-preservation-property.test.ts --testTimeout=10000', {
    stdio: 'inherit',
    cwd: process.cwd()
  });
  
  console.log('✅ All Autonomous Compliance Pipeline tests completed successfully!');
  process.exit(0);
} catch (error) {
  console.error('❌ Tests failed:', error.message);
  process.exit(1);
}