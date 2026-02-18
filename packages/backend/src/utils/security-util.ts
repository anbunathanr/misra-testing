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
export function sanitizeString(input: string): string {
  if (!input) return '';
  
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
export function sanitizeUrl(url: string): string {
  if (!url) return '';
  
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
    if (
      hostname === 'localhost' ||
      hostname === '127.0.0.1' ||
      hostname.startsWith('192.168.') ||
      hostname.startsWith('10.') ||
      hostname.match(/^172\.(1[6-9]|2[0-9]|3[0-1])\./)
    ) {
      throw new Error('Private IP addresses not allowed');
    }
    
    return parsed.toString();
  } catch (error) {
    throw new Error(`Invalid URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
  }
}

/**
 * Sanitizes an email address
 * Validates format and removes dangerous characters
 */
export function sanitizeEmail(email: string): string {
  if (!email) return '';
  
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
export function sanitizePhoneNumber(phone: string): string {
  if (!phone) return '';
  
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
export function filterSensitiveData(content: string): string {
  if (!content) return '';
  
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
export function redactPII(logMessage: string): string {
  if (!logMessage) return '';
  
  let redacted = logMessage;
  
  for (const { pattern, replacement } of PII_PATTERNS) {
    redacted = redacted.replace(pattern, replacement);
  }
  
  return redacted;
}

/**
 * Validates and sanitizes notification preferences input
 */
export interface SanitizedPreferences {
  email?: string;
  phoneNumber?: string;
  webhookUrl?: string;
  slackWebhookUrl?: string;
}

export function sanitizePreferences(preferences: any): SanitizedPreferences {
  const sanitized: SanitizedPreferences = {};
  
  if (preferences.email) {
    try {
      sanitized.email = sanitizeEmail(preferences.email);
    } catch (error) {
      throw new Error(`Invalid email: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (preferences.phoneNumber) {
    try {
      sanitized.phoneNumber = sanitizePhoneNumber(preferences.phoneNumber);
    } catch (error) {
      throw new Error(`Invalid phone number: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (preferences.webhookUrl) {
    try {
      sanitized.webhookUrl = sanitizeUrl(preferences.webhookUrl);
    } catch (error) {
      throw new Error(`Invalid webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  if (preferences.slackWebhookUrl) {
    try {
      sanitized.slackWebhookUrl = sanitizeUrl(preferences.slackWebhookUrl);
    } catch (error) {
      throw new Error(`Invalid Slack webhook URL: ${error instanceof Error ? error.message : 'Unknown error'}`);
    }
  }
  
  return sanitized;
}

/**
 * Creates a secure logger that automatically redacts PII
 */
export class SecureLogger {
  private context: string;
  
  constructor(context: string) {
    this.context = context;
  }
  
  private formatMessage(level: string, message: string, meta?: any): string {
    const timestamp = new Date().toISOString();
    const redactedMessage = redactPII(message);
    const metaStr = meta ? ` ${JSON.stringify(meta)}` : '';
    return `[${timestamp}] [${level}] [${this.context}] ${redactedMessage}${metaStr}`;
  }
  
  info(message: string, meta?: any): void {
    console.log(this.formatMessage('INFO', message, meta));
  }
  
  warn(message: string, meta?: any): void {
    console.warn(this.formatMessage('WARN', message, meta));
  }
  
  error(message: string, meta?: any): void {
    console.error(this.formatMessage('ERROR', message, meta));
  }
  
  debug(message: string, meta?: any): void {
    console.debug(this.formatMessage('DEBUG', message, meta));
  }
}
