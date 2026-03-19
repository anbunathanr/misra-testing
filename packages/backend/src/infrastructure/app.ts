#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { MisraPlatformStackV2 } from './misra-platform-stack-v2';

const app = new cdk.App();

// Deploy Full Platform Stack V2 with pre-bundled Lambda functions
new MisraPlatformStackV2(app, 'MisraPlatformStackV2', {
  env: {
    account: process.env.CDK_DEFAULT_ACCOUNT,
    region: process.env.CDK_DEFAULT_REGION || 'us-east-1',
  },
});

app.synth();
