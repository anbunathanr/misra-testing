import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
/**
 * AI Test Generation Stack
 *
 * Complete AI test generation infrastructure deployed as a separate stack
 * to avoid CDK issues in the main MisraPlatformStack.
 */
export declare class MinimalStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: cdk.StackProps);
}
