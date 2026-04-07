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
const fileMetadataTable = process.env.FILE_METADATA_TABLE || 'misra-platform-file-metadata-dev';
const analysisResultsTable = process.env.ANALYSIS_RESULTS_TABLE || 'misra-platform-analysis-results';
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
        // Invoke MISRA Analysis Engine (Requirement 6.4)
        console.log(`Starting MISRA analysis for ${language} file`);
        const analysisResult = await analysisEngine.analyzeFile(fileContent, language, fileId, userId);
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7OztBQUNBLGtEQUFnRTtBQUNoRSw4REFBNkY7QUFDN0YsMERBQWtEO0FBQ2xELG1GQUFvRjtBQUVwRiw2RUFBeUU7QUFFekUsTUFBTSxVQUFVLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyx3QkFBd0IsSUFBSSxFQUFFLENBQUM7QUFDOUQsTUFBTSxNQUFNLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVyxDQUFDO0FBQ3JELE1BQU0saUJBQWlCLEdBQUcsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsSUFBSSxrQ0FBa0MsQ0FBQztBQUNoRyxNQUFNLG9CQUFvQixHQUFHLE9BQU8sQ0FBQyxHQUFHLENBQUMsc0JBQXNCLElBQUksaUNBQWlDLENBQUM7QUFFckcsTUFBTSxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLENBQUMsQ0FBQztBQUMxQyxNQUFNLFlBQVksR0FBRyxJQUFJLGdDQUFjLENBQUMsRUFBRSxNQUFNLEVBQUUsQ0FBQyxDQUFDO0FBQ3BELE1BQU0sY0FBYyxHQUFHLElBQUkscUNBQW1CLEVBQUUsQ0FBQztBQUNqRCxNQUFNLFdBQVcsR0FBRyxJQUFJLDBCQUFXLENBQUMsWUFBWSxDQUFDLENBQUM7QUFXbEQ7Ozs7O0dBS0c7QUFDSSxNQUFNLE9BQU8sR0FBRyxLQUFLLEVBQUUsS0FBZSxFQUFFLE9BQWdCLEVBQWlCLEVBQUU7SUFDaEYsT0FBTyxDQUFDLEdBQUcsQ0FBQyx5QkFBeUIsQ0FBQyxDQUFDO0lBQ3ZDLE9BQU8sQ0FBQyxHQUFHLENBQUMsY0FBYyxLQUFLLENBQUMsT0FBTyxDQUFDLE1BQU0sYUFBYSxDQUFDLENBQUM7SUFDN0QsT0FBTyxDQUFDLEdBQUcsQ0FBQyxtQkFBbUIsT0FBTyxDQUFDLHdCQUF3QixFQUFFLElBQUksQ0FB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LElBQUksQ0FBQyxJQUFJLENBQUM7WUFDN0MseUJBQXlCLEVBQUUseUJBQXlCO1NBQ3JELENBQUMsQ0FBQztRQUVILE1BQU0sWUFBWSxDQUFDLElBQUksQ0FBQyxPQUFPLENBQUMsQ0FBQztRQUNqQyxPQUFPLENBQUMsR0FBRyxDQUFDLDZCQUE2QixNQUFNLFlBQVksTUFBTSxFQUFFLENBQUMsQ0FBQztJQUN2RSxDQUFDO0lBQUMsT0FBTyxLQUFLLEVBQUUsQ0FBQztRQUNmLE9BQU8sQ0FBQyxLQUFLLENBQUMsK0JBQStCLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFDdEQsTUFBTSxJQUFJLEtBQUssQ0FBQyxtQ0FBbUMsS0FBSyxZQUFZLEtBQUssQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLE9BQU8sQ0FBQyxDQUFDLENBQUMsZUFBZSxFQUFFLENBQUMsQ0FBQztJQUNqSCxDQUFDO0FBQ0gsQ0FBQyIsInNvdXJjZXNDb250ZW50IjpbImltcG9ydCB7IFNRU0V2ZW50LCBTUVNSZWNvcmQsIENvbnRleHQgfSBmcm9tICdhd3MtbGFtYmRhJztcclxuaW1wb3J0IHsgUzNDbGllbnQsIEdldE9iamVjdENvbW1hbmQgfSBmcm9tICdAYXdzLXNkay9jbGllbnQtczMnO1xyXG5pbXBvcnQgeyBEeW5hbW9EQkNsaWVudCwgUHV0SXRlbUNvbW1hbmQsIFVwZGF0ZUl0ZW1Db21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LWR5bmFtb2RiJztcclxuaW1wb3J0IHsgbWFyc2hhbGwgfSBmcm9tICdAYXdzLXNkay91dGlsLWR5bmFtb2RiJztcclxuaW1wb3J0IHsgTUlTUkFBbmFseXNpc0VuZ2luZSB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21pc3JhLWFuYWx5c2lzL2FuYWx5c2lzLWVuZ2luZSc7XHJcbmltcG9ydCB7IExhbmd1YWdlIH0gZnJvbSAnLi4vLi4vdHlwZXMvbWlzcmEtYW5hbHlzaXMnO1xyXG5pbXBvcnQgeyBDb3N0VHJhY2tlciB9IGZyb20gJy4uLy4uL3NlcnZpY2VzL21pc3JhLWFuYWx5c2lzL2Nvc3QtdHJhY2tlcic7XHJcblxyXG5jb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICcnO1xyXG5jb25zdCByZWdpb24gPSBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnO1xyXG5jb25zdCBmaWxlTWV0YWRhdGFUYWJsZSA9IHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ21pc3JhLXBsYXRmb3JtLWZpbGUtbWV0YWRhdGEtZGV2JztcclxuY29uc3QgYW5hbHlzaXNSZXN1bHRzVGFibGUgPSBwcm9jZXNzLmVudi5BTkFMWVNJU19SRVNVTFRTX1RBQkxFIHx8ICdtaXNyYS1wbGF0Zm9ybS1hbmFseXNpcy1yZXN1bHRzJztcclxuXHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb24gfSk7XHJcbmNvbnN0IGFuYWx5c2lzRW5naW5lID0gbmV3IE1JU1JBQW5hbHlzaXNFbmdpbmUoKTtcclxuY29uc3QgY29zdFRyYWNrZXIgPSBuZXcgQ29zdFRyYWNrZXIoZHluYW1vQ2xpZW50KTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc01lc3NhZ2Uge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lOiBzdHJpbmc7XHJcbiAgczNLZXk6IHN0cmluZztcclxuICBsYW5ndWFnZTogTGFuZ3VhZ2U7XHJcbiAgdXNlcklkOiBzdHJpbmc7XHJcbiAgb3JnYW5pemF0aW9uSWQ/OiBzdHJpbmc7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBMYW1iZGEgaGFuZGxlciBmb3IgTUlTUkEgZmlsZSBhbmFseXNpc1xyXG4gKiBQcm9jZXNzZXMgU1FTIG1lc3NhZ2VzIGNvbnRhaW5pbmcgYW5hbHlzaXMgcmVxdWVzdHNcclxuICogXHJcbiAqIFJlcXVpcmVtZW50czogNi4yLCA2LjMsIDYuNCwgNi41XHJcbiAqL1xyXG5leHBvcnQgY29uc3QgaGFuZGxlciA9IGFzeW5jIChldmVudDogU1FTRXZlbnQsIGNvbnRleHQ6IENvbnRleHQpOiBQcm9taXNlPHZvaWQ+ID0+IHtcclxuICBjb25zb2xlLmxvZygnQW5hbHlzaXMgTGFtYmRhIGludm9rZWQnKTtcclxuICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyAke2V2ZW50LlJlY29yZHMubGVuZ3RofSBtZXNzYWdlKHMpYCk7XHJcbiAgY29uc29sZS5sb2coYFJlbWFpbmluZyB0aW1lOiAke2NvbnRleHQuZ2V0UmVtYWluaW5nVGltZUluTWlsbGlzKCl9bXNgKTtcclxuXHJcbiAgLy8gUHJvY2VzcyBlYWNoIFNRUyBtZXNzYWdlXHJcbiAgZm9yIChjb25zdCByZWNvcmQgb2YgZXZlbnQuUmVjb3Jkcykge1xyXG4gICAgYXdhaXQgcHJvY2Vzc0FuYWx5c2lzTWVzc2FnZShyZWNvcmQsIGNvbnRleHQpO1xyXG4gIH1cclxuXHJcbiAgY29uc29sZS5sb2coJ0FsbCBtZXNzYWdlcyBwcm9jZXNzZWQgc3VjY2Vzc2Z1bGx5Jyk7XHJcbn07XHJcblxyXG4vKipcclxuICogUHJvY2VzcyBhIHNpbmdsZSBhbmFseXNpcyBtZXNzYWdlIGZyb20gU1FTXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwcm9jZXNzQW5hbHlzaXNNZXNzYWdlKFxyXG4gIHJlY29yZDogU1FTUmVjb3JkLFxyXG4gIGNvbnRleHQ6IENvbnRleHRcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgbGV0IG1lc3NhZ2U6IEFuYWx5c2lzTWVzc2FnZTtcclxuICBcclxuICB0cnkge1xyXG4gICAgLy8gUGFyc2UgU1FTIG1lc3NhZ2VcclxuICAgIG1lc3NhZ2UgPSBKU09OLnBhcnNlKHJlY29yZC5ib2R5KSBhcyBBbmFseXNpc01lc3NhZ2U7XHJcbiAgICBjb25zb2xlLmxvZyhgUHJvY2Vzc2luZyBhbmFseXNpcyBmb3IgZmlsZTogJHttZXNzYWdlLmZpbGVJZH1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBGaWxlIG5hbWU6ICR7bWVzc2FnZS5maWxlTmFtZX1gKTtcclxuICAgIGNvbnNvbGUubG9nKGBMYW5ndWFnZTogJHttZXNzYWdlLmxhbmd1YWdlfWApO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICBjb25zb2xlLmVycm9yKCdGYWlsZWQgdG8gcGFyc2UgU1FTIG1lc3NhZ2U6JywgZXJyb3IpO1xyXG4gICAgY29uc29sZS5lcnJvcignTWVzc2FnZSBib2R5OicsIHJlY29yZC5ib2R5KTtcclxuICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBTUVMgbWVzc2FnZSBmb3JtYXQnKTtcclxuICB9XHJcblxyXG4gIGNvbnN0IHsgZmlsZUlkLCBzM0tleSwgbGFuZ3VhZ2UsIHVzZXJJZCwgb3JnYW5pemF0aW9uSWQgfSA9IG1lc3NhZ2U7XHJcbiAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICBsZXQgZmlsZVNpemUgPSAwO1xyXG5cclxuICB0cnkge1xyXG4gICAgLy8gVXBkYXRlIGZpbGUgbWV0YWRhdGEgc3RhdHVzIHRvIElOX1BST0dSRVNTIChSZXF1aXJlbWVudCA2LjIpXHJcbiAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgZmlsZSAke2ZpbGVJZH0gc3RhdHVzIHRvIElOX1BST0dSRVNTYCk7XHJcbiAgICBhd2FpdCB1cGRhdGVGaWxlTWV0YWRhdGFTdGF0dXMoZmlsZUlkLCAnaW5fcHJvZ3Jlc3MnKTtcclxuXHJcbiAgICAvLyBDaGVjayByZW1haW5pbmcgdGltZSBiZWZvcmUgc3RhcnRpbmcgYW5hbHlzaXNcclxuICAgIGNvbnN0IHJlbWFpbmluZ1RpbWUgPSBjb250ZXh0LmdldFJlbWFpbmluZ1RpbWVJbk1pbGxpcygpO1xyXG4gICAgY29uc29sZS5sb2coYFJlbWFpbmluZyBMYW1iZGEgdGltZTogJHtyZW1haW5pbmdUaW1lfW1zYCk7XHJcblxyXG4gICAgLy8gUmVzZXJ2ZSAzMCBzZWNvbmRzIGZvciBjbGVhbnVwIGFuZCByZXN1bHQgc2F2aW5nXHJcbiAgICBjb25zdCB0aW1lb3V0QnVmZmVyID0gMzAwMDA7XHJcbiAgICBpZiAocmVtYWluaW5nVGltZSA8IHRpbWVvdXRCdWZmZXIgKyA2MDAwMCkge1xyXG4gICAgICB0aHJvdyBuZXcgRXJyb3IoYEluc3VmZmljaWVudCB0aW1lIHJlbWFpbmluZzogJHtyZW1haW5pbmdUaW1lfW1zYCk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gRG93bmxvYWQgZmlsZSBmcm9tIFMzIChSZXF1aXJlbWVudCA2LjMpXHJcbiAgICBjb25zb2xlLmxvZyhgRG93bmxvYWRpbmcgZmlsZSBmcm9tIFMzOiAke3MzS2V5fWApO1xyXG4gICAgY29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCBkb3dubG9hZEZpbGVGcm9tUzMoczNLZXkpO1xyXG4gICAgZmlsZVNpemUgPSBmaWxlQ29udGVudC5sZW5ndGg7XHJcbiAgICBjb25zb2xlLmxvZyhgRmlsZSBkb3dubG9hZGVkIHN1Y2Nlc3NmdWxseSwgc2l6ZTogJHtmaWxlU2l6ZX0gYnl0ZXNgKTtcclxuXHJcbiAgICAvLyBJbnZva2UgTUlTUkEgQW5hbHlzaXMgRW5naW5lIChSZXF1aXJlbWVudCA2LjQpXHJcbiAgICBjb25zb2xlLmxvZyhgU3RhcnRpbmcgTUlTUkEgYW5hbHlzaXMgZm9yICR7bGFuZ3VhZ2V9IGZpbGVgKTtcclxuICAgIGNvbnN0IGFuYWx5c2lzUmVzdWx0ID0gYXdhaXQgYW5hbHlzaXNFbmdpbmUuYW5hbHl6ZUZpbGUoXHJcbiAgICAgIGZpbGVDb250ZW50LFxyXG4gICAgICBsYW5ndWFnZSxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICB1c2VySWRcclxuICAgICk7XHJcblxyXG4gICAgY29uc3QgZHVyYXRpb24gPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgY29uc29sZS5sb2coYEFuYWx5c2lzIGNvbXBsZXRlZCBpbiAke2R1cmF0aW9ufW1zYCk7XHJcbiAgICBjb25zb2xlLmxvZyhgRm91bmQgJHthbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aH0gdmlvbGF0aW9uc2ApO1xyXG4gICAgY29uc29sZS5sb2coYENvbXBsaWFuY2U6ICR7YW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZS50b0ZpeGVkKDIpfSVgKTtcclxuXHJcbiAgICAvLyBTdG9yZSByZXN1bHRzIGluIER5bmFtb0RCIChSZXF1aXJlbWVudCA2LjUpXHJcbiAgICBjb25zb2xlLmxvZyhgU3RvcmluZyBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCYCk7XHJcbiAgICBhd2FpdCBzdG9yZUFuYWx5c2lzUmVzdWx0cyhhbmFseXNpc1Jlc3VsdCwgb3JnYW5pemF0aW9uSWQpO1xyXG5cclxuICAgIC8vIFRyYWNrIGFuYWx5c2lzIGNvc3RzIChSZXF1aXJlbWVudCAxNC4xKVxyXG4gICAgY29uc29sZS5sb2coYFRyYWNraW5nIGFuYWx5c2lzIGNvc3RzYCk7XHJcbiAgICBjb25zdCBjb3N0cyA9IGNvc3RUcmFja2VyLmNhbGN1bGF0ZUNvc3RzKGR1cmF0aW9uLCBmaWxlU2l6ZSwgMik7XHJcbiAgICBhd2FpdCBjb3N0VHJhY2tlci5yZWNvcmRDb3N0KFxyXG4gICAgICB1c2VySWQsXHJcbiAgICAgIG9yZ2FuaXphdGlvbklkIHx8ICdkZWZhdWx0JyxcclxuICAgICAgYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBjb3N0cyxcclxuICAgICAge1xyXG4gICAgICAgIGZpbGVTaXplLFxyXG4gICAgICAgIGR1cmF0aW9uLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gICAgY29uc29sZS5sb2coYENvc3QgdHJhY2tpbmcgY29tcGxldGVkOiAkJHtjb3N0cy50b3RhbENvc3QudG9GaXhlZCg2KX1gKTtcclxuXHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gQ09NUExFVEVEXHJcbiAgICBjb25zb2xlLmxvZyhgVXBkYXRpbmcgZmlsZSAke2ZpbGVJZH0gc3RhdHVzIHRvIENPTVBMRVRFRGApO1xyXG4gICAgYXdhaXQgdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKGZpbGVJZCwgJ2NvbXBsZXRlZCcsIHtcclxuICAgICAgdmlvbGF0aW9uc19jb3VudDogYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICAgIGNvbXBsaWFuY2VfcGVyY2VudGFnZTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZSxcclxuICAgICAgYW5hbHlzaXNfZHVyYXRpb246IGR1cmF0aW9uLFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc29sZS5sb2coYEFuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHkgZm9yIGZpbGUgJHtmaWxlSWR9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoYEVycm9yIGR1cmluZyBhbmFseXNpcyBmb3IgZmlsZSAke2ZpbGVJZH06YCwgZXJyb3IpO1xyXG5cclxuICAgIGNvbnN0IGVycm9yTWVzc2FnZSA9IGVycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InO1xyXG4gICAgXHJcbiAgICAvLyBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXMgdG8gRkFJTEVEIChSZXF1aXJlbWVudCAxMS4xLCAxMS4yLCAxMS4zLCAxMS40KVxyXG4gICAgdHJ5IHtcclxuICAgICAgYXdhaXQgdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKGZpbGVJZCwgJ2ZhaWxlZCcsIHtcclxuICAgICAgICBlcnJvcl9tZXNzYWdlOiBlcnJvck1lc3NhZ2UsXHJcbiAgICAgICAgZXJyb3JfdGltZXN0YW1wOiBEYXRlLm5vdygpLFxyXG4gICAgICB9KTtcclxuICAgIH0gY2F0Y2ggKHVwZGF0ZUVycm9yKSB7XHJcbiAgICAgIGNvbnNvbGUuZXJyb3IoJ0ZhaWxlZCB0byB1cGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXM6JywgdXBkYXRlRXJyb3IpO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlLXRocm93IHRvIHRyaWdnZXIgU1FTIHJldHJ5L0RMUVxyXG4gICAgdGhyb3cgZXJyb3I7XHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogRG93bmxvYWQgZmlsZSBjb250ZW50IGZyb20gUzNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGRvd25sb2FkRmlsZUZyb21TMyhzM0tleTogc3RyaW5nKTogUHJvbWlzZTxzdHJpbmc+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBHZXRPYmplY3RDb21tYW5kKHtcclxuICAgICAgQnVja2V0OiBidWNrZXROYW1lLFxyXG4gICAgICBLZXk6IHMzS2V5LFxyXG4gICAgfSk7XHJcblxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSBhd2FpdCBzM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgICBpZiAoIXJlc3BvbnNlLkJvZHkpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKCdFbXB0eSByZXNwb25zZSBib2R5IGZyb20gUzMnKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb252ZXJ0IHN0cmVhbSB0byBzdHJpbmdcclxuICAgIGNvbnN0IGNodW5rczogVWludDhBcnJheVtdID0gW107XHJcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlc3BvbnNlLkJvZHkgYXMgYW55KSB7XHJcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpO1xyXG4gICAgcmV0dXJuIGJ1ZmZlci50b1N0cmluZygndXRmLTgnKTtcclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgY29uc29sZS5lcnJvcignRXJyb3IgZG93bmxvYWRpbmcgZmlsZSBmcm9tIFMzOicsIGVycm9yKTtcclxuICAgIHRocm93IG5ldyBFcnJvcihgRmFpbGVkIHRvIGRvd25sb2FkIGZpbGUgZnJvbSBTMzogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdG9yZSBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhcclxuICByZXN1bHQ6IGFueSxcclxuICBvcmdhbml6YXRpb25JZD86IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgaXRlbSA9IHtcclxuICAgICAgYW5hbHlzaXNJZDogcmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogcmVzdWx0LmZpbGVJZCxcclxuICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICB2aW9sYXRpb25zOiByZXN1bHQudmlvbGF0aW9ucyxcclxuICAgICAgc3VtbWFyeTogcmVzdWx0LnN1bW1hcnksXHJcbiAgICAgIHN0YXR1czogcmVzdWx0LnN0YXR1cyxcclxuICAgICAgY3JlYXRlZEF0OiByZXN1bHQuY3JlYXRlZEF0LFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGFuYWx5c2lzUmVzdWx0c1RhYmxlLFxyXG4gICAgICBJdGVtOiBtYXJzaGFsbChpdGVtKSxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgY29uc29sZS5sb2coYEFuYWx5c2lzIHJlc3VsdHMgc3RvcmVkIHdpdGggSUQ6ICR7cmVzdWx0LmFuYWx5c2lzSWR9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHN0b3JpbmcgYW5hbHlzaXMgcmVzdWx0czonLCBlcnJvcik7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEZhaWxlZCB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBmaWxlIG1ldGFkYXRhIHN0YXR1cyBpbiBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gdXBkYXRlRmlsZU1ldGFkYXRhU3RhdHVzKFxyXG4gIGZpbGVJZDogc3RyaW5nLFxyXG4gIHN0YXR1czogc3RyaW5nLFxyXG4gIGFkZGl0aW9uYWxEYXRhPzogUmVjb3JkPHN0cmluZywgYW55PlxyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IFsnU0VUIGFuYWx5c2lzX3N0YXR1cyA9IDpzdGF0dXMnLCAndXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6c3RhdHVzJzogeyBTOiBzdGF0dXMgfSxcclxuICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGFkZGl0aW9uYWxEYXRhKSB7XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ3Zpb2xhdGlvbnNfY291bnQgPSA6dmlvbGF0aW9uc0NvdW50Jyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOnZpb2xhdGlvbnNDb3VudCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS52aW9sYXRpb25zX2NvdW50LnRvU3RyaW5nKCkgfTtcclxuICAgICAgfVxyXG4gICAgICBpZiAoYWRkaXRpb25hbERhdGEuY29tcGxpYW5jZV9wZXJjZW50YWdlICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2NvbXBsaWFuY2VfcGVyY2VudGFnZSA9IDpjb21wbGlhbmNlUGVyY2VudGFnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzpjb21wbGlhbmNlUGVyY2VudGFnZSddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5jb21wbGlhbmNlX3BlcmNlbnRhZ2UudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5hbmFseXNpc19kdXJhdGlvbiAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdhbmFseXNpc19kdXJhdGlvbiA9IDphbmFseXNpc0R1cmF0aW9uJyk7XHJcbiAgICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmFuYWx5c2lzRHVyYXRpb24nXSA9IHsgTjogYWRkaXRpb25hbERhdGEuYW5hbHlzaXNfZHVyYXRpb24udG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl9tZXNzYWdlKSB7XHJcbiAgICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdlcnJvcl9tZXNzYWdlID0gOmVycm9yTWVzc2FnZScpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvck1lc3NhZ2UnXSA9IHsgUzogYWRkaXRpb25hbERhdGEuZXJyb3JfbWVzc2FnZSB9O1xyXG4gICAgICB9XHJcbiAgICAgIGlmIChhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXApIHtcclxuICAgICAgICB1cGRhdGVFeHByZXNzaW9uLnB1c2goJ2Vycm9yX3RpbWVzdGFtcCA9IDplcnJvclRpbWVzdGFtcCcpO1xyXG4gICAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzplcnJvclRpbWVzdGFtcCddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5lcnJvcl90aW1lc3RhbXAudG9TdHJpbmcoKSB9O1xyXG4gICAgICB9XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3QgY29tbWFuZCA9IG5ldyBVcGRhdGVJdGVtQ29tbWFuZCh7XHJcbiAgICAgIFRhYmxlTmFtZTogZmlsZU1ldGFkYXRhVGFibGUsXHJcbiAgICAgIEtleTogbWFyc2hhbGwoeyBmaWxlX2lkOiBmaWxlSWQgfSksXHJcbiAgICAgIFVwZGF0ZUV4cHJlc3Npb246IHVwZGF0ZUV4cHJlc3Npb24uam9pbignLCAnKSxcclxuICAgICAgRXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlczogZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlcyxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgY29uc29sZS5sb2coYEZpbGUgbWV0YWRhdGEgdXBkYXRlZCBmb3IgJHtmaWxlSWR9OiBzdGF0dXM9JHtzdGF0dXN9YCk7XHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnNvbGUuZXJyb3IoJ0Vycm9yIHVwZGF0aW5nIGZpbGUgbWV0YWRhdGE6JywgZXJyb3IpO1xyXG4gICAgdGhyb3cgbmV3IEVycm9yKGBGYWlsZWQgdG8gdXBkYXRlIGZpbGUgbWV0YWRhdGE6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgfVxyXG59XHJcbiJdfQ==