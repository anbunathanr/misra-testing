/**
 * AWS CDK infrastructure definition for File Storage S3 Bucket
 */

import { Construct } from 'constructs'
import { 
  Bucket, 
  BucketEncryption, 
  BlockPublicAccess,
  BucketAccessControl,
  ObjectOwnership,
  LifecycleRule,
  StorageClass,
  Transition
} from 'aws-cdk-lib/aws-s3'
import { RemovalPolicy, Duration } from 'aws-cdk-lib'

export class FileStorageBucket extends Construct {
  public readonly bucket: Bucket

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id)

    const environment = props?.environment || 'dev'
    const bucketName = `misra-platform-files-${environment}`

    // Define lifecycle rules for cost optimization
    const lifecycleRules: LifecycleRule[] = [
      {
        id: 'transition-to-infrequent-access',
        enabled: true,
        transitions: [
          {
            storageClass: StorageClass.INFREQUENT_ACCESS,
            transitionAfter: Duration.days(30)
          },
          {
            storageClass: StorageClass.GLACIER,
            transitionAfter: Duration.days(90)
          }
        ]
      },
      {
        id: 'delete-incomplete-uploads',
        enabled: true,
        abortIncompleteMultipartUploadAfter: Duration.days(7)
      },
      {
        id: 'expire-old-versions',
        enabled: true,
        noncurrentVersionExpiration: Duration.days(30)
      }
    ]

    // Create the S3 bucket with security best practices
    this.bucket = new Bucket(this, 'FileStorageBucket', {
      bucketName,
      
      // Encryption
      encryption: BucketEncryption.S3_MANAGED,
      enforceSSL: true,
      
      // Access Control
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      
      // Versioning for data protection
      versioned: environment === 'prod',
      
      // Lifecycle rules for cost optimization
      lifecycleRules: environment === 'prod' ? lifecycleRules : undefined,
      
      // CORS configuration for web uploads
      cors: [
        {
          allowedMethods: [
            'GET',
            'PUT',
            'POST',
            'DELETE',
            'HEAD'
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
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'prod',
      
      // Event notifications (for triggering Lambda on upload)
      eventBridgeEnabled: true
    })

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
    } as any)

    // Add metadata tags
    this.bucket.node.addMetadata('Purpose', 'File storage for MISRA code analysis')
    this.bucket.node.addMetadata('Environment', environment)
    this.bucket.node.addMetadata('DataClassification', 'Confidential')
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: any) {
    return this.bucket.grantRead(grantee)
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: any) {
    return this.bucket.grantWrite(grantee)
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: any) {
    return this.bucket.grantReadWrite(grantee)
  }

  /**
   * Grant permissions to generate presigned URLs
   */
  public grantPresignedUrl(grantee: any) {
    return this.bucket.grantReadWrite(grantee)
  }
}
