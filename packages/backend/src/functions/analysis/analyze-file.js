"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
const analysis_engine_1 = require("../../services/misra-analysis/analysis-engine");
const cost_tracker_1 = require("../../services/misra-analysis/cost-tracker");
const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || '';
const region = process.env.AWS_REGION || 'us-east-1';
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'FileMetadata-dev';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev';
const s3Client = new client_s3_1.S3Client({ region });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region });
const analysisEngine = new analysis_engine_1.MISRAAnalysisEngine();
const costTracker = new cost_tracker_1.CostTracker(dynamoClient);
/**
 * Lambda handler for MISRA file analysis
 * Processes SQS messages containing analysis requests
 *
 * Requirements: 6.2, 6.3, 6.4, 6.5
 */
const handler = async (event, context) => {
    console.log('Analysis Lambda invoked');
    console.log(`Processing ${event.Records.length} message(s)`);
    console.log(`Remaining time: ${context.getRemainingTimeInMillis()}ms`);
    // Process each SQS message
    for (const record of event.Records) {
        await processAnalysisMessage(record, context);
    }
    console.log('All messages processed successfully');
};
exports.handler = handler;
/**
 * Process a single analysis message from SQS
 */
async function processAnalysisMessage(record, context) {
    let message;
    try {
        // Parse SQS message
        message = JSON.parse(record.body);
        console.log(`Processing analysis for file: ${message.fileId}`);
        console.log(`File name: ${message.fileName}`);
        console.log(`Language: ${message.language}`);
    }
    catch (error) {
        console.error('Failed to parse SQS message:', error);
        console.error('Message body:', record.body);
        throw new Error('Invalid SQS message format');
    }
    const { fileId, s3Key, language, userId, organizationId } = message;
    const startTime = Date.now();
    let fileSize = 0;
    try {
        // Update file metadata status to IN_PROGRESS (Requirement 6.2)
        console.log(`Updating file ${fileId} status to IN_PROGRESS`);
        await updateFileMetadataStatus(fileId, 'in_progress');
        // Check remaining time before starting analysis
        const remainingTime = context.getRemainingTimeInMillis();
        console.log(`Remaining Lambda time: ${remainingTime}ms`);
        // Reserve 30 seconds for cleanup and result saving
        const timeoutBuffer = 30000;
        if (remainingTime < timeoutBuffer + 60000) {
            throw new Error(`Insufficient time remaining: ${remainingTime}ms`);
        }
        // Download file from S3 (Requirement 6.3)
        console.log(`Downloading file from S3: ${s3Key}`);
        const fileContent = await downloadFileFromS3(s3Key);
        fileSize = fileContent.length;
        console.log(`File downloaded successfully, size: ${fileSize} bytes`);
        // Invoke MISRA Analysis Engine with progress tracking (Requirement 6.4, 3.3)
        console.log(`Starting MISRA analysis for ${language} file`);
        // Create progress callback to update DynamoDB every 2 seconds
        const progressCallback = async (progress, message) => {
            try {
                await updateAnalysisProgress(fileId, progress, message);
                console.log(`[Progress] ${progress}% - ${message}`);
            }
            catch (error) {
                console.error('[Progress] Failed to update progress:', error);
                // Don't throw - progress updates are non-critical
            }
        };
        const analysisResult = await analysisEngine.analyzeFile(fileContent, language, fileId, userId, { progressCallback, updateInterval: 2000 } // 2-second updates (Requirement 3.3)
        );
        const duration = Date.now() - startTime;
        console.log(`Analysis completed in ${duration}ms`);
        console.log(`Found ${analysisResult.violations.length} violations`);
        console.log(`Compliance: ${analysisResult.summary.compliancePercentage.toFixed(2)}%`);
        // Store results in DynamoDB (Requirement 6.5)
        console.log(`Storing analysis results in DynamoDB`);
        await storeAnalysisResults(analysisResult, organizationId);
        // Track analysis costs (Requirement 14.1)
        console.log(`Tracking analysis costs`);
        const costs = costTracker.calculateCosts(duration, fileSize, 2);
        await costTracker.recordCost(userId, organizationId || 'default', analysisResult.analysisId, fileId, costs, {
            fileSize,
            duration,
        });
        console.log(`Cost tracking completed: $${costs.totalCost.toFixed(6)}`);
        // Update file metadata status to COMPLETED
        console.log(`Updating file ${fileId} status to COMPLETED`);
        await updateFileMetadataStatus(fileId, 'completed', {
            violations_count: analysisResult.violations.length,
            compliance_percentage: analysisResult.summary.compliancePercentage,
            analysis_duration: duration,
        });
        console.log(`Analysis completed successfully for file ${fileId}`);
    }
    catch (error) {
        console.error(`Error during analysis for file ${fileId}:`, error);
        const errorMessage = error instanceof Error ? error.message : 'Unknown error';
        // Update file metadata status to FAILED (Requirement 11.1, 11.2, 11.3, 11.4)
        try {
            await updateFileMetadataStatus(fileId, 'failed', {
                error_message: errorMessage,
                error_timestamp: Date.now(),
            });
        }
        catch (updateError) {
            console.error('Failed to update file metadata status:', updateError);
        }
        // Re-throw to trigger SQS retry/DLQ
        throw error;
    }
}
/**
 * Download file content from S3
 */
