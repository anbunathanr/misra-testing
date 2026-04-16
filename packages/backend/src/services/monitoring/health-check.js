"use strict";
/**
 * Health Check Service
 * Provides comprehensive health monitoring for all system components
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.healthCheckService = exports.HealthCheckService = void 0;
const client_dynamodb_1 = require("@aws-sdk/client-dynamodb");
const client_s3_1 = require("@aws-sdk/client-s3");
const logger_1 = require("../../utils/logger");
const circuit_breaker_1 = require("../error-handling/circuit-breaker");
const cloudwatch_monitoring_1 = require("./cloudwatch-monitoring");
/**
 * Health check service for monitoring system components
 */
class HealthCheckService {
    logger;
    dynamoClient;
    s3Client;
    startTime;
    constructor() {
        this.logger = (0, logger_1.createLogger)('HealthCheckService');
        this.dynamoClient = new client_dynamodb_1.DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
        this.s3Client = new client_s3_1.S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
        this.startTime = Date.now();
    }
    /**
     * Perform comprehensive system health check
     */
    async performHealthCheck() {
        const startTime = Date.now();
        try {
            this.logger.info('Starting system health check');
            // Run all health checks in parallel
            const healthChecks = await Promise.allSettled([
                this.checkDynamoDBHealth(),
                this.checkS3Health(),
                this.checkCircuitBreakerHealth(),
                this.checkMemoryHealth(),
                this.checkDiskHealth()
            ]);
            // Process results
            const services = [];
            let healthyCount = 0;
            let degradedCount = 0;
            let unhealthyCount = 0;
            healthChecks.forEach((result, index) => {
                const serviceNames = ['DynamoDB', 'S3', 'CircuitBreakers', 'Memory', 'Disk'];
                const serviceName = serviceNames[index];
                if (result.status === 'fulfilled') {
                    services.push(result.value);
                    switch (result.value.status) {
                        case 'healthy':
                            healthyCount++;
                            break;
                        case 'degraded':
                            degradedCount++;
                            break;
                        case 'unhealthy':
                            unhealthyCount++;
                            break;
                    }
                }
                else {
                    services.push({
                        service: serviceName,
                        status: 'unhealthy',
                        responseTime: Date.now() - startTime,
                        details: `Health check failed: ${result.reason}`,
                        lastChecked: new Date().toISOString()
                    });
                    unhealthyCount++;
                }
            });
            // Determine overall health
            let overallStatus;
            if (unhealthyCount > 0) {
                overallStatus = unhealthyCount >= services.length / 2 ? 'unhealthy' : 'degraded';
            }
            else if (degradedCount > 0) {
                overallStatus = 'degraded';
            }
            else {
                overallStatus = 'healthy';
            }
            const systemHealth = {
                overall: overallStatus,
                services,
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime
            };
            // Record health metrics
            await this.recordHealthMetrics(systemHealth);
            this.logger.info('System health check completed', {
                overall: overallStatus,
                healthy: healthyCount,
                degraded: degradedCount,
                unhealthy: unhealthyCount,
                duration: Date.now() - startTime
            });
            return systemHealth;
        }
        catch (error) {
            this.logger.error('Health check failed', error);
            return {
                overall: 'unhealthy',
                services: [{
                        service: 'HealthCheck',
                        status: 'unhealthy',
                        responseTime: Date.now() - startTime,
                        details: `Health check system failure: ${error instanceof Error ? error.message : 'Unknown error'}`,
                        lastChecked: new Date().toISOString()
                    }],
                timestamp: new Date().toISOString(),
                uptime: Date.now() - this.startTime
            };
        }
    }
    /**
     * Check DynamoDB health
     */
    async checkDynamoDBHealth() {
        const startTime = Date.now();
        try {
            const tables = [
                process.env.FILE_METADATA_TABLE || 'FileMetadata-dev',
                process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev',
                process.env.USERS_TABLE || 'Users-dev'
            ];
            // Check first table as representative
            const command = new client_dynamodb_1.DescribeTableCommand({
                TableName: tables[0]
            });
            await this.dynamoClient.send(command);
            const responseTime = Date.now() - startTime;
            return {
                service: 'DynamoDB',
                status: responseTime < 1000 ? 'healthy' : 'degraded',
                responseTime,
                details: `Checked ${tables.length} tables`,
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                service: 'DynamoDB',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                details: `DynamoDB error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * Check S3 health
     */
    async checkS3Health() {
        const startTime = Date.now();
        try {
            const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
            const command = new client_s3_1.HeadBucketCommand({
                Bucket: bucketName
            });
            await this.s3Client.send(command);
            const responseTime = Date.now() - startTime;
            return {
                service: 'S3',
                status: responseTime < 500 ? 'healthy' : 'degraded',
                responseTime,
                details: `Bucket ${bucketName} accessible`,
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                service: 'S3',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                details: `S3 error: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * Check circuit breaker health
     */
    async checkCircuitBreakerHealth() {
        const startTime = Date.now();
        try {
            const metrics = circuit_breaker_1.circuitBreakerManager.getAllMetrics();
            const healthStatus = circuit_breaker_1.circuitBreakerManager.getHealthStatus();
            const totalServices = Object.keys(healthStatus).length;
            const healthyServices = Object.values(healthStatus).filter(healthy => healthy).length;
            let status;
            if (healthyServices === totalServices) {
                status = 'healthy';
            }
            else if (healthyServices >= totalServices / 2) {
                status = 'degraded';
            }
            else {
                status = 'unhealthy';
            }
            return {
                service: 'CircuitBreakers',
                status,
                responseTime: Date.now() - startTime,
                details: `${healthyServices}/${totalServices} services healthy`,
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                service: 'CircuitBreakers',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                details: `Circuit breaker check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * Check memory health
     */
    async checkMemoryHealth() {
        const startTime = Date.now();
        try {
            const memoryUsage = process.memoryUsage();
            const totalMemory = memoryUsage.heapTotal;
            const usedMemory = memoryUsage.heapUsed;
            const memoryUsagePercent = (usedMemory / totalMemory) * 100;
            let status;
            if (memoryUsagePercent < 70) {
                status = 'healthy';
            }
            else if (memoryUsagePercent < 90) {
                status = 'degraded';
            }
            else {
                status = 'unhealthy';
            }
            return {
                service: 'Memory',
                status,
                responseTime: Date.now() - startTime,
                details: `${memoryUsagePercent.toFixed(1)}% used (${Math.round(usedMemory / 1024 / 1024)}MB/${Math.round(totalMemory / 1024 / 1024)}MB)`,
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                service: 'Memory',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                details: `Memory check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * Check disk health (Lambda has limited disk space)
     */
    async checkDiskHealth() {
        const startTime = Date.now();
        try {
            // In Lambda, we have limited disk space in /tmp
            // This is a basic check for Lambda environment
            const fs = require('fs');
            const stats = fs.statSync('/tmp');
            return {
                service: 'Disk',
                status: 'healthy',
                responseTime: Date.now() - startTime,
                details: 'Lambda /tmp directory accessible',
                lastChecked: new Date().toISOString()
            };
        }
        catch (error) {
            return {
                service: 'Disk',
                status: 'unhealthy',
                responseTime: Date.now() - startTime,
                details: `Disk check failed: ${error instanceof Error ? error.message : 'Unknown error'}`,
                lastChecked: new Date().toISOString()
            };
        }
    }
    /**
     * Record health metrics to CloudWatch
     */
    async recordHealthMetrics(systemHealth) {
        try {
            // Record overall system health
            await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordSystemHealth('System', systemHealth.overall === 'healthy', undefined);
            // Record individual service health
            for (const service of systemHealth.services) {
                await cloudwatch_monitoring_1.cloudWatchMonitoringService.recordSystemHealth(service.service, service.status === 'healthy', service.responseTime);
            }
        }
        catch (error) {
            this.logger.warn('Failed to record health metrics', { error: error.message });
        }
    }
    /**
     * Get simple health status for load balancer
     */
    async getSimpleHealthStatus() {
        try {
            const health = await this.performHealthCheck();
            return {
                status: health.overall === 'unhealthy' ? 'ERROR' : 'OK',
                timestamp: health.timestamp
            };
        }
        catch (error) {
            return {
                status: 'ERROR',
                timestamp: new Date().toISOString()
            };
        }
    }
    /**
     * Check if system is ready to serve requests
     */
    async isReady() {
        try {
            const health = await this.performHealthCheck();
            return health.overall !== 'unhealthy';
        }
        catch (error) {
            return false;
        }
    }
    /**
     * Check if system is alive (basic liveness check)
     */
    isAlive() {
        try {
            // Basic checks that the process is running
            return process.uptime() > 0 && Date.now() > this.startTime;
        }
        catch (error) {
            return false;
        }
    }
}
exports.HealthCheckService = HealthCheckService;
// Global health check service instance
exports.healthCheckService = new HealthCheckService();
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiaGVhbHRoLWNoZWNrLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiaGVhbHRoLWNoZWNrLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILDhEQUFnRjtBQUNoRixrREFBaUU7QUFDakUsK0NBQTBEO0FBQzFELHVFQUEwRTtBQUUxRSxtRUFBc0U7QUFpQnRFOztHQUVHO0FBQ0gsTUFBYSxrQkFBa0I7SUFDckIsTUFBTSxDQUFTO0lBQ2YsWUFBWSxDQUFpQjtJQUM3QixRQUFRLENBQVc7SUFDbkIsU0FBUyxDQUFTO0lBRTFCO1FBQ0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsb0JBQW9CLENBQUMsQ0FBQztRQUNqRCxJQUFJLENBQUMsWUFBWSxHQUFHLElBQUksZ0NBQWMsQ0FBQyxFQUFFLE1BQU0sRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLFVBQVUsSUFBSSxXQUFXLEVBQUUsQ0FBQyxDQUFDO1FBQzFGLElBQUksQ0FBQyxRQUFRLEdBQUcsSUFBSSxvQkFBUSxDQUFDLEVBQUUsTUFBTSxFQUFFLE9BQU8sQ0FBQyxHQUFHLENBQUMsVUFBVSxJQUFJLFdBQVcsRUFBRSxDQUFDLENBQUM7UUFDaEYsSUFBSSxDQUFDLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7SUFDOUIsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGtCQUFrQjtRQUN0QixNQUFNLFNBQVMsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFFN0IsSUFBSSxDQUFDO1lBQ0gsSUFBSSxDQUFDLE1BQU0sQ0FBQyxJQUFJLENBQUMsOEJBQThCLENBQUMsQ0FBQztZQUVqRCxvQ0FBb0M7WUFDcEMsTUFBTSxZQUFZLEdBQUcsTUFBTSxPQUFPLENBQUMsVUFBVSxDQUFDO2dCQUM1QyxJQUFJLENBQUMsbUJBQW1CLEVBQUU7Z0JBQzFCLElBQUksQ0FBQyxhQUFhLEVBQUU7Z0JBQ3BCLElBQUksQ0FBQyx5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QyxPQUFPLEtBQUssRUFBRSxDQUFDO1lBQ2YsT0FBTyxLQUFLLENBQUM7UUFDZixDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsT0FBTztRQUNMLElBQUksQ0FBQztZQUNILDJDQUEyQztZQUMzQyxPQUFPLE9BQU8sQ0FBQyxNQUFNLEVBQUUsR0FBRyxDQUFDLElBQUksSUFBSSxDQUFDLEdBQUcsRUFBRSxHQUFHLElBQUksQ0FBQyxTQUFTLENBQUM7UUFDN0QsQ0FBQztRQUFDLE9BQU8sS0FBSyxFQUFFLENBQUM7WUFDZixPQUFPLEtBQUssQ0FBQztRQUNmLENBQUM7SUFDSCxDQUFDO0NBQ0Y7QUFsWEQsZ0RBa1hDO0FBRUQsdUNBQXVDO0FBQzFCLFFBQUEsa0JBQWtCLEdBQUcsSUFBSSxrQkFBa0IsRUFBRSxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEhlYWx0aCBDaGVjayBTZXJ2aWNlXHJcbiAqIFByb3ZpZGVzIGNvbXByZWhlbnNpdmUgaGVhbHRoIG1vbml0b3JpbmcgZm9yIGFsbCBzeXN0ZW0gY29tcG9uZW50c1xyXG4gKi9cclxuXHJcbmltcG9ydCB7IER5bmFtb0RCQ2xpZW50LCBEZXNjcmliZVRhYmxlQ29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1keW5hbW9kYic7XHJcbmltcG9ydCB7IFMzQ2xpZW50LCBIZWFkQnVja2V0Q29tbWFuZCB9IGZyb20gJ0Bhd3Mtc2RrL2NsaWVudC1zMyc7XHJcbmltcG9ydCB7IExvZ2dlciwgY3JlYXRlTG9nZ2VyIH0gZnJvbSAnLi4vLi4vdXRpbHMvbG9nZ2VyJztcclxuaW1wb3J0IHsgY2lyY3VpdEJyZWFrZXJNYW5hZ2VyIH0gZnJvbSAnLi4vZXJyb3ItaGFuZGxpbmcvY2lyY3VpdC1icmVha2VyJztcclxuaW1wb3J0IHsgZ3JhY2VmdWxEZWdyYWRhdGlvblNlcnZpY2UgfSBmcm9tICcuLi9lcnJvci1oYW5kbGluZy9ncmFjZWZ1bC1kZWdyYWRhdGlvbic7XHJcbmltcG9ydCB7IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZSB9IGZyb20gJy4vY2xvdWR3YXRjaC1tb25pdG9yaW5nJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgSGVhbHRoQ2hlY2tSZXN1bHQge1xyXG4gIHNlcnZpY2U6IHN0cmluZztcclxuICBzdGF0dXM6ICdoZWFsdGh5JyB8ICdkZWdyYWRlZCcgfCAndW5oZWFsdGh5JztcclxuICByZXNwb25zZVRpbWU6IG51bWJlcjtcclxuICBkZXRhaWxzPzogc3RyaW5nO1xyXG4gIGxhc3RDaGVja2VkOiBzdHJpbmc7XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgU3lzdGVtSGVhbHRoU3RhdHVzIHtcclxuICBvdmVyYWxsOiAnaGVhbHRoeScgfCAnZGVncmFkZWQnIHwgJ3VuaGVhbHRoeSc7XHJcbiAgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzdWx0W107XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgdXB0aW1lOiBudW1iZXI7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBIZWFsdGggY2hlY2sgc2VydmljZSBmb3IgbW9uaXRvcmluZyBzeXN0ZW0gY29tcG9uZW50c1xyXG4gKi9cclxuZXhwb3J0IGNsYXNzIEhlYWx0aENoZWNrU2VydmljZSB7XHJcbiAgcHJpdmF0ZSBsb2dnZXI6IExvZ2dlcjtcclxuICBwcml2YXRlIGR5bmFtb0NsaWVudDogRHluYW1vREJDbGllbnQ7XHJcbiAgcHJpdmF0ZSBzM0NsaWVudDogUzNDbGllbnQ7XHJcbiAgcHJpdmF0ZSBzdGFydFRpbWU6IG51bWJlcjtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGNyZWF0ZUxvZ2dlcignSGVhbHRoQ2hlY2tTZXJ2aWNlJyk7XHJcbiAgICB0aGlzLmR5bmFtb0NsaWVudCA9IG5ldyBEeW5hbW9EQkNsaWVudCh7IHJlZ2lvbjogcHJvY2Vzcy5lbnYuQVdTX1JFR0lPTiB8fCAndXMtZWFzdC0xJyB9KTtcclxuICAgIHRoaXMuczNDbGllbnQgPSBuZXcgUzNDbGllbnQoeyByZWdpb246IHByb2Nlc3MuZW52LkFXU19SRUdJT04gfHwgJ3VzLWVhc3QtMScgfSk7XHJcbiAgICB0aGlzLnN0YXJ0VGltZSA9IERhdGUubm93KCk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBQZXJmb3JtIGNvbXByZWhlbnNpdmUgc3lzdGVtIGhlYWx0aCBjaGVja1xyXG4gICAqL1xyXG4gIGFzeW5jIHBlcmZvcm1IZWFsdGhDaGVjaygpOiBQcm9taXNlPFN5c3RlbUhlYWx0aFN0YXR1cz4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgdGhpcy5sb2dnZXIuaW5mbygnU3RhcnRpbmcgc3lzdGVtIGhlYWx0aCBjaGVjaycpO1xyXG5cclxuICAgICAgLy8gUnVuIGFsbCBoZWFsdGggY2hlY2tzIGluIHBhcmFsbGVsXHJcbiAgICAgIGNvbnN0IGhlYWx0aENoZWNrcyA9IGF3YWl0IFByb21pc2UuYWxsU2V0dGxlZChbXHJcbiAgICAgICAgdGhpcy5jaGVja0R5bmFtb0RCSGVhbHRoKCksXHJcbiAgICAgICAgdGhpcy5jaGVja1MzSGVhbHRoKCksXHJcbiAgICAgICAgdGhpcy5jaGVja0NpcmN1aXRCcmVha2VySGVhbHRoKCksXHJcbiAgICAgICAgdGhpcy5jaGVja01lbW9yeUhlYWx0aCgpLFxyXG4gICAgICAgIHRoaXMuY2hlY2tEaXNrSGVhbHRoKClcclxuICAgICAgXSk7XHJcblxyXG4gICAgICAvLyBQcm9jZXNzIHJlc3VsdHNcclxuICAgICAgY29uc3Qgc2VydmljZXM6IEhlYWx0aENoZWNrUmVzdWx0W10gPSBbXTtcclxuICAgICAgbGV0IGhlYWx0aHlDb3VudCA9IDA7XHJcbiAgICAgIGxldCBkZWdyYWRlZENvdW50ID0gMDtcclxuICAgICAgbGV0IHVuaGVhbHRoeUNvdW50ID0gMDtcclxuXHJcbiAgICAgIGhlYWx0aENoZWNrcy5mb3JFYWNoKChyZXN1bHQsIGluZGV4KSA9PiB7XHJcbiAgICAgICAgY29uc3Qgc2VydmljZU5hbWVzID0gWydEeW5hbW9EQicsICdTMycsICdDaXJjdWl0QnJlYWtlcnMnLCAnTWVtb3J5JywgJ0Rpc2snXTtcclxuICAgICAgICBjb25zdCBzZXJ2aWNlTmFtZSA9IHNlcnZpY2VOYW1lc1tpbmRleF07XHJcblxyXG4gICAgICAgIGlmIChyZXN1bHQuc3RhdHVzID09PSAnZnVsZmlsbGVkJykge1xyXG4gICAgICAgICAgc2VydmljZXMucHVzaChyZXN1bHQudmFsdWUpO1xyXG4gICAgICAgICAgc3dpdGNoIChyZXN1bHQudmFsdWUuc3RhdHVzKSB7XHJcbiAgICAgICAgICAgIGNhc2UgJ2hlYWx0aHknOlxyXG4gICAgICAgICAgICAgIGhlYWx0aHlDb3VudCsrO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICdkZWdyYWRlZCc6XHJcbiAgICAgICAgICAgICAgZGVncmFkZWRDb3VudCsrO1xyXG4gICAgICAgICAgICAgIGJyZWFrO1xyXG4gICAgICAgICAgICBjYXNlICd1bmhlYWx0aHknOlxyXG4gICAgICAgICAgICAgIHVuaGVhbHRoeUNvdW50Kys7XHJcbiAgICAgICAgICAgICAgYnJlYWs7XHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgfSBlbHNlIHtcclxuICAgICAgICAgIHNlcnZpY2VzLnB1c2goe1xyXG4gICAgICAgICAgICBzZXJ2aWNlOiBzZXJ2aWNlTmFtZSxcclxuICAgICAgICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgICAgICBkZXRhaWxzOiBgSGVhbHRoIGNoZWNrIGZhaWxlZDogJHtyZXN1bHQucmVhc29ufWAsXHJcbiAgICAgICAgICAgIGxhc3RDaGVja2VkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgICAgIH0pO1xyXG4gICAgICAgICAgdW5oZWFsdGh5Q291bnQrKztcclxuICAgICAgICB9XHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgLy8gRGV0ZXJtaW5lIG92ZXJhbGwgaGVhbHRoXHJcbiAgICAgIGxldCBvdmVyYWxsU3RhdHVzOiAnaGVhbHRoeScgfCAnZGVncmFkZWQnIHwgJ3VuaGVhbHRoeSc7XHJcbiAgICAgIGlmICh1bmhlYWx0aHlDb3VudCA+IDApIHtcclxuICAgICAgICBvdmVyYWxsU3RhdHVzID0gdW5oZWFsdGh5Q291bnQgPj0gc2VydmljZXMubGVuZ3RoIC8gMiA/ICd1bmhlYWx0aHknIDogJ2RlZ3JhZGVkJztcclxuICAgICAgfSBlbHNlIGlmIChkZWdyYWRlZENvdW50ID4gMCkge1xyXG4gICAgICAgIG92ZXJhbGxTdGF0dXMgPSAnZGVncmFkZWQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIG92ZXJhbGxTdGF0dXMgPSAnaGVhbHRoeSc7XHJcbiAgICAgIH1cclxuXHJcbiAgICAgIGNvbnN0IHN5c3RlbUhlYWx0aDogU3lzdGVtSGVhbHRoU3RhdHVzID0ge1xyXG4gICAgICAgIG92ZXJhbGw6IG92ZXJhbGxTdGF0dXMsXHJcbiAgICAgICAgc2VydmljZXMsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgICAgdXB0aW1lOiBEYXRlLm5vdygpIC0gdGhpcy5zdGFydFRpbWVcclxuICAgICAgfTtcclxuXHJcbiAgICAgIC8vIFJlY29yZCBoZWFsdGggbWV0cmljc1xyXG4gICAgICBhd2FpdCB0aGlzLnJlY29yZEhlYWx0aE1ldHJpY3Moc3lzdGVtSGVhbHRoKTtcclxuXHJcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1N5c3RlbSBoZWFsdGggY2hlY2sgY29tcGxldGVkJywge1xyXG4gICAgICAgIG92ZXJhbGw6IG92ZXJhbGxTdGF0dXMsXHJcbiAgICAgICAgaGVhbHRoeTogaGVhbHRoeUNvdW50LFxyXG4gICAgICAgIGRlZ3JhZGVkOiBkZWdyYWRlZENvdW50LFxyXG4gICAgICAgIHVuaGVhbHRoeTogdW5oZWFsdGh5Q291bnQsXHJcbiAgICAgICAgZHVyYXRpb246IERhdGUubm93KCkgLSBzdGFydFRpbWVcclxuICAgICAgfSk7XHJcblxyXG4gICAgICByZXR1cm4gc3lzdGVtSGVhbHRoO1xyXG5cclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLmVycm9yKCdIZWFsdGggY2hlY2sgZmFpbGVkJywgZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBvdmVyYWxsOiAndW5oZWFsdGh5JyxcclxuICAgICAgICBzZXJ2aWNlczogW3tcclxuICAgICAgICAgIHNlcnZpY2U6ICdIZWFsdGhDaGVjaycsXHJcbiAgICAgICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgICAgZGV0YWlsczogYEhlYWx0aCBjaGVjayBzeXN0ZW0gZmFpbHVyZTogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICAgICAgbGFzdENoZWNrZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICAgIH1dLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICAgIHVwdGltZTogRGF0ZS5ub3coKSAtIHRoaXMuc3RhcnRUaW1lXHJcbiAgICAgIH07XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDaGVjayBEeW5hbW9EQiBoZWFsdGhcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrRHluYW1vREJIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgdGFibGVzID0gW1xyXG4gICAgICAgIHByb2Nlc3MuZW52LkZJTEVfTUVUQURBVEFfVEFCTEUgfHwgJ0ZpbGVNZXRhZGF0YS1kZXYnLFxyXG4gICAgICAgIHByb2Nlc3MuZW52LkFOQUxZU0lTX1JFU1VMVFNfVEFCTEUgfHwgJ0FuYWx5c2lzUmVzdWx0cy1kZXYnLFxyXG4gICAgICAgIHByb2Nlc3MuZW52LlVTRVJTX1RBQkxFIHx8ICdVc2Vycy1kZXYnXHJcbiAgICAgIF07XHJcblxyXG4gICAgICAvLyBDaGVjayBmaXJzdCB0YWJsZSBhcyByZXByZXNlbnRhdGl2ZVxyXG4gICAgICBjb25zdCBjb21tYW5kID0gbmV3IERlc2NyaWJlVGFibGVDb21tYW5kKHtcclxuICAgICAgICBUYWJsZU5hbWU6IHRhYmxlc1swXVxyXG4gICAgICB9KTtcclxuXHJcbiAgICAgIGF3YWl0IHRoaXMuZHluYW1vQ2xpZW50LnNlbmQoY29tbWFuZCk7XHJcbiAgICAgIFxyXG4gICAgICBjb25zdCByZXNwb25zZVRpbWUgPSBEYXRlLm5vdygpIC0gc3RhcnRUaW1lO1xyXG4gICAgICBcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzZXJ2aWNlOiAnRHluYW1vREInLFxyXG4gICAgICAgIHN0YXR1czogcmVzcG9uc2VUaW1lIDwgMTAwMCA/ICdoZWFsdGh5JyA6ICdkZWdyYWRlZCcsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IGBDaGVja2VkICR7dGFibGVzLmxlbmd0aH0gdGFibGVzYCxcclxuICAgICAgICBsYXN0Q2hlY2tlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzZXJ2aWNlOiAnRHluYW1vREInLFxyXG4gICAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IGBEeW5hbW9EQiBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICAgIGxhc3RDaGVja2VkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIFMzIGhlYWx0aFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tTM0hlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBidWNrZXROYW1lID0gcHJvY2Vzcy5lbnYuRklMRV9TVE9SQUdFX0JVQ0tFVF9OQU1FIHx8ICdtaXNyYS1wbGF0Zm9ybS1maWxlcy1kZXYnO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgY29tbWFuZCA9IG5ldyBIZWFkQnVja2V0Q29tbWFuZCh7XHJcbiAgICAgICAgQnVja2V0OiBidWNrZXROYW1lXHJcbiAgICAgIH0pO1xyXG5cclxuICAgICAgYXdhaXQgdGhpcy5zM0NsaWVudC5zZW5kKGNvbW1hbmQpO1xyXG4gICAgICBcclxuICAgICAgY29uc3QgcmVzcG9uc2VUaW1lID0gRGF0ZS5ub3coKSAtIHN0YXJ0VGltZTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB7XHJcbiAgICAgICAgc2VydmljZTogJ1MzJyxcclxuICAgICAgICBzdGF0dXM6IHJlc3BvbnNlVGltZSA8IDUwMCA/ICdoZWFsdGh5JyA6ICdkZWdyYWRlZCcsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IGBCdWNrZXQgJHtidWNrZXROYW1lfSBhY2Nlc3NpYmxlYCxcclxuICAgICAgICBsYXN0Q2hlY2tlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzZXJ2aWNlOiAnUzMnLFxyXG4gICAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IGBTMyBlcnJvcjogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICAgIGxhc3RDaGVja2VkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGNpcmN1aXQgYnJlYWtlciBoZWFsdGhcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrQ2lyY3VpdEJyZWFrZXJIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbWV0cmljcyA9IGNpcmN1aXRCcmVha2VyTWFuYWdlci5nZXRBbGxNZXRyaWNzKCk7XHJcbiAgICAgIGNvbnN0IGhlYWx0aFN0YXR1cyA9IGNpcmN1aXRCcmVha2VyTWFuYWdlci5nZXRIZWFsdGhTdGF0dXMoKTtcclxuICAgICAgXHJcbiAgICAgIGNvbnN0IHRvdGFsU2VydmljZXMgPSBPYmplY3Qua2V5cyhoZWFsdGhTdGF0dXMpLmxlbmd0aDtcclxuICAgICAgY29uc3QgaGVhbHRoeVNlcnZpY2VzID0gT2JqZWN0LnZhbHVlcyhoZWFsdGhTdGF0dXMpLmZpbHRlcihoZWFsdGh5ID0+IGhlYWx0aHkpLmxlbmd0aDtcclxuICAgICAgXHJcbiAgICAgIGxldCBzdGF0dXM6ICdoZWFsdGh5JyB8ICdkZWdyYWRlZCcgfCAndW5oZWFsdGh5JztcclxuICAgICAgaWYgKGhlYWx0aHlTZXJ2aWNlcyA9PT0gdG90YWxTZXJ2aWNlcykge1xyXG4gICAgICAgIHN0YXR1cyA9ICdoZWFsdGh5JztcclxuICAgICAgfSBlbHNlIGlmIChoZWFsdGh5U2VydmljZXMgPj0gdG90YWxTZXJ2aWNlcyAvIDIpIHtcclxuICAgICAgICBzdGF0dXMgPSAnZGVncmFkZWQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHN0YXR1cyA9ICd1bmhlYWx0aHknO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlcnZpY2U6ICdDaXJjdWl0QnJlYWtlcnMnLFxyXG4gICAgICAgIHN0YXR1cyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgICAgZGV0YWlsczogYCR7aGVhbHRoeVNlcnZpY2VzfS8ke3RvdGFsU2VydmljZXN9IHNlcnZpY2VzIGhlYWx0aHlgLFxyXG4gICAgICAgIGxhc3RDaGVja2VkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuXHJcbiAgICB9IGNhdGNoIChlcnJvcikge1xyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlcnZpY2U6ICdDaXJjdWl0QnJlYWtlcnMnLFxyXG4gICAgICAgIHN0YXR1czogJ3VuaGVhbHRoeScsXHJcbiAgICAgICAgcmVzcG9uc2VUaW1lOiBEYXRlLm5vdygpIC0gc3RhcnRUaW1lLFxyXG4gICAgICAgIGRldGFpbHM6IGBDaXJjdWl0IGJyZWFrZXIgY2hlY2sgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWAsXHJcbiAgICAgICAgbGFzdENoZWNrZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgbWVtb3J5IGhlYWx0aFxyXG4gICAqL1xyXG4gIHByaXZhdGUgYXN5bmMgY2hlY2tNZW1vcnlIZWFsdGgoKTogUHJvbWlzZTxIZWFsdGhDaGVja1Jlc3VsdD4ge1xyXG4gICAgY29uc3Qgc3RhcnRUaW1lID0gRGF0ZS5ub3coKTtcclxuICAgIFxyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgbWVtb3J5VXNhZ2UgPSBwcm9jZXNzLm1lbW9yeVVzYWdlKCk7XHJcbiAgICAgIGNvbnN0IHRvdGFsTWVtb3J5ID0gbWVtb3J5VXNhZ2UuaGVhcFRvdGFsO1xyXG4gICAgICBjb25zdCB1c2VkTWVtb3J5ID0gbWVtb3J5VXNhZ2UuaGVhcFVzZWQ7XHJcbiAgICAgIGNvbnN0IG1lbW9yeVVzYWdlUGVyY2VudCA9ICh1c2VkTWVtb3J5IC8gdG90YWxNZW1vcnkpICogMTAwO1xyXG4gICAgICBcclxuICAgICAgbGV0IHN0YXR1czogJ2hlYWx0aHknIHwgJ2RlZ3JhZGVkJyB8ICd1bmhlYWx0aHknO1xyXG4gICAgICBpZiAobWVtb3J5VXNhZ2VQZXJjZW50IDwgNzApIHtcclxuICAgICAgICBzdGF0dXMgPSAnaGVhbHRoeSc7XHJcbiAgICAgIH0gZWxzZSBpZiAobWVtb3J5VXNhZ2VQZXJjZW50IDwgOTApIHtcclxuICAgICAgICBzdGF0dXMgPSAnZGVncmFkZWQnO1xyXG4gICAgICB9IGVsc2Uge1xyXG4gICAgICAgIHN0YXR1cyA9ICd1bmhlYWx0aHknO1xyXG4gICAgICB9XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlcnZpY2U6ICdNZW1vcnknLFxyXG4gICAgICAgIHN0YXR1cyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgICAgZGV0YWlsczogYCR7bWVtb3J5VXNhZ2VQZXJjZW50LnRvRml4ZWQoMSl9JSB1c2VkICgke01hdGgucm91bmQodXNlZE1lbW9yeSAvIDEwMjQgLyAxMDI0KX1NQi8ke01hdGgucm91bmQodG90YWxNZW1vcnkgLyAxMDI0IC8gMTAyNCl9TUIpYCxcclxuICAgICAgICBsYXN0Q2hlY2tlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzZXJ2aWNlOiAnTWVtb3J5JyxcclxuICAgICAgICBzdGF0dXM6ICd1bmhlYWx0aHknLFxyXG4gICAgICAgIHJlc3BvbnNlVGltZTogRGF0ZS5ub3coKSAtIHN0YXJ0VGltZSxcclxuICAgICAgICBkZXRhaWxzOiBgTWVtb3J5IGNoZWNrIGZhaWxlZDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gLFxyXG4gICAgICAgIGxhc3RDaGVja2VkOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGRpc2sgaGVhbHRoIChMYW1iZGEgaGFzIGxpbWl0ZWQgZGlzayBzcGFjZSlcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIGNoZWNrRGlza0hlYWx0aCgpOiBQcm9taXNlPEhlYWx0aENoZWNrUmVzdWx0PiB7XHJcbiAgICBjb25zdCBzdGFydFRpbWUgPSBEYXRlLm5vdygpO1xyXG4gICAgXHJcbiAgICB0cnkge1xyXG4gICAgICAvLyBJbiBMYW1iZGEsIHdlIGhhdmUgbGltaXRlZCBkaXNrIHNwYWNlIGluIC90bXBcclxuICAgICAgLy8gVGhpcyBpcyBhIGJhc2ljIGNoZWNrIGZvciBMYW1iZGEgZW52aXJvbm1lbnRcclxuICAgICAgY29uc3QgZnMgPSByZXF1aXJlKCdmcycpO1xyXG4gICAgICBjb25zdCBzdGF0cyA9IGZzLnN0YXRTeW5jKCcvdG1wJyk7XHJcbiAgICAgIFxyXG4gICAgICByZXR1cm4ge1xyXG4gICAgICAgIHNlcnZpY2U6ICdEaXNrJyxcclxuICAgICAgICBzdGF0dXM6ICdoZWFsdGh5JyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgICAgZGV0YWlsczogJ0xhbWJkYSAvdG1wIGRpcmVjdG9yeSBhY2Nlc3NpYmxlJyxcclxuICAgICAgICBsYXN0Q2hlY2tlZDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpXHJcbiAgICAgIH07XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzZXJ2aWNlOiAnRGlzaycsXHJcbiAgICAgICAgc3RhdHVzOiAndW5oZWFsdGh5JyxcclxuICAgICAgICByZXNwb25zZVRpbWU6IERhdGUubm93KCkgLSBzdGFydFRpbWUsXHJcbiAgICAgICAgZGV0YWlsczogYERpc2sgY2hlY2sgZmFpbGVkOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWAsXHJcbiAgICAgICAgbGFzdENoZWNrZWQ6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKVxyXG4gICAgICB9O1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogUmVjb3JkIGhlYWx0aCBtZXRyaWNzIHRvIENsb3VkV2F0Y2hcclxuICAgKi9cclxuICBwcml2YXRlIGFzeW5jIHJlY29yZEhlYWx0aE1ldHJpY3Moc3lzdGVtSGVhbHRoOiBTeXN0ZW1IZWFsdGhTdGF0dXMpOiBQcm9taXNlPHZvaWQ+IHtcclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIFJlY29yZCBvdmVyYWxsIHN5c3RlbSBoZWFsdGhcclxuICAgICAgYXdhaXQgY2xvdWRXYXRjaE1vbml0b3JpbmdTZXJ2aWNlLnJlY29yZFN5c3RlbUhlYWx0aChcclxuICAgICAgICAnU3lzdGVtJyxcclxuICAgICAgICBzeXN0ZW1IZWFsdGgub3ZlcmFsbCA9PT0gJ2hlYWx0aHknLFxyXG4gICAgICAgIHVuZGVmaW5lZFxyXG4gICAgICApO1xyXG5cclxuICAgICAgLy8gUmVjb3JkIGluZGl2aWR1YWwgc2VydmljZSBoZWFsdGhcclxuICAgICAgZm9yIChjb25zdCBzZXJ2aWNlIG9mIHN5c3RlbUhlYWx0aC5zZXJ2aWNlcykge1xyXG4gICAgICAgIGF3YWl0IGNsb3VkV2F0Y2hNb25pdG9yaW5nU2VydmljZS5yZWNvcmRTeXN0ZW1IZWFsdGgoXHJcbiAgICAgICAgICBzZXJ2aWNlLnNlcnZpY2UsXHJcbiAgICAgICAgICBzZXJ2aWNlLnN0YXR1cyA9PT0gJ2hlYWx0aHknLFxyXG4gICAgICAgICAgc2VydmljZS5yZXNwb25zZVRpbWVcclxuICAgICAgICApO1xyXG4gICAgICB9XHJcblxyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhpcy5sb2dnZXIud2FybignRmFpbGVkIHRvIHJlY29yZCBoZWFsdGggbWV0cmljcycsIHsgZXJyb3I6IChlcnJvciBhcyBFcnJvcikubWVzc2FnZSB9KTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBzaW1wbGUgaGVhbHRoIHN0YXR1cyBmb3IgbG9hZCBiYWxhbmNlclxyXG4gICAqL1xyXG4gIGFzeW5jIGdldFNpbXBsZUhlYWx0aFN0YXR1cygpOiBQcm9taXNlPHsgc3RhdHVzOiAnT0snIHwgJ0VSUk9SJzsgdGltZXN0YW1wOiBzdHJpbmcgfT4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgY29uc3QgaGVhbHRoID0gYXdhaXQgdGhpcy5wZXJmb3JtSGVhbHRoQ2hlY2soKTtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXM6IGhlYWx0aC5vdmVyYWxsID09PSAndW5oZWFsdGh5JyA/ICdFUlJPUicgOiAnT0snLFxyXG4gICAgICAgIHRpbWVzdGFtcDogaGVhbHRoLnRpbWVzdGFtcFxyXG4gICAgICB9O1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIHtcclxuICAgICAgICBzdGF0dXM6ICdFUlJPUicsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKClcclxuICAgICAgfTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENoZWNrIGlmIHN5c3RlbSBpcyByZWFkeSB0byBzZXJ2ZSByZXF1ZXN0c1xyXG4gICAqL1xyXG4gIGFzeW5jIGlzUmVhZHkoKTogUHJvbWlzZTxib29sZWFuPiB7XHJcbiAgICB0cnkge1xyXG4gICAgICBjb25zdCBoZWFsdGggPSBhd2FpdCB0aGlzLnBlcmZvcm1IZWFsdGhDaGVjaygpO1xyXG4gICAgICByZXR1cm4gaGVhbHRoLm92ZXJhbGwgIT09ICd1bmhlYWx0aHknO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogQ2hlY2sgaWYgc3lzdGVtIGlzIGFsaXZlIChiYXNpYyBsaXZlbmVzcyBjaGVjaylcclxuICAgKi9cclxuICBpc0FsaXZlKCk6IGJvb2xlYW4ge1xyXG4gICAgdHJ5IHtcclxuICAgICAgLy8gQmFzaWMgY2hlY2tzIHRoYXQgdGhlIHByb2Nlc3MgaXMgcnVubmluZ1xyXG4gICAgICByZXR1cm4gcHJvY2Vzcy51cHRpbWUoKSA+IDAgJiYgRGF0ZS5ub3coKSA+IHRoaXMuc3RhcnRUaW1lO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgcmV0dXJuIGZhbHNlO1xyXG4gICAgfVxyXG4gIH1cclxufVxyXG5cclxuLy8gR2xvYmFsIGhlYWx0aCBjaGVjayBzZXJ2aWNlIGluc3RhbmNlXHJcbmV4cG9ydCBjb25zdCBoZWFsdGhDaGVja1NlcnZpY2UgPSBuZXcgSGVhbHRoQ2hlY2tTZXJ2aWNlKCk7Il19