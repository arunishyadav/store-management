import { createTheme } from '@mui/material/styles';

const AppTheme = createTheme({
  palette: {
    primary: {
      main: '#1A365D', // Dark navy blue for a premium look
      light: '#2B6CB0',
      dark: '#0C1A32',
      contrastText: '#ffffff',
    },
    secondary: {
      main: '#3182CE',
      light: '#63B3ED',
      dark: '#2B6CB0',
      contrastText: '#ffffff',
    },
    background: {
      default: '#F7FAFC',
      paper: '#ffffff',
    },
    text: {
      primary: '#2D3748',
      secondary: '#4A5568',
    }
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 15, // Increased base font size
    h1: { fontWeight: 700, fontSize: '2.5rem' },
    h2: { fontWeight: 700, fontSize: '2rem' },
    h3: { fontWeight: 600, fontSize: '1.75rem' },
    h4: { fontWeight: 600, fontSize: '1.5rem' },
    h5: { fontWeight: 600, fontSize: '1.25rem' },
    h6: { fontWeight: 600, fontSize: '1.1rem' },
    body1: { fontSize: '1rem', lineHeight: 1.5 },
    body2: { fontSize: '0.95rem', lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '8px 16px',
          fontWeight: 600,
          boxShadow: 'none',
          '&:hover': {
            boxShadow: '0 4px 6px rgba(0,0,0,0.1)',
          }
        },
      },
    },
    MuiCard: {
      styleOverrides: {
        root: {
          borderRadius: 16,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: 'none',
          backgroundColor: '#ffffff',
          borderRadius: 12,
          boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
          '& .MuiDataGrid-cell': {
            fontSize: '0.95rem', // Larger text for data
            borderBottom: '1px solid #E2E8F0',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: '#F7FAFC',
            borderBottom: '2px solid #E2E8F0',
            fontSize: '1rem',
            fontWeight: 'bold',
            color: '#2D3748'
          },
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          maxWidth: '100vw',
          overflowX: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        },
        body: {
          maxWidth: '100vw',
          overflowX: 'hidden',
          backgroundColor: '#F7FAFC',
          margin: 0,
          padding: 0,
        },
        '#root': {
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        },
      },
    },
  },
});

export default AppTheme;
