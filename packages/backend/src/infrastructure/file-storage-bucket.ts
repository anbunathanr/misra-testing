/**
 * AWS CDK infrastructure definition for File Storage S3 Bucket
 */

import { Construct } from 'constructs'
import { 
  Bucket, 
  BucketEncryption, 
  BlockPublicAccess,
  ObjectOwnership,
  LifecycleRule,
  StorageClass,
  HttpMethods,
  EventType
} from 'aws-cdk-lib/aws-s3'
import { 
  RemovalPolicy, 
  Duration, 
  aws_iam as iam, 
  aws_lambda as lambda, 
  aws_s3_notifications as s3n,
  aws_kms as kms
} from 'aws-cdk-lib'

export interface FileStorageBucketProps {
  environment: string
  accountId: string
  kmsKey: kms.Key
}

export class FileStorageBucket extends Construct {
  public readonly bucket: Bucket

  constructor(scope: Construct, id: string, props: FileStorageBucketProps) {
    super(scope, id)

    const { environment, accountId, kmsKey } = props
    const bucketName = `misra-platform-files-${environment}-${accountId}`

    // Define lifecycle rules for cost optimization (aligned with spec requirements)
    const lifecycleRules: LifecycleRule[] = [
      {
        id: 'DeleteOldVersions',
        enabled: true,
        noncurrentVersionExpiration: Duration.days(30),
      },
      {
        id: 'TransitionToIA',
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
        id: 'AbortIncompleteMultipartUploads',
        enabled: true,
        abortIncompleteMultipartUploadAfter: Duration.days(7),
      },
    ]

    // Create the S3 bucket with security best practices (aligned with production stack)
    this.bucket = new Bucket(this, 'FileStorageBucket', {
      bucketName,
      
      // KMS encryption with customer-managed keys (spec requirement)
      encryption: BucketEncryption.KMS,
      encryptionKey: kmsKey,
      enforceSSL: true,
      
      // Security settings (spec requirement: block public access)
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      objectOwnership: ObjectOwnership.BUCKET_OWNER_ENFORCED,
      
      // Versioning for data protection (spec requirement)
      versioned: true,
      
      // Lifecycle rules for cost optimization (spec requirement)
      lifecycleRules,
      
      // CORS configuration for frontend file uploads (spec requirement)
      cors: [
        {
          allowedMethods: [
            HttpMethods.GET,
            HttpMethods.POST,
            HttpMethods.PUT,
            HttpMethods.HEAD,
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
        ? RemovalPolicy.RETAIN 
        : RemovalPolicy.DESTROY,
      autoDeleteObjects: environment !== 'production',
      
      // Event notifications for Lambda triggers
      eventBridgeEnabled: true
    })

    // Add bucket policy for secure access (enforce HTTPS)
    this.bucket.addToResourcePolicy(
      new iam.PolicyStatement({
        effect: iam.Effect.DENY,
        principals: [new iam.AnyPrincipal()],
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
      })
    )

    // Add metadata tags
    this.bucket.node.addMetadata('Purpose', 'File storage for MISRA code analysis')
    this.bucket.node.addMetadata('Environment', environment)
    this.bucket.node.addMetadata('DataClassification', 'Confidential')
    this.bucket.node.addMetadata('Encryption', 'KMS')
  }

  /**
   * Grant read permissions to a principal
   */
  public grantRead(grantee: iam.IGrantable) {
    return this.bucket.grantRead(grantee)
  }

  /**
   * Grant write permissions to a principal
   */
  public grantWrite(grantee: iam.IGrantable) {
    return this.bucket.grantWrite(grantee)
  }

  /**
   * Grant read/write permissions to a principal
   */
  public grantReadWrite(grantee: iam.IGrantable) {
    return this.bucket.grantReadWrite(grantee)
  }

  /**
   * Grant permissions to generate presigned URLs (spec requirement)
   */
  public grantPresignedUrl(grantee: iam.IGrantable) {
    // Grant specific permissions needed for presigned URL generation
    return iam.Grant.addToPrincipal({
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
    })
  }

  /**
   * Add S3 event notification to trigger Lambda on file upload
   */
  public addUploadNotification(lambdaFunction: lambda.Function) {
    this.bucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(lambdaFunction),
      { prefix: 'users/' } // Updated to match spec folder structure
    )
  }

  /**
   * Add S3 event notification for sample file uploads
   */
  public addSampleUploadNotification(lambdaFunction: lambda.Function) {
    this.bucket.addEventNotification(
      EventType.OBJECT_CREATED_PUT,
      new s3n.LambdaDestination(lambdaFunction),
      { prefix: 'samples/' }
    )
  }
}
