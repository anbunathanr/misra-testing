import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * Simplified CDK Stack using pre-bundled Lambda functions
 * This avoids the massive src directory packaging issue
 */
export declare class MisraPlatformStackV2 extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
