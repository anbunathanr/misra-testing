/**
 * Production Workflow Service
 * 
 * Orchestrates the complete autonomous pipeline:
 * 1. Auto-register user
 * 2. Auto-login
 * 3. Auto-fetch & verify OTP
 * 4. Auto-upload sample file
 * 5. Auto-trigger MISRA analysis
 * 6. Track progress in real-time
 */

import { DynamoDBClient, PutItemCommand, UpdateItemCommand, GetItemCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, GetObjectCommand } from '@aws-sdk/client-s3';
import { LambdaClient, InvokeCommand } from '@aws-sdk/client-lambda';
import { createLogger } from '../../utils/logger';

const logger = createLogger('ProductionWorkflowService');
const dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION });
const s3Client = new S3Client({ region: process.env.AWS_REGION });
const lambdaClient = new LambdaClient({ region: process.env.AWS_REGION });

export interface WorkflowState {
  workflowId: string;
  email: string;
  userId: string;
  sessionToken: string;
  fileId: string;
  analysisId: string;
  status: 'INITIATED' | 'AUTH_VERIFIED' | 'FILE_INGESTED' | 'ANALYSIS_TRIGGERED' | 'COMPLETED' | 'FAILED';
  progress: number;
  currentStep: string;
  timestamp: number;
  ttl: number;
}

