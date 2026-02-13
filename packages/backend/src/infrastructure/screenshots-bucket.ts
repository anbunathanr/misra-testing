import { Construct } from 'constructs';
import { 
  Bucket, 
  BucketEncryption, 
  BlockPublicAccess,
  LifecycleRule,
  StorageClass,
} from 'aws-cdk-lib/aws-s3';
import { RemovalPolicy, Duration } from 'aws-cdk-lib';

export class ScreenshotsBucket extends Construct {
  public readonly bucket: Bucket;

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id);

    const environment = props?.environment || 'dev';
    const bucketName = `misra-platform-screenshots-${environment}`;

    // Define lifecycle rules for cost optimization
    const lifecycleRules: LifecycleRule[] = [
      {
        id: 'transition-to-infrequent-access',
        enabled: true,
        transitions: [
          {
            storageClass: StorageClass.INFREQUENT_ACCESS,
            transitionAfter: Duration.days(30),
          },
          {
            storageClass: StorageClass.GLACIER,
            transitionAfter: Duration.days(90),
          },
        ],
      },
      {
        id: 'delete-old-screenshots',
        enabled: true,
        expiration: Duration.days(180), // Delete screenshots after 6 months
      },
      {
        id: 'delete-incomplete-uploads',
        enabled: true,
        abortIncompleteMultipartUploadAfter: Duration.days(7),
      },
    ];

    // Create the S3 bucket for screenshots
    this.bucket = new Bucket(this, 'ScreenshotsBucket', {
      bucketName,
      
      // Encryption
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      
      // Access Control
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      
      // Lifecycle rules for cost optimization
      lifecycleRules: environment === 'prod' ? lifecycleRules : undefined,
      
      // Removal policy
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
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
    } as any);

    // Add metadata tags
    this.bucket.node.addMetadata('Purpose', 'Screenshot storage for test execution failures');
    this.bucket.node.addMetadata('Environment', environment);
    this.bucket.node.addMetadata('DataClassification', 'Internal');
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: any) {
    return this.bucket.grantRead(grantee);
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: any) {
    return this.bucket.grantWrite(grantee);
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: any) {
    return this.bucket.grantReadWrite(grantee);
  }
}
