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
        this.bucket.addToResourcePolicy({
            effect: 'Deny',
            principals: ['*'],
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
        });
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2NyZWVuc2hvdHMtYnVja2V0LmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsic2NyZWVuc2hvdHMtYnVja2V0LnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUFBLDJDQUF1QztBQUN2QywrQ0FNNEI7QUFDNUIsNkNBQXNEO0FBRXRELE1BQWEsaUJBQWtCLFNBQVEsc0JBQVM7SUFDOUIsTUFBTSxDQUFTO0lBRS9CLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBZ0M7UUFDeEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLENBQUMsQ0FBQztRQUVqQixNQUFNLFdBQVcsR0FBRyxLQUFLLEVBQUUsV0FBVyxJQUFJLEtBQUssQ0FBQztRQUNoRCxNQUFNLFVBQVUsR0FBRyw4QkFBOEIsV0FBVyxFQUFFLENBQUM7UUFFL0QsK0NBQStDO1FBQy9DLE1BQU0sY0FBYyxHQUFvQjtZQUN0QztnQkFDRSxFQUFFLEVBQUUsaUNBQWlDO2dCQUNyQyxPQUFPLEVBQUUsSUFBSTtnQkFDYixXQUFXLEVBQUU7b0JBQ1g7d0JBQ0UsWUFBWSxFQUFFLHFCQUFZLENBQUMsaUJBQWlCO3dCQUM1QyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztvQkFDRDt3QkFDRSxZQUFZLEVBQUUscUJBQVksQ0FBQyxPQUFPO3dCQUNsQyxlQUFlLEVBQUUsc0JBQVEsQ0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDO3FCQUNuQztpQkFDRjthQUNGO1lBQ0Q7Z0JBQ0UsRUFBRSxFQUFFLHdCQUF3QjtnQkFDNUIsT0FBTyxFQUFFLElBQUk7Z0JBQ2IsVUFBVSxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLEdBQUcsQ0FBQyxFQUFFLG9DQUFvQzthQUNyRTtZQUNEO2dCQUNFLEVBQUUsRUFBRSwyQkFBMkI7Z0JBQy9CLE9BQU8sRUFBRSxJQUFJO2dCQUNiLG1DQUFtQyxFQUFFLHNCQUFRLENBQUMsSUFBSSxDQUFDLENBQUMsQ0FBQzthQUN0RDtTQUNGLENBQUM7UUFFRix1Q0FBdUM7UUFDdkMsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFJLGVBQU0sQ0FBQyxJQUFJLEVBQUUsbUJBQW1CLEVBQUU7WUFDbEQsVUFBVTtZQUVWLGFBQWE7WUFDYixVQUFVLEVBQUUseUJBQWdCLENBQUMsVUFBVTtZQUN2QyxVQUFVLEVBQUUsSUFBSTtZQUVoQixpQkFBaUI7WUFDakIsaUJBQWlCLEVBQUUsMEJBQWlCLENBQUMsU0FBUztZQUU5Qyx3Q0FBd0M7WUFDeEMsY0FBYyxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLGNBQWMsQ0FBQyxDQUFDLENBQUMsU0FBUztZQUVuRSxpQkFBaUI7WUFDakIsYUFBYSxFQUFFLFdBQVcsS0FBSyxNQUFNLENBQUMsQ0FBQyxDQUFDLDJCQUFhLENBQUMsTUFBTSxDQUFDLENBQUMsQ0FBQywyQkFBYSxDQUFDLE9BQU87WUFDcEYsaUJBQWlCLEVBQUUsV0FBVyxLQUFLLE1BQU07U0FDMUMsQ0FBQyxDQUFDO1FBRUgsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxNQUFNLENBQUMsbUJBQW1CLENBQUM7WUFDOUIsTUFBTSxFQUFFLE1BQU07WUFDZCxVQUFVLEVBQUUsQ0FBQyxHQUFHLENBQUM7WUFDakIsT0FBTyxFQUFFLENBQUMsTUFBTSxDQUFDO1lBQ2pCLFNBQVMsRUFBRTtnQkFDVCxJQUFJLENBQUMsTUFBTSxDQUFDLFNBQVM7Z0JBQ3JCLEdBQUcsSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLElBQUk7YUFDN0I7WUFDRCxVQUFVLEVBQUU7Z0JBQ1YsSUFBSSxFQUFFO29CQUNKLHFCQUFxQixFQUFFLE9BQU87aUJBQy9CO2FBQ0Y7U0FDSyxDQUFDLENBQUM7UUFFVixvQkFBb0I7UUFDcEIsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLFNBQVMsRUFBRSxnREFBZ0QsQ0FBQyxDQUFDO1FBQzFGLElBQUksQ0FBQyxNQUFNLENBQUMsSUFBSSxDQUFDLFdBQVcsQ0FBQyxhQUFhLEVBQUUsV0FBVyxDQUFDLENBQUM7UUFDekQsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsV0FBVyxDQUFDLG9CQUFvQixFQUFFLFVBQVUsQ0FBQyxDQUFDO0lBQ2pFLENBQUM7SUFFRDs7T0FFRztJQUNJLFNBQVMsQ0FBQyxPQUFZO1FBQzNCLE9BQU8sSUFBSSxDQUFDLE1BQU0sQ0FBQyxTQUFTLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDeEMsQ0FBQztJQUVEOztPQUVHO0lBQ0ksVUFBVSxDQUFDLE9BQVk7UUFDNUIsT0FBTyxJQUFJLENBQUMsTUFBTSxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsQ0FBQztJQUN6QyxDQUFDO0lBRUQ7O09BRUc7SUFDSSxjQUFjLENBQUMsT0FBWTtRQUNoQyxPQUFPLElBQUksQ0FBQyxNQUFNLENBQUMsY0FBYyxDQUFDLE9BQU8sQ0FBQyxDQUFDO0lBQzdDLENBQUM7Q0FDRjtBQWxHRCw4Q0FrR0MiLCJzb3VyY2VzQ29udGVudCI6WyJpbXBvcnQgeyBDb25zdHJ1Y3QgfSBmcm9tICdjb25zdHJ1Y3RzJztcclxuaW1wb3J0IHsgXHJcbiAgQnVja2V0LCBcclxuICBCdWNrZXRFbmNyeXB0aW9uLCBcclxuICBCbG9ja1B1YmxpY0FjY2VzcyxcclxuICBMaWZlY3ljbGVSdWxlLFxyXG4gIFN0b3JhZ2VDbGFzcyxcclxufSBmcm9tICdhd3MtY2RrLWxpYi9hd3MtczMnO1xyXG5pbXBvcnQgeyBSZW1vdmFsUG9saWN5LCBEdXJhdGlvbiB9IGZyb20gJ2F3cy1jZGstbGliJztcclxuXHJcbmV4cG9ydCBjbGFzcyBTY3JlZW5zaG90c0J1Y2tldCBleHRlbmRzIENvbnN0cnVjdCB7XHJcbiAgcHVibGljIHJlYWRvbmx5IGJ1Y2tldDogQnVja2V0O1xyXG5cclxuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IHsgZW52aXJvbm1lbnQ/OiBzdHJpbmcgfSkge1xyXG4gICAgc3VwZXIoc2NvcGUsIGlkKTtcclxuXHJcbiAgICBjb25zdCBlbnZpcm9ubWVudCA9IHByb3BzPy5lbnZpcm9ubWVudCB8fCAnZGV2JztcclxuICAgIGNvbnN0IGJ1Y2tldE5hbWUgPSBgbWlzcmEtcGxhdGZvcm0tc2NyZWVuc2hvdHMtJHtlbnZpcm9ubWVudH1gO1xyXG5cclxuICAgIC8vIERlZmluZSBsaWZlY3ljbGUgcnVsZXMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICBjb25zdCBsaWZlY3ljbGVSdWxlczogTGlmZWN5Y2xlUnVsZVtdID0gW1xyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICd0cmFuc2l0aW9uLXRvLWluZnJlcXVlbnQtYWNjZXNzJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIHRyYW5zaXRpb25zOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHN0b3JhZ2VDbGFzczogU3RvcmFnZUNsYXNzLklORlJFUVVFTlRfQUNDRVNTLFxyXG4gICAgICAgICAgICB0cmFuc2l0aW9uQWZ0ZXI6IER1cmF0aW9uLmRheXMoMzApLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgc3RvcmFnZUNsYXNzOiBTdG9yYWdlQ2xhc3MuR0xBQ0lFUixcclxuICAgICAgICAgICAgdHJhbnNpdGlvbkFmdGVyOiBEdXJhdGlvbi5kYXlzKDkwKSxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGlkOiAnZGVsZXRlLW9sZC1zY3JlZW5zaG90cycsXHJcbiAgICAgICAgZW5hYmxlZDogdHJ1ZSxcclxuICAgICAgICBleHBpcmF0aW9uOiBEdXJhdGlvbi5kYXlzKDE4MCksIC8vIERlbGV0ZSBzY3JlZW5zaG90cyBhZnRlciA2IG1vbnRoc1xyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgaWQ6ICdkZWxldGUtaW5jb21wbGV0ZS11cGxvYWRzJyxcclxuICAgICAgICBlbmFibGVkOiB0cnVlLFxyXG4gICAgICAgIGFib3J0SW5jb21wbGV0ZU11bHRpcGFydFVwbG9hZEFmdGVyOiBEdXJhdGlvbi5kYXlzKDcpLFxyXG4gICAgICB9LFxyXG4gICAgXTtcclxuXHJcbiAgICAvLyBDcmVhdGUgdGhlIFMzIGJ1Y2tldCBmb3Igc2NyZWVuc2hvdHNcclxuICAgIHRoaXMuYnVja2V0ID0gbmV3IEJ1Y2tldCh0aGlzLCAnU2NyZWVuc2hvdHNCdWNrZXQnLCB7XHJcbiAgICAgIGJ1Y2tldE5hbWUsXHJcbiAgICAgIFxyXG4gICAgICAvLyBFbmNyeXB0aW9uXHJcbiAgICAgIGVuY3J5cHRpb246IEJ1Y2tldEVuY3J5cHRpb24uUzNfTUFOQUdFRCxcclxuICAgICAgZW5mb3JjZVNTTDogdHJ1ZSxcclxuICAgICAgXHJcbiAgICAgIC8vIEFjY2VzcyBDb250cm9sXHJcbiAgICAgIGJsb2NrUHVibGljQWNjZXNzOiBCbG9ja1B1YmxpY0FjY2Vzcy5CTE9DS19BTEwsXHJcbiAgICAgIFxyXG4gICAgICAvLyBMaWZlY3ljbGUgcnVsZXMgZm9yIGNvc3Qgb3B0aW1pemF0aW9uXHJcbiAgICAgIGxpZmVjeWNsZVJ1bGVzOiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gbGlmZWN5Y2xlUnVsZXMgOiB1bmRlZmluZWQsXHJcbiAgICAgIFxyXG4gICAgICAvLyBSZW1vdmFsIHBvbGljeVxyXG4gICAgICByZW1vdmFsUG9saWN5OiBlbnZpcm9ubWVudCA9PT0gJ3Byb2QnID8gUmVtb3ZhbFBvbGljeS5SRVRBSU4gOiBSZW1vdmFsUG9saWN5LkRFU1RST1ksXHJcbiAgICAgIGF1dG9EZWxldGVPYmplY3RzOiBlbnZpcm9ubWVudCAhPT0gJ3Byb2QnLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gQWRkIGJ1Y2tldCBwb2xpY3kgZm9yIHNlY3VyZSBhY2Nlc3NcclxuICAgIHRoaXMuYnVja2V0LmFkZFRvUmVzb3VyY2VQb2xpY3koe1xyXG4gICAgICBlZmZlY3Q6ICdEZW55JyxcclxuICAgICAgcHJpbmNpcGFsczogWycqJ10sXHJcbiAgICAgIGFjdGlvbnM6IFsnczM6KiddLFxyXG4gICAgICByZXNvdXJjZXM6IFtcclxuICAgICAgICB0aGlzLmJ1Y2tldC5idWNrZXRBcm4sXHJcbiAgICAgICAgYCR7dGhpcy5idWNrZXQuYnVja2V0QXJufS8qYCxcclxuICAgICAgXSxcclxuICAgICAgY29uZGl0aW9uczoge1xyXG4gICAgICAgIEJvb2w6IHtcclxuICAgICAgICAgICdhd3M6U2VjdXJlVHJhbnNwb3J0JzogJ2ZhbHNlJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgfSBhcyBhbnkpO1xyXG5cclxuICAgIC8vIEFkZCBtZXRhZGF0YSB0YWdzXHJcbiAgICB0aGlzLmJ1Y2tldC5ub2RlLmFkZE1ldGFkYXRhKCdQdXJwb3NlJywgJ1NjcmVlbnNob3Qgc3RvcmFnZSBmb3IgdGVzdCBleGVjdXRpb24gZmFpbHVyZXMnKTtcclxuICAgIHRoaXMuYnVja2V0Lm5vZGUuYWRkTWV0YWRhdGEoJ0Vudmlyb25tZW50JywgZW52aXJvbm1lbnQpO1xyXG4gICAgdGhpcy5idWNrZXQubm9kZS5hZGRNZXRhZGF0YSgnRGF0YUNsYXNzaWZpY2F0aW9uJywgJ0ludGVybmFsJyk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCByZWFkIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50UmVhZChncmFudGVlOiBhbnkpIHtcclxuICAgIHJldHVybiB0aGlzLmJ1Y2tldC5ncmFudFJlYWQoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCB3cml0ZSBwZXJtaXNzaW9ucyB0byBhIHByaW5jaXBhbFxyXG4gICAqL1xyXG4gIHB1YmxpYyBncmFudFdyaXRlKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50V3JpdGUoZ3JhbnRlZSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHcmFudCByZWFkL3dyaXRlIHBlcm1pc3Npb25zIHRvIGEgcHJpbmNpcGFsXHJcbiAgICovXHJcbiAgcHVibGljIGdyYW50UmVhZFdyaXRlKGdyYW50ZWU6IGFueSkge1xyXG4gICAgcmV0dXJuIHRoaXMuYnVja2V0LmdyYW50UmVhZFdyaXRlKGdyYW50ZWUpO1xyXG4gIH1cclxufVxyXG4iXX0=