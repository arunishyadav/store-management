import React, { useState, useEffect } from 'react';
import { 
  Box, Card, CardContent, Typography, TextField, Button, CircularProgress, 
  Alert, MenuItem, Select, FormControl, InputLabel, Autocomplete, IconButton, Tooltip 
} from '@mui/material';
import { Brightness4, Brightness7 } from '@mui/icons-material';
import { keyframes } from '@emotion/react';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import api from '../services/api';
import { useNavigate } from 'react-router-dom';

const fadeIn = keyframes`
  from { opacity: 0; transform: translateY(20px); }
  to { opacity: 1; transform: translateY(0); }
`;

const gradientBg = keyframes`
  0% { background-position: 0% 50%; }
  50% { background-position: 100% 50%; }
  100% { background-position: 0% 50%; }
`;

const pulseLogo = keyframes`
  0% { transform: scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
  50% { transform: scale(1.05); box-shadow: 0 8px 25px rgba(1,186,239,0.4); }
  100% { transform: scale(1); box-shadow: 0 4px 15px rgba(0,0,0,0.1); }
`;

const defaultLocations = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
].map((name, index) => ({ id: `loc-default-${index}`, name, code: name.substring(0, 3).toUpperCase() }));

const Login = () => {
  const [country] = useState('India');
  const [stateId, setStateId] = useState('');
  const [locations, setLocations] = useState(defaultLocations);
  const [loginType, setLoginType] = useState('Admin Login');
  
  const [userId, setUserId] = useState('');
  const [password, setPassword] = useState('');
  
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const login = useAuthStore((state) => state.login);
  const { mode, toggleTheme } = useThemeStore();
  const isDark = mode === 'dark';
  const navigate = useNavigate();

  useEffect(() => {
    // Fetch real location UUIDs from backend API on mount
    const fetchLocations = () => {
      api.get('/api/v1/locations')
        .then(res => {
          if (Array.isArray(res.data) && res.data.length > 0) {
            setLocations(res.data);
            if (!stateId) {
              setStateId(res.data[0].id);
            }
          }
        })
        .catch(err => console.error('Error fetching locations:', err));
    };
    fetchLocations();
  }, []);

  const handleLoginTypeChange = (e) => {
    const type = e.target.value;
    setLoginType(type);
    setUserId('');
    setPassword('');
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setError('');

    const effectiveStateId = stateId || (locations[0] ? locations[0].id : '');
    setLoading(true);

    try {
      const response = await api.post('/api/auth/login', { userId: userId, password: password });
      
      if (response.data.token) {
        let finalLocation = null;
        
        if (response.data.role !== 'SUPER_ADMIN' && response.data.locationId && response.data.locationName) {
          // STRICT LOCK for non-Super Admin (Store Incharge / User) to assigned DB location
          finalLocation = { id: response.data.locationId, name: response.data.locationName };
        } else {
          // Super Admin can use selected state or default location
          finalLocation = locations.find(l => l.id === effectiveStateId) || locations[0] || { id: 'default', name: 'Andhra Pradesh' };
        }

        login(response.data.token, { 
          user_id: response.data.userId, 
          name: response.data.fullName, 
          role: response.data.role,
          location: finalLocation?.name || 'Andhra Pradesh',
          locationId: finalLocation?.id
        });
        
        useAuthStore.getState().updateLocation(finalLocation);
        navigate('/entry-book');
      } else {
        setError('Login failed. Please try again.');
      }
    } catch (err) {
      console.error(err);
      if (err.response?.data?.message) {
        setError(err.response.data.message);
      } else if (err.code === 'ERR_NETWORK' || !err.response || err.response.status === 502 || err.response.status === 503) {
        setError('Unable to connect to backend server. Please check your network or try again in a few seconds.');
      } else {
        setError('Login failed. Invalid User ID or Password.');
      }
    } finally {
      setLoading(false);
    }
  };

  // Reusable styling for high contrast in both light and dark themes
  const fieldSx = {
    '& .MuiOutlinedInput-root': {
      borderRadius: 2,
      backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
      color: isDark ? '#F8FAFC !important' : '#0F172A !important',
      '& fieldset': {
        borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
      },
      '&:hover fieldset': {
        borderColor: isDark ? '#38BDF8' : '#01BAEF',
      },
      '&.Mui-focused fieldset': {
        borderColor: isDark ? '#38BDF8' : '#0B4F6C',
        borderWidth: 2,
      },
    },
    '& .MuiInputBase-input': {
      color: isDark ? '#F8FAFC !important' : '#0F172A !important',
      WebkitTextFillColor: isDark ? '#F8FAFC !important' : '#0F172A !important',
      fontWeight: 500,
    },
    '& .MuiInputLabel-root': {
      color: isDark ? '#94A3B8 !important' : '#475569 !important',
      fontWeight: 500,
    },
    '& .MuiInputLabel-root.Mui-focused': {
      color: isDark ? '#38BDF8 !important' : '#0B4F6C !important',
      fontWeight: 600,
    },
    '& input:-webkit-autofill': {
      WebkitBoxShadow: `0 0 0 100px ${isDark ? '#1E293B' : '#FFFFFF'} inset !important`,
      WebkitTextFillColor: `${isDark ? '#F8FAFC' : '#0F172A'} !important`,
    },
  };

  const selectSx = {
    borderRadius: 2,
    backgroundColor: isDark ? 'rgba(30, 41, 59, 0.85)' : '#FFFFFF',
    color: isDark ? '#F8FAFC !important' : '#0F172A !important',
    '& .MuiSelect-select': {
      color: isDark ? '#F8FAFC !important' : '#0F172A !important',
      WebkitTextFillColor: isDark ? '#F8FAFC !important' : '#0F172A !important',
      fontWeight: 500,
    },
    '& .MuiSvgIcon-root': {
      color: isDark ? '#94A3B8' : '#475569',
    },
    '& fieldset': {
      borderColor: isDark ? 'rgba(255, 255, 255, 0.25)' : '#CBD5E1',
    },
    '&:hover fieldset': {
      borderColor: isDark ? '#38BDF8' : '#01BAEF',
    },
    '&.Mui-focused fieldset': {
      borderColor: isDark ? '#38BDF8' : '#0B4F6C',
      borderWidth: 2,
    },
  };

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(-45deg, #0B4F6C, #01BAEF, #1E90FF, #00BFFF)',
        backgroundSize: '400% 400%',
        animation: `${gradientBg} 15s ease infinite`,
        padding: 2,
        position: 'relative',
        overflow: 'hidden'
      }}
    >
      <Card
        sx={{
          maxWidth: 450,
          width: '100%',
          position: 'relative',
          background: isDark ? 'rgba(15, 23, 42, 0.94)' : 'rgba(255, 255, 255, 0.96)',
          backdropFilter: 'blur(20px)',
          borderRadius: 4,
          boxShadow: isDark 
            ? '0 20px 50px rgba(0, 0, 0, 0.6), 0 0 0 1px rgba(255, 255, 255, 0.1)'
            : '0 20px 50px rgba(0, 0, 0, 0.18), 0 0 0 1px rgba(0, 0, 0, 0.05)',
          animation: `${fadeIn} 0.8s ease-out forwards`,
          overflow: 'hidden'
        }}
      >
        {/* Theme Toggle Button */}
        <Box sx={{ position: 'absolute', top: 16, right: 16, zIndex: 10 }}>
          <Tooltip title={isDark ? "Switch to Light Mode" : "Switch to Dark Mode"}>
            <IconButton 
              onClick={toggleTheme} 
              sx={{ 
                color: isDark ? '#38BDF8' : '#0B4F6C',
                backgroundColor: isDark ? 'rgba(255, 255, 255, 0.08)' : 'rgba(0, 0, 0, 0.05)',
                '&:hover': {
                  backgroundColor: isDark ? 'rgba(255, 255, 255, 0.16)' : 'rgba(0, 0, 0, 0.1)'
                }
              }}
            >
              {isDark ? <Brightness7 /> : <Brightness4 />}
            </IconButton>
          </Tooltip>
        </Box>

        <CardContent sx={{ p: { xs: 3, sm: 5 } }}>
          <Box 
            display="flex" 
            flexDirection="column" 
            alignItems="center" 
            mb={4}
            sx={{ animation: `${fadeIn} 1s ease-out 0.2s both` }}
          >
            <Box 
               sx={{ 
                 background: '#fff', 
                 borderRadius: '50%', 
                 p: 1.5, 
                 mb: 2, 
                 boxShadow: '0 4px 15px rgba(0,0,0,0.1)',
                 animation: `${pulseLogo} 3s ease-in-out infinite`
               }}
            >
               <img src="/logo.svg" alt="Finsen Ritter Logo" style={{ width: '70px', height: '70px' }} />
            </Box>
            
            <Typography 
              variant="h4" 
              align="center" 
              sx={{ 
                fontWeight: 800, 
                letterSpacing: '0.5px',
                color: isDark ? '#38BDF8' : '#0B4F6C'
              }}
            >
              Finsen Ritter Limited
            </Typography>
            <Typography 
              variant="subtitle1" 
              align="center" 
              sx={{ 
                fontWeight: 600, 
                mb: 1, 
                letterSpacing: '1px', 
                textTransform: 'uppercase',
                color: isDark ? '#94A3B8' : '#64748B'
              }}
            >
              Indore
            </Typography>
            
            <Typography 
              variant="body2" 
              align="center" 
              sx={{ 
                color: isDark ? '#94A3B8' : '#64748B',
                opacity: 0.9 
              }}
            >
              Enterprise Inventory & Store Management System
            </Typography>
          </Box>
          
          <Box sx={{ animation: `${fadeIn} 1s ease-out 0.4s both` }}>
            {error && <Alert severity="error" sx={{ mb: 3, borderRadius: 2 }}>{error}</Alert>}

            <form onSubmit={handleLogin}>
              <TextField
                fullWidth
                label="Country"
                variant="outlined"
                margin="normal"
                value={country}
                disabled
                sx={fieldSx}
              />
              
              <FormControl fullWidth margin="normal">
                <Autocomplete
                  options={locations}
                  getOptionLabel={(option) => option.name || ''}
                  value={locations.find(l => l.id === stateId) || null}
                  onChange={(event, newValue) => {
                    setStateId(newValue ? newValue.id : '');
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="State (Location)" 
                      required 
                      sx={fieldSx}
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel sx={{ color: isDark ? '#94A3B8 !important' : '#475569 !important' }}>
                  Login Type
                </InputLabel>
                <Select
                  value={loginType}
                  label="Login Type"
                  onChange={handleLoginTypeChange}
                  sx={selectSx}
                >
                  <MenuItem value="Admin Login">Admin Login</MenuItem>
                  <MenuItem value="Store Incharge Login">Store Incharge Login</MenuItem>
                  <MenuItem value="User Login">User Login (View Only)</MenuItem>
                </Select>
              </FormControl>

              <TextField
                fullWidth
                label="User ID"
                variant="outlined"
                margin="normal"
                value={userId}
                onChange={(e) => setUserId(e.target.value)}
                disabled={loading}
                required
                sx={fieldSx}
              />
              <TextField
                fullWidth
                label="Password"
                type="password"
                variant="outlined"
                margin="normal"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                disabled={loading}
                required
                sx={fieldSx}
              />
              <Button
                fullWidth
                type="submit"
                variant="contained"
                disabled={loading}
                sx={{ 
                   mt: 4, 
                   mb: 2, 
                   py: 1.5, 
                   fontSize: '1.1rem', 
                   fontWeight: 'bold',
                   borderRadius: 3,
                   textTransform: 'none',
                   background: 'linear-gradient(45deg, #0B4F6C 30%, #01BAEF 90%)',
                   color: '#fff',
                   boxShadow: '0 4px 15px rgba(1, 186, 239, 0.4)',
                   transition: 'all 0.3s ease',
                   '&:hover': {
                      background: 'linear-gradient(45deg, #093E55 30%, #019DCA 90%)',
                      transform: 'translateY(-2px)',
                      boxShadow: '0 6px 20px rgba(1, 186, 239, 0.6)',
                   }
                }}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Sign In'}
              </Button>
            </form>
          </Box>
        </CardContent>
      </Card>
    </Box>
  );
};

export default Login;

