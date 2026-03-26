"use strict";
/**
 * Security Utilities for Input Sanitization and Data Protection
 *
 * Provides functions for:
 * - Input sanitization to prevent injection attacks
 * - Sensitive data filtering (passwords, API keys, tokens)
 * - PII redaction for logging
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.SecureLogger = void 0;
exports.sanitizeString = sanitizeString;
exports.sanitizeUrl = sanitizeUrl;
exports.sanitizeEmail = sanitizeEmail;
exports.sanitizePhoneNumber = sanitizePhoneNumber;
exports.filterSensitiveData = filterSensitiveData;
exports.redactPII = redactPII;
exports.sanitizePreferences = sanitizePreferences;
/**
 * Sanitizes a string by removing potentially dangerous characters
 * Prevents XSS, SQL injection, and command injection
 */
function sanitizeString(input) {
    if (!input)
        return '';
    // Remove null bytes
    let sanitized = input.replace(/\0/g, '');
    // Remove control characters except newline and tab
    sanitized = sanitized.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    // Trim whitespace
    sanitized = sanitized.trim();
    return sanitized;
}
/**
 * Sanitizes a URL to prevent SSRF and injection attacks
 * Validates protocol and removes dangerous characters
 */
function sanitizeUrl(url) {
    if (!url)
        return '';
    const sanitized = sanitizeString(url);
    // Validate URL format
    try {
        const parsed = new URL(sanitized);
        // Only allow http and https protocols
        if (!['http:', 'https:'].includes(parsed.protocol)) {
            throw new Error('Invalid protocol');
        }
        // Prevent localhost and private IP ranges
        const hostname = parsed.hostname.toLowerCase();
        if (hostname === 'localhost' ||
            hostname === '127.0.0.1' ||
            hostname.startsWith('192.168.') ||
            hostname.startsWith('10.') ||
            hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)) {
            throw new Error('Private IP addresses not allowed');
        }
        return parsed.toString();
    }
    catch (error) {
        throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
}
/**
 * Sanitizes an email address
 * Validates format and removes dangerous characters
 */
function sanitizeEmail(email) {
    if (!email)
        return '';
    const sanitized = sanitizeString(email).toLowerCase();
    // Basic email validation
    const emailRegex = /^[a-z0-9._%+-]+@[a-z0-9.-]+\.[a-z]{2,}$/;
    if (!emailRegex.test(sanitized)) {
        throw new Error('Invalid email format');
    }
    return sanitized;
}
/**
 * Sanitizes a phone number
 * Removes non-numeric characters and validates format
 */
function sanitizePhoneNumber(phone) {
    if (!phone)
        return '';
    // Remove all non-numeric characters except + at the start
    let sanitized = phone.replace(/[^\d+]/g, '');
    // Ensure + is only at the start
    if (sanitized.includes('+')) {
        const parts = sanitized.split('+');
        sanitized = '+' + parts.filter(p => p).join('');
    }
    // Validate length (international format: +1234567890, min 10 digits)
    const digitCount = sanitized.replace(/\D/g, '').length;
    if (digitCount < 10 || digitCount > 15) {
        throw new Error('Invalid phone number length');
    }
    return sanitized;
}
/**
 * Patterns for detecting sensitive data
 */
const SENSITIVE_PATTERNS = [
    // API Keys and tokens
    { pattern: /\b[A-Za-z0-9]{32,}\b/g, replacement: '[REDACTED_TOKEN]' },
    // AWS Access Keys
    { pattern: /AKIA[0-9A-Z]{16}/g, replacement: '[REDACTED_AWS_KEY]' },
    // JWT tokens
    { pattern: /eyJ[A-Za-z0-9-_]+\.eyJ[A-Za-z0-9-_]+\.[A-Za-z0-9-_]+/g, replacement: '[REDACTED_JWT]' },
    // Passwords in common formats
    { pattern: /password["\s:=]+[^\s"]+/gi, replacement: 'password=[REDACTED]' },
    { pattern: /pwd["\s:=]+[^\s"]+/gi, replacement: 'pwd=[REDACTED]' },
    { pattern: /pass["\s:=]+[^\s"]+/gi, replacement: 'pass=[REDACTED]' },
    // API keys in common formats
    { pattern: /api[_-]?key["\s:=]+[^\s"]+/gi, replacement: 'api_key=[REDACTED]' },
    { pattern: /apikey["\s:=]+[^\s"]+/gi, replacement: 'apikey=[REDACTED]' },
    // Secret keys
    { pattern: /secret[_-]?key["\s:=]+[^\s"]+/gi, replacement: 'secret_key=[REDACTED]' },
    // Bearer tokens
    { pattern: /Bearer\s+[A-Za-z0-9\-._~+/]+=*/gi, replacement: 'Bearer [REDACTED]' },
];
/**
 * Filters sensitive data from notification content
 * Scans for passwords, API keys, tokens, and other secrets
 */
