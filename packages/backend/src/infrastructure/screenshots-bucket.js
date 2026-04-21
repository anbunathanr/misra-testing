"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ScreenshotsBucket = void 0;
const constructs_1 = require("constructs");
const aws_s3_1 = require("aws-cdk-lib/aws-s3");
const aws_cdk_lib_1 = require("aws-cdk-lib");
class ScreenshotsBucket extends constructs_1.Construct {
    bucket;
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdHMtYnVja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NyZWVuc2hvdHMtYnVja2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUF1QztBQUN2QywrQ0FNNEI7QUFDNUIsNkNBQXNFO0FBRXRFLE1BQWEsaUJBQWtCLFNBQVEsc0JBQVM7SUFDOUIsTUFBTSxDQUFTO0lBRS9CLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUNoRCxNQUFNLFVBQVUsR0FBRyw4QkFBOEIsV0FBVyxFQUFFLENBQUM7UUFFL0QsK0NBQStDO1FBQy9DLE1BQU0sY0FBYyxHQUFvQjtZQUN0QztnQkFDRSxFQUFFLEVBQUUsaUNBQWlDO2dCQUNyQyxPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUU7b0JBQ1g7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsaUJBQWlCO3dCQUM1QyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztvQkFDRDt3QkFDRSxZQUFZLEVBQUUscUJBQVksQ0FBQyxPQUFPO3dCQUNsQyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztpQkFDRjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLHdCQUF3QjtnQkFDNUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsVUFBVSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLG9DQUFvQzthQUNyRTtZQUNEO2dCQUNFLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1DQUFtQyxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RDtTQUNGLENBQUM7UUFFRix1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDbEQsVUFBVTtZQUVWLGFBQWE7WUFDYixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtZQUN2QyxVQUFVLEVBQUUsSUFBSTtZQUVoQixpQkFBaUI7WUFDakIsaUJBQWlCLEVBQUUsMEJBQWlCLENBQUMsU0FBUztZQUU5Qyx3Q0FBd0M7WUFDeEMsY0FBYyxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUVuRSxpQkFBaUI7WUFDakIsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87WUFDcEYsaUJBQWlCLEVBQUUsV0FBVyxLQUFLLE1BQU07U0FDMUMsQ0FBQyxDQUFDO1FBRUgsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQzdCLElBQUkscUJBQUcsQ0FBQyxlQUFlLENBQUM7WUFDdEIsTUFBTSxFQUFFLHFCQUFHLENBQUMsTUFBTSxDQUFDLElBQUk7WUFDdkIsVUFBVSxFQUFFLENBQUMsSUFBSSxxQkFBRyxDQUFDLFlBQVksRUFBRSxDQUFDO1lBQ3BDLE9BQU8sRUFBRSxDQUFDLE1BQU0sQ0FBQztZQUNqQixTQUFTLEVBQUU7Z0JBQ1QsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTO2dCQUNyQixHQUFHLElBQUksQ0FBQyxNQUFNLENBQUMsU0FBUyxJQUFJO2FBQzdCO1lBQ0QsVUFBVSxFQUFFO2dCQUNWLElBQUksRUFBRTtvQkFDSixxQkFBcUIsRUFBRSxPQUFPO2lCQUMvQjthQUNGO1NBQ0YsQ0FBQyxDQUNILENBQUM7UUFFRixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxnREFBZ0QsQ0FBQyxDQUFDO1FBQzFGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxPQUFZO1FBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksVUFBVSxDQUFDLE9BQVk7UUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsT0FBWTtRQUNoQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDRjtBQXBHRCw4Q0FvR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgXHJcbiAgQnVja2V0LCBcclxuICBCdWNrZXRFbmNyeXB0aW9uLCBcclxuICBCbG9ja1B1YmxpY0FjY2VzcyxcclxuICBMaWZlY3ljbGVSdWxlLFxyXG4gIFN0b3JhZ2VDbGFzcyxcclxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5LCBEdXJhdGlvbiwgYXdzX2lhbSBhcyBpYW0gfSBmcm9tICdhd3MtY2RrLWxpYic7XHJcblxyXG5leHBvcnQgY2xhc3MgU2NyZWVuc2hvdHNCdWNrZXQgZXh0ZW5kcyBDb25zdHJ1Y3Qge1xyXG4gIHB1YmxpYyByZWFkb25seSBidWNrZXQ6IEJ1Y2tldDtcclxuXHJcbiAgY29uc3RydWN0b3Ioc2NvcGU6IENvbnN0cnVjdCwgaWQ6IHN0cmluZywgcHJvcHM/OiB7IGVudmlyb25tZW50Pzogc3RyaW5nIH0pIHtcclxuICAgIHN1cGVyKHNjb3BlLCBpZCk7XHJcblxyXG4gICAgY29uc3QgZW52aXJvbm1lbnQgPSBwcm9wcz8uZW52aXJvbm1lbnQgfHwgJ2Rldic7XHJcbiAgICBjb25zdCBidWNrZXROYW1lID0gYG1pc3JhLXBsYXRmb3JtLXNjcmVlbnNob3RzLSR7ZW52aXJvbm1lbnR9YDtcclxuXHJcbiAgICAvLyBEZWZpbmUgbGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgY29uc3QgbGlmZWN5Y2xlUnVsZXM6IExpZmVjeWNsZVJ1bGVbXSA9IFtcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAndHJhbnNpdGlvbi10by1pbmZyZXF1ZW50LWFjY2VzcycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICB0cmFuc2l0aW9uczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICBzdG9yYWdlQ2xhc3M6IFN0b3JhZ2VDbGFzcy5JTkZSRVFVRU5UX0FDQ0VTUyxcclxuICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDMwKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogU3RvcmFnZUNsYXNzLkdMQUNJRVIsXHJcbiAgICAgICAgICAgIHRyYW5zaXRpb25BZnRlcjogRHVyYXRpb24uZGF5cyg5MCksXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICBpZDogJ2RlbGV0ZS1vbGQtc2NyZWVuc2hvdHMnLFxyXG4gICAgICAgIGVuYWJsZWQ6IHRydWUsXHJcbiAgICAgICAgZXhwaXJhdGlvbjogRHVyYXRpb24uZGF5cygxODApLCAvLyBEZWxldGUgc2NyZWVuc2hvdHMgYWZ0ZXIgNiBtb250aHNcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnZGVsZXRlLWluY29tcGxldGUtdXBsb2FkcycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBhYm9ydEluY29tcGxldGVNdWx0aXBhcnRVcGxvYWRBZnRlcjogRHVyYXRpb24uZGF5cyg3KSxcclxuICAgICAgfSxcclxuICAgIF07XHJcblxyXG4gICAgLy8gQ3JlYXRlIHRoZSBTMyBidWNrZXQgZm9yIHNjcmVlbnNob3RzXHJcbiAgICB0aGlzLmJ1Y2tldCA9IG5ldyBCdWNrZXQodGhpcywgJ1NjcmVlbnNob3RzQnVja2V0Jywge1xyXG4gICAgICBidWNrZXROYW1lLFxyXG4gICAgICBcclxuICAgICAgLy8gRW5jcnlwdGlvblxyXG4gICAgICBlbmNyeXB0aW9uOiBCdWNrZXRFbmNyeXB0aW9uLlMzX01BTkFHRUQsXHJcbiAgICAgIGVuZm9yY2VTU0w6IHRydWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBBY2Nlc3MgQ29udHJvbFxyXG4gICAgICBibG9ja1B1YmxpY0FjY2VzczogQmxvY2tQdWJsaWNBY2Nlc3MuQkxPQ0tfQUxMLFxyXG4gICAgICBcclxuICAgICAgLy8gTGlmZWN5Y2xlIHJ1bGVzIGZvciBjb3N0IG9wdGltaXphdGlvblxyXG4gICAgICBsaWZlY3ljbGVSdWxlczogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IGxpZmVjeWNsZVJ1bGVzIDogdW5kZWZpbmVkLFxyXG4gICAgICBcclxuICAgICAgLy8gUmVtb3ZhbCBwb2xpY3lcclxuICAgICAgcmVtb3ZhbFBvbGljeTogZW52aXJvbm1lbnQgPT09ICdwcm9kJyA/IFJlbW92YWxQb2xpY3kuUkVUQUlOIDogUmVtb3ZhbFBvbGljeS5ERVNUUk9ZLFxyXG4gICAgICBhdXRvRGVsZXRlT2JqZWN0czogZW52aXJvbm1lbnQgIT09ICdwcm9kJyxcclxuICAgIH0pO1xyXG5cclxuICAgIC8vIEFkZCBidWNrZXQgcG9saWN5IGZvciBzZWN1cmUgYWNjZXNzXHJcbiAgICB0aGlzLmJ1Y2tldC5hZGRUb1Jlc291cmNlUG9saWN5KFxyXG4gICAgICBuZXcgaWFtLlBvbGljeVN0YXRlbWVudCh7XHJcbiAgICAgICAgZWZmZWN0OiBpYW0uRWZmZWN0LkRFTlksXHJcbiAgICAgICAgcHJpbmNpcGFsczogW25ldyBpYW0uQW55UHJpbmNpcGFsKCldLFxyXG4gICAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxyXG4gICAgICAgIHJlc291cmNlczogW1xyXG4gICAgICAgICAgdGhpcy5idWNrZXQuYnVja2V0QXJuLFxyXG4gICAgICAgICAgYCR7dGhpcy5idWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgICBdLFxyXG4gICAgICAgIGNvbmRpdGlvbnM6IHtcclxuICAgICAgICAgIEJvb2w6IHtcclxuICAgICAgICAgICAgJ2F3czpTZWN1cmVUcmFuc3BvcnQnOiAnZmFsc2UnLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICB9LFxyXG4gICAgICB9KVxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBBZGQgbWV0YWRhdGEgdGFnc1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnUHVycG9zZScsICdTY3JlZW5zaG90IHN0b3JhZ2UgZm9yIHRlc3QgZXhlY3V0aW9uIGZhaWx1cmVzJyk7XHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdFbnZpcm9ubWVudCcsIGVudmlyb25tZW50KTtcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0RhdGFDbGFzc2lmaWNhdGlvbicsICdJbnRlcm5hbCcpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZCBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWQoZ3JhbnRlZTogYW55KSB7XHJcbiAgICByZXR1cm4gdGhpcy5idWNrZXQuZ3JhbnRSZWFkKGdyYW50ZWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgd3JpdGUgcGVybWlzc2lvbnMgdG8gYSBwcmluY2lwYWxcclxuICAgKi9cclxuICBwdWJsaWMgZ3JhbnRXcml0ZShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFdyaXRlKGdyYW50ZWUpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR3JhbnQgcmVhZC93cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFJlYWRXcml0ZShncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFJlYWRXcml0ZShncmFudGVlKTtcclxuICB9XHJcbn1cclxuIl19