import React, { useState, useEffect } from 'react';
import { Box, Card, CardContent, Typography, TextField, Button, CircularProgress, Alert, MenuItem, Select, FormControl, InputLabel, Autocomplete } from '@mui/material';
import { keyframes } from '@emotion/react';
import useAuthStore from '../store/authStore';
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
        setError('Unable to connect to backend server. Please make sure spring-backend is running on http://localhost:8080');
      } else {
        setError('Login failed. Invalid User ID or Password.');
      }
    } finally {
      setLoading(false);
    }
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
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(16px)',
          borderRadius: 6,
          boxShadow: '0 12px 40px rgba(0, 0, 0, 0.25)',
          border: '1px solid rgba(255, 255, 255, 0.3)',
          animation: `${fadeIn} 0.8s ease-out forwards`,
          overflow: 'hidden'
        }}
      >
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
                 animation: `${pulseLogo} 3s ease-in-out infinite`
               }}
            >
               <img src="/logo.svg" alt="Finsen Ritter Logo" style={{ width: '70px', height: '70px' }} />
            </Box>
            
            <Typography variant="h4" align="center" color="primary" sx={{ fontWeight: 800, letterSpacing: '0.5px' }}>
              Finsen Ritter Limited
            </Typography>
            <Typography variant="subtitle1" align="center" color="text.secondary" sx={{ fontWeight: 600, mb: 1, letterSpacing: '1px', textTransform: 'uppercase' }}>
              Indore
            </Typography>
            
            <Typography variant="body2" align="center" color="text.secondary" sx={{ opacity: 0.8 }}>
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                      sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
                    />
                  )}
                />
              </FormControl>

              <FormControl fullWidth margin="normal">
                <InputLabel>Login Type</InputLabel>
                <Select
                  value={loginType}
                  label="Login Type"
                  onChange={handleLoginTypeChange}
                  sx={{ borderRadius: 2 }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
                sx={{ '& .MuiOutlinedInput-root': { borderRadius: 2 } }}
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