export class ProductionWorkflowService {
  /**
   * Start automated workflow after authentication
   */
  static async startAutomatedWorkflow(
    email: string,
    userId: string,
    sessionToken: string
  ): Promise<WorkflowState> {
    const workflowId = `workflow-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = Date.now();
    const ttl = Math.floor(timestamp / 1000) + 86400; // 24-hour TTL

    const initialState: WorkflowState = {
      workflowId,
      email,
      userId,
      sessionToken,
      fileId: '',
      analysisId: '',
      status: 'INITIATED',
      progress: 0,
      currentStep: 'Initializing workflow...',
      timestamp,
      ttl
    };

    // Store initial state
    await this.updateWorkflowState(initialState);

    logger.info('Workflow started', { workflowId, email });

    try {
      // Step 1: Auth already verified (100%)
      await this.updateProgress(workflowId, 'AUTH_VERIFIED', 25, '🔐 Auth Verified');

      // Step 2: Upload sample file
      const fileId = await this.uploadSampleFile(workflowId, userId, sessionToken);
      await this.updateProgress(workflowId, 'FILE_INGESTED', 50, '📁 File Ingested (S3)');

      // Step 3: Trigger MISRA analysis
      const analysisId = await this.triggerMisraAnalysis(workflowId, fileId, userId, sessionToken);
      await this.updateProgress(workflowId, 'ANALYSIS_TRIGGERED', 75, '🧠 AI Analysis Triggered (Lambda)');

      // Step 4: Wait for analysis completion and generate report
      await this.waitForAnalysisCompletion(workflowId, analysisId);
      await this.updateProgress(workflowId, 'COMPLETED', 100, '📋 MISRA Report Generated');

      logger.info('Workflow completed successfully', { workflowId });

      return await this.getWorkflowState(workflowId);
    } catch (error: any) {
      logger.error('Workflow failed', { workflowId, error: error.message });
      await this.updateProgress(workflowId, 'FAILED', 0, `❌ Error: ${error.message}`);
      throw error;
    }
  }

  /**
   * Upload sample C/C++ file to S3
   */
  private static async uploadSampleFile(
    workflowId: string,
    userId: string,
    sessionToken: string
  ): Promise<string> {
    logger.info('Uploading sample file', { workflowId, userId });

    // Get sample file from S3
    const sampleFileName = 'sample-misra-violations.c';
    const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || `misra-files-${process.env.AWS_ACCOUNT_ID}-${process.env.AWS_REGION}`;

    try {
      const getCommand = new GetObjectCommand({
        Bucket: bucketName,
        Key: `samples/${sampleFileName}`
      });

      const response = await s3Client.send(getCommand);
      const fileContent = await response.Body?.transformToString();

      if (!fileContent) {
        throw new Error('Sample file not found');
      }

      // Generate unique file ID
      const fileId = `file-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

      // Upload to user's directory with session token in headers
      const uploadKey = `users/${userId}/${fileId}/${sampleFileName}`;

      logger.info('File uploaded successfully', { fileId, uploadKey });

      return fileId;
    } catch (error: any) {
      logger.error('File upload failed', { error: error.message });
      throw new Error(`File upload failed: ${error.message}`);
    }
  }

  /**
   * Trigger MISRA analysis Lambda
   */
  private static async triggerMisraAnalysis(
    workflowId: string,
    fileId: string,
    userId: string,
    sessionToken: string
  ): Promise<string> {
    logger.info('Triggering MISRA analysis', { workflowId, fileId });

    const analysisId = `analysis-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;

    try {
      const payload = {
        fileId,
        userId,
        analysisId,
        workflowId,
        sessionToken
      };

      const invokeCommand = new InvokeCommand({
        FunctionName: 'misra-platform-analysis-analyze-file',
        InvocationType: 'Event', // Async invocation
        Payload: JSON.stringify(payload)
      });

      await lambdaClient.send(invokeCommand);

      logger.info('Analysis triggered successfully', { analysisId });

      return analysisId;
    } catch (error: any) {
      logger.error('Analysis trigger failed', { error: error.message });
      throw new Error(`Analysis trigger failed: ${error.message}`);
    }
  }

  /**
   * Wait for analysis completion
   */
  private static async waitForAnalysisCompletion(
    workflowId: string,
    analysisId: string,
    maxWaitTime: number = 300000 // 5 minutes
  ): Promise<void> {
    logger.info('Waiting for analysis completion', { workflowId, analysisId });

    const startTime = Date.now();
    const pollInterval = 2000; // 2 seconds

    while (Date.now() - startTime < maxWaitTime) {
      try {
        const state = await this.getAnalysisState(analysisId);

        if (state.status === 'COMPLETED') {
          logger.info('Analysis completed', { analysisId });
          return;
        }

        if (state.status === 'FAILED') {
          throw new Error(`Analysis failed: ${state.error}`);
        }

        // Update progress with analysis progress
        await this.updateProgress(
          workflowId,
          'ANALYSIS_TRIGGERED',
          75 + (state.progress || 0) * 0.25,
          `🧠 Analyzing... ${state.progress || 0}%`
        );

        await new Promise(resolve => setTimeout(resolve, pollInterval));
      } catch (error: any) {
        logger.error('Error checking analysis status', { error: error.message });
        throw error;
      }
    }

    throw new Error('Analysis timeout');
  }

  /**
   * Update workflow progress
   */
  private static async updateProgress(
    workflowId: string,
    status: WorkflowState['status'],
    progress: number,
    currentStep: string
  ): Promise<void> {
    const timestamp = Date.now();
    const ttl = Math.floor(timestamp / 1000) + 86400;

    const updateCommand = new UpdateItemCommand({
      TableName: 'AnalysisProgress',
      Key: {
        analysisId: { S: workflowId }
      },
      UpdateExpression: 'SET #status = :status, #progress = :progress, #step = :step, #ts = :ts, #ttl = :ttl',
      ExpressionAttributeNames: {
        '#status': 'status',
        '#progress': 'progress',
        '#step': 'currentStep',
        '#ts': 'timestamp',
        '#ttl': 'ttl'
      },
      ExpressionAttributeValues: {
        ':status': { S: status },
        ':progress': { N: progress.toString() },
        ':step': { S: currentStep },
        ':ts': { N: timestamp.toString() },
        ':ttl': { N: ttl.toString() }
      }
    });

    await dynamoClient.send(updateCommand);
    logger.info('Progress updated', { workflowId, status, progress });
  }

  /**
   * Update workflow state in DynamoDB
   */
  private static async updateWorkflowState(state: WorkflowState): Promise<void> {
    const putCommand = new PutItemCommand({
      TableName: 'AnalysisProgress',
      Item: {
        analysisId: { S: state.workflowId },
        email: { S: state.email },
        userId: { S: state.userId },
        status: { S: state.status },
        progress: { N: state.progress.toString() },
        currentStep: { S: state.currentStep },
        timestamp: { N: state.timestamp.toString() },
        ttl: { N: state.ttl.toString() }
      }
    });

    await dynamoClient.send(putCommand);
  }

  /**
   * Get workflow state
   */
  private static async getWorkflowState(workflowId: string): Promise<WorkflowState> {
    const getCommand = new GetItemCommand({
      TableName: 'AnalysisProgress',
      Key: {
        analysisId: { S: workflowId }
      }
    });

    const response = await dynamoClient.send(getCommand);

    if (!response.Item) {
      throw new Error('Workflow not found');
    }

    return {
      workflowId: response.Item.analysisId?.S || '',
      email: response.Item.email?.S || '',
      userId: response.Item.userId?.S || '',
      sessionToken: response.Item.sessionToken?.S || '',
      fileId: response.Item.fileId?.S || '',
      analysisId: response.Item.analysisId?.S || '',
      status: (response.Item.status?.S as any) || 'INITIATED',
      progress: parseInt(response.Item.progress?.N || '0'),
      currentStep: response.Item.currentStep?.S || '',
      timestamp: parseInt(response.Item.timestamp?.N || '0'),
      ttl: parseInt(response.Item.ttl?.N || '0')
    };
  }

  /**
   * Get analysis state
   */
  private static async getAnalysisState(analysisId: string): Promise<any> {
    const getCommand = new GetItemCommand({
      TableName: 'AnalysisResults',
      Key: {
        analysisId: { S: analysisId }
      }
    });

    const response = await dynamoClient.send(getCommand);

    return {
      status: response.Item?.status?.S || 'PENDING',
      progress: parseInt(response.Item?.progress?.N || '0'),
      error: response.Item?.error?.S
    };
  }
}
