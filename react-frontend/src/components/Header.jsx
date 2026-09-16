import React, { useState, useEffect } from 'react';
import { AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button, IconButton, Chip } from '@mui/material';
import { AccountCircle, Menu as MenuIcon, LocationOn } from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

const Header = ({ onDrawerToggle }) => {
  const { user, logout, updateLocation, selectedLocation } = useAuthStore();
  const navigate = useNavigate();
  const [anchorEl, setAnchorEl] = useState(null);
  const [locations, setLocations] = useState([]);

  useEffect(() => {
    if (user) {
      axios.get('/api/v1/locations')
        .then(res => {
          setLocations(res.data);
          // Auto-select first location if none selected
          if (!selectedLocation && res.data.length > 0) {
            updateLocation(res.data[0]);
          }
        })
        .catch(err => console.error("Error fetching locations", err));
    }
  }, [user, selectedLocation, updateLocation]);

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleLocationChange = (loc) => {
    updateLocation(loc);
    handleClose();
  };

  return (
    <AppBar position="fixed" sx={{ 
      zIndex: (theme) => theme.zIndex.drawer + 1, 
      backgroundColor: 'white', 
      color: 'text.primary', 
      boxShadow: '0 2px 10px rgba(0,0,0,0.05)' 
    }}>
      <Toolbar>

        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Inventory Management</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Finsen</Box>
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 2 } }}>
            {/* Prominent State Location Badge visible on ALL devices */}
            <Chip
              icon={<LocationOn sx={{ color: '#0284c7 !important' }} />}
              label={`SITE: ${selectedLocation?.name || user.location || 'Rajasthan'}`}
              onClick={user.role === 'SUPER_ADMIN' ? handleMenu : undefined}
              sx={{
                fontWeight: 'bold',
                fontSize: { xs: '0.75rem', sm: '0.85rem' },
                backgroundColor: '#e0f2fe',
                color: '#0369a1',
                border: '1.5px solid #0284c7',
                px: 0.5,
                py: 0.2,
                cursor: user.role === 'SUPER_ADMIN' ? 'pointer' : 'default',
                '& .MuiChip-label': { px: 1 }
              }}
            />
            
            <Box>
              <Button onClick={handleMenu} color="inherit" sx={{ minWidth: 'auto', p: { xs: 0.5, sm: 1 }, textTransform: 'none' }}>
                <AccountCircle sx={{ mr: 0.5, color: '#1e293b' }} />
                <Box sx={{ textAlign: 'left' }}>
                  <Typography variant="body2" sx={{ fontWeight: 'bold', fontSize: { xs: '0.75rem', sm: '0.875rem' }, lineHeight: 1.2 }}>
                    {user.name || user.fullName || user.user_id || 'User'}
                  </Typography>
                  <Typography variant="caption" sx={{ color: 'primary.main', fontWeight: 'bold', fontSize: { xs: '0.65rem', sm: '0.75rem' }, display: 'block' }}>
                    {user.role === 'SUPER_ADMIN' ? 'Super Admin' : (user.role === 'STORE_INCHARGE' ? 'Store Incharge' : (user.role === 'STORE_USER' ? 'Store User' : 'Admin'))}
                  </Typography>
                </Box>
              </Button>
              <Menu
                id="menu-appbar"
                anchorEl={anchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(anchorEl)}
                onClose={handleClose}
              >
                {user.role === 'SUPER_ADMIN' && (
                  <>
                    <MenuItem disabled sx={{ opacity: '1 !important', fontWeight: 'bold', color: 'primary.main' }}>
                      Change Active State Site
                    </MenuItem>
                    {locations.map((loc) => (
                      <MenuItem key={loc.id} onClick={() => handleLocationChange(loc)} selected={selectedLocation?.id === loc.id}>
                        {loc.name}
                      </MenuItem>
                    ))}
                  </>
                )}
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main', mt: 1, borderTop: '1px solid #eee' }}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        )}
      </Toolbar>
    </AppBar>
  );
};

export default Header;

