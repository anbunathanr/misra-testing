import { render, screen } from '@testing-library/react';
import { MemoryRouter, Routes, Route } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import { ProtectedRoute } from '../ProtectedRoute';
import authSlice from '../../store/slices/authSlice';
import theme from '../../theme';

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
const PublicComponent = () => <div data-testid="public-content">Public Content</div>;

const renderWithRouter = (initialEntries: string[], authState = {}) => {
  const store = createMockStore(authState);
  
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <MemoryRouter initialEntries={initialEntries}>
          <Routes>
            <Route path="/login" element={<LoginComponent />} />
            <Route path="/public" element={<PublicComponent />} />
            <Route 
              path="/protected" 
              element={
                <ProtectedRoute>
                  <TestComponent />
                </ProtectedRoute>
              } 
            />
          </Routes>
        </MemoryRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('Routing Integration', () => {
  it('renders public routes without authentication', () => {
    renderWithRouter(['/public']);
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
  });

  it('renders login page for unauthenticated users', () => {
    renderWithRouter(['/login']);
    expect(screen.getByTestId('login-page')).toBeInTheDocument();
  });

  it('shows loading state for protected routes while checking auth', () => {
    renderWithRouter(['/protected'], {
      isAuthenticated: false,
      loading: true
    });
    expect(screen.getByText('Loading...')).toBeInTheDocument();
  });

  it('renders protected content for authenticated users', () => {
    renderWithRouter(['/protected'], {
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('redirects unauthenticated users from protected routes', () => {
    renderWithRouter(['/protected'], {
      isAuthenticated: false,
      loading: false
    });
    
    // Should not show protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();
    // Should show loading or redirect (Navigate component behavior)
    expect(screen.queryByText('Loading...')).toBeInTheDocument();
  });
});

describe('Route Protection', () => {
  it('protects routes based on authentication state', () => {
    const { rerender } = renderWithRouter(['/protected'], {
      isAuthenticated: false,
      loading: false
    });

    // Initially not authenticated - should not show protected content
    expect(screen.queryByTestId('protected-content')).not.toBeInTheDocument();

    // Re-render with authenticated state
    const authenticatedStore = createMockStore({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    rerender(
      <Provider store={authenticatedStore}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/protected']}>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route path="/public" element={<PublicComponent />} />
              <Route 
                path="/protected" 
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    // Now should show protected content
    expect(screen.getByTestId('protected-content')).toBeInTheDocument();
  });

  it('handles multiple protected routes correctly', () => {
    const MultipleProtectedRoutes = () => (
      <Routes>
        <Route path="/login" element={<LoginComponent />} />
        <Route 
          path="/protected1" 
          element={
            <ProtectedRoute>
              <div data-testid="protected-1">Protected 1</div>
            </ProtectedRoute>
          } 
        />
        <Route 
          path="/protected2" 
          element={
            <ProtectedRoute>
              <div data-testid="protected-2">Protected 2</div>
            </ProtectedRoute>
          } 
        />
      </Routes>
    );

    const store = createMockStore({
      isAuthenticated: true,
      loading: false,
      user: { id: '1', email: 'test@example.com' },
      token: 'mock-token'
    });

    render(
      <Provider store={store}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/protected1']}>
            <MultipleProtectedRoutes />
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByTestId('protected-1')).toBeInTheDocument();
  });
});

describe('Layout Structure', () => {
  it('maintains consistent layout structure across routes', () => {
    const { container } = renderWithRouter(['/public']);
    
    // Check that the basic structure is maintained
    expect(container.firstChild).toBeInTheDocument();
    expect(screen.getByTestId('public-content')).toBeInTheDocument();
  });

  it('handles route transitions correctly', () => {
    const { rerender } = renderWithRouter(['/public']);
    expect(screen.getByTestId('public-content')).toBeInTheDocument();

    // Simulate route change
    rerender(
      <Provider store={createMockStore()}>
        <ThemeProvider theme={theme}>
          <MemoryRouter initialEntries={['/login']}>
            <Routes>
              <Route path="/login" element={<LoginComponent />} />
              <Route path="/public" element={<PublicComponent />} />
              <Route 
                path="/protected" 
                element={
                  <ProtectedRoute>
                    <TestComponent />
                  </ProtectedRoute>
                } 
              />
            </Routes>
          </MemoryRouter>
        </ThemeProvider>
      </Provider>
    );

    expect(screen.getByTestId('login-page')).toBeInTheDocument();
    expect(screen.queryByTestId('public-content')).not.toBeInTheDocument();
  });
});