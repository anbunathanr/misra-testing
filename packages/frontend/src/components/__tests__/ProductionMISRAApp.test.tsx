import React from 'react';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import '@testing-library/jest-dom';
import ProductionMISRAApp from '../ProductionMISRAApp';
import { mockBackend } from '../../services/mock-backend';

// Enable mock backend for testing
beforeAll(() => {
  mockBackend.enable();
});

afterAll(() => {
  mockBackend.disable();
});

describe('ProductionMISRAApp', () => {
  beforeEach(() => {
    // Clear any previous state
    jest.clearAllMocks();
  });

  test('renders the main application with automated quick start form', () => {
    render(<ProductionMISRAApp />);
    
    // Check for main title
    expect(screen.getByText('🔍 MISRA Compliance Analyzer')).toBeInTheDocument();
    
    // Check for automated quick start form
    expect(screen.getByText('📋 Quick Start - Fully Automated Analysis')).toBeInTheDocument();
    
    // Check for email input
    expect(screen.getByLabelText('Email Address')).toBeInTheDocument();
    
    // Check for automated workflow description
    expect(screen.getByText(/Fully Automated:/)).toBeInTheDocument();
    expect(screen.getByText(/Register\/login your account/)).toBeInTheDocument();
    expect(screen.getByText(/Select a sample C\/C\+\+ file/)).toBeInTheDocument();
  });

  test('shows start analysis button when email is provided', () => {
    render(<ProductionMISRAApp />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const startButton = screen.getByRole('button', { name: /Start MISRA Analysis/i });
    
    // Button should be disabled initially
    expect(startButton).toBeDisabled();
    
    // Enter email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Button should be enabled now
    expect(startButton).toBeEnabled();
  });

  test('displays automated workflow information', () => {
    render(<ProductionMISRAApp />);
    
    // Check for automated workflow alerts
    expect(screen.getByText(/No File Upload Required:/)).toBeInTheDocument();
    expect(screen.getByText(/automatically selects educational sample files/)).toBeInTheDocument();
  });

  test('shows step indicators for the 4-step process', () => {
    render(<ProductionMISRAApp />);
    
    // Check for all 4 steps
    expect(screen.getByText('1. Login')).toBeInTheDocument();
    expect(screen.getByText('2. Upload')).toBeInTheDocument();
    expect(screen.getByText('3. Analyze')).toBeInTheDocument();
    expect(screen.getByText('4. Verify')).toBeInTheDocument();
  });

  test('starts automated workflow when button is clicked', async () => {
    render(<ProductionMISRAApp />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const startButton = screen.getByRole('button', { name: /Start MISRA Analysis/i });
    
    // Enter email
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    
    // Click start button
    fireEvent.click(startButton);
    
    // Should show analyzing state
    await waitFor(() => {
      expect(screen.getByText('Analyzing...')).toBeInTheDocument();
    });
    
    // Should show terminal output
    expect(screen.getByText('Test Output')).toBeInTheDocument();
  });

  test('displays real-time progress during analysis', async () => {
    render(<ProductionMISRAApp />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const startButton = screen.getByRole('button', { name: /Start MISRA Analysis/i });
    
    // Enter email and start workflow
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(startButton);
    
    // Should show progress display
    await waitFor(() => {
      expect(screen.getByText('📊 Real-Time Progress')).toBeInTheDocument();
    });
  });

  test('handles workflow completion and shows results', async () => {
    render(<ProductionMISRAApp />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const startButton = screen.getByRole('button', { name: /Start MISRA Analysis/i });
    
    // Enter email and start workflow
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(startButton);
    
    // Wait for workflow to complete (mock backend should finish quickly)
    await waitFor(() => {
      expect(screen.getByText('📊 Analysis Results')).toBeInTheDocument();
    }, { timeout: 20000 }); // Give enough time for mock workflow
    
    // Should show compliance score
    expect(screen.getByText(/Compliance Score/)).toBeInTheDocument();
    
    // Should show violations found
    expect(screen.getByText(/Violations Found/)).toBeInTheDocument();
    
    // Should show download button
    expect(screen.getByText(/Download Detailed Report/)).toBeInTheDocument();
  });

  test('allows starting another analysis after completion', async () => {
    render(<ProductionMISRAApp />);
    
    const emailInput = screen.getByLabelText('Email Address');
    const startButton = screen.getByRole('button', { name: /Start MISRA Analysis/i });
    
    // Complete one workflow
    fireEvent.change(emailInput, { target: { value: 'test@example.com' } });
    fireEvent.click(startButton);
    
    // Wait for completion
    await waitFor(() => {
      expect(screen.getByText('📊 Analysis Results')).toBeInTheDocument();
    }, { timeout: 20000 });
    
    // Click "Analyze Another File"
    const analyzeAnotherButton = screen.getByText('Analyze Another File');
    fireEvent.click(analyzeAnotherButton);
    
    // Should return to initial state
    expect(screen.getByText('📋 Quick Start - Fully Automated Analysis')).toBeInTheDocument();
    expect(screen.getByLabelText('Email Address')).toHaveValue('');
  });
});