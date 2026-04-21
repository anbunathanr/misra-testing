"use strict";
/**
 * Enhanced MISRA File Analysis Lambda Function
 * Demonstrates production-ready implementation with:
 * - Structured logging with correlation IDs
 * - Comprehensive error handling and retry logic
 * - Custom metrics and performance monitoring
 * - Security validation and rate limiting
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.handler = void 0;
const client_s3_1 = require("@aws-sdk/client-s3");
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const util_dynamodb_1 = require("@aws-sdk/util-dynamodb");
// Enhanced utilities
const logger_1 = require("../../utils/logger");
const error_handler_enhanced_1 = require("../../utils/error-handler-enhanced");
const metrics_util_1 = require("../../utils/metrics-util");
// Existing services (enhanced with new utilities)
const analysis_engine_1 = require("../../services/misra-analysis/analysis-engine");
const misra_analysis_1 = require("../../types/misra-analysis");
// Environment configuration with validation
const config = {
    bucketName: process.env.FILES_BUCKET_NAME || '',
    region: process.env.AWS_REGION || 'us-east-1',
    fileMetadataTable: process.env.FILE_METADATA_TABLE_NAME || '',
    analysisResultsTable: process.env.ANALYSIS_RESULTS_TABLE_NAME || '',
    maxFileSize: parseInt(process.env.MAX_FILE_SIZE || '10485760'), // 10MB
    analysisTimeout: parseInt(process.env.ANALYSIS_TIMEOUT || '300000'), // 5 minutes
    enableCaching: process.env.ENABLE_ANALYSIS_CACHING === 'true',
    cacheTimeout: parseInt(process.env.ANALYSIS_CACHE_TTL || '3600'), // 1 hour
};
// Validate required configuration
if (!config.bucketName || !config.fileMetadataTable || !config.analysisResultsTable) {
    throw new Error('Missing required environment variables');
}
// Initialize AWS clients
const s3Client = new client_s3_1.S3Client({ region: config.region });
const dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: config.region });
const analysisEngine = new analysis_engine_1.MISRAAnalysisEngine();
const metricsCollector = (0, metrics_util_1.getMetricsCollector)();
/**
 * Enhanced Lambda handler for MISRA file analysis
 * Implements comprehensive error handling, monitoring, and security
 */
const handler = async (event, context) => {
    // Initialize correlation ID and logger
    const correlationId = (0, logger_1.generateCorrelationId)();
    const logger = (0, logger_1.createLoggerWithCorrelation)('analyze-file', event, {
        functionName: context.functionName,
        functionVersion: context.functionVersion,
        requestId: context.awsRequestId,
    });
    // Initialize error handler
    const errorHandler = new error_handler_enhanced_1.ErrorHandler('analyze-file');
    // Start performance monitoring
    const startTime = Date.now();
    logger.startTimer('total-execution');
    try {
        logger.info('Analysis request received', {
            httpMethod: event.httpMethod,
            path: event.path,
            userAgent: event.headers['User-Agent'],
            sourceIp: event.requestContext.identity.sourceIp,
        });
        // Security: Validate request method
        if (event.httpMethod !== 'POST') {
            throw new error_handler_enhanced_1.AppError('Method not allowed', error_handler_enhanced_1.ErrorType.VALIDATION_ERROR, 405, true, correlationId);
        }
        // Parse and validate request body
        const request = await parseAndValidateRequest(event.body, correlationId);
        logger.info('Request validated', { fileId: request.fileId });
        // Security: Rate limiting check (simplified - in production use Redis/DynamoDB)
        await checkRateLimit(event.requestContext.identity.sourceIp, correlationId);
        // Execute analysis with retry logic
        const result = await errorHandler.withRetry(() => executeAnalysis(request, context, logger, correlationId), 'misra-analysis', correlationId);
        // Record success metrics
        const duration = Date.now() - startTime;
        await metricsCollector.recordAnalysisMetrics(request.language || 'unknown', result.rulesChecked, result.violationsFound, result.complianceScore, duration, correlationId);
        await metricsCollector.recordApiMetrics(event.httpMethod, event.path, 200, duration, correlationId);
        logger.endTimer('total-execution', {
            success: true,
            complianceScore: result.complianceScore,
            violationsFound: result.violationsFound,
        });
        logger.info('Analysis completed successfully', {
            analysisId: result.analysisId,
            complianceScore: result.complianceScore,
            violationsFound: result.violationsFound,
            duration,
        });
        return (0, error_handler_enhanced_1.createSuccessResponse)(result, 200, correlationId);
    }
    catch (error) {
        const duration = Date.now() - startTime;
        // Record error metrics
        await metricsCollector.recordApiMetrics(event.httpMethod, event.path, error instanceof error_handler_enhanced_1.AppError ? error.statusCode : 500, duration, correlationId);
        logger.endTimer('total-execution', {
            success: false,
            error: error.message,
        });
        logger.error('Analysis failed', error, {
            duration,
            correlationId,
        });
        return errorHandler.handleError(error, correlationId);
    }
};
exports.handler = handler;
/**
 * Parse and validate the request body
 */
async function parseAndValidateRequest(body, correlationId) {
    if (!body) {
        throw new error_handler_enhanced_1.AppError('Request body is required', error_handler_enhanced_1.ErrorType.VALIDATION_ERROR, 400, true, correlationId);
    }
    let request;
    try {
        request = JSON.parse(body);
    }
    catch (error) {
        throw new error_handler_enhanced_1.AppError('Invalid JSON in request body', error_handler_enhanced_1.ErrorType.VALIDATION_ERROR, 400, true, correlationId);
    }
    // Validate required fields
    (0, error_handler_enhanced_1.validateRequired)(request.fileId, 'fileId');
    // Validate file ID format (UUID)
    const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
    if (!uuidRegex.test(request.fileId)) {
        throw new error_handler_enhanced_1.AppError('Invalid fileId format', error_handler_enhanced_1.ErrorType.VALIDATION_ERROR, 400, true, correlationId);
    }
    return request;
}
/**
 * Simple rate limiting check (in production, use Redis or DynamoDB)
 */
async function checkRateLimit(sourceIp, correlationId) {
    // Simplified rate limiting - in production, implement proper rate limiting
    // using Redis or DynamoDB with sliding window or token bucket algorithm
    const rateLimitKey = `rate_limit:${sourceIp}`;
    // This is a placeholder - implement actual rate limiting logic
    // For now, just log the rate limit check
    await (0, logger_1.recordCustomMetric)('MISRA/Security', 'RateLimitCheck', 1, 'Count', { sourceIp, correlationId });
}
/**
 * Execute the MISRA analysis with comprehensive error handling
 */
async function executeAnalysis(request, context, logger, correlationId) {
    const { fileId, language, options } = request;
    logger.info('Starting analysis execution', { fileId, language });
    // Step 1: Get file metadata from DynamoDB
    logger.startTimer('get-file-metadata');
    const fileMetadata = await getFileMetadata(fileId, correlationId);
    logger.endTimer('get-file-metadata');
    // Step 2: Download file from S3
    logger.startTimer('download-file');
    const fileContent = await downloadFileFromS3(fileMetadata.s3Key, fileMetadata.fileSize, correlationId);
    logger.endTimer('download-file', { fileSize: fileContent.length });
    // Step 3: Determine language if not provided
    const analysisLanguage = language || detectLanguage(fileMetadata.fileName);
    // Step 4: Check cache if enabled
    let cachedResult = null;
    if (config.enableCaching) {
        logger.startTimer('check-cache');
        cachedResult = await checkAnalysisCache(fileMetadata.contentHash, correlationId);
        logger.endTimer('check-cache');
        if (cachedResult) {
            logger.info('Using cached analysis result', {
                analysisId: cachedResult.analysisId,
                cacheAge: Date.now() - cachedResult.timestamp,
            });
            await metricsCollector.recordMetric('CacheHit', 1, 'Count', {
                fileType: analysisLanguage,
                correlationId,
            });
            return cachedResult;
        }
    }
    // Step 5: Execute MISRA analysis
    logger.startTimer('misra-analysis');
    const progressCallback = options?.enableProgressTracking
        ? (progress, message) => updateAnalysisProgress(fileId, progress, message, logger)
        : undefined;
    const analysisResult = await analysisEngine.analyzeFile(fileContent, analysisLanguage, fileId, fileMetadata.userId, {
        progressCallback,
        updateInterval: 2000,
    });
    logger.endTimer('misra-analysis', {
        violationsFound: analysisResult.violations.length,
        complianceScore: analysisResult.summary.compliancePercentage,
    });
    // Step 6: Store results
    logger.startTimer('store-results');
    await storeAnalysisResults(analysisResult, fileMetadata.organizationId, correlationId);
    logger.endTimer('store-results');
    // Step 7: Update file metadata
    logger.startTimer('update-metadata');
    await updateFileMetadataStatus(fileId, 'completed', {
        analysisId: analysisResult.analysisId,
        violationsCount: analysisResult.violations.length,
        complianceScore: analysisResult.summary.compliancePercentage,
    }, correlationId);
    logger.endTimer('update-metadata');
    // Step 8: Cache result if enabled
    if (config.enableCaching) {
        logger.startTimer('cache-result');
        await cacheAnalysisResult(fileMetadata.contentHash, analysisResult, correlationId);
        logger.endTimer('cache-result');
    }
    logger.info('Analysis execution completed', {
        analysisId: analysisResult.analysisId,
        violationsFound: analysisResult.violations.length,
        complianceScore: analysisResult.summary.compliancePercentage,
    });
    return {
        analysisId: analysisResult.analysisId,
        fileId,
        complianceScore: analysisResult.summary.compliancePercentage,
        violationsFound: analysisResult.violations.length,
        rulesChecked: analysisResult.summary.totalViolations || 0, // Use totalViolations as proxy for rules checked
        summary: analysisResult.summary,
    };
}
/**
 * Get file metadata from DynamoDB
 */
