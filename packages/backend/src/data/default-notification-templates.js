"use strict";
/**
 * Default Notification Templates
 *
 * Provides default templates for email, SMS, and Slack notifications.
 * These templates are seeded into DynamoDB during deployment or first run.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.defaultTemplates = void 0;
exports.defaultTemplates = [
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
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoiZGVmYXVsdC1ub3RpZmljYXRpb24tdGVtcGxhdGVzLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXMiOlsiZGVmYXVsdC1ub3RpZmljYXRpb24tdGVtcGxhdGVzLnRzIl0sIm5hbWVzIjpbXSwibWFwcGluZ3MiOiI7QUFBQTs7Ozs7R0FLRzs7O0FBSVUsUUFBQSxnQkFBZ0IsR0FBMkU7SUFDdEcsK0VBQStFO0lBQy9FLGtCQUFrQjtJQUNsQiwrRUFBK0U7SUFFL0UsMEJBQTBCO0lBQzFCO1FBQ0UsU0FBUyxFQUFFLGlCQUFpQjtRQUM1QixPQUFPLEVBQUUsT0FBTztRQUNoQixNQUFNLEVBQUUsTUFBTTtRQUNkLE9BQU8sRUFBRSw4QkFBOEI7UUFDdkMsSUFBSSxFQUFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztLQXNDTDtRQUNELFNBQVMsRUFBRSxDQUFDLFVBQVUsRUFBRSxhQUFhLEVBQUUsUUFBUSxFQUFFLFFBQVEsRUFBRSxVQUFVLEVBQUUsV0FBVyxDQUFDO0tBQ3BGO0lBRUQsdUJBQXVCO0lBQ3ZCO1FBQ0UsU0FBUyxFQUFFLGNBQWM7UUFDekIsT0FBTyxFQUFFLE9BQU87UUFDaEIsTUFBTSxFQUFFLE1BQU07UUFDZCxPQUFPLEVBQUUsMkJBQTJCO1FBQ3BDLElBQUksRUFBRTs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7O0tBMENMO1FBQ0QsU0FBUyxFQUFFLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsUUFBUSxFQUFFLFVBQVUsRUFBRSxjQUFjLEVBQUUsV0FBVyxDQUFDO0tBQ3BHO0lBRUQseUJBQXlCO0lBQ3pCO1FBQ0UsU0FBUyxFQUFFLGdCQUFnQjtRQUMzQixPQUFPLEVBQUUsT0FBTztRQUNoQixNQUFNLEVBQUUsTUFBTTtRQUNkLE9BQU8sRUFBRSxpQ0FBaUM7UUFDMUMsSUFBSSxFQUFFOzs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7Ozs7OztL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O3dCQUNkLElBQUksRUFBRSx1QkFBdUI7cUJBQzlCO29CQUNEO3dCQUNFLElBQUksRUFBRSxRQUFRO3dCQUNkLElBQUksRUFBRSw2QkFBNkI7cUJBQ3BDO2lCQUNGO2FBQ0Y7WUFDRDtnQkFDRSxJQUFJLEVBQUUsU0FBUztnQkFDZixJQUFJLEVBQUU7b0JBQ0osSUFBSSxFQUFFLFFBQVE7b0JBQ2QsSUFBSSxFQUFFLGtDQUFrQztpQkFDekM7YUFDRjtZQUNEO2dCQUNFLElBQUksRUFBRSxTQUFTO2FBQ2hCO1lBQ0Q7Z0JBQ0UsSUFBSSxFQUFFLFNBQVM7Z0JBQ2YsUUFBUSxFQUFFO29CQUNSO3dCQUNFLElBQUksRUFBRSxRQUFRO3dCQUNkLElBQUksRUFBRSxtRUFBbUU7cUJBQzFFO2lCQUNGO2FBQ0Y7U0FDRixDQUFDO1FBQ0YsU0FBUyxFQUFFLENBQUMsVUFBVSxFQUFFLGFBQWEsRUFBRSxRQUFRLEVBQUUsY0FBYyxFQUFFLFdBQVcsQ0FBQztLQUM5RTtDQUNGLENBQUMiLCJzb3VyY2VzQ29udGVudCI6WyIvKipcclxuICogRGVmYXVsdCBOb3RpZmljYXRpb24gVGVtcGxhdGVzXHJcbiAqIFxyXG4gKiBQcm92aWRlcyBkZWZhdWx0IHRlbXBsYXRlcyBmb3IgZW1haWwsIFNNUywgYW5kIFNsYWNrIG5vdGlmaWNhdGlvbnMuXHJcbiAqIFRoZXNlIHRlbXBsYXRlcyBhcmUgc2VlZGVkIGludG8gRHluYW1vREIgZHVyaW5nIGRlcGxveW1lbnQgb3IgZmlyc3QgcnVuLlxyXG4gKi9cclxuXHJcbmltcG9ydCB7IE5vdGlmaWNhdGlvblRlbXBsYXRlIH0gZnJvbSAnLi4vdHlwZXMvbm90aWZpY2F0aW9uJztcclxuXHJcbmV4cG9ydCBjb25zdCBkZWZhdWx0VGVtcGxhdGVzOiBPbWl0PE5vdGlmaWNhdGlvblRlbXBsYXRlLCAndGVtcGxhdGVJZCcgfCAnY3JlYXRlZEF0JyB8ICd1cGRhdGVkQXQnPltdID0gW1xyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBFbWFpbCBUZW1wbGF0ZXNcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgXHJcbiAgLy8gVGVzdCBDb21wbGV0aW9uIC0gRW1haWxcclxuICB7XHJcbiAgICBldmVudFR5cGU6ICd0ZXN0X2NvbXBsZXRpb24nLFxyXG4gICAgY2hhbm5lbDogJ2VtYWlsJyxcclxuICAgIGZvcm1hdDogJ2h0bWwnLFxyXG4gICAgc3ViamVjdDogJ1Rlc3QgQ29tcGxldGVkOiB7e3Rlc3ROYW1lfX0nLFxyXG4gICAgYm9keTogYFxyXG4gICAgICA8aHRtbD5cclxuICAgICAgICA8Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbGluZS1oZWlnaHQ6IDEuNjsgY29sb3I6ICMzMzM7XCI+XHJcbiAgICAgICAgICA8aDIgc3R5bGU9XCJjb2xvcjogIzRDQUY1MDtcIj7inJMgVGVzdCBDb21wbGV0ZWQgU3VjY2Vzc2Z1bGx5PC9oMj5cclxuICAgICAgICAgIDxwPllvdXIgdGVzdCBleGVjdXRpb24gaGFzIGNvbXBsZXRlZC48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDx0YWJsZSBzdHlsZT1cImJvcmRlci1jb2xsYXBzZTogY29sbGFwc2U7IHdpZHRoOiAxMDAlOyBtYXJnaW46IDIwcHggMDtcIj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPlRlc3QgTmFtZTo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e3Rlc3ROYW1lfX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+RXhlY3V0aW9uIElEOjwvc3Ryb25nPjwvdGQ+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPnt7ZXhlY3V0aW9uSWR9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5TdGF0dXM6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+e3tzdGF0dXN9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5SZXN1bHQ6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+e3tyZXN1bHR9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5EdXJhdGlvbjo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e2R1cmF0aW9ufX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+VGltZXN0YW1wOjwvc3Ryb25nPjwvdGQ+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPnt7dGltZXN0YW1wfX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgPC90YWJsZT5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW4tdG9wOiAyMHB4OyBjb2xvcjogIzY2NjsgZm9udC1zaXplOiAxMnB4O1wiPlxyXG4gICAgICAgICAgICBUaGlzIGlzIGFuIGF1dG9tYXRlZCBub3RpZmljYXRpb24gZnJvbSBBSUJUUyBUZXN0IEV4ZWN1dGlvbiBTeXN0ZW0uXHJcbiAgICAgICAgICA8L3A+XHJcbiAgICAgICAgPC9ib2R5PlxyXG4gICAgICA8L2h0bWw+XHJcbiAgICBgLFxyXG4gICAgdmFyaWFibGVzOiBbJ3Rlc3ROYW1lJywgJ2V4ZWN1dGlvbklkJywgJ3N0YXR1cycsICdyZXN1bHQnLCAnZHVyYXRpb24nLCAndGltZXN0YW1wJ10sXHJcbiAgfSxcclxuXHJcbiAgLy8gVGVzdCBGYWlsdXJlIC0gRW1haWxcclxuICB7XHJcbiAgICBldmVudFR5cGU6ICd0ZXN0X2ZhaWx1cmUnLFxyXG4gICAgY2hhbm5lbDogJ2VtYWlsJyxcclxuICAgIGZvcm1hdDogJ2h0bWwnLFxyXG4gICAgc3ViamVjdDogJ1Rlc3QgRmFpbGVkOiB7e3Rlc3ROYW1lfX0nLFxyXG4gICAgYm9keTogYFxyXG4gICAgICA8aHRtbD5cclxuICAgICAgICA8Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbGluZS1oZWlnaHQ6IDEuNjsgY29sb3I6ICMzMzM7XCI+XHJcbiAgICAgICAgICA8aDIgc3R5bGU9XCJjb2xvcjogI2Y0NDMzNjtcIj7inJcgVGVzdCBGYWlsZWQ8L2gyPlxyXG4gICAgICAgICAgPHA+WW91ciB0ZXN0IGV4ZWN1dGlvbiBoYXMgZmFpbGVkLiBQbGVhc2UgcmV2aWV3IHRoZSBkZXRhaWxzIGJlbG93LjwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHRhYmxlIHN0eWxlPVwiYm9yZGVyLWNvbGxhcHNlOiBjb2xsYXBzZTsgd2lkdGg6IDEwMCU7IG1hcmdpbjogMjBweCAwO1wiPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+VGVzdCBOYW1lOjwvc3Ryb25nPjwvdGQ+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPnt7dGVzdE5hbWV9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5FeGVjdXRpb24gSUQ6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+e3tleGVjdXRpb25JZH19PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPlN0YXR1czo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e3N0YXR1c319PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPlJlc3VsdDo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e3Jlc3VsdH19PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPkR1cmF0aW9uOjwvc3Ryb25nPjwvdGQ+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPnt7ZHVyYXRpb259fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5FcnJvcjo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDsgY29sb3I6ICNmNDQzMzY7XCI+e3tlcnJvck1lc3NhZ2V9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5UaW1lc3RhbXA6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+e3t0aW1lc3RhbXB9fTwvdGQ+XHJcbiAgICAgICAgICAgIDwvdHI+XHJcbiAgICAgICAgICA8L3RhYmxlPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbi10b3A6IDIwcHg7IGNvbG9yOiAjNjY2OyBmb250LXNpemU6IDEycHg7XCI+XHJcbiAgICAgICAgICAgIFRoaXMgaXMgYW4gYXV0b21hdGVkIG5vdGlmaWNhdGlvbiBmcm9tIEFJQlRTIFRlc3QgRXhlY3V0aW9uIFN5c3RlbS5cclxuICAgICAgICAgIDwvcD5cclxuICAgICAgICA8L2JvZHk+XHJcbiAgICAgIDwvaHRtbD5cclxuICAgIGAsXHJcbiAgICB2YXJpYWJsZXM6IFsndGVzdE5hbWUnLCAnZXhlY3V0aW9uSWQnLCAnc3RhdHVzJywgJ3Jlc3VsdCcsICdkdXJhdGlvbicsICdlcnJvck1lc3NhZ2UnLCAndGltZXN0YW1wJ10sXHJcbiAgfSxcclxuXHJcbiAgLy8gQ3JpdGljYWwgQWxlcnQgLSBFbWFpbFxyXG4gIHtcclxuICAgIGV2ZW50VHlwZTogJ2NyaXRpY2FsX2FsZXJ0JyxcclxuICAgIGNoYW5uZWw6ICdlbWFpbCcsXHJcbiAgICBmb3JtYXQ6ICdodG1sJyxcclxuICAgIHN1YmplY3Q6ICfwn5qoIENSSVRJQ0FMIEFMRVJUOiB7e3Rlc3ROYW1lfX0nLFxyXG4gICAgYm9keTogYFxyXG4gICAgICA8aHRtbD5cclxuICAgICAgICA8Ym9keSBzdHlsZT1cImZvbnQtZmFtaWx5OiBBcmlhbCwgc2Fucy1zZXJpZjsgbGluZS1oZWlnaHQ6IDEuNjsgY29sb3I6ICMzMzM7XCI+XHJcbiAgICAgICAgICA8ZGl2IHN0eWxlPVwiYmFja2dyb3VuZC1jb2xvcjogI2Y0NDMzNjsgY29sb3I6IHdoaXRlOyBwYWRkaW5nOiAxNXB4OyBib3JkZXItcmFkaXVzOiA1cHg7XCI+XHJcbiAgICAgICAgICAgIDxoMiBzdHlsZT1cIm1hcmdpbjogMDtcIj7wn5qoIENSSVRJQ0FMIEFMRVJUPC9oMj5cclxuICAgICAgICAgIDwvZGl2PlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbi10b3A6IDIwcHg7IGZvbnQtc2l6ZTogMTZweDsgY29sb3I6ICNmNDQzMzY7XCI+XHJcbiAgICAgICAgICAgIDxzdHJvbmc+QSBjcml0aWNhbCB0ZXN0IGZhaWx1cmUgaGFzIGJlZW4gZGV0ZWN0ZWQgdGhhdCByZXF1aXJlcyBpbW1lZGlhdGUgYXR0ZW50aW9uLjwvc3Ryb25nPlxyXG4gICAgICAgICAgPC9wPlxyXG4gICAgICAgICAgXHJcbiAgICAgICAgICA8dGFibGUgc3R5bGU9XCJib3JkZXItY29sbGFwc2U6IGNvbGxhcHNlOyB3aWR0aDogMTAwJTsgbWFyZ2luOiAyMHB4IDA7XCI+XHJcbiAgICAgICAgICAgIDx0cj5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+PHN0cm9uZz5UZXN0IE5hbWU6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7XCI+e3t0ZXN0TmFtZX19PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPkV4ZWN1dGlvbiBJRDo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e2V4ZWN1dGlvbklkfX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+UHJvamVjdDo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e3Byb2plY3ROYW1lfX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+U3RhdHVzOjwvc3Ryb25nPjwvdGQ+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPnt7c3RhdHVzfX08L3RkPlxyXG4gICAgICAgICAgICA8L3RyPlxyXG4gICAgICAgICAgICA8dHI+XHJcbiAgICAgICAgICAgICAgPHRkIHN0eWxlPVwicGFkZGluZzogOHB4OyBib3JkZXI6IDFweCBzb2xpZCAjZGRkO1wiPjxzdHJvbmc+RXJyb3I6PC9zdHJvbmc+PC90ZD5cclxuICAgICAgICAgICAgICA8dGQgc3R5bGU9XCJwYWRkaW5nOiA4cHg7IGJvcmRlcjogMXB4IHNvbGlkICNkZGQ7IGNvbG9yOiAjZjQ0MzM2OyBmb250LXdlaWdodDogYm9sZDtcIj57e2Vycm9yTWVzc2FnZX19PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgICAgPHRyPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj48c3Ryb25nPlRpbWVzdGFtcDo8L3N0cm9uZz48L3RkPlxyXG4gICAgICAgICAgICAgIDx0ZCBzdHlsZT1cInBhZGRpbmc6IDhweDsgYm9yZGVyOiAxcHggc29saWQgI2RkZDtcIj57e3RpbWVzdGFtcH19PC90ZD5cclxuICAgICAgICAgICAgPC90cj5cclxuICAgICAgICAgIDwvdGFibGU+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxkaXYgc3R5bGU9XCJiYWNrZ3JvdW5kLWNvbG9yOiAjZmZmM2NkOyBib3JkZXItbGVmdDogNHB4IHNvbGlkICNmZmMxMDc7IHBhZGRpbmc6IDE1cHg7IG1hcmdpbjogMjBweCAwO1wiPlxyXG4gICAgICAgICAgICA8cCBzdHlsZT1cIm1hcmdpbjogMDtcIj48c3Ryb25nPkFjdGlvbiBSZXF1aXJlZDo8L3N0cm9uZz4gUGxlYXNlIGludmVzdGlnYXRlIHRoaXMgZmFpbHVyZSBpbW1lZGlhdGVseS48L3A+XHJcbiAgICAgICAgICA8L2Rpdj5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW4tdG9wOiAyMHB4OyBjb2xvcjogIzY2NjsgZm9udC1zaXplOiAxMnB4O1wiPlxyXG4gICAgICAgICAgICBUaGlzIGlzIGFuIGF1dG9tYXRlZCBjcml0aWNhbCBhbGVydCBmcm9tIEFJQlRTIFRlc3QgRXhlY3V0aW9uIFN5c3RlbS5cclxuICAgICAgICAgIDwvcD5cclxuICAgICAgICA8L2JvZHk+XHJcbiAgICAgIDwvaHRtbD5cclxuICAgIGAsXHJcbiAgICB2YXJpYWJsZXM6IFsndGVzdE5hbWUnLCAnZXhlY3V0aW9uSWQnLCAncHJvamVjdE5hbWUnLCAnc3RhdHVzJywgJ2Vycm9yTWVzc2FnZScsICd0aW1lc3RhbXAnXSxcclxuICB9LFxyXG5cclxuICAvLyBTdW1tYXJ5IFJlcG9ydCAtIEVtYWlsXHJcbiAge1xyXG4gICAgZXZlbnRUeXBlOiAnc3VtbWFyeV9yZXBvcnQnLFxyXG4gICAgY2hhbm5lbDogJ2VtYWlsJyxcclxuICAgIGZvcm1hdDogJ2h0bWwnLFxyXG4gICAgc3ViamVjdDogJ1Rlc3QgRXhlY3V0aW9uIFN1bW1hcnkgUmVwb3J0JyxcclxuICAgIGJvZHk6IGBcclxuICAgICAgPGh0bWw+XHJcbiAgICAgICAgPGJvZHkgc3R5bGU9XCJmb250LWZhbWlseTogQXJpYWwsIHNhbnMtc2VyaWY7IGxpbmUtaGVpZ2h0OiAxLjY7IGNvbG9yOiAjMzMzO1wiPlxyXG4gICAgICAgICAgPGgyIHN0eWxlPVwiY29sb3I6ICMyMTk2RjM7XCI+8J+TiiBUZXN0IEV4ZWN1dGlvbiBTdW1tYXJ5IFJlcG9ydDwvaDI+XHJcbiAgICAgICAgICA8cD5IZXJlJ3MgeW91ciB0ZXN0IGV4ZWN1dGlvbiBzdW1tYXJ5IGZvciB0aGUgcmVwb3J0aW5nIHBlcmlvZC48L3A+XHJcbiAgICAgICAgICBcclxuICAgICAgICAgIDxoMz5SZXBvcnQgRGV0YWlsczwvaDM+XHJcbiAgICAgICAgICA8cD48c3Ryb25nPlJlcG9ydCBUeXBlOjwvc3Ryb25nPiB7e3JlcG9ydERhdGF9fTwvcD5cclxuICAgICAgICAgIFxyXG4gICAgICAgICAgPHAgc3R5bGU9XCJtYXJnaW4tdG9wOiAyMHB4OyBjb2xvcjogIzY2NjsgZm9udC1zaXplOiAxMnB4O1wiPlxyXG4gICAgICAgICAgICBUaGlzIGlzIGFuIGF1dG9tYXRlZCByZXBvcnQgZnJvbSBBSUJUUyBUZXN0IEV4ZWN1dGlvbiBTeXN0ZW0uXHJcbiAgICAgICAgICA8L3A+XHJcbiAgICAgICAgPC9ib2R5PlxyXG4gICAgICA8L2h0bWw+XHJcbiAgICBgLFxyXG4gICAgdmFyaWFibGVzOiBbJ3JlcG9ydERhdGEnXSxcclxuICB9LFxyXG5cclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgLy8gU01TIFRlbXBsYXRlc1xyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICBcclxuICAvLyBDcml0aWNhbCBBbGVydCAtIFNNU1xyXG4gIHtcclxuICAgIGV2ZW50VHlwZTogJ2NyaXRpY2FsX2FsZXJ0JyxcclxuICAgIGNoYW5uZWw6ICdzbXMnLFxyXG4gICAgZm9ybWF0OiAndGV4dCcsXHJcbiAgICBib2R5OiAn8J+aqCBDUklUSUNBTDogVGVzdCBcInt7dGVzdE5hbWV9fVwiIGZhaWxlZC4gRXJyb3I6IHt7ZXJyb3JNZXNzYWdlfX0uIENoZWNrIEFJQlRTIGRhc2hib2FyZCBpbW1lZGlhdGVseS4nLFxyXG4gICAgdmFyaWFibGVzOiBbJ3Rlc3ROYW1lJywgJ2Vycm9yTWVzc2FnZSddLFxyXG4gIH0sXHJcblxyXG4gIC8vID09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT1cclxuICAvLyBTbGFjayBUZW1wbGF0ZXNcclxuICAvLyA9PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09PT09XHJcbiAgXHJcbiAgLy8gVGVzdCBGYWlsdXJlIC0gU2xhY2tcclxuICB7XHJcbiAgICBldmVudFR5cGU6ICd0ZXN0X2ZhaWx1cmUnLFxyXG4gICAgY2hhbm5lbDogJ3NsYWNrJyxcclxuICAgIGZvcm1hdDogJ3NsYWNrX2Jsb2NrcycsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShbXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnaGVhZGVyJyxcclxuICAgICAgICB0ZXh0OiB7XHJcbiAgICAgICAgICB0eXBlOiAncGxhaW5fdGV4dCcsXHJcbiAgICAgICAgICB0ZXh0OiAn4p2MIFRlc3QgRmFpbGVkJyxcclxuICAgICAgICB9LFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdHlwZTogJ3NlY3Rpb24nLFxyXG4gICAgICAgIGZpZWxkczogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgICAgdGV4dDogJypUZXN0IE5hbWU6Klxcbnt7dGVzdE5hbWV9fScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgICAgdGV4dDogJypTdGF0dXM6Klxcbnt7c3RhdHVzfX0nLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZTogJ21ya2R3bicsXHJcbiAgICAgICAgICAgIHRleHQ6ICcqUmVzdWx0OipcXG57e3Jlc3VsdH19JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdtcmtkd24nLFxyXG4gICAgICAgICAgICB0ZXh0OiAnKkR1cmF0aW9uOipcXG57e2R1cmF0aW9ufX0nLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgICB7XHJcbiAgICAgICAgdHlwZTogJ3NlY3Rpb24nLFxyXG4gICAgICAgIHRleHQ6IHtcclxuICAgICAgICAgIHR5cGU6ICdtcmtkd24nLFxyXG4gICAgICAgICAgdGV4dDogJypFcnJvcjoqXFxuYGBge3tlcnJvck1lc3NhZ2V9fWBgYCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHR5cGU6ICdjb250ZXh0JyxcclxuICAgICAgICBlbGVtZW50czogW1xyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgICAgdGV4dDogJ0V4ZWN1dGlvbiBJRDoge3tleGVjdXRpb25JZH19IHwge3t0aW1lc3RhbXB9fScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgIF0sXHJcbiAgICAgIH0sXHJcbiAgICBdKSxcclxuICAgIHZhcmlhYmxlczogWyd0ZXN0TmFtZScsICdzdGF0dXMnLCAncmVzdWx0JywgJ2R1cmF0aW9uJywgJ2Vycm9yTWVzc2FnZScsICdleGVjdXRpb25JZCcsICd0aW1lc3RhbXAnXSxcclxuICB9LFxyXG5cclxuICAvLyBDcml0aWNhbCBBbGVydCAtIFNsYWNrXHJcbiAge1xyXG4gICAgZXZlbnRUeXBlOiAnY3JpdGljYWxfYWxlcnQnLFxyXG4gICAgY2hhbm5lbDogJ3NsYWNrJyxcclxuICAgIGZvcm1hdDogJ3NsYWNrX2Jsb2NrcycsXHJcbiAgICBib2R5OiBKU09OLnN0cmluZ2lmeShbXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnaGVhZGVyJyxcclxuICAgICAgICB0ZXh0OiB7XHJcbiAgICAgICAgICB0eXBlOiAncGxhaW5fdGV4dCcsXHJcbiAgICAgICAgICB0ZXh0OiAn8J+aqCBDUklUSUNBTCBBTEVSVCcsXHJcbiAgICAgICAgfSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHR5cGU6ICdzZWN0aW9uJyxcclxuICAgICAgICB0ZXh0OiB7XHJcbiAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgIHRleHQ6ICcqQSBjcml0aWNhbCB0ZXN0IGZhaWx1cmUgcmVxdWlyZXMgaW1tZWRpYXRlIGF0dGVudGlvbionLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnc2VjdGlvbicsXHJcbiAgICAgICAgZmllbGRzOiBbXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdtcmtkd24nLFxyXG4gICAgICAgICAgICB0ZXh0OiAnKlRlc3QgTmFtZToqXFxue3t0ZXN0TmFtZX19JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgICB7XHJcbiAgICAgICAgICAgIHR5cGU6ICdtcmtkd24nLFxyXG4gICAgICAgICAgICB0ZXh0OiAnKlByb2plY3Q6Klxcbnt7cHJvamVjdE5hbWV9fScsXHJcbiAgICAgICAgICB9LFxyXG4gICAgICAgICAge1xyXG4gICAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgICAgdGV4dDogJypTdGF0dXM6Klxcbnt7c3RhdHVzfX0nLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZTogJ21ya2R3bicsXHJcbiAgICAgICAgICAgIHRleHQ6ICcqVGltZXN0YW1wOipcXG57e3RpbWVzdGFtcH19JyxcclxuICAgICAgICAgIH0sXHJcbiAgICAgICAgXSxcclxuICAgICAgfSxcclxuICAgICAge1xyXG4gICAgICAgIHR5cGU6ICdzZWN0aW9uJyxcclxuICAgICAgICB0ZXh0OiB7XHJcbiAgICAgICAgICB0eXBlOiAnbXJrZHduJyxcclxuICAgICAgICAgIHRleHQ6ICcqRXJyb3I6KlxcbmBgYHt7ZXJyb3JNZXNzYWdlfX1gYGAnLFxyXG4gICAgICAgIH0sXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnZGl2aWRlcicsXHJcbiAgICAgIH0sXHJcbiAgICAgIHtcclxuICAgICAgICB0eXBlOiAnY29udGV4dCcsXHJcbiAgICAgICAgZWxlbWVudHM6IFtcclxuICAgICAgICAgIHtcclxuICAgICAgICAgICAgdHlwZTogJ21ya2R3bicsXHJcbiAgICAgICAgICAgIHRleHQ6ICfimqDvuI8gKkFjdGlvbiBSZXF1aXJlZDoqIFBsZWFzZSBpbnZlc3RpZ2F0ZSB0aGlzIGZhaWx1cmUgaW1tZWRpYXRlbHknLFxyXG4gICAgICAgICAgfSxcclxuICAgICAgICBdLFxyXG4gICAgICB9LFxyXG4gICAgXSksXHJcbiAgICB2YXJpYWJsZXM6IFsndGVzdE5hbWUnLCAncHJvamVjdE5hbWUnLCAnc3RhdHVzJywgJ2Vycm9yTWVzc2FnZScsICd0aW1lc3RhbXAnXSxcclxuICB9LFxyXG5dO1xyXG4iXX0=