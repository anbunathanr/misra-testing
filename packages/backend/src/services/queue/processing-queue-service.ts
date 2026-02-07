/**
 * Processing Queue Service
 * Manages SQS queue operations for file processing jobs
 */

import { SQSClient, SendMessageCommand, SendMessageBatchCommand, ReceiveMessageCommand, DeleteMessageCommand } from '@aws-sdk/client-sqs'

export interface ProcessingJob {
  jobId: string
  fileId: string
  fileName: string
  fileSize: number
  s3Key: string
  userId: string
  organizationId: string
  jobType: 'misra-analysis' | 'regression-test' | 'both'
  priority: 'high' | 'normal' | 'low'
  metadata?: Record<string, any>
  createdAt: number
}

export interface QueueMessage {
  messageId: string
  receiptHandle: string
  body: ProcessingJob
  attributes?: Record<string, string>
}

export class ProcessingQueueService {
  private sqsClient: SQSClient
  private queueUrl: string

  constructor() {
    this.sqsClient = new SQSClient({
      region: process.env.AWS_REGION || 'us-east-1',
    })
    this.queueUrl = process.env.PROCESSING_QUEUE_URL || ''

    if (!this.queueUrl) {
      console.warn('PROCESSING_QUEUE_URL not configured')
    }
  }

  /**
   * Send a processing job to the queue
   */
  async sendJob(job: ProcessingJob): Promise<string> {
    try {
      const command = new SendMessageCommand({
        QueueUrl: this.queueUrl,
        MessageBody: JSON.stringify(job),
        MessageAttributes: {
          jobType: {
            DataType: 'String',
            StringValue: job.jobType,
          },
          priority: {
            DataType: 'String',
            StringValue: job.priority,
          },
          userId: {
            DataType: 'String',
            StringValue: job.userId,
          },
          organizationId: {
            DataType: 'String',
            StringValue: job.organizationId,
          },
        },
        // Delay delivery for low priority jobs
        DelaySeconds: job.priority === 'low' ? 30 : 0,
      })

      const response = await this.sqsClient.send(command)
      return response.MessageId || ''
    } catch (error) {
      console.error('Error sending job to queue:', error)
      throw new Error('Failed to queue processing job')
    }
  }

  /**
   * Send multiple jobs in batch (up to 10 at a time)
   */
  async sendJobBatch(jobs: ProcessingJob[]): Promise<string[]> {
    if (jobs.length === 0) {
      return []
    }

    if (jobs.length > 10) {
      throw new Error('Batch size cannot exceed 10 messages')
    }

    try {
      const entries = jobs.map((job, index) => ({
        Id: `${index}`,
        MessageBody: JSON.stringify(job),
        MessageAttributes: {
          jobType: {
            DataType: 'String',
            StringValue: job.jobType,
          },
          priority: {
            DataType: 'String',
            StringValue: job.priority,
          },
          userId: {
            DataType: 'String',
            StringValue: job.userId,
          },
          organizationId: {
            DataType: 'String',
            StringValue: job.organizationId,
          },
        },
        DelaySeconds: job.priority === 'low' ? 30 : 0,
      }))

      const command = new SendMessageBatchCommand({
        QueueUrl: this.queueUrl,
        Entries: entries,
      })

      const response = await this.sqsClient.send(command)
      return response.Successful?.map(s => s.MessageId || '') || []
    } catch (error) {
      console.error('Error sending batch jobs to queue:', error)
      throw new Error('Failed to queue batch processing jobs')
    }
  }

  /**
   * Receive messages from the queue
   */
  async receiveJobs(maxMessages: number = 1): Promise<QueueMessage[]> {
    try {
      const command = new ReceiveMessageCommand({
        QueueUrl: this.queueUrl,
        MaxNumberOfMessages: Math.min(maxMessages, 10), // SQS max is 10
        WaitTimeSeconds: 20, // Long polling
        MessageAttributeNames: ['All'],
        AttributeNames: ['All'],
      })

      const response = await this.sqsClient.send(command)
      
      if (!response.Messages || response.Messages.length === 0) {
        return []
      }

      return response.Messages.map(msg => ({
        messageId: msg.MessageId || '',
        receiptHandle: msg.ReceiptHandle || '',
        body: JSON.parse(msg.Body || '{}') as ProcessingJob,
        attributes: msg.Attributes,
      }))
    } catch (error) {
      console.error('Error receiving jobs from queue:', error)
      throw new Error('Failed to receive processing jobs')
    }
  }

  /**
   * Delete a message from the queue after successful processing
   */
  async deleteJob(receiptHandle: string): Promise<void> {
    try {
      const command = new DeleteMessageCommand({
        QueueUrl: this.queueUrl,
        ReceiptHandle: receiptHandle,
      })

      await this.sqsClient.send(command)
    } catch (error) {
      console.error('Error deleting job from queue:', error)
      throw new Error('Failed to delete processing job')
    }
  }

  /**
   * Create a processing job from file upload
   */
  createJobFromUpload(
    fileId: string,
    fileName: string,
    fileSize: number,
    s3Key: string,
    userId: string,
    organizationId: string,
    jobType: ProcessingJob['jobType'] = 'misra-analysis',
    priority: ProcessingJob['priority'] = 'normal'
  ): ProcessingJob {
    return {
      jobId: `job-${Date.now()}-${Math.random().toString(36).substring(7)}`,
      fileId,
      fileName,
      fileSize,
      s3Key,
      userId,
      organizationId,
      jobType,
      priority,
      createdAt: Date.now(),
    }
  }

  /**
   * Get queue URL
   */
  getQueueUrl(): string {
    return this.queueUrl
  }

  /**
   * Check if queue is configured
   */
  isConfigured(): boolean {
    return !!this.queueUrl
  }
}
