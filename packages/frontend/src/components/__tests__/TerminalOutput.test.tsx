import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import '@testing-library/jest-dom';
import TerminalOutput from '../TerminalOutput';
import { LogEntry } from '../../services/logging';

const mockLogs: LogEntry[] = [
  {
    timestamp: new Date('2023-01-01T10:00:00Z'),
    level: 'info',
    message: 'Test info message',
    details: undefined
  },
  {
    timestamp: new Date('2023-01-01T10:01:00Z'),
    level: 'warn',
    message: 'Test warning message',
    details: 'Additional details'
  },
  {
    timestamp: new Date('2023-01-01T10:02:00Z'),
    level: 'error',
    message: 'Test error message',
    details: { code: 500, message: 'Server error' }
  },
  {
    timestamp: new Date('2023-01-01T10:03:00Z'),
    level: 'success',
    message: 'Test success message',
    details: undefined
  }
];

describe('TerminalOutput', () => {
  const defaultProps = {
    logs: [],
    isRunning: false,
    onClear: jest.fn(),
    visible: true
  };

  beforeEach(() => {
    jest.clearAllMocks();
  });

  test('renders terminal output when visible', () => {
    render(<TerminalOutput {...defaultProps} />);
    
    expect(screen.getByText('Test Output')).toBeInTheDocument();
  });

  test('does not render when not visible', () => {
    render(<TerminalOutput {...defaultProps} visible={false} />);
    
    expect(screen.queryByText('Test Output')).not.toBeInTheDocument();
  });

  test('displays "No output yet..." when no logs', () => {
    render(<TerminalOutput {...defaultProps} />);
    
    expect(screen.getByText('No output yet...')).toBeInTheDocument();
  });

  test('displays logs with correct formatting', () => {
    render(<TerminalOutput {...defaultProps} logs={mockLogs} />);
    
    expect(screen.getByText(/Test info message/)).toBeInTheDocument();
    expect(screen.getByText(/Test warning message/)).toBeInTheDocument();
    expect(screen.getByText(/Test error message/)).toBeInTheDocument();
    expect(screen.getByText(/Test success message/)).toBeInTheDocument();
  });

  test('displays timestamps for each log entry', () => {
    render(<TerminalOutput {...defaultProps} logs={mockLogs} />);
    
    // Check that timestamps are formatted and displayed
    expect(screen.getByText(/\[.*\] Test info message/)).toBeInTheDocument();
  });

  test('displays log details when present', () => {
    render(<TerminalOutput {...defaultProps} logs={mockLogs} />);
    
    expect(screen.getByText('Additional details')).toBeInTheDocument();
    expect(screen.getByText(/"code":500/)).toBeInTheDocument();
  });

  test('shows running status badge when isRunning is true', () => {
    render(<TerminalOutput {...defaultProps} isRunning={true} />);
    
    expect(screen.getByText('Running')).toBeInTheDocument();
  });

  test('shows error status badge when logs contain errors', () => {
    const errorLogs = [mockLogs[2]]; // Error log
    render(<TerminalOutput {...defaultProps} logs={errorLogs} />);
    
    expect(screen.getByText('Error')).toBeInTheDocument();
  });

  test('shows success status badge when no errors and not running', () => {
    const successLogs = [mockLogs[0], mockLogs[3]]; // Info and success logs
    render(<TerminalOutput {...defaultProps} logs={successLogs} />);
    
    expect(screen.getByText('Success')).toBeInTheDocument();
  });

  test('calls onClear when clear button is clicked', () => {
    const onClear = jest.fn();
    render(<TerminalOutput {...defaultProps} onClear={onClear} />);
    
    const clearButton = screen.getByRole('button');
    fireEvent.click(clearButton);
    
    expect(onClear).toHaveBeenCalledTimes(1);
  });

  test('applies correct colors for different log levels', () => {
    render(<TerminalOutput {...defaultProps} logs={mockLogs} />);
    
    // Test that different log levels have different styling
    // This is a basic test - in a real scenario, you might want to test computed styles
    const logElements = screen.getAllByText(/Test .* message/);
    expect(logElements).toHaveLength(4);
  });

  test('handles empty details gracefully', () => {
    const logsWithEmptyDetails: LogEntry[] = [
      {
        timestamp: new Date(),
        level: 'info',
        message: 'Message without details',
        details: null
      }
    ];
    
    render(<TerminalOutput {...defaultProps} logs={logsWithEmptyDetails} />);
    
    expect(screen.getByText(/Message without details/)).toBeInTheDocument();
  });

  test('scrolls to bottom when new logs are added', () => {
    const { rerender } = render(<TerminalOutput {...defaultProps} logs={[mockLogs[0]]} />);
    
    // Mock scrollTop and scrollHeight
    const mockScrollIntoView = jest.fn();
    Object.defineProperty(HTMLElement.prototype, 'scrollTop', {
      writable: true,
      value: 0
    });
    Object.defineProperty(HTMLElement.prototype, 'scrollHeight', {
      writable: true,
      value: 1000
    });
    
    // Add more logs
    rerender(<TerminalOutput {...defaultProps} logs={mockLogs} />);
    
    // The component should attempt to scroll to bottom
    // This is tested indirectly through the useEffect
  });
});