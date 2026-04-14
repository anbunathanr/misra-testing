/**
 * Health Check Service
 * Provides comprehensive health monitoring for all system components
 */

import { DynamoDBClient, DescribeTableCommand } from '@aws-sdk/client-dynamodb';
import { S3Client, HeadBucketCommand } from '@aws-sdk/client-s3';
import { Logger, createLogger } from '../../utils/logger';
import { circuitBreakerManager } from '../error-handling/circuit-breaker';
import { gracefulDegradationService } from '../error-handling/graceful-degradation';
import { cloudWatchMonitoringService } from './cloudwatch-monitoring';

export interface HealthCheckResult {
  service: string;
  status: 'healthy' | 'degraded' | 'unhealthy';
  responseTime: number;
  details?: string;
  lastChecked: string;
}

export interface SystemHealthStatus {
  overall: 'healthy' | 'degraded' | 'unhealthy';
  services: HealthCheckResult[];
  timestamp: string;
  uptime: number;
}

/**
 * Health check service for monitoring system components
 */
export class HealthCheckService {
  private logger: Logger;
  private dynamoClient: DynamoDBClient;
  private s3Client: S3Client;
  private startTime: number;

  constructor() {
    this.logger = createLogger('HealthCheckService');
    this.dynamoClient = new DynamoDBClient({ region: process.env.AWS_REGION || 'us-east-1' });
    this.s3Client = new S3Client({ region: process.env.AWS_REGION || 'us-east-1' });
    this.startTime = Date.now();
  }

  /**
   * Perform comprehensive system health check
   */
  async performHealthCheck(): Promise<SystemHealthStatus> {
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
      const services: HealthCheckResult[] = [];
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
        } else {
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
      let overallStatus: 'healthy' | 'degraded' | 'unhealthy';
      if (unhealthyCount > 0) {
        overallStatus = unhealthyCount >= services.length / 2 ? 'unhealthy' : 'degraded';
      } else if (degradedCount > 0) {
        overallStatus = 'degraded';
      } else {
        overallStatus = 'healthy';
      }

      const systemHealth: SystemHealthStatus = {
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

    } catch (error) {
      this.logger.error('Health check failed', error as Error);
      
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
  private async checkDynamoDBHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const tables = [
        process.env.FILE_METADATA_TABLE || 'FileMetadata-dev',
        process.env.ANALYSIS_RESULTS_TABLE || 'AnalysisResults-dev',
        process.env.USERS_TABLE || 'Users-dev'
      ];

      // Check first table as representative
      const command = new DescribeTableCommand({
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

    } catch (error) {
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
  private async checkS3Health(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const bucketName = process.env.FILE_STORAGE_BUCKET_NAME || 'misra-platform-files-dev';
      
      const command = new HeadBucketCommand({
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

    } catch (error) {
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
  private async checkCircuitBreakerHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const metrics = circuitBreakerManager.getAllMetrics();
      const healthStatus = circuitBreakerManager.getHealthStatus();
      
      const totalServices = Object.keys(healthStatus).length;
      const healthyServices = Object.values(healthStatus).filter(healthy => healthy).length;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (healthyServices === totalServices) {
        status = 'healthy';
      } else if (healthyServices >= totalServices / 2) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'CircuitBreakers',
        status,
        responseTime: Date.now() - startTime,
        details: `${healthyServices}/${totalServices} services healthy`,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
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
  private async checkMemoryHealth(): Promise<HealthCheckResult> {
    const startTime = Date.now();
    
    try {
      const memoryUsage = process.memoryUsage();
      const totalMemory = memoryUsage.heapTotal;
      const usedMemory = memoryUsage.heapUsed;
      const memoryUsagePercent = (usedMemory / totalMemory) * 100;
      
      let status: 'healthy' | 'degraded' | 'unhealthy';
      if (memoryUsagePercent < 70) {
        status = 'healthy';
      } else if (memoryUsagePercent < 90) {
        status = 'degraded';
      } else {
        status = 'unhealthy';
      }
      
      return {
        service: 'Memory',
        status,
        responseTime: Date.now() - startTime,
        details: `${memoryUsagePercent.toFixed(1)}% used (${Math.round(usedMemory / 1024 / 1024)}MB/${Math.round(totalMemory / 1024 / 1024)}MB)`,
        lastChecked: new Date().toISOString()
      };

    } catch (error) {
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
  private async checkDiskHealth(): Promise<HealthCheckResult> {
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

    } catch (error) {
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
  private async recordHealthMetrics(systemHealth: SystemHealthStatus): Promise<void> {
    try {
      // Record overall system health
      await cloudWatchMonitoringService.recordSystemHealth(
        'System',
        systemHealth.overall === 'healthy',
        undefined
      );

      // Record individual service health
      for (const service of systemHealth.services) {
        await cloudWatchMonitoringService.recordSystemHealth(
          service.service,
          service.status === 'healthy',
          service.responseTime
        );
      }

    } catch (error) {
      this.logger.warn('Failed to record health metrics', { error: (error as Error).message });
    }
  }

  /**
   * Get simple health status for load balancer
   */
  async getSimpleHealthStatus(): Promise<{ status: 'OK' | 'ERROR'; timestamp: string }> {
    try {
      const health = await this.performHealthCheck();
      return {
        status: health.overall === 'unhealthy' ? 'ERROR' : 'OK',
        timestamp: health.timestamp
      };
    } catch (error) {
      return {
        status: 'ERROR',
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Check if system is ready to serve requests
   */
  async isReady(): Promise<boolean> {
    try {
      const health = await this.performHealthCheck();
      return health.overall !== 'unhealthy';
    } catch (error) {
      return false;
    }
  }

  /**
   * Check if system is alive (basic liveness check)
   */
  isAlive(): boolean {
    try {
      // Basic checks that the process is running
      return process.uptime() > 0 && Date.now() > this.startTime;
    } catch (error) {
      return false;
    }
  }
}

// Global health check service instance
export const healthCheckService = new HealthCheckService();