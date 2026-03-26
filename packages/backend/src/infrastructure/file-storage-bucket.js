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
    /**
     * Add S3 event notification to trigger Lambda on file upload
     */
    addUploadNotification(lambdaFunction) {
        this.bucket.addEventNotification(aws_s3_1.EventType.OBJECT_CREATED_PUT, new aws_cdk_lib_1.aws_s3_notifications.LambdaDestination(lambdaFunction), { prefix: 'uploads/' });
    }
}
exports.FileStorageBucket = FileStorageBucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1zdG9yYWdlLWJ1Y2tldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtc3RvcmFnZS1idWNrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsK0NBVzJCO0FBQzNCLDZDQUFpSztBQUVqSyxNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBQzlCLE1BQU0sQ0FBUTtJQUU5QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQWdDO1FBQ3hFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsTUFBTSxXQUFXLEdBQUcsS0FBSyxFQUFFLFdBQVcsSUFBSSxLQUFLLENBQUE7UUFDL0MsTUFBTSxVQUFVLEdBQUcsd0JBQXdCLFdBQVcsRUFBRSxDQUFBO1FBRXhELCtDQUErQztRQUMvQyxNQUFNLGNBQWMsR0FBb0I7WUFDdEM7Z0JBQ0UsRUFBRSxFQUFFLGlDQUFpQztnQkFDckMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsV0FBVyxFQUFFO29CQUNYO3dCQUNFLFlBQVksRUFBRSxxQkFBWSxDQUFDLGlCQUFpQjt3QkFDNUMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7b0JBQ0Q7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsT0FBTzt3QkFDbEMsZUFBZSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQztxQkFDbkM7aUJBQ0Y7YUFDRjtZQUNEO2dCQUNFLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1DQUFtQyxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RDtZQUNEO2dCQUNFLEVBQUUsRUFBRSxxQkFBcUI7Z0JBQ3pCLE9BQU8sRUFBRSxJQUFJO2dCQUNiLDJCQUEyQixFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEVBQUUsQ0FBQzthQUMv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QyxPQUFPLENBQUMsQ0FBQTtJQUM1QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxpQkFBaUIsQ0FBQyxPQUFZO1FBQ25DLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxjQUFjLENBQUMsT0FBTyxDQUFDLENBQUE7SUFDNUMsQ0FBQztJQUVEOztPQUVHO0lBQ0kscUJBQXFCLENBQUMsY0FBK0I7UUFDMUQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxvQkFBb0IsQ0FDOUIsa0JBQVMsQ0FBQyxrQkFBa0IsRUFDNUIsSUFBSSxrQ0FBRyxDQUFDLGlCQUFpQixDQUFDLGNBQWMsQ0FBQyxFQUN6QyxFQUFFLE1BQU0sRUFBRSxVQUFVLEVBQUUsQ0FDdkIsQ0FBQTtJQUNILENBQUM7Q0FDRjtBQW5KRCw4Q0FtSkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVdTIENESyBpbmZyYXN0cnVjdHVyZSBkZWZpbml0aW9uIGZvciBGaWxlIFN0b3JhZ2UgUzMgQnVja2V0XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgXHJcbiAgQnVja2V0LCBcclxuICBCdWNrZXRFbmNyeXB0aW9uLCBcclxuICBCbG9ja1B1YmxpY0FjY2VzcyxcclxuICBCdWNrZXRBY2Nlc3NDb250cm9sLFxyXG4gIE9iamVjdE93bmVyc2hpcCxcclxuICBMaWZlY3ljbGVSdWxlLFxyXG4gIFN0b3JhZ2VDbGFzcyxcclxuICBUcmFuc2l0aW9uLFxyXG4gIEh0dHBNZXRob2RzLFxyXG4gIEV2ZW50VHlwZVxyXG59IGZyb20gJ2F3cy1jZGstbGliL2F3cy1zMydcclxuaW1wb3J0IHsgUmVtb3ZhbFBvbGljeSwgRHVyYXRpb24sIGF3c19pYW0gYXMgaWFtLCBhd3NfbGFtYmRhIGFzIGxhbWJkYSwgYXdzX2xhbWJkYV9kZXN0aW5hdGlvbnMgYXMgZGVzdGluYXRpb25zLCBhd3NfczNfbm90aWZpY2F0aW9ucyBhcyBzM24gfSBmcm9tICdhd3MtY2RrLWxpYidcclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlU3RvcmFnZUJ1Y2tldCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogQnVja2V0XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzPzogeyBlbnZpcm9ubWVudD86IHN0cmluZyB9KSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpXHJcblxyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgJ2RldidcclxuICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSBgbWlzcmEtcGxhdGZvcm0tZmlsZXMtJHtlbnZpcm9ubWVudH1gXHJcblxyXG4gICAgLy8gRGVmaW5lIGxpZmVjeWNsZSBydWxlcyBmb3IgY29zdCBvcHRpbWl6YXRpb25cclxuICAgIGNvbnN0IGxpZmVjeWNsZVJ1bGVzOiBMaWZlY3ljbGVSdWxlW10gPSBbXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ3RyYW5zaXRpb24tdG8taW5mcmVxdWVudC1hY2Nlc3MnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBTdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXHJcbiAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cygzMClcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogU3RvcmFnZUNsYXNzLkdMQUNJRVIsXHJcbiAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cyg5MClcclxuICAgICAgICAgIH1cclxuICAgICAgICBdXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ2RlbGV0ZS1pbmNvbXBsZXRlLXVwbG9hZHMnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgYWJvcnRJbmNvbXBsZXRlTXVsdGlwYXJ0VXBsb2FkQWZ0ZXI6IER1cmF0aW9uLmRheXMoNylcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnZXhwaXJlLW9sZC12ZXJzaW9ucycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBub25jdXJyZW50VmVyc2lvbkV4cGlyYXRpb246IER1cmF0aW9uLmRheXMoMzApXHJcbiAgICAgIH1cclxuICAgIF1cclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIFMzIGJ1Y2tldCB3aXRoIHNlY3VyaXR5IGJlc3QgcHJhY3RpY2VzXHJcbiAgICB0aGlzLmJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgJ0ZpbGVTdG9yYWdlQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5jcnlwdGlvblxyXG4gICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBY2Nlc3MgQ29udHJvbFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBvYmplY3RPd25lcnNoaXA6IE9iamVjdE93bmVyc2hpcC5CVUNLRVRfT1dORVJfRU5GT1JDRUQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBWZXJzaW9uaW5nIGZvciBkYXRhIHByb3RlY3Rpb25cclxuICAgICAgdmVyc2lvbmVkOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnLFxyXG4gICAgICBcclxuICAgICAgLy8gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGxpZmVjeWNsZVJ1bGVzIDogdW5kZWZpbmVkLFxyXG4gICAgICBcclxuICAgICAgLy8gQ09SUyBjb25maWd1cmF0aW9uIGZvciB3ZWIgdXBsb2Fkc1xyXG4gICAgICBjb3JzOiBbXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgYWxsb3dlZE1ldGhvZHM6IFtcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuR0VULFxyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5QVVQsXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLlBPU1QsXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLkRFTEVURSxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuSEVBRFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBbJyonXSwgLy8gSW4gcHJvZHVjdGlvbiwgcmVzdHJpY3QgdG8gc3BlY2lmaWMgZG9tYWluc1xyXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFsnKiddLFxyXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0VUYWcnLFxyXG4gICAgICAgICAgICAneC1hbXotc2VydmVyLXNpZGUtZW5jcnlwdGlvbicsXHJcbiAgICAgICAgICAgICd4LWFtei1yZXF1ZXN0LWlkJyxcclxuICAgICAgICAgICAgJ3gtYW16LWlkLTInXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgbWF4QWdlOiAzMDAwXHJcbiAgICAgICAgfVxyXG4gICAgICBdLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEV2ZW50IG5vdGlmaWNhdGlvbnMgKGZvciB0cmlnZ2VyaW5nIExhbWJkYSBvbiB1cGxvYWQpXHJcbiAgICAgIGV2ZW50QnJpZGdlRW5hYmxlZDogdHJ1ZVxyXG4gICAgfSlcclxuXHJcbiAgICAvLyBBZGQgYnVja2V0IHBvbGljeSBmb3Igc2VjdXJlIGFjY2Vzc1xyXG4gICAgdGhpcy5idWNrZXQuYWRkVG9SZXNvdXJjZVBvbGljeShcclxuICAgICAgbmV3IGlhbS5Qb2xpY3lTdGF0ZW1lbnQoe1xyXG4gICAgICAgIGVmZmVjdDogaWFtLkVmZmVjdC5ERU5ZLFxyXG4gICAgICAgIHByaW5jaXBhbHM6IFtuZXcgaWFtLkFueVByaW5jaXBhbCgpXSxcclxuICAgICAgICBhY3Rpb25zOiBbJ3MzOionXSxcclxuICAgICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICAgIHRoaXMuYnVja2V0LmJ1Y2tldEFybixcclxuICAgICAgICAgIGAke3RoaXMuYnVja2V0LmJ1Y2tldEFybn0vKmBcclxuICAgICAgICBdLFxyXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgIEJvb2w6IHtcclxuICAgICAgICAgICAgJ2F3czpTZWN1cmVUcmFuc3BvcnQnOiAnZmFsc2UnXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfVxyXG4gICAgICB9KVxyXG4gICAgKVxyXG5cclxuICAgIC8vIEFkZCBtZXRhZGF0YSB0YWdzXHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdQdXJwb3NlJywgJ0ZpbGUgc3RvcmFnZSBmb3IgTUlTUkEgY29kZSBhbmFseXNpcycpXHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KVxyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnRGF0YUNsYXNzaWZpY2F0aW9uJywgJ0NvbmZpZGVudGlhbCcpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCByZWFkIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50UmVhZChncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFJlYWQoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IHdyaXRlIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50V3JpdGUoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRXcml0ZShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFJlYWRXcml0ZShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcGVybWlzc2lvbnMgdG8gZ2VuZXJhdGUgcHJlc2lnbmVkIFVSTHNcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRQcmVzaWduZWRVcmwoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkV3JpdGUoZ3JhbnRlZSlcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBTMyBldmVudCBub3RpZmljYXRpb24gdG8gdHJpZ2dlciBMYW1iZGEgb24gZmlsZSB1cGxvYWRcclxuICAgKi9cclxuICBwdWJsaWMgYWRkVXBsb2FkTm90aWZpY2F0aW9uKGxhbWJkYUZ1bmN0aW9uOiBsYW1iZGEuRnVuY3Rpb24pIHtcclxuICAgIHRoaXMuYnVja2V0LmFkZEV2ZW50Tm90aWZpY2F0aW9uKFxyXG4gICAgICBFdmVudFR5cGUuT0JKRUNUX0NSRUFURURfUFVULFxyXG4gICAgICBuZXcgczNuLkxhbWJkYURlc3RpbmF0aW9uKGxhbWJkYUZ1bmN0aW9uKSxcclxuICAgICAgeyBwcmVmaXg6ICd1cGxvYWRzLycgfVxyXG4gICAgKVxyXG4gIH1cclxufVxyXG4iXX0=