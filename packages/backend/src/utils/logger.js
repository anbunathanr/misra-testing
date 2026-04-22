"use strict";
/**
 * Structured Logger Utility
 * Provides consistent logging across all Lambda functions with CloudWatch Insights support
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.Logger = exports.LogLevel = void 0;
exports.createLogger = createLogger;
var LogLevel;
(function (LogLevel) {
    LogLevel["DEBUG"] = "DEBUG";
    LogLevel["INFO"] = "INFO";
    LogLevel["WARN"] = "WARN";
    LogLevel["ERROR"] = "ERROR";
})(LogLevel || (exports.LogLevel = LogLevel = {}));
class Logger {
    context;
    defaultMetadata;
    constructor(context, defaultMetadata = {}) {
        this.context = context;
        this.defaultMetadata = defaultMetadata;
    }
    /**
     * Log a message with the specified level
     */
    log(level, message, meta) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level,
            context: this.context,
            message,
            requestId: process.env.AWS_REQUEST_ID,
            ...this.defaultMetadata,
            ...meta,
        };
        // Output as JSON for CloudWatch Insights
        console.log(JSON.stringify(logEntry));
    }
    /**
     * Log debug message (verbose information for development)
     */
    debug(message, meta) {
        if (process.env.LOG_LEVEL === 'DEBUG') {
            this.log(LogLevel.DEBUG, message, meta);
        }
    }
    /**
     * Log info message (general information about application flow)
     */
    info(message, meta) {
        this.log(LogLevel.INFO, message, meta);
    }
    /**
     * Log warning message (potentially harmful situations)
     */
    warn(message, meta) {
        this.log(LogLevel.WARN, message, meta);
    }
    /**
     * Log error message (error events that might still allow the application to continue)
     */
    error(message, errorOrMeta, meta) {
        let error;
        let metadata = meta;
        // Handle overloaded parameters
        if (errorOrMeta && errorOrMeta instanceof Error) {
            error = errorOrMeta;
        }
        else if (errorOrMeta && typeof errorOrMeta === 'object') {
            metadata = errorOrMeta;
        }
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            context: this.context,
            message,
            requestId: process.env.AWS_REQUEST_ID,
            ...this.defaultMetadata,
            ...metadata,
            error: error
                ? {
                    message: error.message,
                    stack: error.stack,
                    name: error.name,
                }
                : undefined,
        };
        console.error(JSON.stringify(logEntry));
    }
    /**
     * Create a child logger with additional context
     */
    child(additionalContext, additionalMetadata = {}) {
        return new Logger(`${this.context}.${additionalContext}`, { ...this.defaultMetadata, ...additionalMetadata });
    }
    /**
     * Log execution timing
     */
    time(label) {
        const start = Date.now();
        return () => {
            const duration = Date.now() - start;
            this.info(`${label} completed`, { duration });
        };
    }
}
exports.Logger = Logger;
/**
 * Create a logger instance for a specific context
 */
