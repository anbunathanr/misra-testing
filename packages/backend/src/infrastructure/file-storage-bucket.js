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
        const { environment, accountId, kmsKey } = props;
        const bucketName = `misra-platform-files-${environment}-${accountId}`;
        // Define lifecycle rules for cost optimization (aligned with spec requirements)
        const lifecycleRules = [
            {
                id: 'DeleteOldVersions',
                enabled: true,
                noncurrentVersionExpiration: aws_cdk_lib_1.Duration.days(30),
            },
            {
                id: 'TransitionToIA',
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
                id: 'AbortIncompleteMultipartUploads',
                enabled: true,
                abortIncompleteMultipartUploadAfter: aws_cdk_lib_1.Duration.days(7),
            },
        ];
        // Create the S3 bucket with security best practices (aligned with production stack)
        this.bucket = new aws_s3_1.Bucket(this, 'FileStorageBucket', {
            bucketName,
            // KMS encryption with customer-managed keys (spec requirement)
            encryption: aws_s3_1.BucketEncryption.KMS,
            encryptionKey: kmsKey,
            enforceSSL: true,
            // Security settings (spec requirement: block public access)
            blockPublicAccess: aws_s3_1.BlockPublicAccess.BLOCK_ALL,
            objectOwnership: aws_s3_1.ObjectOwnership.BUCKET_OWNER_ENFORCED,
            // Versioning for data protection (spec requirement)
            versioned: true,
            // Lifecycle rules for cost optimization (spec requirement)
            lifecycleRules,
            // CORS configuration for frontend file uploads (spec requirement)
            cors: [
                {
                    allowedMethods: [
                        aws_s3_1.HttpMethods.GET,
                        aws_s3_1.HttpMethods.POST,
                        aws_s3_1.HttpMethods.PUT,
                        aws_s3_1.HttpMethods.HEAD,
                    ],
                    allowedOrigins: environment === 'production'
                        ? ['https://your-production-domain.com'] // Replace with actual production domain
                        : ['http://localhost:3000', 'http://localhost:5173', 'https://*.vercel.app'],
                    allowedHeaders: [
                        'Authorization',
                        'Content-Type',
                        'Content-Length',
                        'Content-MD5',
                        'x-amz-date',
                        'x-amz-security-token',
                        'x-amz-user-agent',
                        'x-amz-content-sha256',
                    ],
                    exposedHeaders: [
                        'ETag',
                        'x-amz-version-id',
                    ],
                    maxAge: 3600, // 1 hour
                },
            ],
            // Removal policy
            removalPolicy: environment === 'production'
                ? aws_cdk_lib_1.RemovalPolicy.RETAIN
                : aws_cdk_lib_1.RemovalPolicy.DESTROY,
            autoDeleteObjects: environment !== 'production',
            // Event notifications for Lambda triggers
            eventBridgeEnabled: true
        });
        // Add bucket policy for secure access (enforce HTTPS)
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
        this.bucket.node.addMetadata('Encryption', 'KMS');
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
     * Grant permissions to generate presigned URLs (spec requirement)
     */
    grantPresignedUrl(grantee) {
        // Grant specific permissions needed for presigned URL generation
        return aws_cdk_lib_1.aws_iam.Grant.addToPrincipal({
            grantee,
            actions: [
                's3:GetObject',
                's3:PutObject',
                's3:DeleteObject',
                's3:GetObjectVersion',
                's3:PutObjectAcl',
            ],
            resourceArns: [
                this.bucket.bucketArn,
                `${this.bucket.bucketArn}/*`
            ],
        });
    }
    /**
     * Add S3 event notification to trigger Lambda on file upload
     */
    addUploadNotification(lambdaFunction) {
        this.bucket.addEventNotification(aws_s3_1.EventType.OBJECT_CREATED_PUT, new aws_cdk_lib_1.aws_s3_notifications.LambdaDestination(lambdaFunction), { prefix: 'users/' } // Updated to match spec folder structure
        );
    }
    /**
     * Add S3 event notification for sample file uploads
     */
    addSampleUploadNotification(lambdaFunction) {
        this.bucket.addEventNotification(aws_s3_1.EventType.OBJECT_CREATED_PUT, new aws_cdk_lib_1.aws_s3_notifications.LambdaDestination(lambdaFunction), { prefix: 'samples/' });
    }
}
exports.FileStorageBucket = FileStorageBucket;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZmlsZS1zdG9yYWdlLWJ1Y2tldC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbImZpbGUtc3RvcmFnZS1idWNrZXQudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOztHQUVHOzs7QUFFSCwyQ0FBc0M7QUFDdEMsK0NBUzJCO0FBQzNCLDZDQU9vQjtBQVFwQixNQUFhLGlCQUFrQixTQUFRLHNCQUFTO0lBQzlCLE1BQU0sQ0FBUTtJQUU5QixZQUFZLEtBQWdCLEVBQUUsRUFBVSxFQUFFLEtBQTZCO1FBQ3JFLEtBQUssQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUE7UUFFaEIsTUFBTSxFQUFFLFdBQVcsRUFBRSxTQUFTLEVBQUUsTUFBTSxFQUFFLEdBQUcsS0FBSyxDQUFBO1FBQ2hELE1BQU0sVUFBVSxHQUFHLHdCQUF3QixXQUFXLElBQUksU0FBUyxFQUFFLENBQUE7UUFFckUsZ0ZBQWdGO1FBQ2hGLE1BQU0sY0FBYyxHQUFvQjtZQUN0QztnQkFDRSxFQUFFLEVBQUUsbUJBQW1CO2dCQUN2QixPQUFPLEVBQUUsSUFBSTtnQkFDYiwyQkFBMkIsRUFBRSxzQkFBUSxDQUFDLElBQUksQ0FBQyxFQUFFLENBQUM7YUFDL0M7WUFDRDtnQkFDRSxFQUFFLEVBQUUsZ0JBQWdCO2dCQUNwQixPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUU7b0JBQ1g7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsaUJBQWlCO3dCQUM1QyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztvQkFDRDt3QkFDRSxZQUFZLEVBQUUscUJBQVksQ0FBQyxPQUFPO3dCQUNsQyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztpQkFDRjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLGlDQUFpQztnQkFDckMsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsbUNBQW1DLEVBQUUsc0JBQVEsQ0FBQyxJQUFJ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QTtJQUNILENBQUM7Q0FDRjtBQXhMRCw4Q0F3TEMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogQVdTIENESyBpbmZyYXN0cnVjdHVyZSBkZWZpbml0aW9uIGZvciBGaWxlIFN0b3JhZ2UgUzMgQnVja2V0XHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgQ29uc3RydWN0IH0gZnJvbSAnY29uc3RydWN0cydcclxuaW1wb3J0IHsgXHJcbiAgQnVja2V0LCBcclxuICBCdWNrZXRFbmNyeXB0aW9uLCBcclxuICBCbG9ja1B1YmxpY0FjY2VzcyxcclxuICBPYmplY3RPd25lcnNoaXAsXHJcbiAgTGlmZWN5Y2xlUnVsZSxcclxuICBTdG9yYWdlQ2xhc3MsXHJcbiAgSHR0cE1ldGhvZHMsXHJcbiAgRXZlbnRUeXBlXHJcbn0gZnJvbSAnYXdzLWNkay1saWIvYXdzLXMzJ1xyXG5pbXBvcnQgeyBcclxuICBSZW1vdmFsUG9saWN5LCBcclxuICBEdXJhdGlvbiwgXHJcbiAgYXdzX2lhbSBhcyBpYW0sIFxyXG4gIGF3c19sYW1iZGEgYXMgbGFtYmRhLCBcclxuICBhd3NfczNfbm90aWZpY2F0aW9ucyBhcyBzM24sXHJcbiAgYXdzX2ttcyBhcyBrbXNcclxufSBmcm9tICdhd3MtY2RrLWxpYidcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRmlsZVN0b3JhZ2VCdWNrZXRQcm9wcyB7XHJcbiAgZW52aXJvbm1lbnQ6IHN0cmluZ1xyXG4gIGFjY291bnRJZDogc3RyaW5nXHJcbiAga21zS2V5OiBrbXMuS2V5XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBGaWxlU3RvcmFnZUJ1Y2tldCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogQnVja2V0XHJcblxyXG4gIGNvbnN0cnVjdG9yKHNjb3BlOiBDb25zdHJ1Y3QsIGlkOiBzdHJpbmcsIHByb3BzOiBGaWxlU3RvcmFnZUJ1Y2tldFByb3BzKSB7XHJcbiAgICBzdXBlcihzY29wZSwgaWQpXHJcblxyXG4gICAgY29uc3QgeyBlbnZpcm9ubWVudCwgYWNjb3VudElkLCBrbXNLZXkgfSA9IHByb3BzXHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gYG1pc3JhLXBsYXRmb3JtLWZpbGVzLSR7ZW52aXJvbm1lbnR9LSR7YWNjb3VudElkfWBcclxuXHJcbiAgICAvLyBEZWZpbmUgbGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvbiAoYWxpZ25lZCB3aXRoIHNwZWMgcmVxdWlyZW1lbnRzKVxyXG4gICAgY29uc3QgbGlmZWN5Y2xlUnVsZXM6IExpZmVjeWNsZVJ1bGVbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnRGVsZXRlT2xkVmVyc2lvbnMnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgbm9uY3VycmVudFZlcnNpb25FeHBpcmF0aW9uOiBEdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnVHJhbnNpdGlvblRvSUEnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgdHJhbnNpdGlvbnM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBTdG9yYWdlQ2xhc3MuSU5GUkVRVUVOVF9BQ0NFU1MsXHJcbiAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cygzMCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IFN0b3JhZ2VDbGFzcy5HTEFDSUVSLFxyXG4gICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoOTApLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdBYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRzJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBEdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICB9LFxyXG4gICAgXVxyXG5cclxuICAgIC8vIENyZWF0ZSB0aGUgUzMgYnVja2V0IHdpdGggc2VjdXJpdHkgYmVzdCBwcmFjdGljZXMgKGFsaWduZWQgd2l0aCBwcm9kdWN0aW9uIHN0YWNrKVxyXG4gICAgdGhpcy5idWNrZXQgPSBuZXcgQnVja2V0KHRoaXMsICdGaWxlU3RvcmFnZUJ1Y2tldCcsIHtcclxuICAgICAgYnVja2V0TmFtZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEtNUyBlbmNyeXB0aW9uIHdpdGggY3VzdG9tZXItbWFuYWdlZCBrZXlzIChzcGVjIHJlcXVpcmVtZW50KVxyXG4gICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLktNUyxcclxuICAgICAgZW5jcnlwdGlvbktleToga21zS2V5LFxyXG4gICAgICBlbmZvcmNlU1NMOiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgLy8gU2VjdXJpdHkgc2V0dGluZ3MgKHNwZWMgcmVxdWlyZW1lbnQ6IGJsb2NrIHB1YmxpYyBhY2Nlc3MpXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIG9iamVjdE93bmVyc2hpcDogT2JqZWN0T3duZXJzaGlwLkJVQ0tFVF9PV05FUl9FTkZPUkNFRCxcclxuICAgICAgXHJcbiAgICAgIC8vIFZlcnNpb25pbmcgZm9yIGRhdGEgcHJvdGVjdGlvbiAoc3BlYyByZXF1aXJlbWVudClcclxuICAgICAgdmVyc2lvbmVkOiB0cnVlLFxyXG4gICAgICBcclxuICAgICAgLy8gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvbiAoc3BlYyByZXF1aXJlbWVudClcclxuICAgICAgbGlmZWN5Y2xlUnVsZXMsXHJcbiAgICAgIFxyXG4gICAgICAvLyBDT1JTIGNvbmZpZ3VyYXRpb24gZm9yIGZyb250ZW5kIGZpbGUgdXBsb2FkcyAoc3BlYyByZXF1aXJlbWVudClcclxuICAgICAgY29yczogW1xyXG4gICAgICAgIHtcclxuICAgICAgICAgIGFsbG93ZWRNZXRob2RzOiBbXHJcbiAgICAgICAgICAgIEh0dHBNZXRob2RzLkdFVCxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuUE9TVCxcclxuICAgICAgICAgICAgSHR0cE1ldGhvZHMuUFVULFxyXG4gICAgICAgICAgICBIdHRwTWV0aG9kcy5IRUFELFxyXG4gICAgICAgICAgXSxcclxuICAgICAgICAgIGFsbG93ZWRPcmlnaW5zOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2R1Y3Rpb24nXHJcbiAgICAgICAgICAgID8gWydodHRwczovL3lvdXItcHJvZHVjdGlvbi1kb21haW4uY29tJ10gLy8gUmVwbGFjZSB3aXRoIGFjdHVhbCBwcm9kdWN0aW9uIGRvbWFpblxyXG4gICAgICAgICAgICA6IFsnaHR0cDovL2xvY2FsaG9zdDozMDAwJywgJ2h0dHA6Ly9sb2NhbGhvc3Q6NTE3MycsICdodHRwczovLyoudmVyY2VsLmFwcCddLFxyXG4gICAgICAgICAgYWxsb3dlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0F1dGhvcml6YXRpb24nLFxyXG4gICAgICAgICAgICAnQ29udGVudC1UeXBlJyxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtTGVuZ3RoJyxcclxuICAgICAgICAgICAgJ0NvbnRlbnQtTUQ1JyxcclxuICAgICAgICAgICAgJ3gtYW16LWRhdGUnLFxyXG4gICAgICAgICAgICAneC1hbXotc2VjdXJpdHktdG9rZW4nLFxyXG4gICAgICAgICAgICAneC1hbXotdXNlci1hZ2VudCcsXHJcbiAgICAgICAgICAgICd4LWFtei1jb250ZW50LXNoYTI1NicsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgZXhwb3NlZEhlYWRlcnM6IFtcclxuICAgICAgICAgICAgJ0VUYWcnLFxyXG4gICAgICAgICAgICAneC1hbXotdmVyc2lvbi1pZCcsXHJcbiAgICAgICAgICBdLFxyXG4gICAgICAgICAgbWF4QWdlOiAzNjAwLCAvLyAxIGhvdXJcclxuICAgICAgICB9LFxyXG4gICAgICBdLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kdWN0aW9uJyBcclxuICAgICAgICA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIFxyXG4gICAgICAgIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZW52aXJvbm1lbnQgIT09ICdwcm9kdWN0aW9uJyxcclxuICAgICAgXHJcbiAgICAgIC8vIEV2ZW50IG5vdGlmaWNhdGlvbnMgZm9yIExhbWJkYSB0cmlnZ2Vyc1xyXG4gICAgICBldmVudEJyaWRnZUVuYWJsZWQ6IHRydWVcclxuICAgIH0pXHJcblxyXG4gICAgLy8gQWRkIGJ1Y2tldCBwb2xpY3kgZm9yIHNlY3VyZSBhY2Nlc3MgKGVuZm9yY2UgSFRUUFMpXHJcbiAgICB0aGlzLmJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkRFTlksXHJcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQW55UHJpbmNpcGFsKCldLFxyXG4gICAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgdGhpcy5idWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICAgICAgYCR7dGhpcy5idWNrZXQuYnVja2V0QXJufS8qYFxyXG4gICAgICAgIF0sXHJcbiAgICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgICAgQm9vbDoge1xyXG4gICAgICAgICAgICAnYXdzOlNlY3VyZVRyYW5zcG9ydCc6ICdmYWxzZSdcclxuICAgICAgICAgIH1cclxuICAgICAgICB9XHJcbiAgICAgIH0pXHJcbiAgICApXHJcblxyXG4gICAgLy8gQWRkIG1ldGFkYXRhIHRhZ3NcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ1B1cnBvc2UnLCAnRmlsZSBzdG9yYWdlIGZvciBNSVNSQSBjb2RlIGFuYWx5c2lzJylcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpXHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdEYXRhQ2xhc3NpZmljYXRpb24nLCAnQ29uZmlkZW50aWFsJylcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0VuY3J5cHRpb24nLCAnS01TJylcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdyYW50IHJlYWQgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRSZWFkKGdyYW50ZWU6IGlhbS5JR3JhbnRhYmxlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCB3cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFdyaXRlKGdyYW50ZWU6IGlhbS5JR3JhbnRhYmxlKSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRXcml0ZShncmFudGVlKVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZShncmFudGVlOiBpYW0uSUdyYW50YWJsZSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZFdyaXRlKGdyYW50ZWUpXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCBwZXJtaXNzaW9ucyB0byBnZW5lcmF0ZSBwcmVzaWduZWQgVVJMcyAoc3BlYyByZXF1aXJlbWVudClcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRQcmVzaWduZWRVcmwoZ3JhbnRlZTogaWFtLklHcmFudGFibGUpIHtcclxuICAgIC8vIEdyYW50IHNwZWNpZmljIHBlcm1pc3Npb25zIG5lZWRlZCBmb3IgcHJlc2lnbmVkIFVSTCBnZW5lcmF0aW9uXHJcbiAgICByZXR1cm4gaWFtLkdyYW50LmFkZFRvUHJpbmNpcGFsKHtcclxuICAgICAgZ3JhbnRlZSxcclxuICAgICAgYWN0aW9uczogW1xyXG4gICAgICAgICdzMzpHZXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpQdXRPYmplY3QnLFxyXG4gICAgICAgICdzMzpEZWxldGVPYmplY3QnLFxyXG4gICAgICAgICdzMzpHZXRPYmplY3RWZXJzaW9uJyxcclxuICAgICAgICAnczM6UHV0T2JqZWN0QWNsJyxcclxuICAgICAgXSxcclxuICAgICAgcmVzb3VyY2VBcm5zOiBbXHJcbiAgICAgICAgdGhpcy5idWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICAgIGAke3RoaXMuYnVja2V0LmJ1Y2tldEFybn0vKmBcclxuICAgICAgXSxcclxuICAgIH0pXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgUzMgZXZlbnQgbm90aWZpY2F0aW9uIHRvIHRyaWdnZXIgTGFtYmRhIG9uIGZpbGUgdXBsb2FkXHJcbiAgICovXHJcbiAgcHVibGljIGFkZFVwbG9hZE5vdGlmaWNhdGlvbihsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uKSB7XHJcbiAgICB0aGlzLmJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcclxuICAgICAgRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVEX1BVVCxcclxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbihsYW1iZGFGdW5jdGlvbiksXHJcbiAgICAgIHsgcHJlZml4OiAndXNlcnMvJyB9IC8vIFVwZGF0ZWQgdG8gbWF0Y2ggc3BlYyBmb2xkZXIgc3RydWN0dXJlXHJcbiAgICApXHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgUzMgZXZlbnQgbm90aWZpY2F0aW9uIGZvciBzYW1wbGUgZmlsZSB1cGxvYWRzXHJcbiAgICovXHJcbiAgcHVibGljIGFkZFNhbXBsZVVwbG9hZE5vdGlmaWNhdGlvbihsYW1iZGFGdW5jdGlvbjogbGFtYmRhLkZ1bmN0aW9uKSB7XHJcbiAgICB0aGlzLmJ1Y2tldC5hZGRFdmVudE5vdGlmaWNhdGlvbihcclxuICAgICAgRXZlbnRUeXBlLk9CSkVDVF9DUkVBVEVEX1BVVCxcclxuICAgICAgbmV3IHMzbi5MYW1iZGFEZXN0aW5hdGlvbihsYW1iZGFGdW5jdGlvbiksXHJcbiAgICAgIHsgcHJlZml4OiAnc2FtcGxlcy8nIH1cclxuICAgIClcclxuICB9XHJcbn1cclxuIl19