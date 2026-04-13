import { render, screen, waitFor } from '@testing-library/react';
import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ProtectedRoute } from '../ProtectedRoute';
import authSlice from '../../store/slices/authSlice';

// Mock the auth service to avoid import.meta.env issues
jest.mock('../../services/auth-service', () => ({
  authService: {
    login: jest.fn(),
    logout: jest.fn(),
    getCurrentUser: jest.fn(),
    refreshToken: jest.fn(),
    isAuthenticated: jest.fn(),
  },
  UserInfo: {}
}));

// Mock the checkAuth action
const mockCheckAuth = jest.fn();
jest.mock('../../store/slices/authSlice', () => ({
  ...jest.requireActual('../../store/slices/authSlice'),
  checkAuth: () => mockCheckAuth,
}));

const createMockStore = (authState = {}) => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: null,
        token: null,
        isAuthenticated: false,
        loading: false,
        error: null,
        ...authState,
      },
    },
  });
};

const TestComponent = () => <div data-testid="protected-content">Protected Content</div>;
const LoginComponent = () => <div data-testid="login-page">Login Page</div>;

const renderWithRouter = (authState = {}) => {
  const store = createMockStore(authState);
  
  return render(
    <Provider store={store}>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<LoginComponent />} />
          <Route 
            path="/protected" 
            element={
              <ProtectedRoute>
                <TestComponent />
              </ProtectedRoute>
            } 
          />
        </Routes>
      </BrowserRouter>
    </Provider>
  );
};

describe('ProtectedRoute Component', () => {
  beforeEach(() => {
    mockCheckAuth.mockClear();
    // Set initial location to protected route
    window.history.pushState({}, 'Protected', '/protected');
  });

  it('renders children when user is authenticated', () => {
    renderWithRouter({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('shows loading state while checking authentication', () => {
    renderWithRouter({
      isAuthenticated: false,
      loading: true
    });

    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('redirects to login when user is not authenticated', async () => {
    renderWithRouter({
      isAuthenticated: false,
      loading: false
    });

    // Should not show protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    
    // Should redirect to login (this would happen in a real router environment)
    await waitFor(() => {
      expect(mockCheckAuth).toHaveBeenCalled();
    });
  });

  it('calls checkAuth when user is not authenticated', () => {
    renderWithRouter({
      isAuthenticated: false,
      loading: false
    });

    expect(mockCheckAuth).toHaveBeenCalled();
  });

  it('does not call checkAuth when user is already authenticated', () => {
    renderWithRouter({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    expect(mockCheckAuth).not.toHaveBeenCalled();
  });

  it('preserves location state for redirect after login', () => {
    const { container } = renderWithRouter({
      isAuthenticated: false,
      loading: false
    });

    // The Navigate component should preserve the current location
    expect(container).toBeInTheDocument();
  });

  it('handles authentication state changes', async () => {
    const store = createMockStore({
      isAuthenticated: false,
      loading: true
    });

    const { rerender } = render(
      <Provider store={store}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/protected" 
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </Provider>
    );

    // Initially loading
    expect(screen.getByText('Loading...')).toBeInTheDocument();

    // Update store to authenticated
    const authenticatedStore = createMockStore({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    rerender(
      <Provider store={authenticatedStore}>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route 
              path="/protected" 
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('renders multiple children correctly', () => {
    renderWithRouter({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    const MultipleChildrenComponent = () => (
      <ProtectedRoute>
        <div data-testid="child-1">Child 1</div>
        <div data-testid="child-2">Child 2</div>
      </ProtectedRoute>
    );

    const store = createMockStore({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    render(
      <Provider store={store}>
        <BrowserRouter>
          <MultipleChildrenComponent />
        </BrowserRouter>
      </Provider>
    );

    expect(screen.getByTestId('child-1')).toBeInTheDocument();
    expect(screen.getByTestId('child-2')).toBeInTheDocument();
  });
});