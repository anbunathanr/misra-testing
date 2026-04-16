"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotsBucket = void 0;
const constructs_1 = require("constructs");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class ScreenshotsBucket extends constructs_1.Construct {
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const bucketName = `misra-platform-screenshots-${environment}`;
        // Define lifecycle rules for cost optimization
        const lifecycleRules = [
            {
                id: 'transition-to-infrequent-access',
                enabled: true,
                transitions: [
                    {
                        storageClass: aws_s3_1.StorageClass.INFREQUENT_ACCESS,
                        transitionAfter: aws_cdk_lib_1.Duration.days(30),
                    },
                    {
                        storageClass: aws_s3_1.StorageClass.GLACIER,
                        transitionAfter: aws_cdk_lib_1.Duration.days(90),
                    },
                ],
            },
            {
                id: 'delete-old-screenshots',
                enabled: true,
                expiration: aws_cdk_lib_1.Duration.days(180), // Delete screenshots after 6 months
            },
            {
                id: 'delete-incomplete-uploads',
                enabled: true,
                abortIncompleteMultipartUploadAfter: aws_cdk_lib_1.Duration.days(7),
            },
        ];
        // Create the S3 bucket for screenshots
        this.bucket = new aws_s3_1.Bucket(this, 'ScreenshotsBucket', {
            bucketName,
            // Encryption
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            // Access Control
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            // Lifecycle rules for cost optimization
            lifecycleRules: environment === 'prod' ? lifecycleRules : undefined,
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'prod',
        });
        // Add bucket policy for secure access
        this.bucket.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.DENY,
            principals: [new aws_cdk_lib_1.aws_iam.AnyPrincipal()],
            actions: ['s3:*'],
            resources: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`,
            ],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false',
                },
            },
        }));
        // Add metadata tags
        this.bucket.node.addMetadata('Purpose', 'Screenshot storage for test execution failures');
        this.bucket.node.addMetadata('Environment', environment);
        this.bucket.node.addMetadata('DataClassification', 'Internal');
    }
    /**
     * Grant read permissions to a principal
     */
    grantRead(grantee) {
        return this.bucket.grantRead(grantee);
    }
    /**
     * Grant write permissions to a principal
     */
    grantWrite(grantee) {
        return this.bucket.grantWrite(grantee);
    }
    /**
     * Grant read/write permissions to a principal
     */
    grantReadWrite(grantee) {
        return this.bucket.grantReadWrite(grantee);
    }
}
exports.ScreenshotsBucket = ScreenshotsBucket;
