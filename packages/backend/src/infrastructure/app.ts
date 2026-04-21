#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MisraPlatformStack } from './misra-platform-stack';

const app = new cdk.App();

// Get environment from context or default to production
const environment = app.node.tryGetContext('environment') || 'production';

// Deploy Full Platform Stack with authentication functions
new MisraPlatformStack(app, `MisraPlatform-${environment}-Stack`, {
  environment: environment, // Pass environment to stack
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  tags: {
    Environment: environment,
    Project: 'MISRA-Platform',
  },
});

app.synth();