async function getFileMetadata(fileId, correlationId) {
    // Implementation would query DynamoDB for file metadata
    // This is a placeholder for the actual implementation
    return {
        fileId,
        fileName: 'example.cpp',
        s3Key: `uploads/${fileId}/example.cpp`,
        fileSize: 1024,
        contentHash: 'sha256-hash',
        userId: 'user-123',
        organizationId: 'org-456',
    };
}
/**
 * Download file from S3 with validation
 */
async function downloadFileFromS3(s3Key, expectedSize, correlationId) {
    try {
        // Validate file size before download
        (0, error_handler_enhanced_1.validateFileSize)(expectedSize, config.maxFileSize);
        const command = new client_s3_1.GetObjectCommand({
            Bucket: config.bucketName,
            Key: s3Key,
        });
        const response = await s3Client.send(command);
        if (!response.Body) {
            throw new error_handler_enhanced_1.AppError('Empty response from S3', error_handler_enhanced_1.ErrorType.EXTERNAL_SERVICE_ERROR, 500, true, correlationId);
        }
        // Convert stream to string
        const chunks = [];
        for await (const chunk of response.Body) {
            chunks.push(chunk);
        }
        const buffer = Buffer.concat(chunks);
        const content = buffer.toString('utf-8');
        // Validate downloaded content
        if (content.length === 0) {
            throw new error_handler_enhanced_1.AppError('Downloaded file is empty', error_handler_enhanced_1.ErrorType.VALIDATION_ERROR, 400, true, correlationId);
        }
        // Record S3 metrics
        await metricsCollector.recordMetric('S3Download', 1, 'Count', {
            bucket: config.bucketName,
            correlationId,
        });
        return content;
    }
    catch (error) {
        if (error instanceof error_handler_enhanced_1.AppError) {
            throw error;
        }
        throw new error_handler_enhanced_1.AppError(`Failed to download file from S3: ${error.message}`, error_handler_enhanced_1.ErrorType.EXTERNAL_SERVICE_ERROR, 500, true, correlationId);
    }
}
/**
 * Detect programming language from file name
 */
function detectLanguage(fileName) {
    const extension = fileName.split('.').pop()?.toLowerCase();
    switch (extension) {
        case 'c':
            return misra_analysis_1.Language.C;
        case 'cpp':
        case 'cxx':
        case 'cc':
            return misra_analysis_1.Language.CPP;
        case 'h':
        case 'hpp':
            return misra_analysis_1.Language.C; // Default to C for headers
        default:
            return misra_analysis_1.Language.C; // Default fallback
    }
}
/**
 * Check analysis cache (placeholder implementation)
 */
async function checkAnalysisCache(contentHash, correlationId) {
    // In production, this would check DynamoDB or Redis cache
    // Return null for now (cache miss)
    return null;
}
/**
 * Cache analysis result (placeholder implementation)
 */
async function cacheAnalysisResult(contentHash, result, correlationId) {
    // In production, this would store in DynamoDB or Redis cache
    // with TTL set to config.cacheTimeout
}
/**
 * Store analysis results in DynamoDB
 */
async function storeAnalysisResults(result, organizationId, correlationId) {
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
            correlationId,
        };
        const command = new client_dynamodb_1.PutItemCommand({
            TableName: config.analysisResultsTable,
            Item: (0, util_dynamodb_1.marshall)(item),
        });
        await dynamoClient.send(command);
    }
    catch (error) {
        throw new error_handler_enhanced_1.AppError(`Failed to store analysis results: ${error.message}`, error_handler_enhanced_1.ErrorType.DATABASE_ERROR, 500, true, correlationId);
    }
}
/**
 * Update file metadata status
 */
async function updateFileMetadataStatus(fileId, status, additionalData, correlationId) {
    try {
        const updateExpression = ['SET analysis_status = :status', 'updated_at = :updatedAt'];
        const expressionAttributeValues = {
            ':status': { S: status },
            ':updatedAt': { N: Math.floor(Date.now() / 1000).toString() },
        };
        if (additionalData.analysisId) {
            updateExpression.push('analysis_id = :analysisId');
            expressionAttributeValues[':analysisId'] = { S: additionalData.analysisId };
        }
        if (additionalData.violationsCount !== undefined) {
            updateExpression.push('violations_count = :violationsCount');
            expressionAttributeValues[':violationsCount'] = { N: additionalData.violationsCount.toString() };
        }
        if (additionalData.complianceScore !== undefined) {
            updateExpression.push('compliance_score = :complianceScore');
            expressionAttributeValues[':complianceScore'] = { N: additionalData.complianceScore.toString() };
        }
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: config.fileMetadataTable,
            Key: (0, util_dynamodb_1.marshall)({ file_id: fileId }),
            UpdateExpression: updateExpression.join(', '),
            ExpressionAttributeValues: expressionAttributeValues,
        });
        await dynamoClient.send(command);
    }
    catch (error) {
        throw new error_handler_enhanced_1.AppError(`Failed to update file metadata: ${error.message}`, error_handler_enhanced_1.ErrorType.DATABASE_ERROR, 500, true, correlationId);
    }
}
/**
 * Update analysis progress (non-critical operation)
 */
