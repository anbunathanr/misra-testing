/**
 * AWS CDK infrastructure definition for File Processing SQS Queue
 */

import { Construct } from 'constructs'
import { Queue, QueueEncryption, DeadLetterQueue } from 'aws-cdk-lib/aws-sqs'
import { Duration, RemovalPolicy } from 'aws-cdk-lib'

export class ProcessingQueue extends Construct {
  public readonly queue: Queue
  public readonly deadLetterQueue: Queue

  constructor(scope: Construct, id: string, props?: { environment?: string }) {
    super(scope, id)

    const environment = props?.environment || 'dev'
    const queueName = `file-processing-queue-${environment}`
    const dlqName = `file-processing-dlq-${environment}`

    // Create Dead Letter Queue for failed messages
    this.deadLetterQueue = new Queue(this, 'ProcessingDeadLetterQueue', {
      queueName: dlqName,
      encryption: QueueEncryption.SQS_MANAGED,
      retentionPeriod: Duration.days(14), // Keep failed messages for 14 days
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    })

    // Create main processing queue
    this.queue = new Queue(this, 'ProcessingQueue', {
      queueName,
      
      // Encryption
      encryption: QueueEncryption.SQS_MANAGED,
      
      // Message retention
      retentionPeriod: Duration.days(4), // Keep messages for 4 days
      
      // Visibility timeout (time Lambda has to process message)
      visibilityTimeout: Duration.minutes(15), // 15 minutes for processing
      
      // Receive message wait time (long polling)
      receiveMessageWaitTime: Duration.seconds(20),
      
      // Dead letter queue configuration
      deadLetterQueue: {
        queue: this.deadLetterQueue,
        maxReceiveCount: 3, // Retry 3 times before sending to DLQ
      },
      
      // Delivery delay
      deliveryDelay: Duration.seconds(0),
      
      // Message deduplication (for FIFO queues, not used here)
      // fifo: false,
      
      // Removal policy
      removalPolicy: environment === 'prod' ? RemovalPolicy.RETAIN : RemovalPolicy.DESTROY,
    })

    // Add metadata tags
    this.queue.node.addMetadata('Purpose', 'File processing job queue')
    this.queue.node.addMetadata('Environment', environment)
    this.deadLetterQueue.node.addMetadata('Purpose', 'Failed file processing jobs')
    this.deadLetterQueue.node.addMetadata('Environment', environment)
  }

  /**
   * Grant send message permissions to a principal
   */
  public grantSendMessages(grantee: any) {
    return this.queue.grantSendMessages(grantee)
  }

  /**
   * Grant consume message permissions to a principal
   */
  public grantConsumeMessages(grantee: any) {
    return this.queue.grantConsumeMessages(grantee)
  }

  /**
   * Grant full access to the queue
   */
  public grantFullAccess(grantee: any) {
    this.queue.grantSendMessages(grantee)
    this.queue.grantConsumeMessages(grantee)
    return this.queue
  }
}
