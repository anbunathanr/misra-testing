#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductionDeploymentStack } from './production-deployment';

const app = new cdk.App();

// Deploy Production Infrastructure Stack for Task 7.2
const productionStack = new cdk.Stack(app, 'MisraPlatformProductionStack', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
  description: 'MISRA Production SaaS Platform - Production Infrastructure (Task 7.2)',
});

// Add the production deployment construct to the stack
new ProductionDeploymentStack(productionStack, 'ProductionDeployment');

app.synth();