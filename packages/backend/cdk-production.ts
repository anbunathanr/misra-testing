#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { ProductionMisraStack } from './src/infrastructure/production-misra-stack';

const app = new cdk.App();

// Get environment from context or default to dev
const environment = app.node.tryGetContext('environment') || 'dev';
const account = app.node.tryGetContext('account') || process.env.CDK_DEFAULT_ACCOUNT;
const region = app.node.tryGetContext('region') || process.env.CDK_DEFAULT_REGION || 'us-east-1';

// Environment-specific configuration
const envConfig = {
  dev: {
    domainName: undefined,
    certificateArn: undefined,
  },
  staging: {
    domainName: app.node.tryGetContext('stagingDomain'),
    certificateArn: app.node.tryGetContext('stagingCertificateArn'),
  },
  production: {
    domainName: app.node.tryGetContext('productionDomain'),
    certificateArn: app.node.tryGetContext('productionCertificateArn'),
  },
};

const config = envConfig[environment as keyof typeof envConfig];

if (!config) {
  throw new Error(`Invalid environment: ${environment}. Must be one of: dev, staging, production`);
}

// Create the stack
new ProductionMisraStack(app, `MisraPlatform-${environment}`, {
  env: {
    account,
    region,
  },
  description: `MISRA Compliance Platform - ${environment} environment`,
  tags: {
    Environment: environment,
    Project: 'MISRA-Platform',
    Owner: 'Development-Team',
    CostCenter: 'Engineering',
  },
});

app.synth();