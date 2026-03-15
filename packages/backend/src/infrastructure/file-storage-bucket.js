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
        this.bucket.addToResourcePolicy(new aws_cdk_lib_1.aws_iam.PolicyStatement({
            effect: aws_cdk_lib_1.aws_iam.Effect.DENY,
            principals: [new aws_cdk_lib_1.aws_iam.AnyPrincipal()],
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
        }));
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1zdG9yYWdlLWJ1Y2tldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtc3RvcmFnZS1idWNrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsK0NBVTJCO0FBQzNCLDZDQUFxRTtBQUVyRSxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBQzlCLE1BQU0sQ0FBUTtJQUU5QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxLQUFLLENBQUE7UUFDL0MsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLFdBQVcsRUFBRSxDQUFBO1FBRXhELCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBb0I7WUFDdEM7Z0JBQ0UsRUFBRSxFQUFFLGlDQUFpQztnQkFDckMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYO3dCQUNFLFlBQVksRUFBRSxxQkFBWSxDQUFDLGlCQUFpQjt3QkFDNUMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7b0JBQ0Q7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsT0FBTzt3QkFDbEMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1DQUFtQyxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RDtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLDJCQUEyQixFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUMv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QyxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxpQkFBaUIsQ0FBQyxPQUFZO1FBQ25DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztDQUNGO0FBeElELDhDQXdJQyIsInNvdXJjZXNDb250ZW50IjpbIi8qKlxyXG4gKiBBV1MgQ0RLIGluZnJhc3RydWN0dXJlIGRlZmluaXRpb24gZm9yIEZpbGUgU3RvcmFnZSBTMyBCdWNrZXRcclxuICovXHJcblxyXG5pbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJ1xyXG5pbXBvcnQgeyBcclxuICBCdWNrZXQsIFxyXG4gIEJ1Y2tldEVuY3J5cHRpb24sIFxyXG4gIEJsb2NrUHVibGljQWNjZXNzLFxyXG4gIEJ1Y2tldEFjY2Vzc0NvbnRyb2wsXHJcbiAgT2JqZWN0T3duZXJzaGlwLFxyXG4gIExpZmVjeWNsZVJ1bGUsXHJcbiAgU3RvcmFnZUNsYXNzLFxyXG4gIFRyYW5zaXRpb24sXHJcbiAgSHR0cE1ldGhvZHNcclxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnXHJcbmltcG9ydCB7IFJlbW92YWxQb2xpY3ksIER1cmF0aW9uLCBhd3NfaWFtIGFzIGlhbSB9IGZyb20gJ2F3cy1jZGstbGliJ1xyXG5cclxuZXhwb3J0IGNsYXNzIEZpbGVTdG9yYWdlQnVja2V0IGV4dGVuZHMgQ29uc3RydWN0IHtcclxuICBwdWJsaWMgcmVhZG9ubHkgYnVja2V0OiBCdWNrZXRcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiB7IGVudmlyb25tZW50Pzogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZClcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAnZGV2J1xyXG4gICAgY29uc3QgYnVja2V0TmFtZSA9IGBtaXNyYS1wbGF0Zm9ybS1maWxlcy0ke2Vudmlyb25tZW50fWBcclxuXHJcbiAgICAvLyBEZWZpbmUgbGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgY29uc3QgbGlmZWN5Y2xlUnVsZXM6IExpZmVjeWNsZVJ1bGVbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1pbmZyZXF1ZW50LWFjY2VzcycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IFN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcclxuICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDMwKVxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBTdG9yYWdlQ2xhc3MuR0xBQ0lFUixcclxuICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDkwKVxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIF1cclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnZGVsZXRlLWluY29tcGxldGUtdXBsb2FkcycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogRHVyYXRpb24uZGF5cyg3KVxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdleHBpcmUtb2xkLXZlcnNpb25zJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIG5vbmN1cnJlbnRWZXJzaW9uRXhwaXJhdGlvbjogRHVyYXRpb24uZGF5cygzMClcclxuICAgICAgfVxyXG4gICAgXVxyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgUzMgYnVja2V0IHdpdGggc2VjdXJpdHkgYmVzdCBwcmFjdGljZXNcclxuICAgIHRoaXMuYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCAnRmlsZVN0b3JhZ2VCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmNyeXB0aW9uXHJcbiAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEFjY2VzcyBDb250cm9sXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIG9iamVjdE93bmVyc2hpcDogT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9FTkZPUkNFRCxcclxuICAgICAgXHJcbiAgICAgIC8vIFZlcnNpb25pbmcgZm9yIGRhdGEgcHJvdGVjdGlvblxyXG4gICAgICB2ZXJzaW9uZWQ6IGVudmlyb25tZW50ID09PSAncHJvZCcsXHJcbiAgICAgIFxyXG4gICAgICAvLyBMaWZlY3ljbGUgcnVsZXMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gbGlmZWN5Y2xlUnVsZXMgOiB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIHdlYiB1cGxvYWRzXHJcbiAgICAgIGNvcnM6IFtcclxuICAgICAgICB7XHJcbiAgICAgICAgICBhbGxvd2VkTWV0aG9kczogW1xyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5HRVQsXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLlBVVCxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuUE9TVCxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuREVMRVRFLFxyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5IRUFEXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgYWxsb3dlZE9yaWdpbnM6IFsnKiddLCAvLyBJbiBwcm9kdWN0aW9uLCByZXN0cmljdCB0byBzcGVjaWZpYyBkb21haW5zXHJcbiAgICAgICAgICBhbGxvd2VkSGVhZGVyczogWycqJ10sXHJcbiAgICAgICAgICBleHBvc2VkSGVhZGVyczogW1xyXG4gICAgICAgICAgICAnRVRhZycsXHJcbiAgICAgICAgICAgICd4LWFtei1zZXJ2ZXItc2lkZS1lbmNyeXB0aW9uJyxcclxuICAgICAgICAgICAgJ3gtYW16LXJlcXVlc3QtaWQnLFxyXG4gICAgICAgICAgICAneC1hbXotaWQtMidcclxuICAgICAgICAgIF0sXHJcbiAgICAgICAgICBtYXhBZ2U6IDMwMDBcclxuICAgICAgICB9XHJcbiAgICAgIF0sXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZW1vdmFsIHBvbGljeVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2QnLFxyXG4gICAgICBcclxuICAgICAgLy8gRXZlbnQgbm90aWZpY2F0aW9ucyAoZm9yIHRyaWdnZXJpbmcgTGFtYmRhIG9uIHVwbG9hZClcclxuICAgICAgZXZlbnRCcmlkZ2VFbmFibGVkOiB0cnVlXHJcbiAgICB9KVxyXG5cclxuICAgIC8vIEFkZCBidWNrZXQgcG9saWN5IGZvciBzZWN1cmUgYWNjZXNzXHJcbiAgICB0aGlzLmJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkRFTlksXHJcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQW55UHJpbmNpcGFsKCldLFxyXG4gICAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgdGhpcy5idWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICAgICAgYCR7dGhpcy5idWNrZXQuYnVja2V0QXJufS8qYFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgICAgQm9vbDoge1xyXG4gICAgICAgICAgICAnYXdzOlNlY3VyZVRyYW5zcG9ydCc6ICdmYWxzZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICApXHJcblxyXG4gICAgLy8gQWRkIG1ldGFkYXRhIHRhZ3NcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ1B1cnBvc2UnLCAnRmlsZSBzdG9yYWdlIGZvciBNSVNSQSBjb2RlIGFuYWx5c2lzJylcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpXHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnQ29uZmlkZW50aWFsJylcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IHJlYWQgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRSZWFkKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZChncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgd3JpdGUgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRXcml0ZShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFdyaXRlKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCByZWFkL3dyaXRlIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50UmVhZFdyaXRlKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZFdyaXRlKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBwZXJtaXNzaW9ucyB0byBnZW5lcmF0ZSBwcmVzaWduZWQgVVJMc1xyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFByZXNpZ25lZFVybChncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFJlYWRXcml0ZShncmFudGVlKVxyXG4gIH1cclxufVxyXG4iXX0=