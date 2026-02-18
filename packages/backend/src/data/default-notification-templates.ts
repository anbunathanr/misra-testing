/**
 * Default Notification Templates
 * 
 * Provides default templates for email, SMS, and Slack notifications.
 * These templates are seeded into DynamoDB during deployment or first run.
 */

import { NotificationTemplate } from '../types/notification';

export const defaultTemplates: Omit<NotificationTemplate, 'templateId' | 'createdAt' | 'updatedAt'>[] = [
  // ============================================================================
  // Email Templates
  // ============================================================================
  
  // Test Completion - Email
  {
    eventType: 'test_completion',
    channel: 'email',
    format: 'html',
    subject: 'Test Completed: {{testName}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #4CAF50;">✓ Test Completed Successfully</h2>
          <p>Your test execution has completed.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Result:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{result}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{duration}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,
    variables: ['testName', 'executionId', 'status', 'result', 'duration', 'timestamp'],
  },

  // Test Failure - Email
  {
    eventType: 'test_failure',
    channel: 'email',
    format: 'html',
    subject: 'Test Failed: {{testName}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #f44336;">✗ Test Failed</h2>
          <p>Your test execution has failed. Please review the details below.</p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Result:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{result}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Duration:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{duration}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Error:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #f44336;">{{errorMessage}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated notification from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,
    variables: ['testName', 'executionId', 'status', 'result', 'duration', 'errorMessage', 'timestamp'],
  },

  // Critical Alert - Email
  {
    eventType: 'critical_alert',
    channel: 'email',
    format: 'html',
    subject: '🚨 CRITICAL ALERT: {{testName}}',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <div style="background-color: #f44336; color: white; padding: 15px; border-radius: 5px;">
            <h2 style="margin: 0;">🚨 CRITICAL ALERT</h2>
          </div>
          
          <p style="margin-top: 20px; font-size: 16px; color: #f44336;">
            <strong>A critical test failure has been detected that requires immediate attention.</strong>
          </p>
          
          <table style="border-collapse: collapse; width: 100%; margin: 20px 0;">
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Test Name:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{testName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Execution ID:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{executionId}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Project:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{projectName}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Status:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{status}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Error:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd; color: #f44336; font-weight: bold;">{{errorMessage}}</td>
            </tr>
            <tr>
              <td style="padding: 8px; border: 1px solid #ddd;"><strong>Timestamp:</strong></td>
              <td style="padding: 8px; border: 1px solid #ddd;">{{timestamp}}</td>
            </tr>
          </table>
          
          <div style="background-color: #fff3cd; border-left: 4px solid #ffc107; padding: 15px; margin: 20px 0;">
            <p style="margin: 0;"><strong>Action Required:</strong> Please investigate this failure immediately.</p>
          </div>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated critical alert from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,
    variables: ['testName', 'executionId', 'projectName', 'status', 'errorMessage', 'timestamp'],
  },

  // Summary Report - Email
  {
    eventType: 'summary_report',
    channel: 'email',
    format: 'html',
    subject: 'Test Execution Summary Report',
    body: `
      <html>
        <body style="font-family: Arial, sans-serif; line-height: 1.6; color: #333;">
          <h2 style="color: #2196F3;">📊 Test Execution Summary Report</h2>
          <p>Here's your test execution summary for the reporting period.</p>
          
          <h3>Report Details</h3>
          <p><strong>Report Type:</strong> {{reportData}}</p>
          
          <p style="margin-top: 20px; color: #666; font-size: 12px;">
            This is an automated report from AIBTS Test Execution System.
          </p>
        </body>
      </html>
    `,
    variables: ['reportData'],
  },

  // ============================================================================
  // SMS Templates
  // ============================================================================
  
  // Critical Alert - SMS
  {
    eventType: 'critical_alert',
    channel: 'sms',
    format: 'text',
    body: '🚨 CRITICAL: Test "{{testName}}" failed. Error: {{errorMessage}}. Check AIBTS dashboard immediately.',
    variables: ['testName', 'errorMessage'],
  },

  // ============================================================================
  // Slack Templates
  // ============================================================================
  
  // Test Failure - Slack
  {
    eventType: 'test_failure',
    channel: 'slack',
    format: 'slack_blocks',
    body: JSON.stringify([
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '❌ Test Failed',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Test Name:*\n{{testName}}',
          },
          {
            type: 'mrkdwn',
            text: '*Status:*\n{{status}}',
          },
          {
            type: 'mrkdwn',
            text: '*Result:*\n{{result}}',
          },
          {
            type: 'mrkdwn',
            text: '*Duration:*\n{{duration}}',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Error:*\n```{{errorMessage}}```',
        },
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: 'Execution ID: {{executionId}} | {{timestamp}}',
          },
        ],
      },
    ]),
    variables: ['testName', 'status', 'result', 'duration', 'errorMessage', 'executionId', 'timestamp'],
  },

  // Critical Alert - Slack
  {
    eventType: 'critical_alert',
    channel: 'slack',
    format: 'slack_blocks',
    body: JSON.stringify([
      {
        type: 'header',
        text: {
          type: 'plain_text',
          text: '🚨 CRITICAL ALERT',
        },
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*A critical test failure requires immediate attention*',
        },
      },
      {
        type: 'section',
        fields: [
          {
            type: 'mrkdwn',
            text: '*Test Name:*\n{{testName}}',
          },
          {
            type: 'mrkdwn',
            text: '*Project:*\n{{projectName}}',
          },
          {
            type: 'mrkdwn',
            text: '*Status:*\n{{status}}',
          },
          {
            type: 'mrkdwn',
            text: '*Timestamp:*\n{{timestamp}}',
          },
        ],
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: '*Error:*\n```{{errorMessage}}```',
        },
      },
      {
        type: 'divider',
      },
      {
        type: 'context',
        elements: [
          {
            type: 'mrkdwn',
            text: '⚠️ *Action Required:* Please investigate this failure immediately',
          },
        ],
      },
    ]),
    variables: ['testName', 'projectName', 'status', 'errorMessage', 'timestamp'],
  },
];