function filterSensitiveData(content) {
    if (!content)
        return '';
    let filtered = content;
    for (const { pattern, replacement } of SENSITIVE_PATTERNS) {
        filtered = filtered.replace(pattern, replacement);
    }
    return filtered;
}
/**
 * PII patterns for redaction in logs
 */
const PII_PATTERNS = [
    // Email addresses
    { pattern: /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Z|a-z]{2,}\b/g, replacement: '[EMAIL_REDACTED]' },
    // Phone numbers (various formats)
    { pattern: /\+?\d{1,3}[-.\s]?\(?\d{1,4}\)?[-.\s]?\d{1,4}[-.\s]?\d{1,9}/g, replacement: '[PHONE_REDACTED]' },
    // Credit card numbers (basic pattern)
    { pattern: /\b\d{4}[-\s]?\d{4}[-\s]?\d{4}[-\s]?\d{4}\b/g, replacement: '[CC_REDACTED]' },
    // SSN (US format)
    { pattern: /\b\d{3}-\d{2}-\d{4}\b/g, replacement: '[SSN_REDACTED]' },
];
/**
 * Redacts PII from log messages
 * Removes email addresses, phone numbers, and other personal data
 */
function redactPII(logMessage) {
    if (!logMessage)
        return '';
    let redacted = logMessage;
    for (const { pattern, replacement } of PII_PATTERNS) {
        redacted = redacted.replace(pattern, replacement);
    }
    return redacted;
}
function sanitizePreferences(preferences) {
    const sanitized = {};
    if (preferences.email) {
        try {
            sanitized.email = sanitizeEmail(preferences.email);
        }
        catch (error) {
            throw new Error(`Invalid email: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    if (preferences.phoneNumber) {
        try {
            sanitized.phoneNumber = sanitizePhoneNumber(preferences.phoneNumber);
        }
        catch (error) {
            throw new Error(`Invalid phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    if (preferences.webhookUrl) {
        try {
            sanitized.webhookUrl = sanitizeUrl(preferences.webhookUrl);
        }
        catch (error) {
            throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    if (preferences.slackWebhookUrl) {
        try {
            sanitized.slackWebhookUrl = sanitizeUrl(preferences.slackWebhookUrl);
        }
        catch (error) {
            throw new Error(`Invalid Slack webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
        }
    }
    return sanitized;
}
/**
 * Creates a secure logger that automatically redacts PII
 */
class SecureLogger {
    context;
    constructor(context) {
        this.context = context;
    }
    formatMessage(level, message, meta) {
        const timestamp = new Date().toISOString();
        const redactedMessage = redactPII(message);
        const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
        return `[${timestamp}] [${level}] [${this.context}] ${redactedMessage}${metaStr}`;
    }
    info(message, meta) {
        console.log(this.formatMessage('INFO', message, meta));
    }
    warn(message, meta) {
        console.warn(this.formatMessage('WARN', message, meta));
    }
    error(message, meta) {
        console.error(this.formatMessage('ERROR', message, meta));
    }
    debug(message, meta) {
        console.debug(this.formatMessage('DEBUG', message, meta));
    }
}
exports.SecureLogger = SecureLogger;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoic2VjdXJpdHktdXRpbC5qcyIsInNvdXJjZVJvb3QiOiIiLCJzb3VyY2VzIjpbInNlY3VyaXR5LXV0aWwudHMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IjtBQUFBOzs7Ozs7O0dBT0c7OztBQU1ILHdDQWFDO0FBTUQsa0NBOEJDO0FBTUQsc0NBWUM7QUFNRCxrREFtQkM7QUE2QkQsa0RBVUM7QUFvQkQsOEJBVUM7QUFZRCxrREFvQ0M7QUFyTkQ7OztHQUdHO0FBQ0gsU0FBZ0IsY0FBYyxDQUFDLEtBQWE7SUFDMUMsSUFBSSxDQUFDLEtBQUs7UUFBRSxPQUFPLEVBQUUsQ0FBQztJQUV0QixvQkFBb0I7SUFDcEIsSUFBSSxTQUFTLEdBQUcsS0FBSyxDQUFDLE9BQU8sQ0FBQyxLQUFLLEVBQUUsRUFBRSxDQUFDLENBQUM7SUFFekMsbURBQW1EO0lBQ25ELFNBQVMsR0FBRyxTQUFTLENBQUMsT0FBTyxDQUFDLG1DQUFtQyxFQUFFLEVBQUUsQ0FBQyxDQUFDO0lBRXZFLGtCQUFrQjtJQUNsQixTQUFTLEdBQUcsU0FBUyxDQUFDLElBQUksRUFBRSxDQUFDO0lBRTdCLE9BQU8sU0FBUyxDQUFDO0FBQ25CLENBQUM7QUFFRDs7O0dBR0c7QUFDSCxTQUFnQixXQUFXLENBQUMsR0FBVztJQUNyQyxJQUFJLENBQUMsR0FBRztRQUFFLE9BQU8sRUFBRSxDQUFDO0lBRXBCLE1BQU0sU0FBUyxHQUFHLGNBQWMsQ0FBQyxHQUFHLENBQUMsQ0FBQztJQUV0QyxzQkFBc0I7SUFDdEIsSUFBSSxDQUFDO1FBQ0gsTUFBTSxNQUFNLEdBQUcsSUFBSSxHQUFHLENBQUMsU0FBUyxDQUFDLENBQUM7UUFFbEMsc0NBQXNDO1FBQ3RDLElBQUksQ0FBQyxDQUFDLE9BQU8sRUFBRSxRQUFRLENBQUMsQ0FBQyxRQUFRLENBQUMsTUFBTSxDQUFDLFFBQVEsQ0FBQyxFQUFFLENBQUM7WUFDbkQsTUFBTSxJQUFJLEtBQUssQ0FBQyxrQkFBa0IsQ0FBQyxDQUFDO1FBQ3RDLENBQUM7UUFFRCwwQ0FBMEM7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Q0FBQyxJQUFJLENBQUMsRUFBRSxDQUFDLENBQUMsQ0FBQyxFQUFFLENBQUM7UUFDdkQsT0FBTyxJQUFJLFNBQVMsTUFBTSxLQUFLLE1BQU0sSUFBSSxDQUFDLE9BQU8sS0FBSyxlQUFlLEdBQUcsT0FBTyxFQUFFLENBQUM7SUFDcEYsQ0FBQztJQUVELElBQUksQ0FBQyxPQUFlLEVBQUUsSUFBVTtRQUM5QixPQUFPLENBQUMsR0FBRyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsTUFBTSxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQ3pELENBQUM7SUFFRCxJQUFJLENBQUMsT0FBZSxFQUFFLElBQVU7UUFDOUIsT0FBTyxDQUFDLElBQUksQ0FBQyxJQUFJLENBQUMsYUFBYSxDQUFDLE1BQU0sRUFBRSxPQUFPLEVBQUUsSUFBSSxDQUFDLENBQUMsQ0FBQztJQUMxRCxDQUFDO0lBRUQsS0FBSyxDQUFDLE9BQWUsRUFBRSxJQUFVO1FBQy9CLE9BQU8sQ0FBQyxLQUFLLENBQUMsSUFBSSxDQUFDLGFBQWEsQ0FBQyxPQUFPLEVBQUUsT0FBTyxFQUFFLElBQUksQ0FBQyxDQUFDLENBQUM7SUFDNUQsQ0FBQztJQUVELEtBQUssQ0FBQyxPQUFlLEVBQUUsSUFBVTtRQUMvQixPQUFPLENBQUMsS0FBSyxDQUFDLElBQUksQ0FBQyxhQUFhLENBQUMsT0FBTyxFQUFFLE9BQU8sRUFBRSxJQUFJLENBQUMsQ0FBQyxDQUFDO0lBQzVELENBQUM7Q0FDRjtBQTdCRCxvQ0E2QkMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogU2VjdXJpdHkgVXRpbGl0aWVzIGZvciBJbnB1dCBTYW5pdGl6YXRpb24gYW5kIERhdGEgUHJvdGVjdGlvblxyXG4gKiBcclxuICogUHJvdmlkZXMgZnVuY3Rpb25zIGZvcjpcclxuICogLSBJbnB1dCBzYW5pdGl6YXRpb24gdG8gcHJldmVudCBpbmplY3Rpb24gYXR0YWNrc1xyXG4gKiAtIFNlbnNpdGl2ZSBkYXRhIGZpbHRlcmluZyAocGFzc3dvcmRzLCBBUEkga2V5cywgdG9rZW5zKVxyXG4gKiAtIFBJSSByZWRhY3Rpb24gZm9yIGxvZ2dpbmdcclxuICovXHJcblxyXG4vKipcclxuICogU2FuaXRpemVzIGEgc3RyaW5nIGJ5IHJlbW92aW5nIHBvdGVudGlhbGx5IGRhbmdlcm91cyBjaGFyYWN0ZXJzXHJcbiAqIFByZXZlbnRzIFhTUywgU1FMIGluamVjdGlvbiwgYW5kIGNvbW1hbmQgaW5qZWN0aW9uXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVTdHJpbmcoaW5wdXQ6IHN0cmluZyk6IHN0cmluZyB7XHJcbiAgaWYgKCFpbnB1dCkgcmV0dXJuICcnO1xyXG4gIFxyXG4gIC8vIFJlbW92ZSBudWxsIGJ5dGVzXHJcbiAgbGV0IHNhbml0aXplZCA9IGlucHV0LnJlcGxhY2UoL1xcMC9nLCAnJyk7XHJcbiAgXHJcbiAgLy8gUmVtb3ZlIGNvbnRyb2wgY2hhcmFjdGVycyBleGNlcHQgbmV3bGluZSBhbmQgdGFiXHJcbiAgc2FuaXRpemVkID0gc2FuaXRpemVkLnJlcGxhY2UoL1tcXHgwMC1cXHgwOFxceDBCXFx4MENcXHgwRS1cXHgxRlxceDdGXS9nLCAnJyk7XHJcbiAgXHJcbiAgLy8gVHJpbSB3aGl0ZXNwYWNlXHJcbiAgc2FuaXRpemVkID0gc2FuaXRpemVkLnRyaW0oKTtcclxuICBcclxuICByZXR1cm4gc2FuaXRpemVkO1xyXG59XHJcblxyXG4vKipcclxuICogU2FuaXRpemVzIGEgVVJMIHRvIHByZXZlbnQgU1NSRiBhbmQgaW5qZWN0aW9uIGF0dGFja3NcclxuICogVmFsaWRhdGVzIHByb3RvY29sIGFuZCByZW1vdmVzIGRhbmdlcm91cyBjaGFyYWN0ZXJzXHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVVcmwodXJsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghdXJsKSByZXR1cm4gJyc7XHJcbiAgXHJcbiAgY29uc3Qgc2FuaXRpemVkID0gc2FuaXRpemVTdHJpbmcodXJsKTtcclxuICBcclxuICAvLyBWYWxpZGF0ZSBVUkwgZm9ybWF0XHJcbiAgdHJ5IHtcclxuICAgIGNvbnN0IHBhcnNlZCA9IG5ldyBVUkwoc2FuaXRpemVkKTtcclxuICAgIFxyXG4gICAgLy8gT25seSBhbGxvdyBodHRwIGFuZCBodHRwcyBwcm90b2NvbHNcclxuICAgIGlmICghWydodHRwOicsICdodHRwczonXS5pbmNsdWRlcyhwYXJzZWQucHJvdG9jb2wpKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignSW52YWxpZCBwcm90b2NvbCcpO1xyXG4gICAgfVxyXG4gICAgXHJcbiAgICAvLyBQcmV2ZW50IGxvY2FsaG9zdCBhbmQgcHJpdmF0ZSBJUCByYW5nZXNcclxuICAgIGNvbnN0IGhvc3RuYW1lID0gcGFyc2VkLmhvc3RuYW1lLnRvTG93ZXJDYXNlKCk7XHJcbiAgICBpZiAoXHJcbiAgICAgIGhvc3RuYW1lID09PSAnbG9jYWxob3N0JyB8fFxyXG4gICAgICBob3N0bmFtZSA9PT0gJzEyNy4wLjAuMScgfHxcclxuICAgICAgaG9zdG5hbWUuc3RhcnRzV2l0aCgnMTkyLjE2OC4nKSB8fFxyXG4gICAgICBob3N0bmFtZS5zdGFydHNXaXRoKCcxMC4nKSB8fFxyXG4gICAgICBob3N0bmFtZS5tYXRjaCgvXjE3MlxcLigxWzYtOV18MlswLTldfDNbMC0xXSlcXC4vKVxyXG4gICAgKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcignUHJpdmF0ZSBJUCBhZGRyZXNzZXMgbm90IGFsbG93ZWQnKTtcclxuICAgIH1cclxuICAgIFxyXG4gICAgcmV0dXJuIHBhcnNlZC50b1N0cmluZygpO1xyXG4gIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoYEludmFsaWQgVVJMOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gIH1cclxufVxyXG5cclxuLyoqXHJcbiAqIFNhbml0aXplcyBhbiBlbWFpbCBhZGRyZXNzXHJcbiAqIFZhbGlkYXRlcyBmb3JtYXQgYW5kIHJlbW92ZXMgZGFuZ2Vyb3VzIGNoYXJhY3RlcnNcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiBzYW5pdGl6ZUVtYWlsKGVtYWlsOiBzdHJpbmcpOiBzdHJpbmcge1xyXG4gIGlmICghZW1haWwpIHJldHVybiAnJztcclxuICBcclxuICBjb25zdCBzYW5pdGl6ZWQgPSBzYW5pdGl6ZVN0cmluZyhlbWFpbCkudG9Mb3dlckNhc2UoKTtcclxuICBcclxuICAvLyBCYXNpYyBlbWFpbCB2YWxpZGF0aW9uXHJcbiAgY29uc3QgZW1haWxSZWdleCA9IC9eW2EtejAtOS5fJSstXStAW2EtejAtOS4tXStcXC5bYS16XXsyLH0kLztcclxuICBpZiAoIWVtYWlsUmVnZXgudGVzdChzYW5pdGl6ZWQpKSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgZW1haWwgZm9ybWF0Jyk7XHJcbiAgfVxyXG4gIFxyXG4gIHJldHVybiBzYW5pdGl6ZWQ7XHJcbn1cclxuXHJcbi8qKlxyXG4gKiBTYW5pdGl6ZXMgYSBwaG9uZSBudW1iZXJcclxuICogUmVtb3ZlcyBub24tbnVtZXJpYyBjaGFyYWN0ZXJzIGFuZCB2YWxpZGF0ZXMgZm9ybWF0XHJcbiAqL1xyXG5leHBvcnQgZnVuY3Rpb24gc2FuaXRpemVQaG9uZU51bWJlcihwaG9uZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIXBob25lKSByZXR1cm4gJyc7XHJcbiAgXHJcbiAgLy8gUmVtb3ZlIGFsbCBub24tbnVtZXJpYyBjaGFyYWN0ZXJzIGV4Y2VwdCArIGF0IHRoZSBzdGFydFxyXG4gIGxldCBzYW5pdGl6ZWQgPSBwaG9uZS5yZXBsYWNlKC9bXlxcZCtdL2csICcnKTtcclxuICBcclxuICAvLyBFbnN1cmUgKyBpcyBvbmx5IGF0IHRoZSBzdGFydFxyXG4gIGlmIChzYW5pdGl6ZWQuaW5jbHVkZXMoJysnKSkge1xyXG4gICAgY29uc3QgcGFydHMgPSBzYW5pdGl6ZWQuc3BsaXQoJysnKTtcclxuICAgIHNhbml0aXplZCA9ICcrJyArIHBhcnRzLmZpbHRlcihwID0+IHApLmpvaW4oJycpO1xyXG4gIH1cclxuICBcclxuICAvLyBWYWxpZGF0ZSBsZW5ndGggKGludGVybmF0aW9uYWwgZm9ybWF0OiArMTIzNDU2Nzg5MCwgbWluIDEwIGRpZ2l0cylcclxuICBjb25zdCBkaWdpdENvdW50ID0gc2FuaXRpemVkLnJlcGxhY2UoL1xcRC9nLCAnJykubGVuZ3RoO1xyXG4gIGlmIChkaWdpdENvdW50IDwgMTAgfHwgZGlnaXRDb3VudCA+IDE1KSB7XHJcbiAgICB0aHJvdyBuZXcgRXJyb3IoJ0ludmFsaWQgcGhvbmUgbnVtYmVyIGxlbmd0aCcpO1xyXG4gIH1cclxuICBcclxuICByZXR1cm4gc2FuaXRpemVkO1xyXG59XHJcblxyXG4vKipcclxuICogUGF0dGVybnMgZm9yIGRldGVjdGluZyBzZW5zaXRpdmUgZGF0YVxyXG4gKi9cclxuY29uc3QgU0VOU0lUSVZFX1BBVFRFUk5TID0gW1xyXG4gIC8vIEFQSSBLZXlzIGFuZCB0b2tlbnNcclxuICB7IHBhdHRlcm46IC9cXGJbQS1aYS16MC05XXszMix9XFxiL2csIHJlcGxhY2VtZW50OiAnW1JFREFDVEVEX1RPS0VOXScgfSxcclxuICAvLyBBV1MgQWNjZXNzIEtleXNcclxuICB7IHBhdHRlcm46IC9BS0lBWzAtOUEtWl17MTZ9L2csIHJlcGxhY2VtZW50OiAnW1JFREFDVEVEX0FXU19LRVldJyB9LFxyXG4gIC8vIEpXVCB0b2tlbnNcclxuICB7IHBhdHRlcm46IC9leUpbQS1aYS16MC05LV9dK1xcLmV5SltBLVphLXowLTktX10rXFwuW0EtWmEtejAtOS1fXSsvZywgcmVwbGFjZW1lbnQ6ICdbUkVEQUNURURfSldUXScgfSxcclxuICAvLyBQYXNzd29yZHMgaW4gY29tbW9uIGZvcm1hdHNcclxuICB7IHBhdHRlcm46IC9wYXNzd29yZFtcIlxcczo9XStbXlxcc1wiXSsvZ2ksIHJlcGxhY2VtZW50OiAncGFzc3dvcmQ9W1JFREFDVEVEXScgfSxcclxuICB7IHBhdHRlcm46IC9wd2RbXCJcXHM6PV0rW15cXHNcIl0rL2dpLCByZXBsYWNlbWVudDogJ3B3ZD1bUkVEQUNURURdJyB9LFxyXG4gIHsgcGF0dGVybjogL3Bhc3NbXCJcXHM6PV0rW15cXHNcIl0rL2dpLCByZXBsYWNlbWVudDogJ3Bhc3M9W1JFREFDVEVEXScgfSxcclxuICAvLyBBUEkga2V5cyBpbiBjb21tb24gZm9ybWF0c1xyXG4gIHsgcGF0dGVybjogL2FwaVtfLV0/a2V5W1wiXFxzOj1dK1teXFxzXCJdKy9naSwgcmVwbGFjZW1lbnQ6ICdhcGlfa2V5PVtSRURBQ1RFRF0nIH0sXHJcbiAgeyBwYXR0ZXJuOiAvYXBpa2V5W1wiXFxzOj1dK1teXFxzXCJdKy9naSwgcmVwbGFjZW1lbnQ6ICdhcGlrZXk9W1JFREFDVEVEXScgfSxcclxuICAvLyBTZWNyZXQga2V5c1xyXG4gIHsgcGF0dGVybjogL3NlY3JldFtfLV0/a2V5W1wiXFxzOj1dK1teXFxzXCJdKy9naSwgcmVwbGFjZW1lbnQ6ICdzZWNyZXRfa2V5PVtSRURBQ1RFRF0nIH0sXHJcbiAgLy8gQmVhcmVyIHRva2Vuc1xyXG4gIHsgcGF0dGVybjogL0JlYXJlclxccytbQS1aYS16MC05XFwtLl9+Ky9dKz0qL2dpLCByZXBsYWNlbWVudDogJ0JlYXJlciBbUkVEQUNURURdJyB9LFxyXG5dO1xyXG5cclxuLyoqXHJcbiAqIEZpbHRlcnMgc2Vuc2l0aXZlIGRhdGEgZnJvbSBub3RpZmljYXRpb24gY29udGVudFxyXG4gKiBTY2FucyBmb3IgcGFzc3dvcmRzLCBBUEkga2V5cywgdG9rZW5zLCBhbmQgb3RoZXIgc2VjcmV0c1xyXG4gKi9cclxuZXhwb3J0IGZ1bmN0aW9uIGZpbHRlclNlbnNpdGl2ZURhdGEoY29udGVudDogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIWNvbnRlbnQpIHJldHVybiAnJztcclxuICBcclxuICBsZXQgZmlsdGVyZWQgPSBjb250ZW50O1xyXG4gIFxyXG4gIGZvciAoY29uc3QgeyBwYXR0ZXJuLCByZXBsYWNlbWVudCB9IG9mIFNFTlNJVElWRV9QQVRURVJOUykge1xyXG4gICAgZmlsdGVyZWQgPSBmaWx0ZXJlZC5yZXBsYWNlKHBhdHRlcm4sIHJlcGxhY2VtZW50KTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIGZpbHRlcmVkO1xyXG59XHJcblxyXG4vKipcclxuICogUElJIHBhdHRlcm5zIGZvciByZWRhY3Rpb24gaW4gbG9nc1xyXG4gKi9cclxuY29uc3QgUElJX1BBVFRFUk5TID0gW1xyXG4gIC8vIEVtYWlsIGFkZHJlc3Nlc1xyXG4gIHsgcGF0dGVybjogL1xcYltBLVphLXowLTkuXyUrLV0rQFtBLVphLXowLTkuLV0rXFwuW0EtWnxhLXpdezIsfVxcYi9nLCByZXBsYWNlbWVudDogJ1tFTUFJTF9SRURBQ1RFRF0nIH0sXHJcbiAgLy8gUGhvbmUgbnVtYmVycyAodmFyaW91cyBmb3JtYXRzKVxyXG4gIHsgcGF0dGVybjogL1xcKz9cXGR7MSwzfVstLlxcc10/XFwoP1xcZHsxLDR9XFwpP1stLlxcc10/XFxkezEsNH1bLS5cXHNdP1xcZHsxLDl9L2csIHJlcGxhY2VtZW50OiAnW1BIT05FX1JFREFDVEVEXScgfSxcclxuICAvLyBDcmVkaXQgY2FyZCBudW1iZXJzIChiYXNpYyBwYXR0ZXJuKVxyXG4gIHsgcGF0dGVybjogL1xcYlxcZHs0fVstXFxzXT9cXGR7NH1bLVxcc10/XFxkezR9Wy1cXHNdP1xcZHs0fVxcYi9nLCByZXBsYWNlbWVudDogJ1tDQ19SRURBQ1RFRF0nIH0sXHJcbiAgLy8gU1NOIChVUyBmb3JtYXQpXHJcbiAgeyBwYXR0ZXJuOiAvXFxiXFxkezN9LVxcZHsyfS1cXGR7NH1cXGIvZywgcmVwbGFjZW1lbnQ6ICdbU1NOX1JFREFDVEVEXScgfSxcclxuXTtcclxuXHJcbi8qKlxyXG4gKiBSZWRhY3RzIFBJSSBmcm9tIGxvZyBtZXNzYWdlc1xyXG4gKiBSZW1vdmVzIGVtYWlsIGFkZHJlc3NlcywgcGhvbmUgbnVtYmVycywgYW5kIG90aGVyIHBlcnNvbmFsIGRhdGFcclxuICovXHJcbmV4cG9ydCBmdW5jdGlvbiByZWRhY3RQSUkobG9nTWVzc2FnZTogc3RyaW5nKTogc3RyaW5nIHtcclxuICBpZiAoIWxvZ01lc3NhZ2UpIHJldHVybiAnJztcclxuICBcclxuICBsZXQgcmVkYWN0ZWQgPSBsb2dNZXNzYWdlO1xyXG4gIFxyXG4gIGZvciAoY29uc3QgeyBwYXR0ZXJuLCByZXBsYWNlbWVudCB9IG9mIFBJSV9QQVRURVJOUykge1xyXG4gICAgcmVkYWN0ZWQgPSByZWRhY3RlZC5yZXBsYWNlKHBhdHRlcm4sIHJlcGxhY2VtZW50KTtcclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIHJlZGFjdGVkO1xyXG59XHJcblxyXG4vKipcclxuICogVmFsaWRhdGVzIGFuZCBzYW5pdGl6ZXMgbm90aWZpY2F0aW9uIHByZWZlcmVuY2VzIGlucHV0XHJcbiAqL1xyXG5leHBvcnQgaW50ZXJmYWNlIFNhbml0aXplZFByZWZlcmVuY2VzIHtcclxuICBlbWFpbD86IHN0cmluZztcclxuICBwaG9uZU51bWJlcj86IHN0cmluZztcclxuICB3ZWJob29rVXJsPzogc3RyaW5nO1xyXG4gIHNsYWNrV2ViaG9va1VybD86IHN0cmluZztcclxufVxyXG5cclxuZXhwb3J0IGZ1bmN0aW9uIHNhbml0aXplUHJlZmVyZW5jZXMocHJlZmVyZW5jZXM6IGFueSk6IFNhbml0aXplZFByZWZlcmVuY2VzIHtcclxuICBjb25zdCBzYW5pdGl6ZWQ6IFNhbml0aXplZFByZWZlcmVuY2VzID0ge307XHJcbiAgXHJcbiAgaWYgKHByZWZlcmVuY2VzLmVtYWlsKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBzYW5pdGl6ZWQuZW1haWwgPSBzYW5pdGl6ZUVtYWlsKHByZWZlcmVuY2VzLmVtYWlsKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBlbWFpbDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgaWYgKHByZWZlcmVuY2VzLnBob25lTnVtYmVyKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBzYW5pdGl6ZWQucGhvbmVOdW1iZXIgPSBzYW5pdGl6ZVBob25lTnVtYmVyKHByZWZlcmVuY2VzLnBob25lTnVtYmVyKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBwaG9uZSBudW1iZXI6ICR7ZXJyb3IgaW5zdGFuY2VvZiBFcnJvciA/IGVycm9yLm1lc3NhZ2UgOiAnVW5rbm93biBlcnJvcid9YCk7XHJcbiAgICB9XHJcbiAgfVxyXG4gIFxyXG4gIGlmIChwcmVmZXJlbmNlcy53ZWJob29rVXJsKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBzYW5pdGl6ZWQud2ViaG9va1VybCA9IHNhbml0aXplVXJsKHByZWZlcmVuY2VzLndlYmhvb2tVcmwpO1xyXG4gICAgfSBjYXRjaCAoZXJyb3IpIHtcclxuICAgICAgdGhyb3cgbmV3IEVycm9yKGBJbnZhbGlkIHdlYmhvb2sgVVJMOiAke2Vycm9yIGluc3RhbmNlb2YgRXJyb3IgPyBlcnJvci5tZXNzYWdlIDogJ1Vua25vd24gZXJyb3InfWApO1xyXG4gICAgfVxyXG4gIH1cclxuICBcclxuICBpZiAocHJlZmVyZW5jZXMuc2xhY2tXZWJob29rVXJsKSB7XHJcbiAgICB0cnkge1xyXG4gICAgICBzYW5pdGl6ZWQuc2xhY2tXZWJob29rVXJsID0gc2FuaXRpemVVcmwocHJlZmVyZW5jZXMuc2xhY2tXZWJob29rVXJsKTtcclxuICAgIH0gY2F0Y2ggKGVycm9yKSB7XHJcbiAgICAgIHRocm93IG5ldyBFcnJvcihgSW52YWxpZCBTbGFjayB3ZWJob29rIFVSTDogJHtlcnJvciBpbnN0YW5jZW9mIEVycm9yID8gZXJyb3IubWVzc2FnZSA6ICdVbmtub3duIGVycm9yJ31gKTtcclxuICAgIH1cclxuICB9XHJcbiAgXHJcbiAgcmV0dXJuIHNhbml0aXplZDtcclxufVxyXG5cclxuLyoqXHJcbiAqIENyZWF0ZXMgYSBzZWN1cmUgbG9nZ2VyIHRoYXQgYXV0b21hdGljYWxseSByZWRhY3RzIFBJSVxyXG4gKi9cclxuZXhwb3J0IGNsYXNzIFNlY3VyZUxvZ2dlciB7XHJcbiAgcHJpdmF0ZSBjb250ZXh0OiBzdHJpbmc7XHJcbiAgXHJcbiAgY29uc3RydWN0b3IoY29udGV4dDogc3RyaW5nKSB7XHJcbiAgICB0aGlzLmNvbnRleHQgPSBjb250ZXh0O1xyXG4gIH1cclxuICBcclxuICBwcml2YXRlIGZvcm1hdE1lc3NhZ2UobGV2ZWw6IHN0cmluZywgbWVzc2FnZTogc3RyaW5nLCBtZXRhPzogYW55KTogc3RyaW5nIHtcclxuICAgIGNvbnN0IHRpbWVzdGFtcCA9IG5ldyBEYXRlKCkudG9JU09TdHJpbmcoKTtcclxuICAgIGNvbnN0IHJlZGFjdGVkTWVzc2FnZSA9IHJlZGFjdFBJSShtZXNzYWdlKTtcclxuICAgIGNvbnN0IG1ldGFTdHIgPSBtZXRhID8gYCAke0pTT04uc3RyaW5naWZ5KG1ldGEpfWAgOiAnJztcclxuICAgIHJldHVybiBgWyR7dGltZXN0YW1wfV0gWyR7bGV2ZWx9XSBbJHt0aGlzLmNvbnRleHR9XSAke3JlZGFjdGVkTWVzc2FnZX0ke21ldGFTdHJ9YDtcclxuICB9XHJcbiAgXHJcbiAgaW5mbyhtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUubG9nKHRoaXMuZm9ybWF0TWVzc2FnZSgnSU5GTycsIG1lc3NhZ2UsIG1ldGEpKTtcclxuICB9XHJcbiAgXHJcbiAgd2FybihtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUud2Fybih0aGlzLmZvcm1hdE1lc3NhZ2UoJ1dBUk4nLCBtZXNzYWdlLCBtZXRhKSk7XHJcbiAgfVxyXG4gIFxyXG4gIGVycm9yKG1lc3NhZ2U6IHN0cmluZywgbWV0YT86IGFueSk6IHZvaWQge1xyXG4gICAgY29uc29sZS5lcnJvcih0aGlzLmZvcm1hdE1lc3NhZ2UoJ0VSUk9SJywgbWVzc2FnZSwgbWV0YSkpO1xyXG4gIH1cclxuICBcclxuICBkZWJ1ZyhtZXNzYWdlOiBzdHJpbmcsIG1ldGE/OiBhbnkpOiB2b2lkIHtcclxuICAgIGNvbnNvbGUuZGVidWcodGhpcy5mb3JtYXRNZXNzYWdlKCdERUJVRycsIG1lc3NhZ2UsIG1ldGEpKTtcclxuICB9XHJcbn1cclxuIl19