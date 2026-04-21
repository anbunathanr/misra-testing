import * as cdk from 'aws-cdk-lib';
import { Construct } from 'constructs';
export interface MisraPlatformStackProps extends cdk.StackProps {
    environment?: string;
}
export declare class MisraPlatformStack extends cdk.Stack {
    constructor(scope: Construct, id: string, props?: MisraPlatformStackProps);
}
