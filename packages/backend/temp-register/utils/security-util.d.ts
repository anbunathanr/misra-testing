/**
 * Security Utilities for Input Sanitization and Data Protection
 *
 * Provides functions for:
 * - Input sanitization to prevent injection attacks
 * - Sensitive data filtering (passwords, API keys, tokens)
 * - PII redaction for logging
 */
/**
 * Sanitizes a string by removing potentially dangerous characters
 * Prevents XSS, SQL injection, and command injection
 */
export declare function sanitizeString(input: string): string;
/**
 * Sanitizes a URL to prevent SSRF and injection attacks
 * Validates protocol and removes dangerous characters
 */
export declare function sanitizeUrl(url: string): string;
/**
 * Sanitizes an email address
 * Validates format and removes dangerous characters
 */
export declare function sanitizeEmail(email: string): string;
/**
 * Sanitizes a phone number
 * Removes non-numeric characters and validates format
 */
export declare function sanitizePhoneNumber(phone: string): string;
/**
 * Filters sensitive data from notification content
 * Scans for passwords, API keys, tokens, and other secrets
 */
export declare function filterSensitiveData(content: string): string;
/**
 * Redacts PII from log messages
 * Removes email addresses, phone numbers, and other personal data
 */
export declare function redactPII(logMessage: string): string;
/**
 * Validates and sanitizes notification preferences input
 */
export interface SanitizedPreferences {
    email?: string;
    phoneNumber?: string;
    webhookUrl?: string;
    slackWebhookUrl?: string;
}
export declare function sanitizePreferences(preferences: any): SanitizedPreferences;
/**
 * Creates a secure logger that automatically redacts PII
 */
export declare class SecureLogger {
    private context;
    constructor(context: string);
    private formatMessage;
    info(message: string, meta?: any): void;
    warn(message: string, meta?: any): void;
    error(message: string, meta?: any): void;
    debug(message: string, meta?: any): void;
}
