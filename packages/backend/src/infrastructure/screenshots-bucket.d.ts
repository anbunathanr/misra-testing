import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { aws_iam as iam } from 'aws-cdk-lib';
export declare class ScreenshotsBucket extends Construct {
    readonly bucket: Bucket;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee: any): iam.Grant;
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee: any): iam.Grant;
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee: any): iam.Grant;
}
