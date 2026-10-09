import { createTheme } from '@mui/material/styles';

export const getAppTheme = (mode = 'light') => createTheme({
  palette: {
    mode,
    primary: mode === 'dark' ? {
      main: '#38BDF8',
      light: '#7DD3FC',
      dark: '#0284C7',
      contrastText: '#0F172A',
    } : {
      main: '#1A365D',
      light: '#2B6CB0',
      dark: '#0C1A32',
      contrastText: '#ffffff',
    },
    secondary: mode === 'dark' ? {
      main: '#818CF8',
      light: '#A5B4FC',
      dark: '#4F46E5',
      contrastText: '#ffffff',
    } : {
      main: '#3182CE',
      light: '#63B3ED',
      dark: '#2B6CB0',
      contrastText: '#ffffff',
    },
    background: mode === 'dark' ? {
      default: '#0F172A',
      paper: '#1E293B',
    } : {
      default: '#F8FAFC',
      paper: '#ffffff',
    },
    text: mode === 'dark' ? {
      primary: '#F8FAFC',
      secondary: '#94A3B8',
    } : {
      primary: '#2D3748',
      secondary: '#4A5568',
    },
  },
  typography: {
    fontFamily: '"Inter", "Roboto", "Helvetica", "Arial", sans-serif',
    fontSize: 14,
    h1: { fontWeight: 700, fontSize: '2.2rem' },
    h2: { fontWeight: 700, fontSize: '1.8rem' },
    h3: { fontWeight: 600, fontSize: '1.5rem' },
    h4: { fontWeight: 600, fontSize: '1.3rem' },
    h5: { fontWeight: 600, fontSize: '1.1rem' },
    h6: { fontWeight: 600, fontSize: '1rem' },
    body1: { fontSize: '0.92rem', lineHeight: 1.5 },
    body2: { fontSize: '0.85rem', lineHeight: 1.5 },
  },
  components: {
    MuiButton: {
      styleOverrides: {
        root: {
          textTransform: 'none',
          borderRadius: 8,
          padding: '6px 14px',
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
          borderRadius: 14,
          boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.4)' : '0 4px 12px rgba(0,0,0,0.05)',
          border: mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
        },
      },
    },
    MuiDataGrid: {
      styleOverrides: {
        root: {
          border: mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
          backgroundColor: mode === 'dark' ? '#1E293B' : '#ffffff',
          borderRadius: 12,
          boxShadow: mode === 'dark' ? '0 4px 12px rgba(0,0,0,0.3)' : '0 4px 12px rgba(0,0,0,0.04)',
          '& .MuiDataGrid-cell': {
            fontSize: '0.85rem',
            borderBottom: mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
            padding: '4px 8px',
          },
          '& .MuiDataGrid-columnHeaders': {
            backgroundColor: mode === 'dark' ? '#0F172A' : '#F1F5F9',
            borderBottom: mode === 'dark' ? '2px solid #334155' : '2px solid #CBD5E1',
            fontSize: '0.88rem',
            fontWeight: 700,
            color: mode === 'dark' ? '#F8FAFC' : '#1E293B',
          },
          '& .MuiDataGrid-footerContainer': {
            borderTop: mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
            backgroundColor: mode === 'dark' ? '#0F172A' : '#F8FAFC',
          }
        },
      },
    },
    MuiOutlinedInput: {
      styleOverrides: {
        root: {
          backgroundColor: mode === 'dark' ? '#1E293B' : '#ffffff',
          color: mode === 'dark' ? '#F8FAFC' : '#1E293B',
          '& .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? '#475569' : '#CBD5E1',
          },
          '&:hover .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? '#94A3B8' : '#94A3B8',
          },
          '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
            borderColor: mode === 'dark' ? '#38BDF8' : '#1A365D',
          },
          '& input': {
            color: mode === 'dark' ? '#F8FAFC !important' : '#1E293B !important',
            '&::placeholder': {
              color: mode === 'dark' ? '#94A3B8' : '#64748B',
              opacity: 1,
            },
          },
        },
      },
    },
    MuiInputBase: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#F8FAFC' : '#1E293B',
        },
        input: {
          color: mode === 'dark' ? '#F8FAFC !important' : '#1E293B !important',
          '&::placeholder': {
            color: mode === 'dark' ? '#94A3B8' : '#64748B',
            opacity: 1,
          },
        },
      },
    },
    MuiInputLabel: {
      styleOverrides: {
        root: {
          color: mode === 'dark' ? '#94A3B8' : '#64748B',
          '&.Mui-focused': {
            color: mode === 'dark' ? '#38BDF8' : '#1A365D',
          },
        },
      },
    },
    MuiSelect: {
      styleOverrides: {
        icon: {
          color: mode === 'dark' ? '#94A3B8' : '#64748B',
        },
      },
    },
    MuiPaper: {
      styleOverrides: {
        root: {
          backgroundImage: 'none',
        },
      },
    },
    MuiCssBaseline: {
      styleOverrides: {
        html: {
          colorScheme: mode,
          maxWidth: '100vw',
          overflowX: 'hidden',
          WebkitTapHighlightColor: 'transparent',
        },
        body: {
          colorScheme: mode,
          maxWidth: '100vw',
          overflowX: 'hidden',
          backgroundColor: mode === 'dark' ? '#0F172A' : '#F8FAFC',
          color: mode === 'dark' ? '#F8FAFC' : '#2D3748',
          margin: 0,
          padding: 0,
        },
        '#root': {
          maxWidth: '100vw',
          overflowX: 'hidden',
          boxSizing: 'border-box',
        },
        'input, textarea, select': {
          colorScheme: mode,
          color: mode === 'dark' ? '#F8FAFC' : '#1E293B',
          backgroundColor: mode === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: mode === 'dark' ? '#475569' : '#CBD5E1',
          '&::placeholder': {
            color: mode === 'dark' ? '#94A3B8' : '#64748B',
            opacity: 1,
          },
        },
        'input[type="date"], input[type="time"]': {
          colorScheme: mode,
          color: mode === 'dark' ? '#F8FAFC' : '#1E293B',
          backgroundColor: mode === 'dark' ? '#1E293B' : '#FFFFFF',
          borderColor: mode === 'dark' ? '#475569' : '#CBD5E1',
        },
      },
    },
  },
});

export default getAppTheme('light');