async function downloadFileFromS3(s3Key) {
    try {
        const command = new client_s3_1.GetObjectCommand({
            Bucket: bucketName,
            Key: s3Key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            throw new Error('Empty response body from S3');
        }
        // Convert stream to string
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        return buffer.toString('utf-8');
    }
    catch (error) {
        console.error('Error downloading file from S3:', error);
        throw new Error(`Failed to download file from S3: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Store analysis results in DynamoDB
 */
async function storeAnalysisResults(result, organizationId) {
    try {
        const item = {
            analysisId: result.analysisId,
            fileId: result.fileId,
            userId: result.userId,
            organizationId: organizationId || 'default',
            language: result.language,
            violations: result.violations,
            summary: result.summary,
            status: result.status,
            createdAt: result.createdAt,
            timestamp: Date.now(),
        };
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: analysisResultsTable,
            Item: (0, util_dynamodb_1.marshall)(item),
        });
        await dynamoClient.send(command);
        console.log(`Analysis results stored with ID: ${result.analysisId}`);
    }
    catch (error) {
        console.error('Error storing analysis results:', error);
        throw new Error(`Failed to store analysis results: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update file metadata status in DynamoDB
 */
async function updateFileMetadataStatus(fileId, status, additionalData) {
    try {
        const updateExpression = ['SET analysis_status = :status', 'updated_at = :updatedAt'];
        const expressionAttributeValues = {
            ':status': { S: status },
            ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
        };
        if (additionalData) {
            if (additionalData.violations_count !== undefined) {
                updateExpression.push('violations_count = :violationsCount');
                expressionAttributeValues[':violationsCount'] = { N: additionalData.violations_count.toString() };
            }
            if (additionalData.compliance_percentage !== undefined) {
                updateExpression.push('compliance_percentage = :compliancePercentage');
                expressionAttributeValues[':compliancePercentage'] = { N: additionalData.compliance_percentage.toString() };
            }
            if (additionalData.analysis_duration !== undefined) {
                updateExpression.push('analysis_duration = :analysisDuration');
                expressionAttributeValues[':analysisDuration'] = { N: additionalData.analysis_duration.toString() };
            }
            if (additionalData.error_message) {
                updateExpression.push('error_message = :errorMessage');
                expressionAttributeValues[':errorMessage'] = { S: additionalData.error_message };
            }
            if (additionalData.error_timestamp) {
                updateExpression.push('error_timestamp = :errorTimestamp');
                expressionAttributeValues[':errorTimestamp'] = { N: additionalData.error_timestamp.toString() };
            }
        }
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
            UpdateExpression: updateExpression.join(', '),
            ExpressionAttributeValues: expressionAttributeValues,
        });
        await dynamoClient.send(command);
        console.log(`File metadata updated for ${fileId}: status=${status}`);
    }
    catch (error) {
        console.error('Error updating file metadata:', error);
        throw new Error(`Failed to update file metadata: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Update analysis progress in DynamoDB
 * Requirements: 3.3 (2-second progress updates)
 */
async function updateAnalysisProgress(fileId, progress, message) {
    try {
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
            UpdateExpression: 'SET analysis_progress = :progress, analysis_message = :message, updated_at = :updatedAt',
            ExpressionAttributeValues: {
                ':progress': { N: progress.toString() },
                ':message': { S: message },
                ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
            },
        });
        await dynamoClient.send(command);
    }
    catch (error) {
        console.error('Error updating analysis progress:', error);
        // Don't throw - progress updates are non-critical
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFFekUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUM7QUFDOUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQkFBa0IsQ0FBQztBQUNoRixNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUkscUJBQXFCLENBQUM7QUFFekYsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMxQyxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sY0FBYyxHQUFHLElBQUkscUNBQW1CLEVBQUUsQ0FBQztBQUNqRCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7QUFXbEQ7Ozs7O0dBS0c7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBZSxFQUFFLE9BQWdCLEVBQWlCLEVBQUU7SUFDaEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sYUFBYSxDQUFDLENBQUM7SUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsT0FBTyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FB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QztZQUNwQyxTQUFTLEVBQUUsaUJBQWlCO1lBQzVCLEdBQUcsRUFBRSxJQUFBLHdCQUFRLEVBQUMsRUFBRSxPQUFPLEVBQUUsTUFBTSxFQUFFLENBQUM7WUFDbEMsZ0JBQWdCLEVBQUUseUZBQXlGO1lBQzNHLHlCQUF5QixFQUFFO2dCQUN6QixXQUFXLEVBQUUsRUFBRSxDQUFDLEVBQUUsUUFBUSxDQUFDLFFBQVEsRUFBRSxFQUFFO2dCQUN2QyxVQUFVLEVBQUUsRUFBRSxDQUFDLEVBQUUsT0FBTyxFQUFFO2dCQUMxQixZQUFZLEVBQUUsRUFBRSxDQUFDLEVBQUUsSUFBSSxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsSUFBSSxDQUFDLENBQUMsUUFBUSxFQUFFLEVBQUU7YUFDOUQ7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLFlBQVksQ0FBQyxJQUFJLENBQUMsT0FBTyxDQUFDLENBQUM7SUFDbkMsQ0FBQztJQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7UUFDZixPQUFPLENBQUMsS0FBSyxDQUFDLG1DQUFtQyxFQUFFLEtBQUssQ0FBQyxDQUFDO1FBQzFELGtEQUFrRDtJQUNwRCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNRU0V2ZW50LCBTUVNSZWNvcmQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIEdldE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQsIFVwZGF0ZUl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgTUlTUkFBbmFseXNpc0VuZ2luZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21pc3JhLWFuYWx5c2lzL2FuYWx5c2lzLWVuZ2luZSc7XHJcbmltcG9ydCB7IExhbmd1YWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5pbXBvcnQgeyBDb3N0VHJhY2tlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21pc3JhLWFuYWx5c2lzL2Nvc3QtdHJhY2tlcic7XHJcblxyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICcnO1xyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YS1kZXYnO1xyXG5jb25zdCBhbmFseXNpc1Jlc3VsdHNUYWJsZSA9IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cy1kZXYnO1xyXG5cclxuY29uc3QgczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IGR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbiB9KTtcclxuY29uc3QgYW5hbHlzaXNFbmdpbmUgPSBuZXcgTUlTUkFBbmFseXNpc0VuZ2luZSgpO1xyXG5jb25zdCBjb3N0VHJhY2tlciA9IG5ldyBDb3N0VHJhY2tlcihkeW5hbW9DbGllbnQpO1xyXG5cclxuaW50ZXJmYWNlIEFuYWx5c2lzTWVzc2FnZSB7XHJcbiAgZmlsZUlkOiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU6IHN0cmluZztcclxuICBzM0tleTogc3RyaW5nO1xyXG4gIGxhbmd1YWdlOiBMYW5ndWFnZTtcclxuICB1c2VySWQ6IHN0cmluZztcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZztcclxufVxyXG5cclxuLyoqXHJcbiAqIExhbWJkYSBoYW5kbGVyIGZvciBNSVNSQSBmaWxlIGFuYWx5c2lzXHJcbiAqIFByb2Nlc3NlcyBTUVMgbWVzc2FnZXMgY29udGFpbmluZyBhbmFseXNpcyByZXF1ZXN0c1xyXG4gKiBcclxuICogUmVxdWlyZW1lbnRzOiA2LjIsIDYuMywgNi40LCA2LjVcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKGV2ZW50OiBTUVNFdmVudCwgY29udGV4dDogQ29udGV4dCk6IFByb21pc2U8dm9pZD4gPT4ge1xyXG4gIGNvbnNvbGUubG9nKCdBbmFseXNpcyBMYW1iZGEgaW52b2tlZCcpO1xyXG4gIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nICR7ZXZlbnQuUmVjb3Jkcy5sZW5ndGh9IG1lc3NhZ2UocylgKTtcclxuICBjb25zb2xlLmxvZyhgUmVtYWluaW5nIHRpbWU6ICR7Y29udGV4dC5nZXRSZW1haW5pbmdUaW1lSW5NaWxsaXMoKX1tc2ApO1xyXG5cclxuICAvLyBQcm9jZXNzIGVhY2ggU1FTIG1lc3NhZ2VcclxuICBmb3IgKGNvbnN0IHJlY29yZCBvZiBldmVudC5SZWNvcmRzKSB7XHJcbiAgICBhd2FpdCBwcm9jZXNzQW5hbHlzaXNNZXNzYWdlKHJlY29yZCwgY29udGV4dCk7XHJcbiAgfVxyXG5cclxuICBjb25zb2xlLmxvZygnQWxsIG1lc3NhZ2VzIHByb2Nlc3NlZCBzdWNjZXNzZnVsbHknKTtcclxufTtcclxuXHJcbi8qKlxyXG4gKiBQcm9jZXNzIGEgc2luZ2xlIGFuYWx5c2lzIG1lc3NhZ2UgZnJvbSBTUVNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHByb2Nlc3NBbmFseXNpc01lc3NhZ2UoXHJcbiAgcmVjb3JkOiBTUVNSZWNvcmQsXHJcbiAgY29udGV4dDogQ29udGV4dFxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICBsZXQgbWVzc2FnZTogQW5hbHlzaXNNZXNzYWdlO1xyXG4gIFxyXG4gIHRyeSB7XHJcbiAgICAvLyBQYXJzZSBTUVMgbWVzc2FnZVxyXG4gICAgbWVzc2FnZSA9IEpTT04ucGFyc2UocmVjb3JkLmJvZHkpIGFzIEFuYWx5c2lzTWVzc2FnZTtcclxuICAgIGNvbnNvbGUubG9nKGBQcm9jZXNzaW5nIGFuYWx5c2lzIGZvciBmaWxlOiAke21lc3NhZ2UuZmlsZUlkfWApO1xyXG4gICAgY29uc29sZS5sb2coYEZpbGUgbmFtZTogJHttZXNzYWdlLmZpbGVOYW1lfWApO1xyXG4gICAgY29uc29sZS5sb2coYExhbmd1YWdlOiAke21lc3NhZ2UubGFuZ3VhZ2V9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byBwYXJzZSBTUVMgbWVzc2FnZTonLCBlcnJvcik7XHJcbiAgICBjb25zb2xlLmVycm9yKCdNZXNzYWdlIGJvZHk6JywgcmVjb3JkLmJvZHkpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKCdJbnZhbGlkIFNRUyBtZXNzYWdlIGZvcm1hdCcpO1xyXG4gIH1cclxuXHJcbiAgY29uc3QgeyBmaWxlSWQsIHMzS2V5LCBsYW5ndWFnZSwgdXNlcklkLCBvcmdhbml6YXRpb25JZCB9ID0gbWVzc2FnZTtcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIGxldCBmaWxlU2l6ZSA9IDA7XHJcblxyXG4gIHRyeSB7XHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gSU5fUFJPR1JFU1MgKFJlcXVpcmVtZW50IDYuMilcclxuICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBmaWxlICR7ZmlsZUlkfSBzdGF0dXMgdG8gSU5fUFJPR1JFU1NgKTtcclxuICAgIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdpbl9wcm9ncmVzcycpO1xyXG5cclxuICAgIC8vIENoZWNrIHJlbWFpbmluZyB0aW1lIGJlZm9yZSBzdGFydGluZyBhbmFseXNpc1xyXG4gICAgY29uc3QgcmVtYWluaW5nVGltZSA9IGNvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCk7XHJcbiAgICBjb25zb2xlLmxvZyhgUmVtYWluaW5nIExhbWJkYSB0aW1lOiAke3JlbWFpbmluZ1RpbWV9bXNgKTtcclxuXHJcbiAgICAvLyBSZXNlcnZlIDMwIHNlY29uZHMgZm9yIGNsZWFudXAgYW5kIHJlc3VsdCBzYXZpbmdcclxuICAgIGNvbnN0IHRpbWVvdXRCdWZmZXIgPSAzMDAwMDtcclxuICAgIGlmIChyZW1haW5pbmdUaW1lIDwgdGltZW91dEJ1ZmZlciArIDYwMDAwKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW5zdWZmaWNpZW50IHRpbWUgcmVtYWluaW5nOiAke3JlbWFpbmluZ1RpbWV9bXNgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBEb3dubG9hZCBmaWxlIGZyb20gUzMgKFJlcXVpcmVtZW50IDYuMylcclxuICAgIGNvbnNvbGUubG9nKGBEb3dubG9hZGluZyBmaWxlIGZyb20gUzM6ICR7czNLZXl9YCk7XHJcbiAgICBjb25zdCBmaWxlQ29udGVudCA9IGF3YWl0IGRvd25sb2FkRmlsZUZyb21TMyhzM0tleSk7XHJcbiAgICBmaWxlU2l6ZSA9IGZpbGVDb250ZW50Lmxlbmd0aDtcclxuICAgIGNvbnNvbGUubG9nKGBGaWxlIGRvd25sb2FkZWQgc3VjY2Vzc2Z1bGx5LCBzaXplOiAke2ZpbGVTaXplfSBieXRlc2ApO1xyXG5cclxuICAgIC8vIEludm9rZSBNSVNSQSBBbmFseXNpcyBFbmdpbmUgd2l0aCBwcm9ncmVzcyB0cmFja2luZyAoUmVxdWlyZW1lbnQgNi40LCAzLjMpXHJcbiAgICBjb25zb2xlLmxvZyhgU3RhcnRpbmcgTUlTUkEgYW5hbHlzaXMgZm9yICR7bGFuZ3VhZ2V9IGZpbGVgKTtcclxuICAgIFxyXG4gICAgLy8gQ3JlYXRlIHByb2dyZXNzIGNhbGxiYWNrIHRvIHVwZGF0ZSBEeW5hbW9EQiBldmVyeSAyIHNlY29uZHNcclxuICAgIGNvbnN0IHByb2dyZXNzQ2FsbGJhY2sgPSBhc3luYyAocHJvZ3Jlc3M6IG51bWJlciwgbWVzc2FnZTogc3RyaW5nKSA9PiB7XHJcbiAgICAgIHRyeSB7XHJcbiAgICAgICAgYXdhaXQgdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhmaWxlSWQsIHByb2dyZXNzLCBtZXNzYWdlKTtcclxuICAgICAgICBjb25zb2xlLmxvZyhgW1Byb2dyZXNzXSAke3Byb2dyZXNzfSUgLSAke21lc3NhZ2V9YCk7XHJcbiAgICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgICAgY29uc29sZS5lcnJvcignW1Byb2dyZXNzXSBGYWlsZWQgdG8gdXBkYXRlIHByb2dyZXNzOicsIGVycm9yKTtcclxuICAgICAgICAvLyBEb24ndCB0aHJvdyAtIHByb2dyZXNzIHVwZGF0ZXMgYXJlIG5vbi1jcml0aWNhbFxyXG4gICAgICB9XHJcbiAgICB9O1xyXG4gICAgXHJcbiAgICBjb25zdCBhbmFseXNpc1Jlc3VsdCA9IGF3YWl0IGFuYWx5c2lzRW5naW5lLmFuYWx5emVGaWxlKFxyXG4gICAgICBmaWxlQ29udGVudCxcclxuICAgICAgbGFuZ3VhZ2UsXHJcbiAgICAgIGZpbGVJZCxcclxuICAgICAgdXNlcklkLFxyXG4gICAgICB7IHByb2dyZXNzQ2FsbGJhY2ssIHVwZGF0ZUludGVydmFsOiAyMDAwIH0gLy8gMi1zZWNvbmQgdXBkYXRlcyAoUmVxdWlyZW1lbnQgMy4zKVxyXG4gICAgKTtcclxuXHJcbiAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBjb25zb2xlLmxvZyhgQW5hbHlzaXMgY29tcGxldGVkIGluICR7ZHVyYXRpb259bXNgKTtcclxuICAgIGNvbnNvbGUubG9nKGBGb3VuZCAke2FuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RofSB2aW9sYXRpb25zYCk7XHJcbiAgICBjb25zb2xlLmxvZyhgQ29tcGxpYW5jZTogJHthbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLnRvRml4ZWQoMil9JWApO1xyXG5cclxuICAgIC8vIFN0b3JlIHJlc3VsdHMgaW4gRHluYW1vREIgKFJlcXVpcmVtZW50IDYuNSlcclxuICAgIGNvbnNvbGUubG9nKGBTdG9yaW5nIGFuYWx5c2lzIHJlc3VsdHMgaW4gRHluYW1vREJgKTtcclxuICAgIGF3YWl0IHN0b3JlQW5hbHlzaXNSZXN1bHRzKGFuYWx5c2lzUmVzdWx0LCBvcmdhbml6YXRpb25JZCk7XHJcblxyXG4gICAgLy8gVHJhY2sgYW5hbHlzaXMgY29zdHMgKFJlcXVpcmVtZW50IDE0LjEpXHJcbiAgICBjb25zb2xlLmxvZyhgVHJhY2tpbmcgYW5hbHlzaXMgY29zdHNgKTtcclxuICAgIGNvbnN0IGNvc3RzID0gY29zdFRyYWNrZXIuY2FsY3VsYXRlQ29zdHMoZHVyYXRpb24sIGZpbGVTaXplLCAyKTtcclxuICAgIGF3YWl0IGNvc3RUcmFja2VyLnJlY29yZENvc3QoXHJcbiAgICAgIHVzZXJJZCxcclxuICAgICAgb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBmaWxlSWQsXHJcbiAgICAgIGNvc3RzLFxyXG4gICAgICB7XHJcbiAgICAgICAgZmlsZVNpemUsXHJcbiAgICAgICAgZHVyYXRpb24sXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgICBjb25zb2xlLmxvZyhgQ29zdCB0cmFja2luZyBjb21wbGV0ZWQ6ICQke2Nvc3RzLnRvdGFsQ29zdC50b0ZpeGVkKDYpfWApO1xyXG5cclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBDT01QTEVURURcclxuICAgIGNvbnNvbGUubG9nKGBVcGRhdGluZyBmaWxlICR7ZmlsZUlkfSBzdGF0dXMgdG8gQ09NUExFVEVEYCk7XHJcbiAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnY29tcGxldGVkJywge1xyXG4gICAgICB2aW9sYXRpb25zX2NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgICAgY29tcGxpYW5jZV9wZXJjZW50YWdlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gICAgICBhbmFseXNpc19kdXJhdGlvbjogZHVyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zb2xlLmxvZyhgQW5hbHlzaXMgY29tcGxldGVkIHN1Y2Nlc3NmdWxseSBmb3IgZmlsZSAke2ZpbGVJZH1gKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcihgRXJyb3IgZHVyaW5nIGFuYWx5c2lzIGZvciBmaWxlICR7ZmlsZUlkfTpgLCBlcnJvcik7XHJcblxyXG4gICAgY29uc3QgZXJyb3JNZXNzYWdlID0gZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcic7XHJcbiAgICBcclxuICAgIC8vIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyB0byBGQUlMRUQgKFJlcXVpcmVtZW50IDExLjEsIDExLjIsIDExLjMsIDExLjQpXHJcbiAgICB0cnkge1xyXG4gICAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnZmFpbGVkJywge1xyXG4gICAgICAgIGVycm9yX21lc3NhZ2U6IGVycm9yTWVzc2FnZSxcclxuICAgICAgICBlcnJvcl90aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIH0pO1xyXG4gICAgfSBjYXRjaCAodXBkYXRlRXJyb3IpIHtcclxuICAgICAgY29uc29sZS5lcnJvcignRmFpbGVkIHRvIHVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1czonLCB1cGRhdGVFcnJvcik7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUmUtdGhyb3cgdG8gdHJpZ2dlciBTUVMgcmV0cnkvRExRXHJcbiAgICB0aHJvdyBlcnJvcjtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEb3dubG9hZCBmaWxlIGNvbnRlbnQgZnJvbSBTM1xyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRGaWxlRnJvbVMzKHMzS2V5OiBzdHJpbmcpOiBQcm9taXNlPHN0cmluZz4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IEdldE9iamVjdENvbW1hbmQoe1xyXG4gICAgICBCdWNrZXQ6IGJ1Y2tldE5hbWUsXHJcbiAgICAgIEtleTogczNLZXksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2UuQm9keSkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoJ0VtcHR5IHJlc3BvbnNlIGJvZHkgZnJvbSBTMycpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIENvbnZlcnQgc3RyZWFtIHRvIHN0cmluZ1xyXG4gICAgY29uc3QgY2h1bmtzOiBVaW50OEFycmF5W10gPSBbXTtcclxuICAgIGZvciBhd2FpdCAoY29uc3QgY2h1bmsgb2YgcmVzcG9uc2UuQm9keSBhcyBhbnkpIHtcclxuICAgICAgY2h1bmtzLnB1c2goY2h1bmspO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBidWZmZXIgPSBCdWZmZXIuY29uY2F0KGNodW5rcyk7XHJcbiAgICByZXR1cm4gYnVmZmVyLnRvU3RyaW5nKCd1dGYtOCcpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciBkb3dubG9hZGluZyBmaWxlIGZyb20gUzM6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gZG93bmxvYWQgZmlsZSBmcm9tIFMzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFN0b3JlIGFuYWx5c2lzIHJlc3VsdHMgaW4gRHluYW1vREJcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHN0b3JlQW5hbHlzaXNSZXN1bHRzKFxyXG4gIHJlc3VsdDogYW55LFxyXG4gIG9yZ2FuaXphdGlvbklkPzogc3RyaW5nXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBpdGVtID0ge1xyXG4gICAgICBhbmFseXNpc0lkOiByZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkOiByZXN1bHQuZmlsZUlkLFxyXG4gICAgICB1c2VySWQ6IHJlc3VsdC51c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkOiBvcmdhbml6YXRpb25JZCB8fCAnZGVmYXVsdCcsXHJcbiAgICAgIGxhbmd1YWdlOiByZXN1bHQubGFuZ3VhZ2UsXHJcbiAgICAgIHZpb2xhdGlvbnM6IHJlc3VsdC52aW9sYXRpb25zLFxyXG4gICAgICBzdW1tYXJ5OiByZXN1bHQuc3VtbWFyeSxcclxuICAgICAgc3RhdHVzOiByZXN1bHQuc3RhdHVzLFxyXG4gICAgICBjcmVhdGVkQXQ6IHJlc3VsdC5jcmVhdGVkQXQsXHJcbiAgICAgIHRpbWVzdGFtcDogRGF0ZS5ub3coKSxcclxuICAgIH07XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBQdXRJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogYW5hbHlzaXNSZXN1bHRzVGFibGUsXHJcbiAgICAgIEl0ZW06IG1hcnNoYWxsKGl0ZW0pLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZyhgQW5hbHlzaXMgcmVzdWx0cyBzdG9yZWQgd2l0aCBJRDogJHtyZXN1bHQuYW5hbHlzaXNJZH1gKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3Igc3RvcmluZyBhbmFseXNpcyByZXN1bHRzOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIHN0b3JlIGFuYWx5c2lzIHJlc3VsdHM6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgc3RhdHVzOiBzdHJpbmcsXHJcbiAgYWRkaXRpb25hbERhdGE/OiBSZWNvcmQ8c3RyaW5nLCBhbnk+XHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCB1cGRhdGVFeHByZXNzaW9uID0gWydTRVQgYW5hbHlzaXNfc3RhdHVzID0gOnN0YXR1cycsICd1cGRhdGVkX2F0ID0gOnVwZGF0ZWRBdCddO1xyXG4gICAgY29uc3QgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogUmVjb3JkPHN0cmluZywgYW55PiA9IHtcclxuICAgICAgJzpzdGF0dXMnOiB7IFM6IHN0YXR1cyB9LFxyXG4gICAgICAnOnVwZGF0ZWRBdCc6IHsgTjogTWF0aC5mbG9vcihEYXRlLm5vdygpIC8gMTAwMCkudG9TdHJpbmcoKSB9LFxyXG4gICAgfTtcclxuXHJcbiAgICBpZiAoYWRkaXRpb25hbERhdGEpIHtcclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLnZpb2xhdGlvbnNfY291bnQgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgndmlvbGF0aW9uc19jb3VudCA9IDp2aW9sYXRpb25zQ291bnQnKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dmlvbGF0aW9uc0NvdW50J10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLnZpb2xhdGlvbnNfY291bnQudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5jb21wbGlhbmNlX3BlcmNlbnRhZ2UgIT09IHVuZGVmaW5lZCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnY29tcGxpYW5jZV9wZXJjZW50YWdlID0gOmNvbXBsaWFuY2VQZXJjZW50YWdlJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNvbXBsaWFuY2VQZXJjZW50YWdlJ10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLmNvbXBsaWFuY2VfcGVyY2VudGFnZS50b1N0cmluZygpIH07XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLmFuYWx5c2lzX2R1cmF0aW9uICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2FuYWx5c2lzX2R1cmF0aW9uID0gOmFuYWx5c2lzRHVyYXRpb24nKTtcclxuICAgICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6YW5hbHlzaXNEdXJhdGlvbiddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5hbmFseXNpc19kdXJhdGlvbi50b1N0cmluZygpIH07XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLmVycm9yX21lc3NhZ2UpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2Vycm9yX21lc3NhZ2UgPSA6ZXJyb3JNZXNzYWdlJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVycm9yTWVzc2FnZSddID0geyBTOiBhZGRpdGlvbmFsRGF0YS5lcnJvcl9tZXNzYWdlIH07XHJcbiAgICAgIH1cclxuICAgICAgaWYgKGFkZGl0aW9uYWxEYXRhLmVycm9yX3RpbWVzdGFtcCkge1xyXG4gICAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnZXJyb3JfdGltZXN0YW1wID0gOmVycm9yVGltZXN0YW1wJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmVycm9yVGltZXN0YW1wJ10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLmVycm9yX3RpbWVzdGFtcC50b1N0cmluZygpIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogdXBkYXRlRXhwcmVzc2lvbi5qb2luKCcsICcpLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBjb25zb2xlLmxvZyhgRmlsZSBtZXRhZGF0YSB1cGRhdGVkIGZvciAke2ZpbGVJZH06IHN0YXR1cz0ke3N0YXR1c31gKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgdXBkYXRpbmcgZmlsZSBtZXRhZGF0YTonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byB1cGRhdGUgZmlsZSBtZXRhZGF0YTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgYW5hbHlzaXMgcHJvZ3Jlc3MgaW4gRHluYW1vREJcclxuICogUmVxdWlyZW1lbnRzOiAzLjMgKDItc2Vjb25kIHByb2dyZXNzIHVwZGF0ZXMpXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiB1cGRhdGVBbmFseXNpc1Byb2dyZXNzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHByb2dyZXNzOiBudW1iZXIsXHJcbiAgbWVzc2FnZTogc3RyaW5nXHJcbik6IFByb21pc2U8dm9pZD4ge1xyXG4gIHRyeSB7XHJcbiAgICBjb25zdCBjb21tYW5kID0gbmV3IFVwZGF0ZUl0ZW1Db21tYW5kKHtcclxuICAgICAgVGFibGVOYW1lOiBmaWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBhbmFseXNpc19wcm9ncmVzcyA9IDpwcm9ncmVzcywgYW5hbHlzaXNfbWVzc2FnZSA9IDptZXNzYWdlLCB1cGRhdGVkX2F0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnByb2dyZXNzJzogeyBOOiBwcm9ncmVzcy50b1N0cmluZygpIH0sXHJcbiAgICAgICAgJzptZXNzYWdlJzogeyBTOiBtZXNzYWdlIH0sXHJcbiAgICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdFcnJvciB1cGRhdGluZyBhbmFseXNpcyBwcm9ncmVzczonLCBlcnJvcik7XHJcbiAgICAvLyBEb24ndCB0aHJvdyAtIHByb2dyZXNzIHVwZGF0ZXMgYXJlIG5vbi1jcml0aWNhbFxyXG4gIH1cclxufVxyXG4iXX0=