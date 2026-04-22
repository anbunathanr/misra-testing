#!/usr/bin/env node
import 'source-map-support/register';
import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * MISRA Platform MVP Stack
 *
 * Minimal production-ready infrastructure for core MISRA analysis workflow:
 * - Authentication (Cognito)
 * - File upload/retrieval (S3 + Lambda)
 * - MISRA analysis (Lambda)
 * - Results storage (DynamoDB)
 */
export declare class MisraPlatformMVPStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
