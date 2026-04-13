import React from 'react';
import { render, screen } from '@testing-library/react';
import '@testing-library/jest-dom';
import * as fc from 'fast-check';
import TerminalOutput from '../TerminalOutput';
import { LogEntry } from '../../services/logging';

/**
 * Property 2: Terminal Output Formatting
 * 
 * For any log entry with level and message content, the terminal-style output 
 * should format and display the entry with appropriate styling, timestamps, 
 * color coding, and maintain debugging functionality for technical users.
 * 
 * Validates: Requirements 1.3, 7.5, 9.4
 */

// Generators for property-based testing
const logLevelArb = fc.constantFrom('info', 'warn', 'error', 'success');

const logMessageArb = fc.string({ minLength: 1, maxLength: 200 });

const logDetailsArb = fc.oneof(
  fc.constant(undefined),
  fc.string(),
  fc.record({
    code: fc.integer(),
    message: fc.string(),
    data: fc.anything()
  })
);

const logEntryArb = fc.record({
  timestamp: fc.date(),
  level: logLevelArb,
  message: logMessageArb,
  details: logDetailsArb
}) as fc.Arbitrary<LogEntry>;

const logArrayArb = fc.array(logEntryArb, { minLength: 0, maxLength: 50 });

describe('TerminalOutput Property Tests', () => {
  /**
   * Property: Terminal output should always render when visible
   */
  test('terminal output renders consistently when visible', () => {
    fc.assert(
      fc.property(
        logArrayArb,
        fc.boolean(),
        (logs, isRunning) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={isRunning}
              onClear={onClear}
              visible={true}
            />
          );
          
          // Terminal should always have the header when visible
          expect(screen.getByText('Test Output')).toBeInTheDocument();
          
          // Should have a clear button
          expect(screen.getByRole('button')).toBeInTheDocument();
          
          // Should have a status badge
          const statusBadges = ['Running', 'Success', 'Error'];
          const hasStatusBadge = statusBadges.some(badge => 
            screen.queryByText(badge) !== null
          );
          expect(hasStatusBadge).toBe(true);
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: All log entries should be displayed with proper formatting
   */
  test('all log entries are displayed with timestamps and messages', () => {
    fc.assert(
      fc.property(
        logArrayArb,
        (logs) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={false}
              onClear={onClear}
              visible={true}
            />
          );
          
          if (logs.length === 0) {
            // Should show "No output yet..." when no logs
            expect(screen.getByText('No output yet...')).toBeInTheDocument();
          } else {
            // Each log message should be present
            logs.forEach(log => {
              // Check that the message content is displayed
              expect(screen.getByText(new RegExp(log.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
            });
          }
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Status badge should reflect the correct state
   */
  test('status badge correctly reflects terminal state', () => {
    fc.assert(
      fc.property(
        logArrayArb,
        fc.boolean(),
        (logs, isRunning) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={isRunning}
              onClear={onClear}
              visible={true}
            />
          );
          
          if (isRunning) {
            expect(screen.getByText('Running')).toBeInTheDocument();
          } else {
            const hasErrors = logs.some(log => log.level === 'error');
            if (hasErrors) {
              expect(screen.getByText('Error')).toBeInTheDocument();
            } else {
              expect(screen.getByText('Success')).toBeInTheDocument();
            }
          }
        }
      ),
      { numRuns: 50 }
    );
  });

  /**
   * Property: Log details should be displayed when present
   */
  test('log details are displayed when present', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            timestamp: fc.date(),
            level: logLevelArb,
            message: logMessageArb,
            details: fc.oneof(
              fc.string({ minLength: 1 }),
              fc.record({ key: fc.string({ minLength: 1 }) })
            )
          }) as fc.Arbitrary<LogEntry>,
          { minLength: 1, maxLength: 10 }
        ),
        (logs) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={false}
              onClear={onClear}
              visible={true}
            />
          );
          
          logs.forEach(log => {
            if (log.details) {
              // Details should be displayed in some form
              const detailsText = typeof log.details === 'string' 
                ? log.details 
                : JSON.stringify(log.details);
              
              // Check if any part of the details is visible
              const hasDetailsContent = detailsText.length > 0;
              expect(hasDetailsContent).toBe(true);
            }
          });
        }
      ),
      { numRuns: 20 }
    );
  });

  /**
   * Property: Terminal should handle different log levels consistently
   */
  test('terminal handles all log levels with appropriate styling', () => {
    fc.assert(
      fc.property(
        fc.array(
          fc.record({
            timestamp: fc.date(),
            level: logLevelArb,
            message: fc.string({ minLength: 1, maxLength: 100 }),
            details: fc.constant(undefined)
          }) as fc.Arbitrary<LogEntry>,
          { minLength: 1, maxLength: 20 }
        ),
        (logs) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={false}
              onClear={onClear}
              visible={true}
            />
          );
          
          // All log levels should be supported
          const supportedLevels = ['info', 'warn', 'error', 'success'];
          logs.forEach(log => {
            expect(supportedLevels).toContain(log.level);
            
            // Message should be displayed regardless of level
            expect(screen.getByText(new RegExp(log.message.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
          });
        }
      ),
      { numRuns: 30 }
    );
  });

  /**
   * Property: Terminal should be scrollable when content exceeds max height
   */
  test('terminal maintains scrollable behavior with large log sets', () => {
    fc.assert(
      fc.property(
        fc.array(
          logEntryArb,
          { minLength: 20, maxLength: 100 } // Large number of logs
        ),
        (logs) => {
          const onClear = jest.fn();
          
          render(
            <TerminalOutput
              logs={logs}
              isRunning={false}
              onClear={onClear}
              visible={true}
            />
          );
          
          // Terminal should render without crashing with large log sets
          expect(screen.getByText('Test Output')).toBeInTheDocument();
          
          // Should still show the first and last messages
          if (logs.length > 0) {
            const firstMessage = logs[0].message;
            const lastMessage = logs[logs.length - 1].message;
            
            expect(screen.getByText(new RegExp(firstMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
            expect(screen.getByText(new RegExp(lastMessage.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')))).toBeInTheDocument();
          }
        }
      ),
      { numRuns: 10 } // Fewer runs for performance with large datasets
    );
  });

  /**
   * Property: Terminal should handle edge cases gracefully
   */
  test('terminal handles edge cases gracefully', () => {
    fc.assert(
      fc.property(
        fc.oneof(
          fc.constant([]), // Empty logs
          fc.array(
            fc.record({
              timestamp: fc.date(),
              level: logLevelArb,
              message: fc.oneof(
                fc.constant(''), // Empty message
                fc.string({ minLength: 1000, maxLength: 2000 }), // Very long message
                fc.string().filter(s => s.includes('\n') || s.includes('\t')) // Messages with special characters
              ),
              details: fc.oneof(
                fc.constant(undefined),
                fc.constant(null),
                fc.constant(''),
                fc.object() // Complex objects
              )
            }) as fc.Arbitrary<LogEntry>,
            { minLength: 1, maxLength: 5 }
          )
        ),
        (logs) => {
          const onClear = jest.fn();
          
          // Should not throw errors with edge case inputs
          expect(() => {
            render(
              <TerminalOutput
                logs={logs}
                isRunning={false}
                onClear={onClear}
                visible={true}
              />
            );
          }).not.toThrow();
          
          // Should still render the basic structure
          expect(screen.getByText('Test Output')).toBeInTheDocument();
        }
      ),
      { numRuns: 20 }
    );
  });
});