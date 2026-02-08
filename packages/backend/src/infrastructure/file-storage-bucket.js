"use strict";
/**
 * AWS CDK infrastructure definition for File Storage S3 Bucket
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.FileStorageBucket = void 0;
const constructs_1 = require("constructs");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class FileStorageBucket extends constructs_1.Construct {
    bucket;
    constructor(scope, id, props) {
        super(scope, id);
        const environment = props?.environment || 'dev';
        const bucketName = `misra-platform-files-${environment}`;
        // Define lifecycle rules for cost optimization
        const lifecycleRules = [
            {
                id: 'transition-to-infrequent-access',
                enabled: true,
                transitions: [
                    {
                        storageClass: aws_s3_1.StorageClass.INFREQUENT_ACCESS,
                        transitionAfter: aws_cdk_lib_1.Duration.days(30)
                    },
                    {
                        storageClass: aws_s3_1.StorageClass.GLACIER,
                        transitionAfter: aws_cdk_lib_1.Duration.days(90)
                    }
                ]
            },
            {
                id: 'delete-incomplete-uploads',
                enabled: true,
                abortIncompleteMultipartUploadAfter: aws_cdk_lib_1.Duration.days(7)
            },
            {
                id: 'expire-old-versions',
                enabled: true,
                noncurrentVersionExpiration: aws_cdk_lib_1.Duration.days(30)
            }
        ];
        // Create the S3 bucket with security best practices
        this.bucket = new aws_s3_1.Bucket(this, 'FileStorageBucket', {
            bucketName,
            // Encryption
            encryption: aws_s3_1.BucketEncryption.S3_MANAGED,
            enforceSSL: true,
            // Access Control
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            objectOwnership: aws_s3_1.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            // Versioning for data protection
            versioned: environment === 'prod',
            // Lifecycle rules for cost optimization
            lifecycleRules: environment === 'prod' ? lifecycleRules : undefined,
            // CORS configuration for web uploads
            cors: [
                {
                    allowedMethods: [
                        aws_s3_1.HttpMethods.GET,
                        aws_s3_1.HttpMethods.PUT,
                        aws_s3_1.HttpMethods.POST,
                        aws_s3_1.HttpMethods.DELETE,
                        aws_s3_1.HttpMethods.HEAD
                    ],
                    allowedOrigins: ['*'], // In production, restrict to specific domains
                    allowedHeaders: ['*'],
                    exposedHeaders: [
                        'ETag',
                        'x-amz-server-side-encryption',
                        'x-amz-request-id',
                        'x-amz-id-2'
                    ],
                    maxAge: 3000
                }
            ],
            // Removal policy
            removalPolicy: environment === 'prod' ? aws_cdk_lib_1.RemovalPolicy.RETAIN : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'prod',
            // Event notifications (for triggering Lambda on upload)
            eventBridgeEnabled: true
        });
        // Add bucket policy for secure access
        this.bucket.addToResourcePolicy({
            effect: 'Deny',
            principals: ['*'],
            actions: ['s3:*'],
            resources: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`
            ],
            conditions: {
                Bool: {
                    'aws:SecureTransport': 'false'
                }
            }
        });
        // Add metadata tags
        this.bucket.node.addMetadata('Purpose', 'File storage for MISRA code analysis');
        this.bucket.node.addMetadata('Environment', environment);
        this.bucket.node.addMetadata('DataClassification', 'Confidential');
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
    /**
     * Grant permissions to generate presigned URLs
     */
    grantPresignedUrl(grantee) {
        return this.bucket.grantReadWrite(grantee);
    }
}
exports.FileStorageBucket = FileStorageBucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1zdG9yYWdlLWJ1Y2tldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtc3RvcmFnZS1idWNrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsK0NBVTJCO0FBQzNCLDZDQUFxRDtBQUVyRCxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBQzlCLE1BQU0sQ0FBUTtJQUU5QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxLQUFLLENBQUE7UUFDL0MsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLFdBQVcsRUFBRSxDQUFBO1FBRXhELCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBb0I7WUFDdEM7Z0JBQ0UsRUFBRSxFQUFFLGlDQUFpQztnQkFDckMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYO3dCQUNFLFlBQVksRUFBRSxxQkFBWSxDQUFDLGlCQUFpQjt3QkFDNUMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7b0JBQ0Q7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsT0FBTzt3QkFDbEMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1DQUFtQyxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RDtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLDJCQUEyQixFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUMvQztTQUNGLENBQUE7UUFFRCxvREFBb0Q7UUFDcEQsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDbEQsVUFBVTtZQUVWLGFBQWE7WUFDYixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtZQUN2QyxVQUFVLEVBQUUsSUFBSTtZQUVoQixpQkFBaUI7WUFDakIsaUJBQWlCLEVBQUUsMEJBQWlCLENBQUMsU0FBUztZQUM5QyxlQUFlLEVBQUUsd0JBQWUsQ0FBQyxxQkFBcUI7WUFFdEQsaUNBQWlDO1lBQ2pDLFNBQVMsRUFBRSxXQUFXLEtBQUssTUFBTTtZQUVqQyx3Q0FBd0M7WUFDeEMsY0FBYyxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUVuRSxxQ0FBcUM7WUFDckMsSUFBSSxFQUFFO2dCQUNKO29CQUNFLGNBQWMsRUFBRTt3QkFDZCxvQkFBVyxDQUFDLEdBQUc7d0JBQ2Ysb0JBQVcsQ0FBQyxHQUFHO3dCQUNmLG9CQUFXLENBQUMsSUFBSTt3QkFDaEIsb0JBQVcsQ0FBQyxNQUFNO3dCQUNsQixvQkFBVyxDQUFDLElBQUk7cUJBQ2pCO29CQUNELGNBQWMsRUFBRSxDQUFDLEdBQUcsQ0FBQyxFQUFFLDhDQUE4QztvQkFDckUsY0FBYyxFQUFFLENBQUMsR0FBRyxDQUFDO29CQUNyQixjQUFjLEVBQUU7d0JBQ2QsTUFBTTt3QkFDTiw4QkFBOEI7d0JBQzlCLGtCQUFrQjt3QkFDbEIsWUFBWTtxQkFDYjtvQkFDRCxNQUFNLEVBQUUsSUFBSTtpQkFDYjthQUNGO1lBRUQsaUJBQWlCO1lBQ2pCLGFBQWEsRUFBRSxXQUFXLEtBQUssTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE1BQU0sQ0FBQyxDQUFDLENBQUMsMkJBQWEsQ0FBQyxPQUFPO1lBQ3BGLGlCQUFpQixFQUFFLFdBQVcsS0FBSyxNQUFNO1lBRXpDLHdEQUF3RDtZQUN4RCxrQkFBa0IsRUFBRSxJQUFJO1NBQ3pCLENBQUMsQ0FBQTtRQUVGLHNDQUFzQztRQUN0QyxJQUFJLENBQUMsTUFBTSxDQUFDLG1CQUFtQixDQUFDO1lBQzlCLE1BQU0sRUFBRSxNQUFNO1lBQ2QsVUFBVSxFQUFFLENBQUMsR0FBRyxDQUFDO1lBQ2pCLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNqQixTQUFTLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTO2dCQUNyQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJO2FBQzdCO1lBQ0QsVUFBVSxFQUFFO2dCQUNWLElBQUksRUFBRTtvQkFDSixxQkFBcUIsRUFBRSxPQUFPO2lCQUMvQjthQUNGO1NBQ0ssQ0FBQyxDQUFBO1FBRVQsb0JBQW9CO1FBQ3BCLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxTQUFTLEVBQUUsc0NBQXNDLENBQUMsQ0FBQTtRQUMvRSxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyxXQUFXLENBQUMsYUFBYSxFQUFFLFdBQVcsQ0FBQyxDQUFBO1FBQ3hELElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxvQkFBb0IsRUFBRSxjQUFjLENBQUMsQ0FBQTtJQUNwRSxDQUFDO0lBRUQ7O09BRUc7SUFDSSxTQUFTLENBQUMsT0FBWTtRQUMzQixPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxDQUFDLE9BQU8sQ0FBQyxDQUFBO0lBQ3ZDLENBQUM7SUFFRDs7T0FFRztJQUNJLFVBQVUsQ0FBQyxPQUFZO1FBQzVCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksY0FBYyxDQUFDLE9BQVk7UUFDaEMsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLGNBQWMsQ0FBQyxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxpQkFBaUIsQ0FBQyxPQUFZO1FBQ25DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNGO0FBdElELDhDQXNJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBV1MgQ0RLIGluZnJhc3RydWN0dXJlIGRlZmluaXRpb24gZm9yIEZpbGUgU3RvcmFnZSBTMyBCdWNrZXRcclxuICovXHJcblxyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5pbXBvcnQgeyBcclxuICBCdWNrZXQsIFxyXG4gIEJ1Y2tldEVuY3J5cHRpb24sIFxyXG4gIEJsb2NrUHVibGljQWNjZXNzLFxyXG4gIEJ1Y2tldEFjY2Vzc0NvbnRyb2wsXHJcbiAgT2JqZWN0T3duZXJzaGlwLFxyXG4gIExpZmVjeWNsZVJ1bGUsXHJcbiAgU3RvcmFnZUNsYXNzLFxyXG4gIFRyYW5zaXRpb24sXHJcbiAgSHR0cE1ldGhvZHNcclxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3ksIER1cmF0aW9uIH0gZnJvbSAnYXdzLWNkay1saWInXHJcblxyXG5leHBvcnQgY2xhc3MgRmlsZVN0b3JhZ2VCdWNrZXQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBidWNrZXQ6IEJ1Y2tldFxyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IHsgZW52aXJvbm1lbnQ/OiBzdHJpbmcgfSkge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKVxyXG5cclxuICAgIGNvbnN0IGVudmlyb25tZW50ID0gcHJvcHM/LmVudmlyb25tZW50IHx8ICdkZXYnXHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9YFxyXG5cclxuICAgIC8vIERlZmluZSBsaWZlY3ljbGUgcnVsZXMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICBjb25zdCBsaWZlY3ljbGVSdWxlczogTGlmZWN5Y2xlUnVsZVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICd0cmFuc2l0aW9uLXRvLWluZnJlcXVlbnQtYWNjZXNzJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxyXG4gICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IFN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxyXG4gICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoOTApXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgXVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdkZWxldGUtaW5jb21wbGV0ZS11cGxvYWRzJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBEdXJhdGlvbi5kYXlzKDcpXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ2V4cGlyZS1vbGQtdmVyc2lvbnMnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbm9uY3VycmVudFZlcnNpb25FeHBpcmF0aW9uOiBEdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICB9XHJcbiAgICBdXHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBTMyBidWNrZXQgd2l0aCBzZWN1cml0eSBiZXN0IHByYWN0aWNlc1xyXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEVuY3J5cHRpb25cclxuICAgICAgZW5jcnlwdGlvbjogQnVja2V0RW5jcnlwdGlvbi5TM19NQU5BR0VELFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgLy8gQWNjZXNzIENvbnRyb2xcclxuICAgICAgYmxvY2tQdWJsaWNBY2Nlc3M6IEJsb2NrUHVibGljQWNjZXNzLkJMT0NLX0FMTCxcclxuICAgICAgb2JqZWN0T3duZXJzaGlwOiBPYmplY3RPd25lcnNoaXAuQlVDS0VUX09XTkVSX0VORk9SQ0VELFxyXG4gICAgICBcclxuICAgICAgLy8gVmVyc2lvbmluZyBmb3IgZGF0YSBwcm90ZWN0aW9uXHJcbiAgICAgIHZlcnNpb25lZDogZW52aXJvbm1lbnQgPT09ICdwcm9kJyxcclxuICAgICAgXHJcbiAgICAgIC8vIExpZmVjeWNsZSBydWxlcyBmb3IgY29zdCBvcHRpbWl6YXRpb25cclxuICAgICAgbGlmZWN5Y2xlUnVsZXM6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBsaWZlY3ljbGVSdWxlcyA6IHVuZGVmaW5lZCxcclxuICAgICAgXHJcbiAgICAgIC8vIENPUlMgY29uZmlndXJhdGlvbiBmb3Igd2ViIHVwbG9hZHNcclxuICAgICAgY29yczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLkdFVCxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuUFVULFxyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5QT1NULFxyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5ERUxFVEUsXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLkhFQURcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBhbGxvd2VkT3JpZ2luczogWycqJ10sIC8vIEluIHByb2R1Y3Rpb24sIHJlc3RyaWN0IHRvIHNwZWNpZmljIGRvbWFpbnNcclxuICAgICAgICAgIGFsbG93ZWRIZWFkZXJzOiBbJyonXSxcclxuICAgICAgICAgIGV4cG9zZWRIZWFkZXJzOiBbXHJcbiAgICAgICAgICAgICdFVGFnJyxcclxuICAgICAgICAgICAgJ3gtYW16LXNlcnZlci1zaWRlLWVuY3J5cHRpb24nLFxyXG4gICAgICAgICAgICAneC1hbXotcmVxdWVzdC1pZCcsXHJcbiAgICAgICAgICAgICd4LWFtei1pZC0yJ1xyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIG1heEFnZTogMzAwMFxyXG4gICAgICAgIH1cclxuICAgICAgXSxcclxuICAgICAgXHJcbiAgICAgIC8vIFJlbW92YWwgcG9saWN5XHJcbiAgICAgIHJlbW92YWxQb2xpY3k6IGVudmlyb25tZW50ID09PSAncHJvZCcgPyBSZW1vdmFsUG9saWN5LlJFVEFJTiA6IFJlbW92YWxQb2xpY3kuREVTVFJPWSxcclxuICAgICAgYXV0b0RlbGV0ZU9iamVjdHM6IGVudmlyb25tZW50ICE9PSAncHJvZCcsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFdmVudCBub3RpZmljYXRpb25zIChmb3IgdHJpZ2dlcmluZyBMYW1iZGEgb24gdXBsb2FkKVxyXG4gICAgICBldmVudEJyaWRnZUVuYWJsZWQ6IHRydWVcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQWRkIGJ1Y2tldCBwb2xpY3kgZm9yIHNlY3VyZSBhY2Nlc3NcclxuICAgIHRoaXMuYnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koe1xyXG4gICAgICBlZmZlY3Q6ICdEZW55JyxcclxuICAgICAgcHJpbmNpcGFsczogWycqJ10sXHJcbiAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICB0aGlzLmJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgYCR7dGhpcy5idWNrZXQuYnVja2V0QXJufS8qYFxyXG4gICAgICBdLFxyXG4gICAgICBjb25kaXRpb25zOiB7XHJcbiAgICAgICAgQm9vbDoge1xyXG4gICAgICAgICAgJ2F3czpTZWN1cmVUcmFuc3BvcnQnOiAnZmFsc2UnXHJcbiAgICAgICAgfVxyXG4gICAgICB9XHJcbiAgICB9IGFzIGFueSlcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdGaWxlIHN0b3JhZ2UgZm9yIE1JU1JBIGNvZGUgYW5hbHlzaXMnKVxyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnRW52aXJvbm1lbnQnLCBlbnZpcm9ubWVudClcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0RhdGFDbGFzc2lmaWNhdGlvbicsICdDb25maWRlbnRpYWwnKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZCBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWQoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCB3cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFdyaXRlKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50V3JpdGUoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IHJlYWQvd3JpdGUgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IHBlcm1pc3Npb25zIHRvIGdlbmVyYXRlIHByZXNpZ25lZCBVUkxzXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50UHJlc2lnbmVkVXJsKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZFdyaXRlKGdyYW50ZWUpXHJcbiAgfVxyXG59XHJcbiJdfQ==