function createLogger(context, metadata) {
    return new Logger(context, metadata);
}
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQTBJSCxvQ0FFQztBQTFJRCxJQUFZLFFBS1g7QUFMRCxXQUFZLFFBQVE7SUFDbEIsMkJBQWUsQ0FBQTtJQUNmLHlCQUFhLENBQUE7SUFDYix5QkFBYSxDQUFBO0lBQ2IsMkJBQWUsQ0FBQTtBQUNqQixDQUFDLEVBTFcsUUFBUSx3QkFBUixRQUFRLFFBS25CO0FBc0JELE1BQWEsTUFBTTtJQUNULE9BQU8sQ0FBUztJQUNoQixlQUFlLENBQWM7SUFFckMsWUFBWSxPQUFlLEVBQUUsa0JBQStCLEVBQUU7UUFDNUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssR0FBRyxDQUFDLEtBQWUsRUFBRSxPQUFlLEVBQUUsSUFBa0I7UUFDOUQsTUFBTSxRQUFRLEdBQWE7WUFDekIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLEtBQUs7WUFDTCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsT0FBTztZQUNQLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7WUFDckMsR0FBRyxJQUFJLENBQUMsZUFBZTtZQUN2QixHQUFHLElBQUk7U0FDUixDQUFDO1FBRUYseUNBQXlDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsSUFBa0I7UUFDdkMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLENBQUMsT0FBZSxFQUFFLElBQWtCO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLE9BQWUsRUFBRSxJQUFrQjtRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsV0FBaUMsRUFBRSxJQUFrQjtRQUMxRSxJQUFJLEtBQXdCLENBQUM7UUFDN0IsSUFBSSxRQUFRLEdBQUcsSUFBSSxDQUFDO1FBRXBCLCtCQUErQjtRQUMvQixJQUFJLFdBQVcsSUFBSSxXQUFXLFlBQVksS0FBSyxFQUFFLENBQUM7WUFDaEQsS0FBSyxHQUFHLFdBQVcsQ0FBQztRQUN0QixDQUFDO2FBQU0sSUFBSSxXQUFXLElBQUksT0FBTyxXQUFXLEtBQUssUUFBUSxFQUFFLENBQUM7WUFDMUQsUUFBUSxHQUFHLFdBQVcsQ0FBQztRQUN6QixDQUFDO1FBRUQsTUFBTSxRQUFRLEdBQWE7WUFDekIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLEtBQUssRUFBRSxRQUFRLENBQUMsS0FBSztZQUNyQixPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsT0FBTztZQUNQLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7WUFDckMsR0FBRyxJQUFJLENBQUMsZUFBZTtZQUN2QixHQUFHLFFBQVE7WUFDWCxLQUFLLEVBQUUsS0FBSztnQkFDVixDQUFDLENBQUM7b0JBQ0UsT0FBTyxFQUFFLEtBQUssQ0FBQyxPQUFPO29CQUN0QixLQUFLLEVBQUUsS0FBSyxDQUFDLEtBQUs7b0JBQ2xCLElBQUksRUFBRSxLQUFLLENBQUMsSUFBSTtpQkFDakI7Z0JBQ0gsQ0FBQyxDQUFDLFNBQVM7U0FDZCxDQUFDO1FBRUYsT0FBTyxDQUFDLEtBQUssQ0FBQyxJQUFJLENBQUMsU0FBUyxDQUFDLFFBQVEsQ0FBQyxDQUFDLENBQUM7SUFDMUMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsS0FBSyxDQUFDLGlCQUF5QixFQUFFLHFCQUFrQyxFQUFFO1FBQ25FLE9BQU8sSUFBSSxNQUFNLENBQ2YsR0FBRyxJQUFJLENBQUMsT0FBTyxJQUFJLGlCQUFpQixFQUFFLEVBQ3RDLEVBQUUsR0FBRyxJQUFJLENBQUMsZUFBZSxFQUFFLEdBQUcsa0JBQWtCLEVBQUUsQ0FDbkQsQ0FBQztJQUNKLENBQUM7SUFFRDs7T0FFRztJQUNILElBQUksQ0FBQyxLQUFhO1FBQ2hCLE1BQU0sS0FBSyxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsQ0FBQztRQUN6QixPQUFPLEdBQUcsRUFBRTtZQUNWLE1BQU0sUUFBUSxHQUFHLElBQUksQ0FBQyxHQUFHLEVBQUUsR0FBRyxLQUFLLENBQUM7WUFDcEMsSUFBSSxDQUFDLElBQUksQ0FBQyxHQUFHLEtBQUssWUFBWSxFQUFFLEVBQUUsUUFBUSxFQUFFLENBQUMsQ0FBQztRQUNoRCxDQUFDLENBQUM7SUFDSixDQUFDO0NBQ0Y7QUF4R0Qsd0JBd0dDO0FBRUQ7O0dBRUc7QUFDSCxTQUFnQixZQUFZLENBQUMsT0FBZSxFQUFFLFFBQXNCO0lBQ2xFLE9BQU8sSUFBSSxNQUFNLENBQUMsT0FBTyxFQUFFLFFBQVEsQ0FBQyxDQUFDO0FBQ3ZDLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU3RydWN0dXJlZCBMb2dnZXIgVXRpbGl0eVxyXG4gKiBQcm92aWRlcyBjb25zaXN0ZW50IGxvZ2dpbmcgYWNyb3NzIGFsbCBMYW1iZGEgZnVuY3Rpb25zIHdpdGggQ2xvdWRXYXRjaCBJbnNpZ2h0cyBzdXBwb3J0XHJcbiAqL1xyXG5cclxuZXhwb3J0IGVudW0gTG9nTGV2ZWwge1xyXG4gIERFQlVHID0gJ0RFQlVHJyxcclxuICBJTkZPID0gJ0lORk8nLFxyXG4gIFdBUk4gPSAnV0FSTicsXHJcbiAgRVJST1IgPSAnRVJST1InLFxyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExvZ01ldGFkYXRhIHtcclxuICBba2V5OiBzdHJpbmddOiBhbnk7XHJcbiAgY29ycmVsYXRpb25JZD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dFbnRyeSB7XHJcbiAgdGltZXN0YW1wOiBzdHJpbmc7XHJcbiAgbGV2ZWw6IExvZ0xldmVsO1xyXG4gIGNvbnRleHQ6IHN0cmluZztcclxuICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgcmVxdWVzdElkPzogc3RyaW5nO1xyXG4gIHVzZXJJZD86IHN0cmluZztcclxuICBtZXRhZGF0YT86IExvZ01ldGFkYXRhO1xyXG4gIGVycm9yPzoge1xyXG4gICAgbWVzc2FnZTogc3RyaW5nO1xyXG4gICAgc3RhY2s/OiBzdHJpbmc7XHJcbiAgICBuYW1lOiBzdHJpbmc7XHJcbiAgfTtcclxufVxyXG5cclxuZXhwb3J0IGNsYXNzIExvZ2dlciB7XHJcbiAgcHJpdmF0ZSBjb250ZXh0OiBzdHJpbmc7XHJcbiAgcHJpdmF0ZSBkZWZhdWx0TWV0YWRhdGE6IExvZ01ldGFkYXRhO1xyXG5cclxuICBjb25zdHJ1Y3Rvcihjb250ZXh0OiBzdHJpbmcsIGRlZmF1bHRNZXRhZGF0YTogTG9nTWV0YWRhdGEgPSB7fSkge1xyXG4gICAgdGhpcy5jb250ZXh0ID0gY29udGV4dDtcclxuICAgIHRoaXMuZGVmYXVsdE1ldGFkYXRhID0gZGVmYXVsdE1ldGFkYXRhO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGEgbWVzc2FnZSB3aXRoIHRoZSBzcGVjaWZpZWQgbGV2ZWxcclxuICAgKi9cclxuICBwcml2YXRlIGxvZyhsZXZlbDogTG9nTGV2ZWwsIG1lc3NhZ2U6IHN0cmluZywgbWV0YT86IExvZ01ldGFkYXRhKTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2dFbnRyeTogTG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsZXZlbCxcclxuICAgICAgY29udGV4dDogdGhpcy5jb250ZXh0LFxyXG4gICAgICBtZXNzYWdlLFxyXG4gICAgICByZXF1ZXN0SWQ6IHByb2Nlc3MuZW52LkFXU19SRVFVRVNUX0lELFxyXG4gICAgICAuLi50aGlzLmRlZmF1bHRNZXRhZGF0YSxcclxuICAgICAgLi4ubWV0YSxcclxuICAgIH07XHJcblxyXG4gICAgLy8gT3V0cHV0IGFzIEpTT04gZm9yIENsb3VkV2F0Y2ggSW5zaWdodHNcclxuICAgIGNvbnNvbGUubG9nKEpTT04uc3RyaW5naWZ5KGxvZ0VudHJ5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZGVidWcgbWVzc2FnZSAodmVyYm9zZSBpbmZvcm1hdGlvbiBmb3IgZGV2ZWxvcG1lbnQpXHJcbiAgICovXHJcbiAgZGVidWcobWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIGlmIChwcm9jZXNzLmVudi5MT0dfTEVWRUwgPT09ICdERUJVRycpIHtcclxuICAgICAgdGhpcy5sb2coTG9nTGV2ZWwuREVCVUcsIG1lc3NhZ2UsIG1ldGEpO1xyXG4gICAgfVxyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGluZm8gbWVzc2FnZSAoZ2VuZXJhbCBpbmZvcm1hdGlvbiBhYm91dCBhcHBsaWNhdGlvbiBmbG93KVxyXG4gICAqL1xyXG4gIGluZm8obWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIHRoaXMubG9nKExvZ0xldmVsLklORk8sIG1lc3NhZ2UsIG1ldGEpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIHdhcm5pbmcgbWVzc2FnZSAocG90ZW50aWFsbHkgaGFybWZ1bCBzaXR1YXRpb25zKVxyXG4gICAqL1xyXG4gIHdhcm4obWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIHRoaXMubG9nKExvZ0xldmVsLldBUk4sIG1lc3NhZ2UsIG1ldGEpO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGVycm9yIG1lc3NhZ2UgKGVycm9yIGV2ZW50cyB0aGF0IG1pZ2h0IHN0aWxsIGFsbG93IHRoZSBhcHBsaWNhdGlvbiB0byBjb250aW51ZSlcclxuICAgKi9cclxuICBlcnJvcihtZXNzYWdlOiBzdHJpbmcsIGVycm9yT3JNZXRhPzogRXJyb3IgfCBMb2dNZXRhZGF0YSwgbWV0YT86IExvZ01ldGFkYXRhKTogdm9pZCB7XHJcbiAgICBsZXQgZXJyb3I6IEVycm9yIHwgdW5kZWZpbmVkO1xyXG4gICAgbGV0IG1ldGFkYXRhID0gbWV0YTtcclxuICAgIFxyXG4gICAgLy8gSGFuZGxlIG92ZXJsb2FkZWQgcGFyYW1ldGVyc1xyXG4gICAgaWYgKGVycm9yT3JNZXRhICYmIGVycm9yT3JNZXRhIGluc3RhbmNlb2YgRXJyb3IpIHtcclxuICAgICAgZXJyb3IgPSBlcnJvck9yTWV0YTtcclxuICAgIH0gZWxzZSBpZiAoZXJyb3JPck1ldGEgJiYgdHlwZW9mIGVycm9yT3JNZXRhID09PSAnb2JqZWN0Jykge1xyXG4gICAgICBtZXRhZGF0YSA9IGVycm9yT3JNZXRhO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICBjb25zdCBsb2dFbnRyeTogTG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsZXZlbDogTG9nTGV2ZWwuRVJST1IsXHJcbiAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgcmVxdWVzdElkOiBwcm9jZXNzLmVudi5BV1NfUkVRVUVTVF9JRCxcclxuICAgICAgLi4udGhpcy5kZWZhdWx0TWV0YWRhdGEsXHJcbiAgICAgIC4uLm1ldGFkYXRhLFxyXG4gICAgICBlcnJvcjogZXJyb3JcclxuICAgICAgICA/IHtcclxuICAgICAgICAgICAgbWVzc2FnZTogZXJyb3IubWVzc2FnZSxcclxuICAgICAgICAgICAgc3RhY2s6IGVycm9yLnN0YWNrLFxyXG4gICAgICAgICAgICBuYW1lOiBlcnJvci5uYW1lLFxyXG4gICAgICAgICAgfVxyXG4gICAgICAgIDogdW5kZWZpbmVkLFxyXG4gICAgfTtcclxuXHJcbiAgICBjb25zb2xlLmVycm9yKEpTT04uc3RyaW5naWZ5KGxvZ0VudHJ5KSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBDcmVhdGUgYSBjaGlsZCBsb2dnZXIgd2l0aCBhZGRpdGlvbmFsIGNvbnRleHRcclxuICAgKi9cclxuICBjaGlsZChhZGRpdGlvbmFsQ29udGV4dDogc3RyaW5nLCBhZGRpdGlvbmFsTWV0YWRhdGE6IExvZ01ldGFkYXRhID0ge30pOiBMb2dnZXIge1xyXG4gICAgcmV0dXJuIG5ldyBMb2dnZXIoXHJcbiAgICAgIGAke3RoaXMuY29udGV4dH0uJHthZGRpdGlvbmFsQ29udGV4dH1gLFxyXG4gICAgICB7IC4uLnRoaXMuZGVmYXVsdE1ldGFkYXRhLCAuLi5hZGRpdGlvbmFsTWV0YWRhdGEgfVxyXG4gICAgKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBleGVjdXRpb24gdGltaW5nXHJcbiAgICovXHJcbiAgdGltZShsYWJlbDogc3RyaW5nKTogKCkgPT4gdm9pZCB7XHJcbiAgICBjb25zdCBzdGFydCA9IERhdGUubm93KCk7XHJcbiAgICByZXR1cm4gKCkgPT4ge1xyXG4gICAgICBjb25zdCBkdXJhdGlvbiA9IERhdGUubm93KCkgLSBzdGFydDtcclxuICAgICAgdGhpcy5pbmZvKGAke2xhYmVsfSBjb21wbGV0ZWRgLCB7IGR1cmF0aW9uIH0pO1xyXG4gICAgfTtcclxuICB9XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBDcmVhdGUgYSBsb2dnZXIgaW5zdGFuY2UgZm9yIGEgc3BlY2lmaWMgY29udGV4dFxyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGNyZWF0ZUxvZ2dlcihjb250ZXh0OiBzdHJpbmcsIG1ldGFkYXRhPzogTG9nTWV0YWRhdGEpOiBMb2dnZXIge1xyXG4gIHJldHVybiBuZXcgTG9nZ2VyKGNvbnRleHQsIG1ldGFkYXRhKTtcclxufVxyXG4iXX0=