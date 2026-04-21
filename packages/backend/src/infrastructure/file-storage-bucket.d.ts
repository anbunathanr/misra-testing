/**
 * AWS CDK infrastructure definition for File Storage S3 Bucket
 */
import { Construct } from 'constructs';
import { Bucket } from 'aws-cdk-lib/aws-s3';
import { aws_iam as iam, aws_lambda as lambda, aws_kms as kms } from 'aws-cdk-lib';
export interface FileStorageBucketProps {
    environment: string;
    accountId: string;
    kmsKey: kms.Key;
}
export declare class FileStorageBucket extends Construct {
    readonly bucket: Bucket;
    constructor(scope: Construct, id: string, props: FileStorageBucketProps);
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee: iam.IGrantable): iam.Grant;
    /**
     * Grant permissions to generate presigned URLs (spec requirement)
     */
    grantPresignedUrl(grantee: iam.IGrantable): iam.Grant;
    /**
     * Add S3 event notification to trigger Lambda on file upload
     */
    addUploadNotification(lambdaFunction: lambda.Function): void;
    /**
     * Add S3 event notification for sample file uploads
     */
    addSampleUploadNotification(lambdaFunction: lambda.Function): void;
}
