import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
export declare class ScreenshotsBucket extends Construct {
    readonly bucket: Bucket;
    constructor(scope: Construct, id: string, props?: {
        environment?: string;
    });
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee: any): import("aws-cdk-lib/aws-iam").Grant;
}