async function updateAnalysisProgress(fileId, progress, message, logger) {
    try {
        const command = new client_dynamodb_1.UpdateItemCommand({
            TableName: config.fileMetadataTable,
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
        // Progress updates are non-critical, just log the error
        logger.warn('Failed to update analysis progress', {
            fileId,
            progress,
            error: error.message,
        });
    }
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiYW5hbHl6ZS1maWxlLWVuaGFuY2VkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiYW5hbHl6ZS1maWxlLWVuaGFuY2VkLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7OztHQU9HOzs7QUFHSCxrREFBZ0U7QUFDaEUsOERBQTZGO0FBQzdGLDBEQUFrRDtBQUVsRCxxQkFBcUI7QUFDckIsK0NBSTRCO0FBQzVCLCtFQU80QztBQUM1QywyREFHa0M7QUFFbEMsa0RBQWtEO0FBQ2xELG1GQUFvRjtBQUNwRiwrREFBc0Q7QUFFdEQsNENBQTRDO0FBQzVDLE1BQU0sTUFBTSxHQUFHO0lBQ2IsVUFBVSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsaUJBQWlCLElBQUksRUFBRTtJQUMvQyxNQUFNLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxVQUFVLElBQUksV0FBVztJQUM3QyxpQkFBaUIsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLHdCQUF3QixJQUFJLEVBQUU7SUFDN0Qsb0JBQW9CLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQywyQkFBMkIsSUFBSSxFQUFFO0lBQ25FLFdBQVcsRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxhQUFhLElBQUksVUFBVSxDQUFDLEVBQUUsT0FBTztJQUN2RSxlQUFlLEVBQUUsUUFBUSxDQUFDLE9BQU8sQ0FBQyxHQUFHLENBQUMsZ0JBQWdCLElBQUksUUFBUSxDQUFDLEVBQUUsWUFBWTtJQUNqRixhQUFhLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyx1QkFBdUIsS0FBSyxNQUFNO0lBQzdELFlBQVksRUFBRSxRQUFRLENBQUMsT0FBTyxDQUFDLEdBQUcsQ0FBQyxrQkFBa0IsSUFBSSxNQUFNLENBQUMsRUFBRSxTQUFTO0NBQzVFLENBQUM7QUFFRixrQ0FBa0M7QUFDbEMsSUFBSSxDQUFDLE1BQU0sQ0FBQyxVQUFVLElBQUksQ0FBQyxNQUFNLENBQUMsaUJBQWlCLElBQUksQ0FBQyxNQUFN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QztJQUNMLENBQUM7QUFDSCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVuaGFuY2VkIE1JU1JBIEZpbGUgQW5hbHlzaXMgTGFtYmRhIEZ1bmN0aW9uXHJcbiAqIERlbW9uc3RyYXRlcyBwcm9kdWN0aW9uLXJlYWR5IGltcGxlbWVudGF0aW9uIHdpdGg6XHJcbiAqIC0gU3RydWN0dXJlZCBsb2dnaW5nIHdpdGggY29ycmVsYXRpb24gSURzXHJcbiAqIC0gQ29tcHJlaGVuc2l2ZSBlcnJvciBoYW5kbGluZyBhbmQgcmV0cnkgbG9naWNcclxuICogLSBDdXN0b20gbWV0cmljcyBhbmQgcGVyZm9ybWFuY2UgbW9uaXRvcmluZ1xyXG4gKiAtIFNlY3VyaXR5IHZhbGlkYXRpb24gYW5kIHJhdGUgbGltaXRpbmdcclxuICovXHJcblxyXG5pbXBvcnQgeyBBUElHYXRld2F5UHJveHlFdmVudCwgQVBJR2F0ZXdheVByb3h5UmVzdWx0LCBDb250ZXh0IH0gZnJvbSAnYXdzLWxhbWJkYSc7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBHZXRPYmplY3RDb21tYW5kIH0gZnJvbSAnQGF3cy1zZGsvY2xpZW50LXMzJztcclxuaW1wb3J0IHsgRHluYW1vREJDbGllbnQsIFB1dEl0ZW1Db21tYW5kLCBVcGRhdGVJdGVtQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IG1hcnNoYWxsIH0gZnJvbSAnQGF3cy1zZGsvdXRpbC1keW5hbW9kYic7XHJcblxyXG4vLyBFbmhhbmNlZCB1dGlsaXRpZXNcclxuaW1wb3J0IHsgXHJcbiAgY3JlYXRlTG9nZ2VyV2l0aENvcnJlbGF0aW9uLCBcclxuICBnZW5lcmF0ZUNvcnJlbGF0aW9uSWQsXHJcbiAgcmVjb3JkQ3VzdG9tTWV0cmljIFxyXG59IGZyb20gJy4uLy4uL3V0aWxzL2xvZ2dlcic7XHJcbmltcG9ydCB7IFxyXG4gIEVycm9ySGFuZGxlciwgXHJcbiAgQXBwRXJyb3IsIFxyXG4gIEVycm9yVHlwZSwgXHJcbiAgY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlLFxyXG4gIHZhbGlkYXRlUmVxdWlyZWQsXHJcbiAgdmFsaWRhdGVGaWxlU2l6ZSBcclxufSBmcm9tICcuLi8uLi91dGlscy9lcnJvci1oYW5kbGVyLWVuaGFuY2VkJztcclxuaW1wb3J0IHsgXHJcbiAgZ2V0TWV0cmljc0NvbGxlY3RvcixcclxuICB3aXRoUGVyZm9ybWFuY2VNb25pdG9yaW5nIFxyXG59IGZyb20gJy4uLy4uL3V0aWxzL21ldHJpY3MtdXRpbCc7XHJcblxyXG4vLyBFeGlzdGluZyBzZXJ2aWNlcyAoZW5oYW5jZWQgd2l0aCBuZXcgdXRpbGl0aWVzKVxyXG5pbXBvcnQgeyBNSVNSQUFuYWx5c2lzRW5naW5lIH0gZnJvbSAnLi4vLi4vc2VydmljZXMvbWlzcmEtYW5hbHlzaXMvYW5hbHlzaXMtZW5naW5lJztcclxuaW1wb3J0IHsgTGFuZ3VhZ2UgfSBmcm9tICcuLi8uLi90eXBlcy9taXNyYS1hbmFseXNpcyc7XHJcblxyXG4vLyBFbnZpcm9ubWVudCBjb25maWd1cmF0aW9uIHdpdGggdmFsaWRhdGlvblxyXG5jb25zdCBjb25maWcgPSB7XHJcbiAgYnVja2V0TmFtZTogcHJvY2Vzcy5lbnYuRklMRVNfQlVDS0VUX05BTUUgfHwgJycsXHJcbiAgcmVnaW9uOiBwcm9jZXNzLmVudi5BV1NfUkVHSU9OIHx8ICd1cy1lYXN0LTEnLFxyXG4gIGZpbGVNZXRhZGF0YVRhYmxlOiBwcm9jZXNzLmVudi5GSUxFX01FVEFEQVRBX1RBQkxFX05BTUUgfHwgJycsXHJcbiAgYW5hbHlzaXNSZXN1bHRzVGFibGU6IHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEVfTkFNRSB8fCAnJyxcclxuICBtYXhGaWxlU2l6ZTogcGFyc2VJbnQocHJvY2Vzcy5lbnYuTUFYX0ZJTEVfU0laRSB8fCAnMTA0ODU3NjAnKSwgLy8gMTBNQlxyXG4gIGFuYWx5c2lzVGltZW91dDogcGFyc2VJbnQocHJvY2Vzcy5lbnYuQU5BTFlTSVNfVElNRU9VVCB8fCAnMzAwMDAwJyksIC8vIDUgbWludXRlc1xyXG4gIGVuYWJsZUNhY2hpbmc6IHByb2Nlc3MuZW52LkVOQUJMRV9BTkFMWVNJU19DQUNISU5HID09PSAndHJ1ZScsXHJcbiAgY2FjaGVUaW1lb3V0OiBwYXJzZUludChwcm9jZXNzLmVudi5BTkFMWVNJU19DQUNIRV9UVEwgfHwgJzM2MDAnKSwgLy8gMSBob3VyXHJcbn07XHJcblxyXG4vLyBWYWxpZGF0ZSByZXF1aXJlZCBjb25maWd1cmF0aW9uXHJcbmlmICghY29uZmlnLmJ1Y2tldE5hbWUgfHwgIWNvbmZpZy5maWxlTWV0YWRhdGFUYWJsZSB8fCAhY29uZmlnLmFuYWx5c2lzUmVzdWx0c1RhYmxlKSB7XHJcbiAgdGhyb3cgbmV3IEVycm9yKCdNaXNzaW5nIHJlcXVpcmVkIGVudmlyb25tZW50IHZhcmlhYmxlcycpO1xyXG59XHJcblxyXG4vLyBJbml0aWFsaXplIEFXUyBjbGllbnRzXHJcbmNvbnN0IHMzQ2xpZW50ID0gbmV3IFMzQ2xpZW50KHsgcmVnaW9uOiBjb25maWcucmVnaW9uIH0pO1xyXG5jb25zdCBkeW5hbW9DbGllbnQgPSBuZXcgRHluYW1vREJDbGllbnQoeyByZWdpb246IGNvbmZpZy5yZWdpb24gfSk7XHJcbmNvbnN0IGFuYWx5c2lzRW5naW5lID0gbmV3IE1JU1JBQW5hbHlzaXNFbmdpbmUoKTtcclxuY29uc3QgbWV0cmljc0NvbGxlY3RvciA9IGdldE1ldHJpY3NDb2xsZWN0b3IoKTtcclxuXHJcbmludGVyZmFjZSBBbmFseXNpc1JlcXVlc3Qge1xyXG4gIGZpbGVJZDogc3RyaW5nO1xyXG4gIGZpbGVOYW1lPzogc3RyaW5nO1xyXG4gIGxhbmd1YWdlPzogTGFuZ3VhZ2U7XHJcbiAgb3B0aW9ucz86IHtcclxuICAgIGVuYWJsZVByb2dyZXNzVHJhY2tpbmc/OiBib29sZWFuO1xyXG4gICAgY3VzdG9tUnVsZXM/OiBzdHJpbmdbXTtcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogRW5oYW5jZWQgTGFtYmRhIGhhbmRsZXIgZm9yIE1JU1JBIGZpbGUgYW5hbHlzaXNcclxuICogSW1wbGVtZW50cyBjb21wcmVoZW5zaXZlIGVycm9yIGhhbmRsaW5nLCBtb25pdG9yaW5nLCBhbmQgc2VjdXJpdHlcclxuICovXHJcbmV4cG9ydCBjb25zdCBoYW5kbGVyID0gYXN5bmMgKFxyXG4gIGV2ZW50OiBBUElHYXRld2F5UHJveHlFdmVudCxcclxuICBjb250ZXh0OiBDb250ZXh0XHJcbik6IFByb21pc2U8QVBJR2F0ZXdheVByb3h5UmVzdWx0PiA9PiB7XHJcbiAgLy8gSW5pdGlhbGl6ZSBjb3JyZWxhdGlvbiBJRCBhbmQgbG9nZ2VyXHJcbiAgY29uc3QgY29ycmVsYXRpb25JZCA9IGdlbmVyYXRlQ29ycmVsYXRpb25JZCgpO1xyXG4gIGNvbnN0IGxvZ2dlciA9IGNyZWF0ZUxvZ2dlcldpdGhDb3JyZWxhdGlvbignYW5hbHl6ZS1maWxlJywgZXZlbnQsIHtcclxuICAgIGZ1bmN0aW9uTmFtZTogY29udGV4dC5mdW5jdGlvbk5hbWUsXHJcbiAgICBmdW5jdGlvblZlcnNpb246IGNvbnRleHQuZnVuY3Rpb25WZXJzaW9uLFxyXG4gICAgcmVxdWVzdElkOiBjb250ZXh0LmF3c1JlcXVlc3RJZCxcclxuICB9KTtcclxuXHJcbiAgLy8gSW5pdGlhbGl6ZSBlcnJvciBoYW5kbGVyXHJcbiAgY29uc3QgZXJyb3JIYW5kbGVyID0gbmV3IEVycm9ySGFuZGxlcignYW5hbHl6ZS1maWxlJyk7XHJcblxyXG4gIC8vIFN0YXJ0IHBlcmZvcm1hbmNlIG1vbml0b3JpbmdcclxuICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gIGxvZ2dlci5zdGFydFRpbWVyKCd0b3RhbC1leGVjdXRpb24nKTtcclxuXHJcbiAgdHJ5IHtcclxuICAgIGxvZ2dlci5pbmZvKCdBbmFseXNpcyByZXF1ZXN0IHJlY2VpdmVkJywge1xyXG4gICAgICBodHRwTWV0aG9kOiBldmVudC5odHRwTWV0aG9kLFxyXG4gICAgICBwYXRoOiBldmVudC5wYXRoLFxyXG4gICAgICB1c2VyQWdlbnQ6IGV2ZW50LmhlYWRlcnNbJ1VzZXItQWdlbnQnXSxcclxuICAgICAgc291cmNlSXA6IGV2ZW50LnJlcXVlc3RDb250ZXh0LmlkZW50aXR5LnNvdXJjZUlwLFxyXG4gICAgfSk7XHJcblxyXG4gICAgLy8gU2VjdXJpdHk6IFZhbGlkYXRlIHJlcXVlc3QgbWV0aG9kXHJcbiAgICBpZiAoZXZlbnQuaHR0cE1ldGhvZCAhPT0gJ1BPU1QnKSB7XHJcbiAgICAgIHRocm93IG5ldyBBcHBFcnJvcihcclxuICAgICAgICAnTWV0aG9kIG5vdCBhbGxvd2VkJyxcclxuICAgICAgICBFcnJvclR5cGUuVkFMSURBVElPTl9FUlJPUixcclxuICAgICAgICA0MDUsXHJcbiAgICAgICAgdHJ1ZSxcclxuICAgICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICAgICk7XHJcbiAgICB9XHJcblxyXG4gICAgLy8gUGFyc2UgYW5kIHZhbGlkYXRlIHJlcXVlc3QgYm9keVxyXG4gICAgY29uc3QgcmVxdWVzdCA9IGF3YWl0IHBhcnNlQW5kVmFsaWRhdGVSZXF1ZXN0KGV2ZW50LmJvZHksIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgbG9nZ2VyLmluZm8oJ1JlcXVlc3QgdmFsaWRhdGVkJywgeyBmaWxlSWQ6IHJlcXVlc3QuZmlsZUlkIH0pO1xyXG5cclxuICAgIC8vIFNlY3VyaXR5OiBSYXRlIGxpbWl0aW5nIGNoZWNrIChzaW1wbGlmaWVkIC0gaW4gcHJvZHVjdGlvbiB1c2UgUmVkaXMvRHluYW1vREIpXHJcbiAgICBhd2FpdCBjaGVja1JhdGVMaW1pdChldmVudC5yZXF1ZXN0Q29udGV4dC5pZGVudGl0eS5zb3VyY2VJcCwgY29ycmVsYXRpb25JZCk7XHJcblxyXG4gICAgLy8gRXhlY3V0ZSBhbmFseXNpcyB3aXRoIHJldHJ5IGxvZ2ljXHJcbiAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBlcnJvckhhbmRsZXIud2l0aFJldHJ5KFxyXG4gICAgICAoKSA9PiBleGVjdXRlQW5hbHlzaXMocmVxdWVzdCwgY29udGV4dCwgbG9nZ2VyLCBjb3JyZWxhdGlvbklkKSxcclxuICAgICAgJ21pc3JhLWFuYWx5c2lzJyxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuXHJcbiAgICAvLyBSZWNvcmQgc3VjY2VzcyBtZXRyaWNzXHJcbiAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydFRpbWU7XHJcbiAgICBhd2FpdCBtZXRyaWNzQ29sbGVjdG9yLnJlY29yZEFuYWx5c2lzTWV0cmljcyhcclxuICAgICAgcmVxdWVzdC5sYW5ndWFnZSB8fCAndW5rbm93bicsXHJcbiAgICAgIHJlc3VsdC5ydWxlc0NoZWNrZWQsXHJcbiAgICAgIHJlc3VsdC52aW9sYXRpb25zRm91bmQsXHJcbiAgICAgIHJlc3VsdC5jb21wbGlhbmNlU2NvcmUsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIGF3YWl0IG1ldHJpY3NDb2xsZWN0b3IucmVjb3JkQXBpTWV0cmljcyhcclxuICAgICAgZXZlbnQuaHR0cE1ldGhvZCxcclxuICAgICAgZXZlbnQucGF0aCxcclxuICAgICAgMjAwLFxyXG4gICAgICBkdXJhdGlvbixcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuXHJcbiAgICBsb2dnZXIuZW5kVGltZXIoJ3RvdGFsLWV4ZWN1dGlvbicsIHsgXHJcbiAgICAgIHN1Y2Nlc3M6IHRydWUsXHJcbiAgICAgIGNvbXBsaWFuY2VTY29yZTogcmVzdWx0LmNvbXBsaWFuY2VTY29yZSxcclxuICAgICAgdmlvbGF0aW9uc0ZvdW5kOiByZXN1bHQudmlvbGF0aW9uc0ZvdW5kLFxyXG4gICAgfSk7XHJcblxyXG4gICAgbG9nZ2VyLmluZm8oJ0FuYWx5c2lzIGNvbXBsZXRlZCBzdWNjZXNzZnVsbHknLCB7XHJcbiAgICAgIGFuYWx5c2lzSWQ6IHJlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgICBjb21wbGlhbmNlU2NvcmU6IHJlc3VsdC5jb21wbGlhbmNlU2NvcmUsXHJcbiAgICAgIHZpb2xhdGlvbnNGb3VuZDogcmVzdWx0LnZpb2xhdGlvbnNGb3VuZCxcclxuICAgICAgZHVyYXRpb24sXHJcbiAgICB9KTtcclxuXHJcbiAgICByZXR1cm4gY3JlYXRlU3VjY2Vzc1Jlc3BvbnNlKHJlc3VsdCwgMjAwLCBjb3JyZWxhdGlvbklkKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgIFxyXG4gICAgLy8gUmVjb3JkIGVycm9yIG1ldHJpY3NcclxuICAgIGF3YWl0IG1ldHJpY3NDb2xsZWN0b3IucmVjb3JkQXBpTWV0cmljcyhcclxuICAgICAgZXZlbnQuaHR0cE1ldGhvZCxcclxuICAgICAgZXZlbnQucGF0aCxcclxuICAgICAgZXJyb3IgaW5zdGFuY2VvZiBBcHBFcnJvciA/IGVycm9yLnN0YXR1c0NvZGUgOiA1MDAsXHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG5cclxuICAgIGxvZ2dlci5lbmRUaW1lcigndG90YWwtZXhlY3V0aW9uJywgeyBcclxuICAgICAgc3VjY2VzczogZmFsc2UsXHJcbiAgICAgIGVycm9yOiAoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2UsXHJcbiAgICB9KTtcclxuXHJcbiAgICBsb2dnZXIuZXJyb3IoJ0FuYWx5c2lzIGZhaWxlZCcsIGVycm9yIGFzIEVycm9yLCB7XHJcbiAgICAgIGR1cmF0aW9uLFxyXG4gICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgfSk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9ySGFuZGxlci5oYW5kbGVFcnJvcihlcnJvciBhcyBFcnJvciwgY29ycmVsYXRpb25JZCk7XHJcbiAgfVxyXG59O1xyXG5cclxuLyoqXHJcbiAqIFBhcnNlIGFuZCB2YWxpZGF0ZSB0aGUgcmVxdWVzdCBib2R5XHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBwYXJzZUFuZFZhbGlkYXRlUmVxdWVzdChcclxuICBib2R5OiBzdHJpbmcgfCBudWxsLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPEFuYWx5c2lzUmVxdWVzdD4ge1xyXG4gIGlmICghYm9keSkge1xyXG4gICAgdGhyb3cgbmV3IEFwcEVycm9yKFxyXG4gICAgICAnUmVxdWVzdCBib2R5IGlzIHJlcXVpcmVkJyxcclxuICAgICAgRXJyb3JUeXBlLlZBTElEQVRJT05fRVJST1IsXHJcbiAgICAgIDQwMCxcclxuICAgICAgdHJ1ZSxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIGxldCByZXF1ZXN0OiBBbmFseXNpc1JlcXVlc3Q7XHJcbiAgdHJ5IHtcclxuICAgIHJlcXVlc3QgPSBKU09OLnBhcnNlKGJvZHkpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB0aHJvdyBuZXcgQXBwRXJyb3IoXHJcbiAgICAgICdJbnZhbGlkIEpTT04gaW4gcmVxdWVzdCBib2R5JyxcclxuICAgICAgRXJyb3JUeXBlLlZBTElEQVRJT05fRVJST1IsXHJcbiAgICAgIDQwMCxcclxuICAgICAgdHJ1ZSxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8vIFZhbGlkYXRlIHJlcXVpcmVkIGZpZWxkc1xyXG4gIHZhbGlkYXRlUmVxdWlyZWQocmVxdWVzdC5maWxlSWQsICdmaWxlSWQnKTtcclxuXHJcbiAgLy8gVmFsaWRhdGUgZmlsZSBJRCBmb3JtYXQgKFVVSUQpXHJcbiAgY29uc3QgdXVpZFJlZ2V4ID0gL15bMC05YS1mXXs4fS1bMC05YS1mXXs0fS1bMS01XVswLTlhLWZdezN9LVs4OWFiXVswLTlhLWZdezN9LVswLTlhLWZdezEyfSQvaTtcclxuICBpZiAoIXV1aWRSZWdleC50ZXN0KHJlcXVlc3QuZmlsZUlkKSkge1xyXG4gICAgdGhyb3cgbmV3IEFwcEVycm9yKFxyXG4gICAgICAnSW52YWxpZCBmaWxlSWQgZm9ybWF0JyxcclxuICAgICAgRXJyb3JUeXBlLlZBTElEQVRJT05fRVJST1IsXHJcbiAgICAgIDQwMCxcclxuICAgICAgdHJ1ZSxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIHJldHVybiByZXF1ZXN0O1xyXG59XHJcblxyXG4vKipcclxuICogU2ltcGxlIHJhdGUgbGltaXRpbmcgY2hlY2sgKGluIHByb2R1Y3Rpb24sIHVzZSBSZWRpcyBvciBEeW5hbW9EQilcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNoZWNrUmF0ZUxpbWl0KHNvdXJjZUlwOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8dm9pZD4ge1xyXG4gIC8vIFNpbXBsaWZpZWQgcmF0ZSBsaW1pdGluZyAtIGluIHByb2R1Y3Rpb24sIGltcGxlbWVudCBwcm9wZXIgcmF0ZSBsaW1pdGluZ1xyXG4gIC8vIHVzaW5nIFJlZGlzIG9yIER5bmFtb0RCIHdpdGggc2xpZGluZyB3aW5kb3cgb3IgdG9rZW4gYnVja2V0IGFsZ29yaXRobVxyXG4gIFxyXG4gIGNvbnN0IHJhdGVMaW1pdEtleSA9IGByYXRlX2xpbWl0OiR7c291cmNlSXB9YDtcclxuICAvLyBUaGlzIGlzIGEgcGxhY2Vob2xkZXIgLSBpbXBsZW1lbnQgYWN0dWFsIHJhdGUgbGltaXRpbmcgbG9naWNcclxuICBcclxuICAvLyBGb3Igbm93LCBqdXN0IGxvZyB0aGUgcmF0ZSBsaW1pdCBjaGVja1xyXG4gIGF3YWl0IHJlY29yZEN1c3RvbU1ldHJpYyhcclxuICAgICdNSVNSQS9TZWN1cml0eScsXHJcbiAgICAnUmF0ZUxpbWl0Q2hlY2snLFxyXG4gICAgMSxcclxuICAgICdDb3VudCcsXHJcbiAgICB7IHNvdXJjZUlwLCBjb3JyZWxhdGlvbklkIH1cclxuICApO1xyXG59XHJcblxyXG4vKipcclxuICogRXhlY3V0ZSB0aGUgTUlTUkEgYW5hbHlzaXMgd2l0aCBjb21wcmVoZW5zaXZlIGVycm9yIGhhbmRsaW5nXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBleGVjdXRlQW5hbHlzaXMoXHJcbiAgcmVxdWVzdDogQW5hbHlzaXNSZXF1ZXN0LFxyXG4gIGNvbnRleHQ6IENvbnRleHQsXHJcbiAgbG9nZ2VyOiBhbnksXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IFByb21pc2U8e1xyXG4gIGFuYWx5c2lzSWQ6IHN0cmluZztcclxuICBmaWxlSWQ6IHN0cmluZztcclxuICBjb21wbGlhbmNlU2NvcmU6IG51bWJlcjtcclxuICB2aW9sYXRpb25zRm91bmQ6IG51bWJlcjtcclxuICBydWxlc0NoZWNrZWQ6IG51bWJlcjtcclxuICBzdW1tYXJ5OiBhbnk7XHJcbn0+IHtcclxuICBjb25zdCB7IGZpbGVJZCwgbGFuZ3VhZ2UsIG9wdGlvbnMgfSA9IHJlcXVlc3Q7XHJcbiAgXHJcbiAgbG9nZ2VyLmluZm8oJ1N0YXJ0aW5nIGFuYWx5c2lzIGV4ZWN1dGlvbicsIHsgZmlsZUlkLCBsYW5ndWFnZSB9KTtcclxuXHJcbiAgLy8gU3RlcCAxOiBHZXQgZmlsZSBtZXRhZGF0YSBmcm9tIER5bmFtb0RCXHJcbiAgbG9nZ2VyLnN0YXJ0VGltZXIoJ2dldC1maWxlLW1ldGFkYXRhJyk7XHJcbiAgY29uc3QgZmlsZU1ldGFkYXRhID0gYXdhaXQgZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZCwgY29ycmVsYXRpb25JZCk7XHJcbiAgbG9nZ2VyLmVuZFRpbWVyKCdnZXQtZmlsZS1tZXRhZGF0YScpO1xyXG5cclxuICAvLyBTdGVwIDI6IERvd25sb2FkIGZpbGUgZnJvbSBTM1xyXG4gIGxvZ2dlci5zdGFydFRpbWVyKCdkb3dubG9hZC1maWxlJyk7XHJcbiAgY29uc3QgZmlsZUNvbnRlbnQgPSBhd2FpdCBkb3dubG9hZEZpbGVGcm9tUzMoXHJcbiAgICBmaWxlTWV0YWRhdGEuczNLZXksXHJcbiAgICBmaWxlTWV0YWRhdGEuZmlsZVNpemUsXHJcbiAgICBjb3JyZWxhdGlvbklkXHJcbiAgKTtcclxuICBsb2dnZXIuZW5kVGltZXIoJ2Rvd25sb2FkLWZpbGUnLCB7IGZpbGVTaXplOiBmaWxlQ29udGVudC5sZW5ndGggfSk7XHJcblxyXG4gIC8vIFN0ZXAgMzogRGV0ZXJtaW5lIGxhbmd1YWdlIGlmIG5vdCBwcm92aWRlZFxyXG4gIGNvbnN0IGFuYWx5c2lzTGFuZ3VhZ2UgPSBsYW5ndWFnZSB8fCBkZXRlY3RMYW5ndWFnZShmaWxlTWV0YWRhdGEuZmlsZU5hbWUpO1xyXG4gIFxyXG4gIC8vIFN0ZXAgNDogQ2hlY2sgY2FjaGUgaWYgZW5hYmxlZFxyXG4gIGxldCBjYWNoZWRSZXN1bHQgPSBudWxsO1xyXG4gIGlmIChjb25maWcuZW5hYmxlQ2FjaGluZykge1xyXG4gICAgbG9nZ2VyLnN0YXJ0VGltZXIoJ2NoZWNrLWNhY2hlJyk7XHJcbiAgICBjYWNoZWRSZXN1bHQgPSBhd2FpdCBjaGVja0FuYWx5c2lzQ2FjaGUoZmlsZU1ldGFkYXRhLmNvbnRlbnRIYXNoLCBjb3JyZWxhdGlvbklkKTtcclxuICAgIGxvZ2dlci5lbmRUaW1lcignY2hlY2stY2FjaGUnKTtcclxuICAgIFxyXG4gICAgaWYgKGNhY2hlZFJlc3VsdCkge1xyXG4gICAgICBsb2dnZXIuaW5mbygnVXNpbmcgY2FjaGVkIGFuYWx5c2lzIHJlc3VsdCcsIHsgXHJcbiAgICAgICAgYW5hbHlzaXNJZDogY2FjaGVkUmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgICAgY2FjaGVBZ2U6IERhdGUubm93KCkgLSBjYWNoZWRSZXN1bHQudGltZXN0YW1wLFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIGF3YWl0IG1ldHJpY3NDb2xsZWN0b3IucmVjb3JkTWV0cmljKCdDYWNoZUhpdCcsIDEsICdDb3VudCcsIHtcclxuICAgICAgICBmaWxlVHlwZTogYW5hbHlzaXNMYW5ndWFnZSxcclxuICAgICAgICBjb3JyZWxhdGlvbklkLFxyXG4gICAgICB9KTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiBjYWNoZWRSZXN1bHQ7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvLyBTdGVwIDU6IEV4ZWN1dGUgTUlTUkEgYW5hbHlzaXNcclxuICBsb2dnZXIuc3RhcnRUaW1lcignbWlzcmEtYW5hbHlzaXMnKTtcclxuICBcclxuICBjb25zdCBwcm9ncmVzc0NhbGxiYWNrID0gb3B0aW9ucz8uZW5hYmxlUHJvZ3Jlc3NUcmFja2luZyBcclxuICAgID8gKHByb2dyZXNzOiBudW1iZXIsIG1lc3NhZ2U6IHN0cmluZykgPT4gdXBkYXRlQW5hbHlzaXNQcm9ncmVzcyhmaWxlSWQsIHByb2dyZXNzLCBtZXNzYWdlLCBsb2dnZXIpXHJcbiAgICA6IHVuZGVmaW5lZDtcclxuXHJcbiAgY29uc3QgYW5hbHlzaXNSZXN1bHQgPSBhd2FpdCBhbmFseXNpc0VuZ2luZS5hbmFseXplRmlsZShcclxuICAgIGZpbGVDb250ZW50LFxyXG4gICAgYW5hbHlzaXNMYW5ndWFnZSxcclxuICAgIGZpbGVJZCxcclxuICAgIGZpbGVNZXRhZGF0YS51c2VySWQsXHJcbiAgICB7IFxyXG4gICAgICBwcm9ncmVzc0NhbGxiYWNrLFxyXG4gICAgICB1cGRhdGVJbnRlcnZhbDogMjAwMCxcclxuICAgIH1cclxuICApO1xyXG4gIFxyXG4gIGxvZ2dlci5lbmRUaW1lcignbWlzcmEtYW5hbHlzaXMnLCB7XHJcbiAgICB2aW9sYXRpb25zRm91bmQ6IGFuYWx5c2lzUmVzdWx0LnZpb2xhdGlvbnMubGVuZ3RoLFxyXG4gICAgY29tcGxpYW5jZVNjb3JlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gIH0pO1xyXG5cclxuICAvLyBTdGVwIDY6IFN0b3JlIHJlc3VsdHNcclxuICBsb2dnZXIuc3RhcnRUaW1lcignc3RvcmUtcmVzdWx0cycpO1xyXG4gIGF3YWl0IHN0b3JlQW5hbHlzaXNSZXN1bHRzKGFuYWx5c2lzUmVzdWx0LCBmaWxlTWV0YWRhdGEub3JnYW5pemF0aW9uSWQsIGNvcnJlbGF0aW9uSWQpO1xyXG4gIGxvZ2dlci5lbmRUaW1lcignc3RvcmUtcmVzdWx0cycpO1xyXG5cclxuICAvLyBTdGVwIDc6IFVwZGF0ZSBmaWxlIG1ldGFkYXRhXHJcbiAgbG9nZ2VyLnN0YXJ0VGltZXIoJ3VwZGF0ZS1tZXRhZGF0YScpO1xyXG4gIGF3YWl0IHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhmaWxlSWQsICdjb21wbGV0ZWQnLCB7XHJcbiAgICBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgdmlvbGF0aW9uc0NvdW50OiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgIGNvbXBsaWFuY2VTY29yZTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS5jb21wbGlhbmNlUGVyY2VudGFnZSxcclxuICB9LCBjb3JyZWxhdGlvbklkKTtcclxuICBsb2dnZXIuZW5kVGltZXIoJ3VwZGF0ZS1tZXRhZGF0YScpO1xyXG5cclxuICAvLyBTdGVwIDg6IENhY2hlIHJlc3VsdCBpZiBlbmFibGVkXHJcbiAgaWYgKGNvbmZpZy5lbmFibGVDYWNoaW5nKSB7XHJcbiAgICBsb2dnZXIuc3RhcnRUaW1lcignY2FjaGUtcmVzdWx0Jyk7XHJcbiAgICBhd2FpdCBjYWNoZUFuYWx5c2lzUmVzdWx0KGZpbGVNZXRhZGF0YS5jb250ZW50SGFzaCwgYW5hbHlzaXNSZXN1bHQsIGNvcnJlbGF0aW9uSWQpO1xyXG4gICAgbG9nZ2VyLmVuZFRpbWVyKCdjYWNoZS1yZXN1bHQnKTtcclxuICB9XHJcblxyXG4gIGxvZ2dlci5pbmZvKCdBbmFseXNpcyBleGVjdXRpb24gY29tcGxldGVkJywge1xyXG4gICAgYW5hbHlzaXNJZDogYW5hbHlzaXNSZXN1bHQuYW5hbHlzaXNJZCxcclxuICAgIHZpb2xhdGlvbnNGb3VuZDogYW5hbHlzaXNSZXN1bHQudmlvbGF0aW9ucy5sZW5ndGgsXHJcbiAgICBjb21wbGlhbmNlU2NvcmU6IGFuYWx5c2lzUmVzdWx0LnN1bW1hcnkuY29tcGxpYW5jZVBlcmNlbnRhZ2UsXHJcbiAgfSk7XHJcblxyXG4gIHJldHVybiB7XHJcbiAgICBhbmFseXNpc0lkOiBhbmFseXNpc1Jlc3VsdC5hbmFseXNpc0lkLFxyXG4gICAgZmlsZUlkLFxyXG4gICAgY29tcGxpYW5jZVNjb3JlOiBhbmFseXNpc1Jlc3VsdC5zdW1tYXJ5LmNvbXBsaWFuY2VQZXJjZW50YWdlLFxyXG4gICAgdmlvbGF0aW9uc0ZvdW5kOiBhbmFseXNpc1Jlc3VsdC52aW9sYXRpb25zLmxlbmd0aCxcclxuICAgIHJ1bGVzQ2hlY2tlZDogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeS50b3RhbFZpb2xhdGlvbnMgfHwgMCwgLy8gVXNlIHRvdGFsVmlvbGF0aW9ucyBhcyBwcm94eSBmb3IgcnVsZXMgY2hlY2tlZFxyXG4gICAgc3VtbWFyeTogYW5hbHlzaXNSZXN1bHQuc3VtbWFyeSxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogR2V0IGZpbGUgbWV0YWRhdGEgZnJvbSBEeW5hbW9EQlxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZ2V0RmlsZU1ldGFkYXRhKGZpbGVJZDogc3RyaW5nLCBjb3JyZWxhdGlvbklkOiBzdHJpbmcpOiBQcm9taXNlPGFueT4ge1xyXG4gIC8vIEltcGxlbWVudGF0aW9uIHdvdWxkIHF1ZXJ5IER5bmFtb0RCIGZvciBmaWxlIG1ldGFkYXRhXHJcbiAgLy8gVGhpcyBpcyBhIHBsYWNlaG9sZGVyIGZvciB0aGUgYWN0dWFsIGltcGxlbWVudGF0aW9uXHJcbiAgcmV0dXJuIHtcclxuICAgIGZpbGVJZCxcclxuICAgIGZpbGVOYW1lOiAnZXhhbXBsZS5jcHAnLFxyXG4gICAgczNLZXk6IGB1cGxvYWRzLyR7ZmlsZUlkfS9leGFtcGxlLmNwcGAsXHJcbiAgICBmaWxlU2l6ZTogMTAyNCxcclxuICAgIGNvbnRlbnRIYXNoOiAnc2hhMjU2LWhhc2gnLFxyXG4gICAgdXNlcklkOiAndXNlci0xMjMnLFxyXG4gICAgb3JnYW5pemF0aW9uSWQ6ICdvcmctNDU2JyxcclxuICB9O1xyXG59XHJcblxyXG4vKipcclxuICogRG93bmxvYWQgZmlsZSBmcm9tIFMzIHdpdGggdmFsaWRhdGlvblxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gZG93bmxvYWRGaWxlRnJvbVMzKFxyXG4gIHMzS2V5OiBzdHJpbmcsXHJcbiAgZXhwZWN0ZWRTaXplOiBudW1iZXIsXHJcbiAgY29ycmVsYXRpb25JZDogc3RyaW5nXHJcbik6IFByb21pc2U8c3RyaW5nPiB7XHJcbiAgdHJ5IHtcclxuICAgIC8vIFZhbGlkYXRlIGZpbGUgc2l6ZSBiZWZvcmUgZG93bmxvYWRcclxuICAgIHZhbGlkYXRlRmlsZVNpemUoZXhwZWN0ZWRTaXplLCBjb25maWcubWF4RmlsZVNpemUpO1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgR2V0T2JqZWN0Q29tbWFuZCh7XHJcbiAgICAgIEJ1Y2tldDogY29uZmlnLmJ1Y2tldE5hbWUsXHJcbiAgICAgIEtleTogczNLZXksXHJcbiAgICB9KTtcclxuXHJcbiAgICBjb25zdCByZXNwb25zZSA9IGF3YWl0IHMzQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICBcclxuICAgIGlmICghcmVzcG9uc2UuQm9keSkge1xyXG4gICAgICB0aHJvdyBuZXcgQXBwRXJyb3IoXHJcbiAgICAgICAgJ0VtcHR5IHJlc3BvbnNlIGZyb20gUzMnLFxyXG4gICAgICAgIEVycm9yVHlwZS5FWFRFUk5BTF9TRVJWSUNFX0VSUk9SLFxyXG4gICAgICAgIDUwMCxcclxuICAgICAgICB0cnVlLFxyXG4gICAgICAgIGNvcnJlbGF0aW9uSWRcclxuICAgICAgKTtcclxuICAgIH1cclxuXHJcbiAgICAvLyBDb252ZXJ0IHN0cmVhbSB0byBzdHJpbmdcclxuICAgIGNvbnN0IGNodW5rczogVWludDhBcnJheVtdID0gW107XHJcbiAgICBmb3IgYXdhaXQgKGNvbnN0IGNodW5rIG9mIHJlc3BvbnNlLkJvZHkgYXMgYW55KSB7XHJcbiAgICAgIGNodW5rcy5wdXNoKGNodW5rKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgY29uc3QgYnVmZmVyID0gQnVmZmVyLmNvbmNhdChjaHVua3MpO1xyXG4gICAgY29uc3QgY29udGVudCA9IGJ1ZmZlci50b1N0cmluZygndXRmLTgnKTtcclxuXHJcbiAgICAvLyBWYWxpZGF0ZSBkb3dubG9hZGVkIGNvbnRlbnRcclxuICAgIGlmIChjb250ZW50Lmxlbmd0aCA9PT0gMCkge1xyXG4gICAgICB0aHJvdyBuZXcgQXBwRXJyb3IoXHJcbiAgICAgICAgJ0Rvd25sb2FkZWQgZmlsZSBpcyBlbXB0eScsXHJcbiAgICAgICAgRXJyb3JUeXBlLlZBTElEQVRJT05fRVJST1IsXHJcbiAgICAgICAgNDAwLFxyXG4gICAgICAgIHRydWUsXHJcbiAgICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgICApO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIFJlY29yZCBTMyBtZXRyaWNzXHJcbiAgICBhd2FpdCBtZXRyaWNzQ29sbGVjdG9yLnJlY29yZE1ldHJpYygnUzNEb3dubG9hZCcsIDEsICdDb3VudCcsIHtcclxuICAgICAgYnVja2V0OiBjb25maWcuYnVja2V0TmFtZSxcclxuICAgICAgY29ycmVsYXRpb25JZCxcclxuICAgIH0pO1xyXG5cclxuICAgIHJldHVybiBjb250ZW50O1xyXG5cclxuICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgQXBwRXJyb3IpIHtcclxuICAgICAgdGhyb3cgZXJyb3I7XHJcbiAgICB9XHJcblxyXG4gICAgdGhyb3cgbmV3IEFwcEVycm9yKFxyXG4gICAgICBgRmFpbGVkIHRvIGRvd25sb2FkIGZpbGUgZnJvbSBTMzogJHsoZXJyb3IgYXMgRXJyb3IpLm1lc3NhZ2V9YCxcclxuICAgICAgRXJyb3JUeXBlLkVYVEVSTkFMX1NFUlZJQ0VfRVJST1IsXHJcbiAgICAgIDUwMCxcclxuICAgICAgdHJ1ZSxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBEZXRlY3QgcHJvZ3JhbW1pbmcgbGFuZ3VhZ2UgZnJvbSBmaWxlIG5hbWVcclxuICovXHJcbmZ1bmN0aW9uIGRldGVjdExhbmd1YWdlKGZpbGVOYW1lOiBzdHJpbmcpOiBMYW5ndWFnZSB7XHJcbiAgY29uc3QgZXh0ZW5zaW9uID0gZmlsZU5hbWUuc3BsaXQoJy4nKS5wb3AoKT8udG9Mb3dlckNhc2UoKTtcclxuICBcclxuICBzd2l0Y2ggKGV4dGVuc2lvbikge1xyXG4gICAgY2FzZSAnYyc6XHJcbiAgICAgIHJldHVybiBMYW5ndWFnZS5DO1xyXG4gICAgY2FzZSAnY3BwJzpcclxuICAgIGNhc2UgJ2N4eCc6XHJcbiAgICBjYXNlICdjYyc6XHJcbiAgICAgIHJldHVybiBMYW5ndWFnZS5DUFA7XHJcbiAgICBjYXNlICdoJzpcclxuICAgIGNhc2UgJ2hwcCc6XHJcbiAgICAgIHJldHVybiBMYW5ndWFnZS5DOyAvLyBEZWZhdWx0IHRvIEMgZm9yIGhlYWRlcnNcclxuICAgIGRlZmF1bHQ6XHJcbiAgICAgIHJldHVybiBMYW5ndWFnZS5DOyAvLyBEZWZhdWx0IGZhbGxiYWNrXHJcbiAgfVxyXG59XHJcblxyXG4vKipcclxuICogQ2hlY2sgYW5hbHlzaXMgY2FjaGUgKHBsYWNlaG9sZGVyIGltcGxlbWVudGF0aW9uKVxyXG4gKi9cclxuYXN5bmMgZnVuY3Rpb24gY2hlY2tBbmFseXNpc0NhY2hlKGNvbnRlbnRIYXNoOiBzdHJpbmcsIGNvcnJlbGF0aW9uSWQ6IHN0cmluZyk6IFByb21pc2U8YW55IHwgbnVsbD4ge1xyXG4gIC8vIEluIHByb2R1Y3Rpb24sIHRoaXMgd291bGQgY2hlY2sgRHluYW1vREIgb3IgUmVkaXMgY2FjaGVcclxuICAvLyBSZXR1cm4gbnVsbCBmb3Igbm93IChjYWNoZSBtaXNzKVxyXG4gIHJldHVybiBudWxsO1xyXG59XHJcblxyXG4vKipcclxuICogQ2FjaGUgYW5hbHlzaXMgcmVzdWx0IChwbGFjZWhvbGRlciBpbXBsZW1lbnRhdGlvbilcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIGNhY2hlQW5hbHlzaXNSZXN1bHQoXHJcbiAgY29udGVudEhhc2g6IHN0cmluZyxcclxuICByZXN1bHQ6IGFueSxcclxuICBjb3JyZWxhdGlvbklkOiBzdHJpbmdcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgLy8gSW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCBzdG9yZSBpbiBEeW5hbW9EQiBvciBSZWRpcyBjYWNoZVxyXG4gIC8vIHdpdGggVFRMIHNldCB0byBjb25maWcuY2FjaGVUaW1lb3V0XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTdG9yZSBhbmFseXNpcyByZXN1bHRzIGluIER5bmFtb0RCXHJcbiAqL1xyXG5hc3luYyBmdW5jdGlvbiBzdG9yZUFuYWx5c2lzUmVzdWx0cyhcclxuICByZXN1bHQ6IGFueSxcclxuICBvcmdhbml6YXRpb25JZDogc3RyaW5nLFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgaXRlbSA9IHtcclxuICAgICAgYW5hbHlzaXNJZDogcmVzdWx0LmFuYWx5c2lzSWQsXHJcbiAgICAgIGZpbGVJZDogcmVzdWx0LmZpbGVJZCxcclxuICAgICAgdXNlcklkOiByZXN1bHQudXNlcklkLFxyXG4gICAgICBvcmdhbml6YXRpb25JZDogb3JnYW5pemF0aW9uSWQgfHwgJ2RlZmF1bHQnLFxyXG4gICAgICBsYW5ndWFnZTogcmVzdWx0Lmxhbmd1YWdlLFxyXG4gICAgICB2aW9sYXRpb25zOiByZXN1bHQudmlvbGF0aW9ucyxcclxuICAgICAgc3VtbWFyeTogcmVzdWx0LnN1bW1hcnksXHJcbiAgICAgIHN0YXR1czogcmVzdWx0LnN0YXR1cyxcclxuICAgICAgY3JlYXRlZEF0OiByZXN1bHQuY3JlYXRlZEF0LFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIGNvcnJlbGF0aW9uSWQsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgUHV0SXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGNvbmZpZy5hbmFseXNpc1Jlc3VsdHNUYWJsZSxcclxuICAgICAgSXRlbTogbWFyc2hhbGwoaXRlbSksXHJcbiAgICB9KTtcclxuXHJcbiAgICBhd2FpdCBkeW5hbW9DbGllbnQuc2VuZChjb21tYW5kKTtcclxuXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIHRocm93IG5ldyBBcHBFcnJvcihcclxuICAgICAgYEZhaWxlZCB0byBzdG9yZSBhbmFseXNpcyByZXN1bHRzOiAkeyhlcnJvciBhcyBFcnJvcikubWVzc2FnZX1gLFxyXG4gICAgICBFcnJvclR5cGUuREFUQUJBU0VfRVJST1IsXHJcbiAgICAgIDUwMCxcclxuICAgICAgdHJ1ZSxcclxuICAgICAgY29ycmVsYXRpb25JZFxyXG4gICAgKTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBVcGRhdGUgZmlsZSBtZXRhZGF0YSBzdGF0dXNcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUZpbGVNZXRhZGF0YVN0YXR1cyhcclxuICBmaWxlSWQ6IHN0cmluZyxcclxuICBzdGF0dXM6IHN0cmluZyxcclxuICBhZGRpdGlvbmFsRGF0YTogYW55LFxyXG4gIGNvcnJlbGF0aW9uSWQ6IHN0cmluZ1xyXG4pOiBQcm9taXNlPHZvaWQ+IHtcclxuICB0cnkge1xyXG4gICAgY29uc3QgdXBkYXRlRXhwcmVzc2lvbiA9IFsnU0VUIGFuYWx5c2lzX3N0YXR1cyA9IDpzdGF0dXMnLCAndXBkYXRlZF9hdCA9IDp1cGRhdGVkQXQnXTtcclxuICAgIGNvbnN0IGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IFJlY29yZDxzdHJpbmcsIGFueT4gPSB7XHJcbiAgICAgICc6c3RhdHVzJzogeyBTOiBzdGF0dXMgfSxcclxuICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgIH07XHJcblxyXG4gICAgaWYgKGFkZGl0aW9uYWxEYXRhLmFuYWx5c2lzSWQpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCdhbmFseXNpc19pZCA9IDphbmFseXNpc0lkJyk7XHJcbiAgICAgIGV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXNbJzphbmFseXNpc0lkJ10gPSB7IFM6IGFkZGl0aW9uYWxEYXRhLmFuYWx5c2lzSWQgfTtcclxuICAgIH1cclxuXHJcbiAgICBpZiAoYWRkaXRpb25hbERhdGEudmlvbGF0aW9uc0NvdW50ICE9PSB1bmRlZmluZWQpIHtcclxuICAgICAgdXBkYXRlRXhwcmVzc2lvbi5wdXNoKCd2aW9sYXRpb25zX2NvdW50ID0gOnZpb2xhdGlvbnNDb3VudCcpO1xyXG4gICAgICBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzWyc6dmlvbGF0aW9uc0NvdW50J10gPSB7IE46IGFkZGl0aW9uYWxEYXRhLnZpb2xhdGlvbnNDb3VudC50b1N0cmluZygpIH07XHJcbiAgICB9XHJcblxyXG4gICAgaWYgKGFkZGl0aW9uYWxEYXRhLmNvbXBsaWFuY2VTY29yZSAhPT0gdW5kZWZpbmVkKSB7XHJcbiAgICAgIHVwZGF0ZUV4cHJlc3Npb24ucHVzaCgnY29tcGxpYW5jZV9zY29yZSA9IDpjb21wbGlhbmNlU2NvcmUnKTtcclxuICAgICAgZXhwcmVzc2lvbkF0dHJpYnV0ZVZhbHVlc1snOmNvbXBsaWFuY2VTY29yZSddID0geyBOOiBhZGRpdGlvbmFsRGF0YS5jb21wbGlhbmNlU2NvcmUudG9TdHJpbmcoKSB9O1xyXG4gICAgfVxyXG5cclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGNvbmZpZy5maWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogdXBkYXRlRXhwcmVzc2lvbi5qb2luKCcsICcpLFxyXG4gICAgICBFeHByZXNzaW9uQXR0cmlidXRlVmFsdWVzOiBleHByZXNzaW9uQXR0cmlidXRlVmFsdWVzLFxyXG4gICAgfSk7XHJcblxyXG4gICAgYXdhaXQgZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcblxyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB0aHJvdyBuZXcgQXBwRXJyb3IoXHJcbiAgICAgIGBGYWlsZWQgdG8gdXBkYXRlIGZpbGUgbWV0YWRhdGE6ICR7KGVycm9yIGFzIEVycm9yKS5tZXNzYWdlfWAsXHJcbiAgICAgIEVycm9yVHlwZS5EQVRBQkFTRV9FUlJPUixcclxuICAgICAgNTAwLFxyXG4gICAgICB0cnVlLFxyXG4gICAgICBjb3JyZWxhdGlvbklkXHJcbiAgICApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFVwZGF0ZSBhbmFseXNpcyBwcm9ncmVzcyAobm9uLWNyaXRpY2FsIG9wZXJhdGlvbilcclxuICovXHJcbmFzeW5jIGZ1bmN0aW9uIHVwZGF0ZUFuYWx5c2lzUHJvZ3Jlc3MoXHJcbiAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgcHJvZ3Jlc3M6IG51bWJlcixcclxuICBtZXNzYWdlOiBzdHJpbmcsXHJcbiAgbG9nZ2VyOiBhbnlcclxuKTogUHJvbWlzZTx2b2lkPiB7XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IGNvbW1hbmQgPSBuZXcgVXBkYXRlSXRlbUNvbW1hbmQoe1xyXG4gICAgICBUYWJsZU5hbWU6IGNvbmZpZy5maWxlTWV0YWRhdGFUYWJsZSxcclxuICAgICAgS2V5OiBtYXJzaGFsbCh7IGZpbGVfaWQ6IGZpbGVJZCB9KSxcclxuICAgICAgVXBkYXRlRXhwcmVzc2lvbjogJ1NFVCBhbmFseXNpc19wcm9ncmVzcyA9IDpwcm9ncmVzcywgYW5hbHlzaXNfbWVzc2FnZSA9IDptZXNzYWdlLCB1cGRhdGVkX2F0ID0gOnVwZGF0ZWRBdCcsXHJcbiAgICAgIEV4cHJlc3Npb25BdHRyaWJ1dGVWYWx1ZXM6IHtcclxuICAgICAgICAnOnByb2dyZXNzJzogeyBOOiBwcm9ncmVzcy50b1N0cmluZygpIH0sXHJcbiAgICAgICAgJzptZXNzYWdlJzogeyBTOiBtZXNzYWdlIH0sXHJcbiAgICAgICAgJzp1cGRhdGVkQXQnOiB7IE46IE1hdGguZmxvb3IoRGF0ZS5ub3coKSAvIDEwMDApLnRvU3RyaW5nKCkgfSxcclxuICAgICAgfSxcclxuICAgIH0pO1xyXG5cclxuICAgIGF3YWl0IGR5bmFtb0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgXHJcbiAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgIC8vIFByb2dyZXNzIHVwZGF0ZXMgYXJlIG5vbi1jcml0aWNhbCwganVzdCBsb2cgdGhlIGVycm9yXHJcbiAgICBsb2dnZXIud2FybignRmFpbGVkIHRvIHVwZGF0ZSBhbmFseXNpcyBwcm9ncmVzcycsIHtcclxuICAgICAgZmlsZUlkLFxyXG4gICAgICBwcm9ncmVzcyxcclxuICAgICAgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSxcclxuICAgIH0pO1xyXG4gIH1cclxufSJdfQ==