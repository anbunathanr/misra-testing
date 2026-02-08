"use strict";
/**
 * Error Handler Service
 * Centralized error handling and logging for the application
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorHandlerService = exports.ErrorSeverity = void 0;
const validation_1 = require("../types/validation");
var ErrorSeverity;
(function (ErrorSeverity) {
    ErrorSeverity["LOW"] = "low";
    ErrorSeverity["MEDIUM"] = "medium";
    ErrorSeverity["HIGH"] = "high";
    ErrorSeverity["CRITICAL"] = "critical";
})(ErrorSeverity || (exports.ErrorSeverity = ErrorSeverity = {}));
class ErrorHandlerService {
    /**
     * Handle and log errors with appropriate severity
     */
    static handleError(error, context, severity = ErrorSeverity.MEDIUM) {
        const errorLog = {
            errorId: this.generateErrorId(),
            timestamp: Date.now(),
            severity,
            errorCode: error instanceof validation_1.MetadataError ? error.code : validation_1.ErrorCodes.UNKNOWN_ERROR,
            message: error.message,
            stack: error.stack,
            context
        };
        // Log to console (in production, this would go to CloudWatch)
        this.logError(errorLog);
        return errorLog;
    }
    /**
     * Log error to console with formatting
     */
    static logError(errorLog) {
        const logLevel = this.getSeverityLogLevel(errorLog.severity);
        const logMessage = `[${errorLog.severity.toUpperCase()}] ${errorLog.errorCode}: ${errorLog.message}`;
        console[logLevel](logMessage, {
            errorId: errorLog.errorId,
            timestamp: new Date(errorLog.timestamp).toISOString(),
            context: errorLog.context,
            stack: errorLog.stack
        });
    }
    /**
     * Get console log level based on severity
     */
    static getSeverityLogLevel(severity) {
        switch (severity) {
            case ErrorSeverity.LOW:
                return 'log';
            case ErrorSeverity.MEDIUM:
                return 'warn';
            case ErrorSeverity.HIGH:
            case ErrorSeverity.CRITICAL:
                return 'error';
            default:
                return 'error';
        }
    }
    /**
     * Generate unique error ID
     */
    static generateErrorId() {
        return `ERR-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
    }
    /**
     * Create standardized error response for API
     */
    static createErrorResponse(error, context) {
        const errorLog = this.handleError(error, context);
        const statusCode = error instanceof validation_1.MetadataError ? error.statusCode : 500;
        const response = {
            error: true,
            errorId: errorLog.errorId,
            errorCode: errorLog.errorCode,
            message: error.message,
            timestamp: errorLog.timestamp
        };
        return {
            statusCode,
            body: JSON.stringify(response)
        };
    }
    /**
     * Determine if error should trigger user notification
     */
    static shouldNotifyUser(error, severity) {
        // Notify on high and critical errors
        if (severity === ErrorSeverity.HIGH || severity === ErrorSeverity.CRITICAL) {
            return true;
        }
        // Notify on specific error codes
        if (error instanceof validation_1.MetadataError) {
            const notifiableErrors = [
                validation_1.ErrorCodes.ANALYSIS_FAILED,
                validation_1.ErrorCodes.FILE_UPLOAD_FAILED,
                validation_1.ErrorCodes.DATABASE_ERROR
            ];
            return notifiableErrors.includes(error.code);
        }
        return false;
    }
    /**
     * Create retry strategy based on error type
     */
    static getRetryStrategy(error) {
        if (error instanceof validation_1.MetadataError) {
            switch (error.code) {
                case validation_1.ErrorCodes.DATABASE_ERROR:
                    return { shouldRetry: true, retryAfter: 1000, maxRetries: 3 };
                case validation_1.ErrorCodes.NETWORK_ERROR:
                    return { shouldRetry: true, retryAfter: 2000, maxRetries: 5 };
                case validation_1.ErrorCodes.VALIDATION_ERROR:
                case validation_1.ErrorCodes.UNAUTHORIZED:
                case validation_1.ErrorCodes.NOT_FOUND:
                    return { shouldRetry: false, retryAfter: 0, maxRetries: 0 };
                default:
                    return { shouldRetry: true, retryAfter: 1000, maxRetries: 2 };
            }
        }
        // Default retry strategy for unknown errors
        return { shouldRetry: true, retryAfter: 1000, maxRetries: 2 };
    }
}
exports.ErrorHandlerService = ErrorHandlerService;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZXJyb3ItaGFuZGxlci1zZXJ2aWNlLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZXJyb3ItaGFuZGxlci1zZXJ2aWNlLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQUVILG9EQUFnRTtBQUVoRSxJQUFZLGFBS1g7QUFMRCxXQUFZLGFBQWE7SUFDdkIsNEJBQVcsQ0FBQTtJQUNYLGtDQUFpQixDQUFBO0lBQ2pCLDhCQUFhLENBQUE7SUFDYixzQ0FBcUIsQ0FBQTtBQUN2QixDQUFDLEVBTFcsYUFBYSw2QkFBYixhQUFhLFFBS3hCO0FBc0JELE1BQWEsbUJBQW1CO0lBQzlCOztPQUVHO0lBQ0gsTUFBTSxDQUFDLFdBQVcsQ0FDaEIsS0FBNEIsRUFDNUIsT0FBc0IsRUFDdEIsV0FBMEIsYUFBYSxDQUFDLE1BQU07UUFFOUMsTUFBTSxRQUFRLEdBQWE7WUFDekIsT0FBTyxFQUFFLElBQUksQ0FBQyxlQUFlLEVBQUU7WUFDL0IsU0FBUyxFQUFFLElBQUksQ0FBQyxHQUFHLEVBQUU7WUFDckIsUUFBUTtZQUNSLFNBQVMsRUFBRSxLQUFLLFlBQVksMEJBQWEsQ0FBQyxDQUFDLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxDQUFDLENBQUMsdUJBQVUsQ0FBQyxhQUFhO1lBQ2pGLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztZQUN0QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7WUFDbEIsT0FBTztTQUNSLENBQUM7UUFFRiw4REFBOEQ7UUFDOUQsSUFBSSxDQUFDLFFBQVEsQ0FBQyxRQUFRLENBQUMsQ0FBQztRQUV4QixPQUFPLFFBQVEsQ0FBQztJQUNsQixDQUFDO0lBRUQ7O09BRUc7SUFDSyxNQUFNLENBQUMsUUFBUSxDQUFDLFFBQWtCO1FBQ3hDLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxtQkFBbUIsQ0FBQyxRQUFRLENBQUMsUUFBUSxDQUFDLENBQUM7UUFDN0QsTUFBTSxVQUFVLEdBQUcsSUFBSSxRQUFRLENBQUMs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QUFDLGNBQWM7b0JBQzVCLE9BQU8sRUFBRSxXQUFXLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUVoRSxLQUFLLHVCQUFVLENBQUMsYUFBYTtvQkFDM0IsT0FBTyxFQUFFLFdBQVcsRUFBRSxJQUFJLEVBQUUsVUFBVSxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsQ0FBQyxFQUFFLENBQUM7Z0JBRWhFLEtBQUssdUJBQVUsQ0FBQyxnQkFBZ0IsQ0FBQztnQkFDakMsS0FBSyx1QkFBVSxDQUFDLFlBQVksQ0FBQztnQkFDN0IsS0FBSyx1QkFBVSxDQUFDLFNBQVM7b0JBQ3ZCLE9BQU8sRUFBRSxXQUFXLEVBQUUsS0FBSyxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsVUFBVSxFQUFFLENBQUMsRUFBRSxDQUFDO2dCQUU5RDtvQkFDRSxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztZQUNsRSxDQUFDO1FBQ0gsQ0FBQztRQUVELDRDQUE0QztRQUM1QyxPQUFPLEVBQUUsV0FBVyxFQUFFLElBQUksRUFBRSxVQUFVLEVBQUUsSUFBSSxFQUFFLFVBQVUsRUFBRSxDQUFDLEVBQUUsQ0FBQztJQUNoRSxDQUFDO0NBQ0Y7QUEvSUQsa0RBK0lDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIEVycm9yIEhhbmRsZXIgU2VydmljZVxyXG4gKiBDZW50cmFsaXplZCBlcnJvciBoYW5kbGluZyBhbmQgbG9nZ2luZyBmb3IgdGhlIGFwcGxpY2F0aW9uXHJcbiAqL1xyXG5cclxuaW1wb3J0IHsgTWV0YWRhdGFFcnJvciwgRXJyb3JDb2RlcyB9IGZyb20gJy4uL3R5cGVzL3ZhbGlkYXRpb24nO1xyXG5cclxuZXhwb3J0IGVudW0gRXJyb3JTZXZlcml0eSB7XHJcbiAgTE9XID0gJ2xvdycsXHJcbiAgTUVESVVNID0gJ21lZGl1bScsXHJcbiAgSElHSCA9ICdoaWdoJyxcclxuICBDUklUSUNBTCA9ICdjcml0aWNhbCdcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBFcnJvckNvbnRleHQge1xyXG4gIHVzZXJJZD86IHN0cmluZztcclxuICBmaWxlSWQ/OiBzdHJpbmc7XHJcbiAgZmlsZU5hbWU/OiBzdHJpbmc7XHJcbiAgYW5hbHlzaXNJZD86IHN0cmluZztcclxuICBvcGVyYXRpb24/OiBzdHJpbmc7XHJcbiAgcmV0cnlDb3VudD86IG51bWJlcjtcclxuICBtZXRhZGF0YT86IFJlY29yZDxzdHJpbmcsIGFueT47XHJcbn1cclxuXHJcbmV4cG9ydCBpbnRlcmZhY2UgRXJyb3JMb2cge1xyXG4gIGVycm9ySWQ6IHN0cmluZztcclxuICB0aW1lc3RhbXA6IG51bWJlcjtcclxuICBzZXZlcml0eTogRXJyb3JTZXZlcml0eTtcclxuICBlcnJvckNvZGU6IHN0cmluZztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgc3RhY2s/OiBzdHJpbmc7XHJcbiAgY29udGV4dD86IEVycm9yQ29udGV4dDtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIEVycm9ySGFuZGxlclNlcnZpY2Uge1xyXG4gIC8qKlxyXG4gICAqIEhhbmRsZSBhbmQgbG9nIGVycm9ycyB3aXRoIGFwcHJvcHJpYXRlIHNldmVyaXR5XHJcbiAgICovXHJcbiAgc3RhdGljIGhhbmRsZUVycm9yKFxyXG4gICAgZXJyb3I6IEVycm9yIHwgTWV0YWRhdGFFcnJvcixcclxuICAgIGNvbnRleHQ/OiBFcnJvckNvbnRleHQsXHJcbiAgICBzZXZlcml0eTogRXJyb3JTZXZlcml0eSA9IEVycm9yU2V2ZXJpdHkuTUVESVVNXHJcbiAgKTogRXJyb3JMb2cge1xyXG4gICAgY29uc3QgZXJyb3JMb2c6IEVycm9yTG9nID0ge1xyXG4gICAgICBlcnJvcklkOiB0aGlzLmdlbmVyYXRlRXJyb3JJZCgpLFxyXG4gICAgICB0aW1lc3RhbXA6IERhdGUubm93KCksXHJcbiAgICAgIHNldmVyaXR5LFxyXG4gICAgICBlcnJvckNvZGU6IGVycm9yIGluc3RhbmNlb2YgTWV0YWRhdGFFcnJvciA/IGVycm9yLmNvZGUgOiBFcnJvckNvZGVzLlVOS05PV05fRVJST1IsXHJcbiAgICAgIG1lc3NhZ2U6IGVycm9yLm1lc3NhZ2UsXHJcbiAgICAgIHN0YWNrOiBlcnJvci5zdGFjayxcclxuICAgICAgY29udGV4dFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBMb2cgdG8gY29uc29sZSAoaW4gcHJvZHVjdGlvbiwgdGhpcyB3b3VsZCBnbyB0byBDbG91ZFdhdGNoKVxyXG4gICAgdGhpcy5sb2dFcnJvcihlcnJvckxvZyk7XHJcblxyXG4gICAgcmV0dXJuIGVycm9yTG9nO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGVycm9yIHRvIGNvbnNvbGUgd2l0aCBmb3JtYXR0aW5nXHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzdGF0aWMgbG9nRXJyb3IoZXJyb3JMb2c6IEVycm9yTG9nKTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2dMZXZlbCA9IHRoaXMuZ2V0U2V2ZXJpdHlMb2dMZXZlbChlcnJvckxvZy5zZXZlcml0eSk7XHJcbiAgICBjb25zdCBsb2dNZXNzYWdlID0gYFske2Vycm9yTG9nLnNldmVyaXR5LnRvVXBwZXJDYXNlKCl9XSAke2Vycm9yTG9nLmVycm9yQ29kZX06ICR7ZXJyb3JMb2cubWVzc2FnZX1gO1xyXG4gICAgXHJcbiAgICBjb25zb2xlW2xvZ0xldmVsXShsb2dNZXNzYWdlLCB7XHJcbiAgICAgIGVycm9ySWQ6IGVycm9yTG9nLmVycm9ySWQsXHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoZXJyb3JMb2cudGltZXN0YW1wKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBjb250ZXh0OiBlcnJvckxvZy5jb250ZXh0LFxyXG4gICAgICBzdGFjazogZXJyb3JMb2cuc3RhY2tcclxuICAgIH0pO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogR2V0IGNvbnNvbGUgbG9nIGxldmVsIGJhc2VkIG9uIHNldmVyaXR5XHJcbiAgICovXHJcbiAgcHJpdmF0ZSBzdGF0aWMgZ2V0U2V2ZXJpdHlMb2dMZXZlbChzZXZlcml0eTogRXJyb3JTZXZlcml0eSk6ICdsb2cnIHwgJ3dhcm4nIHwgJ2Vycm9yJyB7XHJcbiAgICBzd2l0Y2ggKHNldmVyaXR5KSB7XHJcbiAgICAgIGNhc2UgRXJyb3JTZXZlcml0eS5MT1c6XHJcbiAgICAgICAgcmV0dXJuICdsb2cnO1xyXG4gICAgICBjYXNlIEVycm9yU2V2ZXJpdHkuTUVESVVNOlxyXG4gICAgICAgIHJldHVybiAnd2Fybic7XHJcbiAgICAgIGNhc2UgRXJyb3JTZXZlcml0eS5ISUdIOlxyXG4gICAgICBjYXNlIEVycm9yU2V2ZXJpdHkuQ1JJVElDQUw6XHJcbiAgICAgICAgcmV0dXJuICdlcnJvcic7XHJcbiAgICAgIGRlZmF1bHQ6XHJcbiAgICAgICAgcmV0dXJuICdlcnJvcic7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBHZW5lcmF0ZSB1bmlxdWUgZXJyb3IgSURcclxuICAgKi9cclxuICBwcml2YXRlIHN0YXRpYyBnZW5lcmF0ZUVycm9ySWQoKTogc3RyaW5nIHtcclxuICAgIHJldHVybiBgRVJSLSR7RGF0ZS5ub3coKX0tJHtNYXRoLnJhbmRvbSgpLnRvU3RyaW5nKDM2KS5zdWJzdHIoMiwgOSl9YDtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBzdGFuZGFyZGl6ZWQgZXJyb3IgcmVzcG9uc2UgZm9yIEFQSVxyXG4gICAqL1xyXG4gIHN0YXRpYyBjcmVhdGVFcnJvclJlc3BvbnNlKFxyXG4gICAgZXJyb3I6IEVycm9yIHwgTWV0YWRhdGFFcnJvcixcclxuICAgIGNvbnRleHQ/OiBFcnJvckNvbnRleHRcclxuICApOiB7XHJcbiAgICBzdGF0dXNDb2RlOiBudW1iZXI7XHJcbiAgICBib2R5OiBzdHJpbmc7XHJcbiAgfSB7XHJcbiAgICBjb25zdCBlcnJvckxvZyA9IHRoaXMuaGFuZGxlRXJyb3IoZXJyb3IsIGNvbnRleHQpO1xyXG4gICAgXHJcbiAgICBjb25zdCBzdGF0dXNDb2RlID0gZXJyb3IgaW5zdGFuY2VvZiBNZXRhZGF0YUVycm9yID8gZXJyb3Iuc3RhdHVzQ29kZSA6IDUwMDtcclxuICAgIFxyXG4gICAgY29uc3QgcmVzcG9uc2UgPSB7XHJcbiAgICAgIGVycm9yOiB0cnVlLFxyXG4gICAgICBlcnJvcklkOiBlcnJvckxvZy5lcnJvcklkLFxyXG4gICAgICBlcnJvckNvZGU6IGVycm9yTG9nLmVycm9yQ29kZSxcclxuICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgdGltZXN0YW1wOiBlcnJvckxvZy50aW1lc3RhbXBcclxuICAgIH07XHJcblxyXG4gICAgcmV0dXJuIHtcclxuICAgICAgc3RhdHVzQ29kZSxcclxuICAgICAgYm9keTogSlNPTi5zdHJpbmdpZnkocmVzcG9uc2UpXHJcbiAgICB9O1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogRGV0ZXJtaW5lIGlmIGVycm9yIHNob3VsZCB0cmlnZ2VyIHVzZXIgbm90aWZpY2F0aW9uXHJcbiAgICovXHJcbiAgc3RhdGljIHNob3VsZE5vdGlmeVVzZXIoZXJyb3I6IEVycm9yIHwgTWV0YWRhdGFFcnJvciwgc2V2ZXJpdHk6IEVycm9yU2V2ZXJpdHkpOiBib29sZWFuIHtcclxuICAgIC8vIE5vdGlmeSBvbiBoaWdoIGFuZCBjcml0aWNhbCBlcnJvcnNcclxuICAgIGlmIChzZXZlcml0eSA9PT0gRXJyb3JTZXZlcml0eS5ISUdIIHx8IHNldmVyaXR5ID09PSBFcnJvclNldmVyaXR5LkNSSVRJQ0FMKSB7XHJcbiAgICAgIHJldHVybiB0cnVlO1xyXG4gICAgfVxyXG5cclxuICAgIC8vIE5vdGlmeSBvbiBzcGVjaWZpYyBlcnJvciBjb2Rlc1xyXG4gICAgaWYgKGVycm9yIGluc3RhbmNlb2YgTWV0YWRhdGFFcnJvcikge1xyXG4gICAgICBjb25zdCBub3RpZmlhYmxlRXJyb3JzID0gW1xyXG4gICAgICAgIEVycm9yQ29kZXMuQU5BTFlTSVNfRkFJTEVELFxyXG4gICAgICAgIEVycm9yQ29kZXMuRklMRV9VUExPQURfRkFJTEVELFxyXG4gICAgICAgIEVycm9yQ29kZXMuREFUQUJBU0VfRVJST1JcclxuICAgICAgXTtcclxuICAgICAgcmV0dXJuIG5vdGlmaWFibGVFcnJvcnMuaW5jbHVkZXMoZXJyb3IuY29kZSBhcyBhbnkpO1xyXG4gICAgfVxyXG5cclxuICAgIHJldHVybiBmYWxzZTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSByZXRyeSBzdHJhdGVneSBiYXNlZCBvbiBlcnJvciB0eXBlXHJcbiAgICovXHJcbiAgc3RhdGljIGdldFJldHJ5U3RyYXRlZ3koZXJyb3I6IEVycm9yIHwgTWV0YWRhdGFFcnJvcik6IHtcclxuICAgIHNob3VsZFJldHJ5OiBib29sZWFuO1xyXG4gICAgcmV0cnlBZnRlcjogbnVtYmVyOyAvLyBtaWxsaXNlY29uZHNcclxuICAgIG1heFJldHJpZXM6IG51bWJlcjtcclxuICB9IHtcclxuICAgIGlmIChlcnJvciBpbnN0YW5jZW9mIE1ldGFkYXRhRXJyb3IpIHtcclxuICAgICAgc3dpdGNoIChlcnJvci5jb2RlKSB7XHJcbiAgICAgICAgY2FzZSBFcnJvckNvZGVzLkRBVEFCQVNFX0VSUk9SOlxyXG4gICAgICAgICAgcmV0dXJuIHsgc2hvdWxkUmV0cnk6IHRydWUsIHJldHJ5QWZ0ZXI6IDEwMDAsIG1heFJldHJpZXM6IDMgfTtcclxuICAgICAgICBcclxuICAgICAgICBjYXNlIEVycm9yQ29kZXMuTkVUV09SS19FUlJPUjpcclxuICAgICAgICAgIHJldHVybiB7IHNob3VsZFJldHJ5OiB0cnVlLCByZXRyeUFmdGVyOiAyMDAwLCBtYXhSZXRyaWVzOiA1IH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgY2FzZSBFcnJvckNvZGVzLlZBTElEQVRJT05fRVJST1I6XHJcbiAgICAgICAgY2FzZSBFcnJvckNvZGVzLlVOQVVUSE9SSVpFRDpcclxuICAgICAgICBjYXNlIEVycm9yQ29kZXMuTk9UX0ZPVU5EOlxyXG4gICAgICAgICAgcmV0dXJuIHsgc2hvdWxkUmV0cnk6IGZhbHNlLCByZXRyeUFmdGVyOiAwLCBtYXhSZXRyaWVzOiAwIH07XHJcbiAgICAgICAgXHJcbiAgICAgICAgZGVmYXVsdDpcclxuICAgICAgICAgIHJldHVybiB7IHNob3VsZFJldHJ5OiB0cnVlLCByZXRyeUFmdGVyOiAxMDAwLCBtYXhSZXRyaWVzOiAyIH07XHJcbiAgICAgIH1cclxuICAgIH1cclxuXHJcbiAgICAvLyBEZWZhdWx0IHJldHJ5IHN0cmF0ZWd5IGZvciB1bmtub3duIGVycm9yc1xyXG4gICAgcmV0dXJuIHsgc2hvdWxkUmV0cnk6IHRydWUsIHJldHJ5QWZ0ZXI6IDEwMDAsIG1heFJldHJpZXM6IDIgfTtcclxuICB9XHJcbn1cclxuIl19