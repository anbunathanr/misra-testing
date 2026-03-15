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
    error(message, error, meta) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            level: LogLevel.ERROR,
            context: this.context,
            message,
            requestId: process.env.AWS_REQUEST_ID,
            ...this.defaultMetadata,
            ...meta,
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoibG9nZ2VyLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsibG9nZ2VyLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7O0dBR0c7OztBQStISCxvQ0FFQztBQS9IRCxJQUFZLFFBS1g7QUFMRCxXQUFZLFFBQVE7SUFDbEIsMkJBQWUsQ0FBQTtJQUNmLHlCQUFhLENBQUE7SUFDYix5QkFBYSxDQUFBO0lBQ2IsMkJBQWUsQ0FBQTtBQUNqQixDQUFDLEVBTFcsUUFBUSx3QkFBUixRQUFRLFFBS25CO0FBcUJELE1BQWEsTUFBTTtJQUNULE9BQU8sQ0FBUztJQUNoQixlQUFlLENBQWM7SUFFckMsWUFBWSxPQUFlLEVBQUUsa0JBQStCLEVBQUU7UUFDNUQsSUFBSSxDQUFDLE9BQU8sR0FBRyxPQUFPLENBQUM7UUFDdkIsSUFBSSxDQUFDLGVBQWUsR0FBRyxlQUFlLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0ssR0FBRyxDQUFDLEtBQWUsRUFBRSxPQUFlLEVBQUUsSUFBa0I7UUFDOUQsTUFBTSxRQUFRLEdBQWE7WUFDekIsU0FBUyxFQUFFLElBQUksSUFBSSxFQUFFLENBQUMsV0FBVyxFQUFFO1lBQ25DLEtBQUs7WUFDTCxPQUFPLEVBQUUsSUFBSSxDQUFDLE9BQU87WUFDckIsT0FBTztZQUNQLFNBQVMsRUFBRSxPQUFPLENBQUMsR0FBRyxDQUFDLGNBQWM7WUFDckMsR0FBRyxJQUFJLENBQUMsZUFBZTtZQUN2QixHQUFHLElBQUk7U0FDUixDQUFDO1FBRUYseUNBQXlDO1FBQ3pDLE9BQU8sQ0FBQyxHQUFHLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQ3hDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsSUFBa0I7UUFDdkMsSUFBSSxPQUFPLENBQUMsR0FBRyxDQUFDLFNBQVMsS0FBSyxPQUFPLEVBQUUsQ0FBQztZQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxLQUFLLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO1FBQzFDLENBQUM7SUFDSCxDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLENBQUMsT0FBZSxFQUFFLElBQWtCO1FBQ3RDLElBQUksQ0FBQyxHQUFHLENBQUMsUUFBUSxDQUFDLElBQUksRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUM7SUFDekMsQ0FBQztJQUVEOztPQUVHO0lBQ0gsSUFBSSxDQUFDLE9BQWUsRUFBRSxJQUFrQjtRQUN0QyxJQUFJLENBQUMsR0FBRyxDQUFDLFFBQVEsQ0FBQyxJQUFJLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDO0lBQ3pDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxPQUFlLEVBQUUsS0FBYSxFQUFFLElBQWtCO1FBQ3RELE1BQU0sUUFBUSxHQUFhO1lBQ3pCLFNBQVMsRUFBRSxJQUFJLElBQUksRUFBRSxDQUFDLFdBQVcsRUFBRTtZQUNuQyxLQUFLLEVBQUUsUUFBUSxDQUFDLEtBQUs7WUFDckIsT0FBTyxFQUFFLElBQUksQ0FBQyxPQUFPO1lBQ3JCLE9BQU87WUFDUCxTQUFTLEVBQUUsT0FBTyxDQUFDLEdBQUcsQ0FBQyxjQUFjO1lBQ3JDLEdBQUcsSUFBSSxDQUFDLGVBQWU7WUFDdkIsR0FBRyxJQUFJO1lBQ1AsS0FBSyxFQUFFLEtBQUs7Z0JBQ1YsQ0FBQyxDQUFDO29CQUNFLE9BQU8sRUFBRSxLQUFLLENBQUMsT0FBTztvQkFDdEIsS0FBSyxFQUFFLEtBQUssQ0FBQyxLQUFLO29CQUNsQixJQUFJLEVBQUUsS0FBSyxDQUFDLElBQUk7aUJBQ2pCO2dCQUNILENBQUMsQ0FBQyxTQUFTO1NBQ2QsQ0FBQztRQUVGLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLFNBQVMsQ0FBQyxRQUFRLENBQUMsQ0FBQyxDQUFDO0lBQzFDLENBQUM7SUFFRDs7T0FFRztJQUNILEtBQUssQ0FBQyxpQkFBeUIsRUFBRSxxQkFBa0MsRUFBRTtRQUNuRSxPQUFPLElBQUksTUFBTSxDQUNmLEdBQUcsSUFBSSxDQUFDLE9BQU8sSUFBSSxpQkFBaUIsRUFBRSxFQUN0QyxFQUFFLEdBQUcsSUFBSSxDQUFDLGVBQWUsRUFBRSxHQUFHLGtCQUFrQixFQUFFLENBQ25ELENBQUM7SUFDSixDQUFDO0lBRUQ7O09BRUc7SUFDSCxJQUFJLENBQUMsS0FBYTtRQUNoQixNQUFNLEtBQUssR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLENBQUM7UUFDekIsT0FBTyxHQUFHLEVBQUU7WUFDVixNQUFNLFFBQVEsR0FBRyxJQUFJLENBQUMsR0FBRyxFQUFFLEdBQUcsS0FBSyxDQUFDO1lBQ3BDLElBQUksQ0FBQyxJQUFJLENBQUMsR0FBRyxLQUFLLFlBQVksRUFBRSxFQUFFLFFBQVEsRUFBRSxDQUFDLENBQUM7UUFDaEQsQ0FBQyxDQUFDO0lBQ0osQ0FBQztDQUNGO0FBOUZELHdCQThGQztBQUVEOztHQUVHO0FBQ0gsU0FBZ0IsWUFBWSxDQUFDLE9BQWUsRUFBRSxRQUFzQjtJQUNsRSxPQUFPLElBQUksTUFBTSxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQztBQUN2QyxDQUFDIiwic291cmNlc0NvbnRlbnQiOlsiLyoqXHJcbiAqIFN0cnVjdHVyZWQgTG9nZ2VyIFV0aWxpdHlcclxuICogUHJvdmlkZXMgY29uc2lzdGVudCBsb2dnaW5nIGFjcm9zcyBhbGwgTGFtYmRhIGZ1bmN0aW9ucyB3aXRoIENsb3VkV2F0Y2ggSW5zaWdodHMgc3VwcG9ydFxyXG4gKi9cclxuXHJcbmV4cG9ydCBlbnVtIExvZ0xldmVsIHtcclxuICBERUJVRyA9ICdERUJVRycsXHJcbiAgSU5GTyA9ICdJTkZPJyxcclxuICBXQVJOID0gJ1dBUk4nLFxyXG4gIEVSUk9SID0gJ0VSUk9SJyxcclxufVxyXG5cclxuZXhwb3J0IGludGVyZmFjZSBMb2dNZXRhZGF0YSB7XHJcbiAgW2tleTogc3RyaW5nXTogYW55O1xyXG59XHJcblxyXG5leHBvcnQgaW50ZXJmYWNlIExvZ0VudHJ5IHtcclxuICB0aW1lc3RhbXA6IHN0cmluZztcclxuICBsZXZlbDogTG9nTGV2ZWw7XHJcbiAgY29udGV4dDogc3RyaW5nO1xyXG4gIG1lc3NhZ2U6IHN0cmluZztcclxuICByZXF1ZXN0SWQ/OiBzdHJpbmc7XHJcbiAgdXNlcklkPzogc3RyaW5nO1xyXG4gIG1ldGFkYXRhPzogTG9nTWV0YWRhdGE7XHJcbiAgZXJyb3I/OiB7XHJcbiAgICBtZXNzYWdlOiBzdHJpbmc7XHJcbiAgICBzdGFjaz86IHN0cmluZztcclxuICAgIG5hbWU6IHN0cmluZztcclxuICB9O1xyXG59XHJcblxyXG5leHBvcnQgY2xhc3MgTG9nZ2VyIHtcclxuICBwcml2YXRlIGNvbnRleHQ6IHN0cmluZztcclxuICBwcml2YXRlIGRlZmF1bHRNZXRhZGF0YTogTG9nTWV0YWRhdGE7XHJcblxyXG4gIGNvbnN0cnVjdG9yKGNvbnRleHQ6IHN0cmluZywgZGVmYXVsdE1ldGFkYXRhOiBMb2dNZXRhZGF0YSA9IHt9KSB7XHJcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG4gICAgdGhpcy5kZWZhdWx0TWV0YWRhdGEgPSBkZWZhdWx0TWV0YWRhdGE7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgYSBtZXNzYWdlIHdpdGggdGhlIHNwZWNpZmllZCBsZXZlbFxyXG4gICAqL1xyXG4gIHByaXZhdGUgbG9nKGxldmVsOiBMb2dMZXZlbCwgbWVzc2FnZTogc3RyaW5nLCBtZXRhPzogTG9nTWV0YWRhdGEpOiB2b2lkIHtcclxuICAgIGNvbnN0IGxvZ0VudHJ5OiBMb2dFbnRyeSA9IHtcclxuICAgICAgdGltZXN0YW1wOiBuZXcgRGF0ZSgpLnRvSVNPU3RyaW5nKCksXHJcbiAgICAgIGxldmVsLFxyXG4gICAgICBjb250ZXh0OiB0aGlzLmNvbnRleHQsXHJcbiAgICAgIG1lc3NhZ2UsXHJcbiAgICAgIHJlcXVlc3RJZDogcHJvY2Vzcy5lbnYuQVdTX1JFUVVFU1RfSUQsXHJcbiAgICAgIC4uLnRoaXMuZGVmYXVsdE1ldGFkYXRhLFxyXG4gICAgICAuLi5tZXRhLFxyXG4gICAgfTtcclxuXHJcbiAgICAvLyBPdXRwdXQgYXMgSlNPTiBmb3IgQ2xvdWRXYXRjaCBJbnNpZ2h0c1xyXG4gICAgY29uc29sZS5sb2coSlNPTi5zdHJpbmdpZnkobG9nRW50cnkpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIExvZyBkZWJ1ZyBtZXNzYWdlICh2ZXJib3NlIGluZm9ybWF0aW9uIGZvciBkZXZlbG9wbWVudClcclxuICAgKi9cclxuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBMb2dNZXRhZGF0YSk6IHZvaWQge1xyXG4gICAgaWYgKHByb2Nlc3MuZW52LkxPR19MRVZFTCA9PT0gJ0RFQlVHJykge1xyXG4gICAgICB0aGlzLmxvZyhMb2dMZXZlbC5ERUJVRywgbWVzc2FnZSwgbWV0YSk7XHJcbiAgICB9XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgaW5mbyBtZXNzYWdlIChnZW5lcmFsIGluZm9ybWF0aW9uIGFib3V0IGFwcGxpY2F0aW9uIGZsb3cpXHJcbiAgICovXHJcbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBMb2dNZXRhZGF0YSk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coTG9nTGV2ZWwuSU5GTywgbWVzc2FnZSwgbWV0YSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgd2FybmluZyBtZXNzYWdlIChwb3RlbnRpYWxseSBoYXJtZnVsIHNpdHVhdGlvbnMpXHJcbiAgICovXHJcbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBMb2dNZXRhZGF0YSk6IHZvaWQge1xyXG4gICAgdGhpcy5sb2coTG9nTGV2ZWwuV0FSTiwgbWVzc2FnZSwgbWV0YSk7XHJcbiAgfVxyXG5cclxuICAvKipcclxuICAgKiBMb2cgZXJyb3IgbWVzc2FnZSAoZXJyb3IgZXZlbnRzIHRoYXQgbWlnaHQgc3RpbGwgYWxsb3cgdGhlIGFwcGxpY2F0aW9uIHRvIGNvbnRpbnVlKVxyXG4gICAqL1xyXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgZXJyb3I/OiBFcnJvciwgbWV0YT86IExvZ01ldGFkYXRhKTogdm9pZCB7XHJcbiAgICBjb25zdCBsb2dFbnRyeTogTG9nRW50cnkgPSB7XHJcbiAgICAgIHRpbWVzdGFtcDogbmV3IERhdGUoKS50b0lTT1N0cmluZygpLFxyXG4gICAgICBsZXZlbDogTG9nTGV2ZWwuRVJST1IsXHJcbiAgICAgIGNvbnRleHQ6IHRoaXMuY29udGV4dCxcclxuICAgICAgbWVzc2FnZSxcclxuICAgICAgcmVxdWVzdElkOiBwcm9jZXNzLmVudi5BV1NfUkVRVUVTVF9JRCxcclxuICAgICAgLi4udGhpcy5kZWZhdWx0TWV0YWRhdGEsXHJcbiAgICAgIC4uLm1ldGEsXHJcbiAgICAgIGVycm9yOiBlcnJvclxyXG4gICAgICAgID8ge1xyXG4gICAgICAgICAgICBtZXNzYWdlOiBlcnJvci5tZXNzYWdlLFxyXG4gICAgICAgICAgICBzdGFjazogZXJyb3Iuc3RhY2ssXHJcbiAgICAgICAgICAgIG5hbWU6IGVycm9yLm5hbWUsXHJcbiAgICAgICAgICB9XHJcbiAgICAgICAgOiB1bmRlZmluZWQsXHJcbiAgICB9O1xyXG5cclxuICAgIGNvbnNvbGUuZXJyb3IoSlNPTi5zdHJpbmdpZnkobG9nRW50cnkpKTtcclxuICB9XHJcblxyXG4gIC8qKlxyXG4gICAqIENyZWF0ZSBhIGNoaWxkIGxvZ2dlciB3aXRoIGFkZGl0aW9uYWwgY29udGV4dFxyXG4gICAqL1xyXG4gIGNoaWxkKGFkZGl0aW9uYWxDb250ZXh0OiBzdHJpbmcsIGFkZGl0aW9uYWxNZXRhZGF0YTogTG9nTWV0YWRhdGEgPSB7fSk6IExvZ2dlciB7XHJcbiAgICByZXR1cm4gbmV3IExvZ2dlcihcclxuICAgICAgYCR7dGhpcy5jb250ZXh0fS4ke2FkZGl0aW9uYWxDb250ZXh0fWAsXHJcbiAgICAgIHsgLi4udGhpcy5kZWZhdWx0TWV0YWRhdGEsIC4uLmFkZGl0aW9uYWxNZXRhZGF0YSB9XHJcbiAgICApO1xyXG4gIH1cclxuXHJcbiAgLyoqXHJcbiAgICogTG9nIGV4ZWN1dGlvbiB0aW1pbmdcclxuICAgKi9cclxuICB0aW1lKGxhYmVsOiBzdHJpbmcpOiAoKSA9PiB2b2lkIHtcclxuICAgIGNvbnN0IHN0YXJ0ID0gRGF0ZS5ub3coKTtcclxuICAgIHJldHVybiAoKSA9PiB7XHJcbiAgICAgIGNvbnN0IGR1cmF0aW9uID0gRGF0ZS5ub3coKSAtIHN0YXJ0O1xyXG4gICAgICB0aGlzLmluZm8oYCR7bGFiZWx9IGNvbXBsZXRlZGAsIHsgZHVyYXRpb24gfSk7XHJcbiAgICB9O1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZSBhIGxvZ2dlciBpbnN0YW5jZSBmb3IgYSBzcGVjaWZpYyBjb250ZXh0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gY3JlYXRlTG9nZ2VyKGNvbnRleHQ6IHN0cmluZywgbWV0YWRhdGE/OiBMb2dNZXRhZGF0YSk6IExvZ2dlciB7XHJcbiAgcmV0dXJuIG5ldyBMb2dnZXIoY29udGV4dCwgbWV0YWRhdGEpO1xyXG59XHJcbiJdfQ==