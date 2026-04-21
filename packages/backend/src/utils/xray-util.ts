/**
 * X-Ray Tracing Utility for Production Lambda Functions
 * Provides AWS X-Ray integration for distributed tracing
 */

import * as AWSXRay from 'aws-xray-sdk-core';
import { Logger, createLogger } from './logger';

export interface TraceSegment {
  name: string;
  metadata?: { [key: string]: any };
  annotations?: { [key: string]: string | number | boolean };
}

export class XRayTracer {
  private logger: Logger;
  private enabled: boolean;

  constructor() {
    this.logger = createLogger('xray-tracer');
    this.enabled = process.env.ENABLE_XRAY_TRACING === 'true';

    if (this.enabled) {
      // Capture AWS SDK calls
      AWSXRay.captureAWS(require('aws-sdk'));
      
      // Capture HTTP/HTTPS requests
      AWSXRay.captureHTTPsGlobal(require('http'));
      AWSXRay.captureHTTPsGlobal(require('https'));
      
      this.logger.info('X-Ray tracing enabled');
    } else {
      this.logger.debug('X-Ray tracing disabled');
    }
  }

  /**
   * Create a new subsegment for tracing a specific operation
   */
  async traceOperation<T>(
    name: string,
    operation: () => Promise<T>,
    metadata?: { [key: string]: any },
    annotations?: { [key: string]: string | number | boolean }
  ): Promise<T> {
    if (!this.enabled) {
      return operation();
    }

    const segment = AWSXRay.getSegment();
    if (!segment) {
      this.logger.warn('No active X-Ray segment found', { operation: name });
      return operation();
    }

    const subsegment = segment.addNewSubsegment(name);

    try {
      // Add metadata (searchable in X-Ray console)
      if (metadata) {
        Object.entries(metadata).forEach(([key, value]) => {
          subsegment.addMetadata(key, value);
        });
      }

      // Add annotations (indexed for filtering)
      if (annotations) {
        Object.entries(annotations).forEach(([key, value]) => {
          subsegment.addAnnotation(key, value);
        });
      }

      const result = await operation();
      
      subsegment.close();
      return result;
    } catch (error) {
      subsegment.addError(error as Error);
      subsegment.close();
      throw error;
    }
  }

  /**
   * Trace MISRA analysis operation
   */
  async traceAnalysis<T>(
    analysisId: string,
    fileType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      'MISRA-Analysis',
      operation,
      {
        analysisId,
        fileType,
        timestamp: new Date().toISOString(),
      },
      {
        analysisId,
        fileType,
        service: 'misra-analysis',
      }
    );
  }

  /**
   * Trace file upload operation
   */
  async traceFileUpload<T>(
    fileId: string,
    fileName: string,
    fileSize: number,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      'File-Upload',
      operation,
      {
        fileId,
        fileName,
        fileSize,
        timestamp: new Date().toISOString(),
      },
      {
        fileId,
        service: 'file-upload',
      }
    );
  }

  /**
   * Trace DynamoDB operation
   */
  async traceDynamoDBOperation<T>(
    tableName: string,
    operation: string,
    operationFn: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      `DynamoDB-${operation}`,
      operationFn,
      {
        tableName,
        operation,
        timestamp: new Date().toISOString(),
      },
      {
        tableName,
        operation,
        service: 'dynamodb',
      }
    );
  }

  /**
   * Trace authentication operation
   */
  async traceAuth<T>(
    userId: string,
    authType: string,
    operation: () => Promise<T>
  ): Promise<T> {
    return this.traceOperation(
      'Authentication',
      operation,
      {
        userId,
        authType,
        timestamp: new Date().toISOString(),
      },
      {
        userId,
        authType,
        service: 'authentication',
      }
    );
  }

  /**
   * Add custom annotation to current segment
   */
  addAnnotation(key: string, value: string | number | boolean): void {
    if (!this.enabled) return;

    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addAnnotation(key, value);
    }
  }

  /**
   * Add custom metadata to current segment
   */
  addMetadata(key: string, value: any): void {
    if (!this.enabled) return;

    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addMetadata(key, value);
    }
  }

  /**
   * Record an error in the current segment
   */
  recordError(error: Error): void {
    if (!this.enabled) return;

    const segment = AWSXRay.getSegment();
    if (segment) {
      segment.addError(error);
    }
  }

  /**
   * Get current trace ID for correlation
   */
  getTraceId(): string | undefined {
    if (!this.enabled) return undefined;

    const segment = AWSXRay.getSegment();
    return (segment as any)?.trace_id;
  }
}

// Global X-Ray tracer instance
let globalXRayTracer: XRayTracer | undefined;

/**
 * Get or create global X-Ray tracer
 */
export function getXRayTracer(): XRayTracer {
  if (!globalXRayTracer) {
    globalXRayTracer = new XRayTracer();
  }
  return globalXRayTracer;
}

/**
 * Decorator for automatic X-Ray tracing
 */
export function withXRayTracing(operationName: string) {
  return function (target: any, propertyName: string, descriptor: PropertyDescriptor) {
    const method = descriptor.value;

    descriptor.value = async function (...args: any[]) {
      const tracer = getXRayTracer();
      
      return tracer.traceOperation(
        operationName,
        async () => method.apply(this, args),
        {
          method: propertyName,
          timestamp: new Date().toISOString(),
        },
        {
          operation: operationName,
        }
      );
    };

    return descriptor;
  };
}

/**
 * Trace an async operation with X-Ray
 */
export async function traceAsync<T>(
  name: string,
  operation: () => Promise<T>,
  metadata?: { [key: string]: any }
): Promise<T> {
  const tracer = getXRayTracer();
  return tracer.traceOperation(name, operation, metadata);
}
