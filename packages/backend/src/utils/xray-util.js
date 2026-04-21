"use strict";
/**
 * X-Ray Tracing Utility for Production Lambda Functions
 * Provides AWS X-Ray integration for distributed tracing
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.XRayTracer = void 0;
exports.getXRayTracer = getXRayTracer;
exports.withXRayTracing = withXRayTracing;
exports.traceAsync = traceAsync;
const AWSXRay = __importStar(require("aws-xray-sdk-core"));
const logger_1 = require("./logger");
class XRayTracer {
    logger;
    enabled;
    constructor() {
        this.logger = (0, logger_1.createLogger)('xray-tracer');
        this.enabled = process.env.ENABLE_XRAY_TRACING === 'true';
        if (this.enabled) {
            // Capture AWS SDK calls
            AWSXRay.captureAWS(require('aws-sdk'));
            // Capture HTTP/HTTPS requests
            AWSXRay.captureHTTPsGlobal(require('http'));
            AWSXRay.captureHTTPsGlobal(require('https'));
            this.logger.info('X-Ray tracing enabled');
        }
        else {
            this.logger.debug('X-Ray tracing disabled');
        }
    }
    /**
     * Create a new subsegment for tracing a specific operation
     */
    async traceOperation(name, operation, metadata, annotations) {
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
        }
        catch (error) {
            subsegment.addError(error);
            subsegment.close();
            throw error;
        }
    }
    /**
     * Trace MISRA analysis operation
     */
    async traceAnalysis(analysisId, fileType, operation) {
        return this.traceOperation('MISRA-Analysis', operation, {
            analysisId,
            fileType,
            timestamp: new Date().toISOString(),
        }, {
            analysisId,
            fileType,
            service: 'misra-analysis',
        });
    }
    /**
     * Trace file upload operation
     */
    async traceFileUpload(fileId, fileName, fileSize, operation) {
        return this.traceOperation('File-Upload', operation, {
            fileId,
            fileName,
            fileSize,
            timestamp: new Date().toISOString(),
        }, {
            fileId,
            service: 'file-upload',
        });
    }
    /**
     * Trace DynamoDB operation
     */
    async traceDynamoDBOperation(tableName, operation, operationFn) {
        return this.traceOperation(`DynamoDB-${operation}`, operationFn, {
            tableName,
            operation,
            timestamp: new Date().toISOString(),
        }, {
            tableName,
            operation,
            service: 'dynamodb',
        });
    }
    /**
     * Trace authentication operation
     */
    async traceAuth(userId, authType, operation) {
        return this.traceOperation('Authentication', operation, {
            userId,
            authType,
            timestamp: new Date().toISOString(),
        }, {
            userId,
            authType,
            service: 'authentication',
        });
    }
    /**
     * Add custom annotation to current segment
     */
    addAnnotation(key, value) {
        if (!this.enabled)
            return;
        const segment = AWSXRay.getSegment();
        if (segment) {
            segment.addAnnotation(key, value);
        }
    }
    /**
     * Add custom metadata to current segment
     */
    addMetadata(key, value) {
        if (!this.enabled)
            return;
        const segment = AWSXRay.getSegment();
        if (segment) {
            segment.addMetadata(key, value);
        }
    }
    /**
     * Record an error in the current segment
     */
    recordError(error) {
        if (!this.enabled)
            return;
        const segment = AWSXRay.getSegment();
        if (segment) {
            segment.addError(error);
        }
    }
    /**
     * Get current trace ID for correlation
     */
    getTraceId() {
        if (!this.enabled)
            return undefined;
        const segment = AWSXRay.getSegment();
        return segment?.trace_id;
    }
}
exports.XRayTracer = XRayTracer;
// Global X-Ray tracer instance
let globalXRayTracer;
/**
 * Get or create global X-Ray tracer
 */
function getXRayTracer() {
    if (!globalXRayTracer) {
        globalXRayTracer = new XRayTracer();
    }
    return globalXRayTracer;
}
/**
 * Decorator for automatic X-Ray tracing
 */
