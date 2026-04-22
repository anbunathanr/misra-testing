import { createTheme } from '@mui/material/styles'

const theme = createTheme({
  palette: {
    mode: 'dark',
    primary: {
      main: '#7b61ff',
      light: '#9d8aff',
      dark: '#5a41d9',
      contrastText: '#fff'
    },
    secondary: {
      main: '#764ba2',
      light: '#9575cd',
      dark: '#5e35b1',
      contrastText: '#fff'
    },
    error: {
      main: '#f44336'
    },
    warning: {
      main: '#ffc107'
    },
    info: {
      main: '#2196F3'
    },
    success: {
      main: '#00e676'
    },
    background: {
      default: '#0f172a',
      paper: 'rgba(30, 41, 59, 0.7)'
    },
    text: {
      primary: '#f8fafc',
      secondary: '#94a3b8'
    }
  },
  typography: {
    fontFamily: '"Roboto", "Helvetica", "Arial", sans-serif',
    h1: {
      fontSize: '2.5rem',
      fontWeight: 700
    },
    h2: {
      fontSize: '2rem',
      fontWeight: 700
    },
    h3: {
      fontSize: '1.75rem',
      fontWeight: 700
    },
    h4: {
      fontSize: '1.5rem',
      fontWeight: 600
    },
    h5: {
      fontSize: '1.25rem',
      fontWeight: 600
    },
    h6: {
      fontSize: '1rem',
      fontWeight: 600
    }
  },
  shape: {
    borderRadius: 12
  },
  components: {
    MuiCssBaseline: {
      styleOverrides: {
        body: {
          background: 'radial-gradient(circle at top right, #2d1b69 0%, #0f172a 100%)',
          backgroundAttachment: 'fixed',
          minHeight: '100vh'
        }
      }
    },
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 30,
          padding: '10px 24px',
          fontWeight: 600
        },
        containedPrimary: {
          background: 'linear-gradient(45deg, #7b61ff 30%, #00e676 90%)',
          boxShadow: '0 0 15px rgba(123, 97, 255, 0.4)',
          '&:hover': {
            background: 'linear-gradient(45deg, #6a50e8 30%, #00d66a 90%)',
            boxShadow: '0 0 25px rgba(123, 97, 255, 0.6)'
          }
        }
      }
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }
      }
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          borderRadius: 12,
          backgroundImage: 'none',
          backgroundColor: 'rgba(255, 255, 255, 0.05)',
          backdropFilter: 'blur(10px)',
          border: '1px solid rgba(255, 255, 255, 0.1)',
          boxShadow: '0 8px 32px 0 rgba(0, 0, 0, 0.37)'
        }
      }
    },
    MuiTextField: {
      styleOverrides: {
        root: {
          '& .MuiOutlinedInput-root': {
            color: '#f8fafc',
            '& fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.2)'
            },
            '&:hover fieldset': {
              borderColor: 'rgba(255, 255, 255, 0.3)'
            },
            '&.Mui-focused fieldset': {
              borderColor: '#7b61ff'
            }
          },
          '& .MuiInputLabel-root': {
            color: '#94a3b8'
          },
          '& .MuiFormHelperText-root': {
            color: '#94a3b8'
          }
        }
      }
    },
    MuiTableCell: {
      styleOverrides: {
        root: {
          borderBottom: '1px solid rgba(255, 255, 255, 0.1)',
          color: '#f8fafc'
        },
        head: {
          fontWeight: 600,
          color: '#94a3b8'
        }
      }
    }
  }
})

export default theme
