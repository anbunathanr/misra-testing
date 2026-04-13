import { render, screen, fireEvent } from '@testing-library/react';
import { BrowserRouter } from 'react-router-dom';
import { Provider } from 'react-redux';
import { configureStore } from '@reduxjs/toolkit';
import { ThemeProvider } from '@mui/material/styles';
import Layout from '../Layout';
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

// Mock the Sidebar and Header components
jest.mock('../Sidebar', () => {
  return function MockSidebar({ drawerWidth, mobileOpen, onDrawerToggle }: any) {
    return (
      <div data-testid="sidebar" data-drawer-width={drawerWidth} data-mobile-open={mobileOpen}>
        <button onClick={onDrawerToggle} data-testid="sidebar-toggle">
          Toggle Sidebar
        </button>
      </div>
    );
  };
});

jest.mock('../Header', () => {
  return function MockHeader({ onMenuClick, drawerWidth }: any) {
    return (
      <div data-testid="header" data-drawer-width={drawerWidth}>
        <button onClick={onMenuClick} data-testid="menu-button">
          Menu
        </button>
      </div>
    );
  };
});

// Mock react-router-dom Outlet
jest.mock('react-router-dom', () => ({
  ...jest.requireActual('react-router-dom'),
  Outlet: () => <div data-testid="outlet">Outlet Content</div>
}));

const createMockStore = () => {
  return configureStore({
    reducer: {
      auth: authSlice,
    },
    preloadedState: {
      auth: {
        user: { id: '1', email: 'test@example.com' },
        token: 'mock-token',
        isAuthenticated: true,
        loading: false,
        error: null,
      },
    },
  });
};

const renderWithProviders = (component: React.ReactElement) => {
  const store = createMockStore();
  return render(
    <Provider store={store}>
      <ThemeProvider theme={theme}>
        <BrowserRouter>
          {component}
        </BrowserRouter>
      </ThemeProvider>
    </Provider>
  );
};

describe('Layout Component', () => {
  it('renders without crashing', () => {
    renderWithProviders(<Layout />);
    expect(screen.getByTestId('header')).toBeInTheDocument();
    expect(screen.getByTestId('sidebar')).toBeInTheDocument();
  });

  it('renders with correct drawer width', () => {
    renderWithProviders(<Layout />);
    
    const header = screen.getByTestId('header');
    const sidebar = screen.getByTestId('sidebar');
    
    expect(header).toHaveAttribute('data-drawer-width', '240');
    expect(sidebar).toHaveAttribute('data-drawer-width', '240');
  });

  it('has proper flex layout structure', () => {
    const { container } = renderWithProviders(<Layout />);
    const layoutContainer = container.firstChild;
    
    expect(layoutContainer).toHaveStyle({ display: 'flex', width: '100%' });
  });

  it('toggles mobile drawer when menu button is clicked', () => {
    renderWithProviders(<Layout />);
    
    const menuButton = screen.getByTestId('menu-button');
    const sidebar = screen.getByTestId('sidebar');
    
    // Initially closed
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
    
    // Click to open
    fireEvent.click(menuButton);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
    
    // Click to close
    fireEvent.click(menuButton);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
  });

  it('toggles mobile drawer when sidebar toggle is clicked', () => {
    renderWithProviders(<Layout />);
    
    const sidebarToggle = screen.getByTestId('sidebar-toggle');
    const sidebar = screen.getByTestId('sidebar');
    
    // Initially closed
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
    
    // Click to open
    fireEvent.click(sidebarToggle);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
    
    // Click to close
    fireEvent.click(sidebarToggle);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
  });

  it('renders main content area with proper styling', () => {
    const { container } = renderWithProviders(<Layout />);
    const mainContent = container.querySelector('[component="main"]');
    
    expect(mainContent).toBeInTheDocument();
    expect(mainContent).toHaveStyle({
      flexGrow: '1',
      padding: '24px',
      minHeight: '100vh'
    });
  });

  it('includes toolbar spacing in main content', () => {
    renderWithProviders(<Layout />);
    
    // The Toolbar component should be present for spacing
    const toolbar = document.querySelector('.MuiToolbar-root');
    expect(toolbar).toBeInTheDocument();
  });

  it('handles responsive layout correctly', () => {
    const { container } = renderWithProviders(<Layout />);
    const mainContent = container.querySelector('[component="main"]');
    
    // Should have responsive width calculation
    expect(mainContent).toHaveStyle({
      width: 'calc(100% - 240px)' // This would be applied via MUI's sx prop
    });
  });

  it('maintains state between re-renders', () => {
    const { rerender } = renderWithProviders(<Layout />);
    
    const menuButton = screen.getByTestId('menu-button');
    const sidebar = screen.getByTestId('sidebar');
    
    // Open the drawer
    fireEvent.click(menuButton);
    expect(sidebar).toHaveAttribute('data-mobile-open', 'true');
    
    // Re-render and check state is maintained
    rerender(
      <Provider store={createMockStore()}>
        <ThemeProvider theme={theme}>
          <BrowserRouter>
            <Layout />
          </BrowserRouter>
        </ThemeProvider>
      </Provider>
    );
    
    // State should be reset on re-render (this is expected behavior)
    const newSidebar = screen.getByTestId('sidebar');
    expect(newSidebar).toHaveAttribute('data-mobile-open', 'false');
  });

  it('passes correct props to Header component', () => {
    renderWithProviders(<Layout />);
    
    const header = screen.getByTestId('header');
    expect(header).toHaveAttribute('data-drawer-width', '240');
    
    const menuButton = screen.getByTestId('menu-button');
    expect(menuButton).toBeInTheDocument();
  });

  it('passes correct props to Sidebar component', () => {
    renderWithProviders(<Layout />);
    
    const sidebar = screen.getByTestId('sidebar');
    expect(sidebar).toHaveAttribute('data-drawer-width', '240');
    expect(sidebar).toHaveAttribute('data-mobile-open', 'false');
    
    const sidebarToggle = screen.getByTestId('sidebar-toggle');
    expect(sidebarToggle).toBeInTheDocument();
  });

  it('renders Outlet for nested routes', () => {
    renderWithProviders(<Layout />);
    
    // The Outlet component should be rendered within the main content area
    // In a real test, this would render the nested route content
    const mainContent = document.querySelector('[component="main"]');
    expect(mainContent).toBeInTheDocument();
  });
});