function withXRayTracing(operationName) {
    return function (target, propertyName, descriptor) {
        const method = descriptor.value;
        descriptor.value = async function (...args) {
            const tracer = getXRayTracer();
            return tracer.traceOperation(operationName, async () => method.apply(this, args), {
                method: propertyName,
                timestamp: new Date().toISOString(),
            }, {
                operation: operationName,
            });
        };
        return descriptor;
    };
}
/**
 * Trace an async operation with X-Ray
 */
async function traceAsync(name, operation, metadata) {
    const tracer = getXRayTracer();
    return tracer.traceOperation(name, operation, metadata);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoieHJheS11dGlsLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsieHJheS11dGlsLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztBQXNPSCxzQ0FLQztBQUtELDBDQXNCQztBQUtELGdDQU9DO0FBaFJELDJEQUE2QztBQUM3QyxxQ0FBZ0Q7QUFRaEQsTUFBYSxVQUFVO0lBQ2IsTUFBTSxDQUFTO0lBQ2YsT0FBTyxDQUFVO0lBRXpCO1FBQ0UsSUFBSSxDQUFDLE1BQU0sR0FBRyxJQUFBLHFCQUFZLEVBQUMsYUFBYSxDQUFDLENBQUM7UUFDMUMsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUMsR0FBRyxDQUFDLG1CQUFtQixLQUFLLE1BQU0sQ0FBQztRQUUxRCxJQUFJLElBQUksQ0FBQyxPQUFPLEVBQUUsQ0FBQztZQUNqQix3QkFBd0I7WUFDeEIsT0FBTyxDQUFDLFVBQVUsQ0FBQyxPQUFPLENBQUMsU0FBUyxDQUFDLENBQUMsQ0FBQztZQUV2Qyw4QkFBOEI7WUFDOUIsT0FBTyxDQUFDLGtCQUFrQixDQUFDLE9BQU8sQ0FBQyxNQUFNLENBQUMsQ0FBQyxDQUFDO1lBQzVDLE9BQU8sQ0FBQyxrQkFBa0IsQ0FBQyxPQUFPLENBQUMsT0FBTyxDQUFDLENBQUMsQ0FBQztZQUU3QyxJQUFJLENBQUMsTUFBTSxDQUFDLElBQUksQ0FBQyx1QkFBdUIsQ0FBQyxDQUFDO1FBQzVDLENBQUM7YUFBTSxDQUFDO1lBQ04sSUFBSSxDQUFDLE1BQU0sQ0FBQyxLQUFLLENBQUMsd0JBQXdCLENBQUMsQ0FBQztRQUM5QyxDQUFDO0lBQ0gsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGNBQWMsQ0FDbEIsSUFBWSxFQUNaLFNBQTJCLEVBQzNCLFFBQWlDLEVBQ2pDLFdBQTBEO1FBRTFELElBQUksQ0FBQyxJQUFJLENBQUMsT0FBTyxFQUFFLENBQUM7WUFDbEIsT0FBTyxTQUFT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QyxNQUFNLE1BQU0sR0FBRyxhQUFhLEVBQUUsQ0FBQztJQUMvQixPQUFPLE1BQU0sQ0FBQyxjQUFjLENBQUMsSUFBSSxFQUFFLFNBQVMsRUFBRSxRQUFRLENBQUMsQ0FBQztBQUMxRCxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFgtUmF5IFRyYWNpbmcgVXRpbGl0eSBmb3IgUHJvZHVjdGlvbiBMYW1iZGEgRnVuY3Rpb25zXHJcbiAqIFByb3ZpZGVzIEFXUyBYLVJheSBpbnRlZ3JhdGlvbiBmb3IgZGlzdHJpYnV0ZWQgdHJhY2luZ1xyXG4gKi9cclxuXHJcbmltcG9ydCAqIGFzIEFXU1hSYXkgZnJvbSAnYXdzLXhyYXktc2RrLWNvcmUnO1xyXG5pbXBvcnQgeyBMb2dnZXIsIGNyZWF0ZUxvZ2dlciB9IGZyb20gJy4vbG9nZ2VyJztcclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgVHJhY2VTZWdtZW50IHtcclxuICBuYW1lOiBzdHJpbmc7XHJcbiAgbWV0YWRhdGE/OiB7IFtrZXk6IHN0cmluZ106IGFueSB9O1xyXG4gIGFubm90YXRpb25zPzogeyBba2V5OiBzdHJpbmddOiBzdHJpbmcgfCBudW1iZXIgfCBib29sZWFuIH07XHJcbn1cclxuXHJcbmV4cG9ydCBjbGFzcyBYUmF5VHJhY2VyIHtcclxuICBwcml2YXRlIGxvZ2dlcjogTG9nZ2VyO1xyXG4gIHByaXZhdGUgZW5hYmxlZDogYm9vbGVhbjtcclxuXHJcbiAgY29uc3RydWN0b3IoKSB7XHJcbiAgICB0aGlzLmxvZ2dlciA9IGNyZWF0ZUxvZ2dlcigneHJheS10cmFjZXInKTtcclxuICAgIHRoaXMuZW5hYmxlZCA9IHByb2Nlc3MuZW52LkVOQUJMRV9YUkFZX1RSQUNJTkcgPT09ICd0cnVlJztcclxuXHJcbiAgICBpZiAodGhpcy5lbmFibGVkKSB7XHJcbiAgICAgIC8vIENhcHR1cmUgQVdTIFNESyBjYWxsc1xyXG4gICAgICBBV1NYUmF5LmNhcHR1cmVBV1MocmVxdWlyZSgnYXdzLXNkaycpKTtcclxuICAgICAgXHJcbiAgICAgIC8vIENhcHR1cmUgSFRUUC9IVFRQUyByZXF1ZXN0c1xyXG4gICAgICBBV1NYUmF5LmNhcHR1cmVIVFRQc0dsb2JhbChyZXF1aXJlKCdodHRwJykpO1xyXG4gICAgICBBV1NYUmF5LmNhcHR1cmVIVFRQc0dsb2JhbChyZXF1aXJlKCdodHRwcycpKTtcclxuICAgICAgXHJcbiAgICAgIHRoaXMubG9nZ2VyLmluZm8oJ1gtUmF5IHRyYWNpbmcgZW5hYmxlZCcpO1xyXG4gICAgfSBlbHNlIHtcclxuICAgICAgdGhpcy5sb2dnZXIuZGVidWcoJ1gtUmF5IHRyYWNpbmcgZGlzYWJsZWQnKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIG5ldyBzdWJzZWdtZW50IGZvciB0cmFjaW5nIGEgc3BlY2lmaWMgb3BlcmF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgdHJhY2VPcGVyYXRpb248VD4oXHJcbiAgICBuYW1lOiBzdHJpbmcsXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD4sXHJcbiAgICBtZXRhZGF0YT86IHsgW2tleTogc3RyaW5nXTogYW55IH0sXHJcbiAgICBhbm5vdGF0aW9ucz86IHsgW2tleTogc3RyaW5nXTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbiB9XHJcbiAgKTogUHJvbWlzZTxUPiB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkge1xyXG4gICAgICByZXR1cm4gb3BlcmF0aW9uKCk7XHJcbiAgICB9XHJcblxyXG4gICAgY29uc3Qgc2VnbWVudCA9IEFXU1hSYXkuZ2V0U2VnbWVudCgpO1xyXG4gICAgaWYgKCFzZWdtZW50KSB7XHJcbiAgICAgIHRoaXMubG9nZ2VyLndhcm4oJ05vIGFjdGl2ZSBYLVJheSBzZWdtZW50IGZvdW5kJywgeyBvcGVyYXRpb246IG5hbWUgfSk7XHJcbiAgICAgIHJldHVybiBvcGVyYXRpb24oKTtcclxuICAgIH1cclxuXHJcbiAgICBjb25zdCBzdWJzZWdtZW50ID0gc2VnbWVudC5hZGROZXdTdWJzZWdtZW50KG5hbWUpO1xyXG5cclxuICAgIHRyeSB7XHJcbiAgICAgIC8vIEFkZCBtZXRhZGF0YSAoc2VhcmNoYWJsZSBpbiBYLVJheSBjb25zb2xlKVxyXG4gICAgICBpZiAobWV0YWRhdGEpIHtcclxuICAgICAgICBPYmplY3QuZW50cmllcyhtZXRhZGF0YSkuZm9yRWFjaCgoW2tleSwgdmFsdWVdKSA9PiB7XHJcbiAgICAgICAgICBzdWJzZWdtZW50LmFkZE1ldGFkYXRhKGtleSwgdmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICAvLyBBZGQgYW5ub3RhdGlvbnMgKGluZGV4ZWQgZm9yIGZpbHRlcmluZylcclxuICAgICAgaWYgKGFubm90YXRpb25zKSB7XHJcbiAgICAgICAgT2JqZWN0LmVudHJpZXMoYW5ub3RhdGlvbnMpLmZvckVhY2goKFtrZXksIHZhbHVlXSkgPT4ge1xyXG4gICAgICAgICAgc3Vic2VnbWVudC5hZGRBbm5vdGF0aW9uKGtleSwgdmFsdWUpO1xyXG4gICAgICAgIH0pO1xyXG4gICAgICB9XHJcblxyXG4gICAgICBjb25zdCByZXN1bHQgPSBhd2FpdCBvcGVyYXRpb24oKTtcclxuICAgICAgXHJcbiAgICAgIHN1YnNlZ21lbnQuY2xvc2UoKTtcclxuICAgICAgcmV0dXJuIHJlc3VsdDtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHN1YnNlZ21lbnQuYWRkRXJyb3IoZXJyb3IgYXMgRXJyb3IpO1xyXG4gICAgICBzdWJzZWdtZW50LmNsb3NlKCk7XHJcbiAgICAgIHRocm93IGVycm9yO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVHJhY2UgTUlTUkEgYW5hbHlzaXMgb3BlcmF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgdHJhY2VBbmFseXNpczxUPihcclxuICAgIGFuYWx5c2lzSWQ6IHN0cmluZyxcclxuICAgIGZpbGVUeXBlOiBzdHJpbmcsXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD5cclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIHJldHVybiB0aGlzLnRyYWNlT3BlcmF0aW9uKFxyXG4gICAgICAnTUlTUkEtQW5hbHlzaXMnLFxyXG4gICAgICBvcGVyYXRpb24sXHJcbiAgICAgIHtcclxuICAgICAgICBhbmFseXNpc0lkLFxyXG4gICAgICAgIGZpbGVUeXBlLFxyXG4gICAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgYW5hbHlzaXNJZCxcclxuICAgICAgICBmaWxlVHlwZSxcclxuICAgICAgICBzZXJ2aWNlOiAnbWlzcmEtYW5hbHlzaXMnLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVHJhY2UgZmlsZSB1cGxvYWQgb3BlcmF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgdHJhY2VGaWxlVXBsb2FkPFQ+KFxyXG4gICAgZmlsZUlkOiBzdHJpbmcsXHJcbiAgICBmaWxlTmFtZTogc3RyaW5nLFxyXG4gICAgZmlsZVNpemU6IG51bWJlcixcclxuICAgIG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPlxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgcmV0dXJuIHRoaXMudHJhY2VPcGVyYXRpb24oXHJcbiAgICAgICdGaWxlLVVwbG9hZCcsXHJcbiAgICAgIG9wZXJhdGlvbixcclxuICAgICAge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBmaWxlTmFtZSxcclxuICAgICAgICBmaWxlU2l6ZSxcclxuICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIGZpbGVJZCxcclxuICAgICAgICBzZXJ2aWNlOiAnZmlsZS11cGxvYWQnLFxyXG4gICAgICB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogVHJhY2UgRHluYW1vREIgb3BlcmF0aW9uXHJcbiAgICovXHJcbiAgYXN5bmMgdHJhY2VEeW5hbW9EQk9wZXJhdGlvbjxUPihcclxuICAgIHRhYmxlTmFtZTogc3RyaW5nLFxyXG4gICAgb3BlcmF0aW9uOiBzdHJpbmcsXHJcbiAgICBvcGVyYXRpb25GbjogKCkgPT4gUHJvbWlzZTxUPlxyXG4gICk6IFByb21pc2U8VD4ge1xyXG4gICAgcmV0dXJuIHRoaXMudHJhY2VPcGVyYXRpb24oXHJcbiAgICAgIGBEeW5hbW9EQi0ke29wZXJhdGlvbn1gLFxyXG4gICAgICBvcGVyYXRpb25GbixcclxuICAgICAge1xyXG4gICAgICAgIHRhYmxlTmFtZSxcclxuICAgICAgICBvcGVyYXRpb24sXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0YWJsZU5hbWUsXHJcbiAgICAgICAgb3BlcmF0aW9uLFxyXG4gICAgICAgIHNlcnZpY2U6ICdkeW5hbW9kYicsXHJcbiAgICAgIH1cclxuICAgICk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBUcmFjZSBhdXRoZW50aWNhdGlvbiBvcGVyYXRpb25cclxuICAgKi9cclxuICBhc3luYyB0cmFjZUF1dGg8VD4oXHJcbiAgICB1c2VySWQ6IHN0cmluZyxcclxuICAgIGF1dGhUeXBlOiBzdHJpbmcsXHJcbiAgICBvcGVyYXRpb246ICgpID0+IFByb21pc2U8VD5cclxuICApOiBQcm9taXNlPFQ+IHtcclxuICAgIHJldHVybiB0aGlzLnRyYWNlT3BlcmF0aW9uKFxyXG4gICAgICAnQXV0aGVudGljYXRpb24nLFxyXG4gICAgICBvcGVyYXRpb24sXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgYXV0aFR5cGUsXHJcbiAgICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB1c2VySWQsXHJcbiAgICAgICAgYXV0aFR5cGUsXHJcbiAgICAgICAgc2VydmljZTogJ2F1dGhlbnRpY2F0aW9uJyxcclxuICAgICAgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEFkZCBjdXN0b20gYW5ub3RhdGlvbiB0byBjdXJyZW50IHNlZ21lbnRcclxuICAgKi9cclxuICBhZGRBbm5vdGF0aW9uKGtleTogc3RyaW5nLCB2YWx1ZTogc3RyaW5nIHwgbnVtYmVyIHwgYm9vbGVhbik6IHZvaWQge1xyXG4gICAgaWYgKCF0aGlzLmVuYWJsZWQpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBzZWdtZW50ID0gQVdTWFJheS5nZXRTZWdtZW50KCk7XHJcbiAgICBpZiAoc2VnbWVudCkge1xyXG4gICAgICBzZWdtZW50LmFkZEFubm90YXRpb24oa2V5LCB2YWx1ZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBBZGQgY3VzdG9tIG1ldGFkYXRhIHRvIGN1cnJlbnQgc2VnbWVudFxyXG4gICAqL1xyXG4gIGFkZE1ldGFkYXRhKGtleTogc3RyaW5nLCB2YWx1ZTogYW55KTogdm9pZCB7XHJcbiAgICBpZiAoIXRoaXMuZW5hYmxlZCkgcmV0dXJuO1xyXG5cclxuICAgIGNvbnN0IHNlZ21lbnQgPSBBV1NYUmF5LmdldFNlZ21lbnQoKTtcclxuICAgIGlmIChzZWdtZW50KSB7XHJcbiAgICAgIHNlZ21lbnQuYWRkTWV0YWRhdGEoa2V5LCB2YWx1ZSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBSZWNvcmQgYW4gZXJyb3IgaW4gdGhlIGN1cnJlbnQgc2VnbWVudFxyXG4gICAqL1xyXG4gIHJlY29yZEVycm9yKGVycm9yOiBFcnJvcik6IHZvaWQge1xyXG4gICAgaWYgKCF0aGlzLmVuYWJsZWQpIHJldHVybjtcclxuXHJcbiAgICBjb25zdCBzZWdtZW50ID0gQVdTWFJheS5nZXRTZWdtZW50KCk7XHJcbiAgICBpZiAoc2VnbWVudCkge1xyXG4gICAgICBzZWdtZW50LmFkZEVycm9yKGVycm9yKTtcclxuICAgIH1cclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIEdldCBjdXJyZW50IHRyYWNlIElEIGZvciBjb3JyZWxhdGlvblxyXG4gICAqL1xyXG4gIGdldFRyYWNlSWQoKTogc3RyaW5nIHwgdW5kZWZpbmVkIHtcclxuICAgIGlmICghdGhpcy5lbmFibGVkKSByZXR1cm4gdW5kZWZpbmVkO1xyXG5cclxuICAgIGNvbnN0IHNlZ21lbnQgPSBBV1NYUmF5LmdldFNlZ21lbnQoKTtcclxuICAgIHJldHVybiBzZWdtZW50Py50cmFjZV9pZDtcclxuICB9XHJcbn1cclxuXHJcbi8vIEdsb2JhbCBYLVJheSB0cmFjZXIgaW5zdGFuY2VcclxubGV0IGdsb2JhbFhSYXlUcmFjZXI6IFhSYXlUcmFjZXIgfCB1bmRlZmluZWQ7XHJcblxyXG4vKipcclxuICogR2V0IG9yIGNyZWF0ZSBnbG9iYWwgWC1SYXkgdHJhY2VyXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gZ2V0WFJheVRyYWNlcigpOiBYUmF5VHJhY2VyIHtcclxuICBpZiAoIWdsb2JhbFhSYXlUcmFjZXIpIHtcclxuICAgIGdsb2JhbFhSYXlUcmFjZXIgPSBuZXcgWFJheVRyYWNlcigpO1xyXG4gIH1cclxuICByZXR1cm4gZ2xvYmFsWFJheVRyYWNlcjtcclxufVxyXG5cclxuLyoqXHJcbiAqIERlY29yYXRvciBmb3IgYXV0b21hdGljIFgtUmF5IHRyYWNpbmdcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiB3aXRoWFJheVRyYWNpbmcob3BlcmF0aW9uTmFtZTogc3RyaW5nKSB7XHJcbiAgcmV0dXJuIGZ1bmN0aW9uICh0YXJnZXQ6IGFueSwgcHJvcGVydHlOYW1lOiBzdHJpbmcsIGRlc2NyaXB0b3I6IFByb3BlcnR5RGVzY3JpcHRvcikge1xyXG4gICAgY29uc3QgbWV0aG9kID0gZGVzY3JpcHRvci52YWx1ZTtcclxuXHJcbiAgICBkZXNjcmlwdG9yLnZhbHVlID0gYXN5bmMgZnVuY3Rpb24gKC4uLmFyZ3M6IGFueVtdKSB7XHJcbiAgICAgIGNvbnN0IHRyYWNlciA9IGdldFhSYXlUcmFjZXIoKTtcclxuICAgICAgXHJcbiAgICAgIHJldHVybiB0cmFjZXIudHJhY2VPcGVyYXRpb24oXHJcbiAgICAgICAgb3BlcmF0aW9uTmFtZSxcclxuICAgICAgICBhc3luYyAoKSA9PiBtZXRob2QuYXBwbHkodGhpcywgYXJncyksXHJcbiAgICAgICAge1xyXG4gICAgICAgICAgbWV0aG9kOiBwcm9wZXJ0eU5hbWUsXHJcbiAgICAgICAgICB0aW1lc3RhbXA6IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKSxcclxuICAgICAgICB9LFxyXG4gICAgICAgIHtcclxuICAgICAgICAgIG9wZXJhdGlvbjogb3BlcmF0aW9uTmFtZSxcclxuICAgICAgICB9XHJcbiAgICAgICk7XHJcbiAgICB9O1xyXG5cclxuICAgIHJldHVybiBkZXNjcmlwdG9yO1xyXG4gIH07XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBUcmFjZSBhbiBhc3luYyBvcGVyYXRpb24gd2l0aCBYLVJheVxyXG4gKi9cclxuZXhwb3J0IGFzeW5jIGZ1bmN0aW9uIHRyYWNlQXN5bmM8VD4oXHJcbiAgbmFtZTogc3RyaW5nLFxyXG4gIG9wZXJhdGlvbjogKCkgPT4gUHJvbWlzZTxUPixcclxuICBtZXRhZGF0YT86IHsgW2tleTogc3RyaW5nXTogYW55IH1cclxuKTogUHJvbWlzZTxUPiB7XHJcbiAgY29uc3QgdHJhY2VyID0gZ2V0WFJheVRyYWNlcigpO1xyXG4gIHJldHVybiB0cmFjZXIudHJhY2VPcGVyYXRpb24obmFtZSwgb3BlcmF0aW9uLCBtZXRhZGF0YSk7XHJcbn1cclxuIl19