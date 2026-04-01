#!/usr/bin/env ts-node
/**
 * Verification script for Bedrock TypeScript types
 * This script demonstrates that all Bedrock SDK types are properly configured
 * and accessible in the TypeScript environment.
 */

import {
  BedrockRuntimeClient,
  InvokeModelCommand,
  InvokeModelCommandInput,
  InvokeModelCommandOutput,
} from '@aws-sdk/client-bedrock-runtime';

console.log('✓ Successfully imported BedrockRuntimeClient');
console.log('✓ Successfully imported InvokeModelCommand');
console.log('✓ Successfully imported InvokeModelCommandInput');
console.log('✓ Successfully imported InvokeModelCommandOutput');

// Type checking - verify all types are properly resolved
const verifyTypes = () => {
  // Client type
  const client: BedrockRuntimeClient = new BedrockRuntimeClient({
    region: 'us-east-1',
  });
  console.log('✓ BedrockRuntimeClient type is valid');

  // Input type
  const input: InvokeModelCommandInput = {
    modelId: 'anthropic.claude-3-5-sonnet-20241022-v2:0',
    contentType: 'application/json',
    accept: 'application/json',
    body: new Uint8Array(),
  };
  console.log('✓ InvokeModelCommandInput type is valid');

  // Command type
  const command: InvokeModelCommand = new InvokeModelCommand(input);
  console.log('✓ InvokeModelCommand type is valid');

  // Output type (type-only check)
  const checkOutput = (output: InvokeModelCommandOutput) => {
    return output.body !== undefined;
  };
  console.log('✓ InvokeModelCommandOutput type is valid');

  return true;
};

// Run verification
try {
  verifyTypes();
  console.log('\n✅ All Bedrock TypeScript types are properly configured!');
  console.log('✅ Task 1.2: Configure TypeScript types for Bedrock - COMPLETE');
} catch (error) {
  console.error('\n❌ Type verification failed:', error);
  process.exit(1);
}
