import React, { useState, useEffect, useMemo } from 'react';
import { 
  AppBar, Toolbar, Typography, Box, Menu, MenuItem, Button, IconButton, Chip, Tooltip, 
  Dialog, DialogTitle, DialogContent, DialogActions, TextField, InputAdornment, 
  List, ListItem, ListItemButton, ListItemText, ListItemIcon, Divider, Paper, useTheme, useMediaQuery 
} from '@mui/material';
import { 
  AccountCircle, Menu as MenuIcon, LocationOn, DarkMode, LightMode, 
  Search as SearchIcon, Business as BusinessIcon, Person as PersonIcon, 
  CheckCircle as CheckCircleIcon, ArrowForwardIos as ArrowForwardIosIcon, Close as CloseIcon 
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import useThemeStore from '../store/themeStore';
import { useNavigate } from 'react-router-dom';
import axios from '../services/api';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

const Header = ({ onDrawerToggle }) => {
  const { user, logout, updateLocation, selectedLocation } = useAuthStore();
  const { mode, toggleTheme } = useThemeStore();
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const navigate = useNavigate();

  const [profileAnchorEl, setProfileAnchorEl] = useState(null);
  const [locations, setLocations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  
  // Super Admin State -> Site selection modal
  const [siteDialogOpen, setSiteDialogOpen] = useState(false);
  const [stateSearch, setStateSearch] = useState('');
  const [selectedStateTab, setSelectedStateTab] = useState('Madhya Pradesh');

  useEffect(() => {
    if (user) {
      axios.get('/api/v1/locations')
        .then(res => {
          setLocations(res.data);
          if (!selectedLocation && res.data.length > 0) {
            updateLocation(res.data[0]);
          }
        })
        .catch(err => console.error("Error fetching locations", err));

      if (user.role === 'SUPER_ADMIN') {
        axios.get('/api/v1/users')
          .then(res => setAllUsers(res.data))
          .catch(err => console.error("Error fetching users for header", err));
      }
    }
  }, [user]);

  const handleProfileMenu = (event) => {
    setProfileAnchorEl(event.currentTarget);
  };

  const handleProfileClose = () => {
    setProfileAnchorEl(null);
  };

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleOpenSiteDialog = () => {
    if (user?.role === 'SUPER_ADMIN') {
      const curState = selectedLocation?.stateName || selectedLocation?.name || 'Madhya Pradesh';
      setSelectedStateTab(curState);
      setStateSearch('');
      setSiteDialogOpen(true);
    }
  };

  const handleSelectSite = (loc) => {
    updateLocation(loc);
    setSiteDialogOpen(false);
  };

  // Group locations by State
  const stateSitesMap = useMemo(() => {
    const map = {};
    INDIAN_STATES.forEach(st => {
      map[st] = [];
    });

    locations.forEach(loc => {
      const stateName = loc.stateName || loc.name;
      const matchedState = INDIAN_STATES.find(s => s.toLowerCase() === (stateName || '').toLowerCase()) || stateName;
      if (!map[matchedState]) {
        map[matchedState] = [];
      }
      map[matchedState].push(loc);
    });

    return map;
  }, [locations]);

  // Map users to sites for displaying Store Incharge details
  const usersBySiteId = useMemo(() => {
    const map = {};
    allUsers.forEach(u => {
      if (u.locationId) {
        if (!map[u.locationId]) map[u.locationId] = [];
        map[u.locationId].push(u);
      }
    });
    return map;
  }, [allUsers]);

  // Filtered states list for search
  const filteredStates = useMemo(() => {
    const q = (stateSearch || '').trim().toLowerCase();
    if (!q) return INDIAN_STATES;
    return INDIAN_STATES.filter(st => {
      if (st.toLowerCase().includes(q)) return true;
      const sites = stateSitesMap[st] || [];
      return sites.some(s => (s.siteName || s.name || '').toLowerCase().includes(q));
    });
  }, [stateSearch, stateSitesMap]);

  // Active state & site display name for header chip
  const headerLocationLabel = useMemo(() => {
    const sName = selectedLocation?.siteName || user?.siteName || 'Main Site';
    const stName = selectedLocation?.stateName || selectedLocation?.name || user?.stateName || user?.location || 'State';
    if (isMobile) {
      return `${stName} • ${sName}`;
    }
    return `STATE: ${stName} | SITE: ${sName}`;
  }, [selectedLocation, user, isMobile]);

  return (
    <AppBar position="fixed" sx={{ 
      zIndex: (theme) => theme.zIndex.drawer + 1, 
      backgroundColor: mode === 'dark' ? '#1E293B' : '#ffffff', 
      color: 'text.primary', 
      borderBottom: mode === 'dark' ? '1px solid #334155' : '1px solid #E2E8F0',
      boxShadow: mode === 'dark' ? '0 2px 10px rgba(0,0,0,0.4)' : '0 2px 10px rgba(0,0,0,0.05)' 
    }}>
      <Toolbar>
        <IconButton
          color="inherit"
          aria-label="open drawer"
          edge="start"
          onClick={onDrawerToggle}
          sx={{ mr: 1, display: { sm: 'none' } }}
        >
          <MenuIcon />
        </IconButton>
        <Typography variant="h6" component="div" sx={{ flexGrow: 1, fontWeight: 'bold', fontSize: { xs: '1rem', sm: '1.25rem' } }}>
          <Box component="span" sx={{ display: { xs: 'none', sm: 'inline' } }}>Inventory Management</Box>
          <Box component="span" sx={{ display: { xs: 'inline', sm: 'none' } }}>Finsen</Box>
        </Typography>
        
        {user && (
          <Box sx={{ display: 'flex', alignItems: 'center', gap: { xs: 0.5, sm: 1.5 } }}>
            {/* Theme Toggle Button */}
            <Tooltip title={mode === 'dark' ? "Switch to Light Mode" : "Switch to Dark Mode"}>
              <IconButton onClick={toggleTheme} color="inherit" size="small" sx={{ p: 1, borderRadius: 2 }}>
                {mode === 'dark' ? <LightMode sx={{ color: '#FACC15' }} /> : <DarkMode sx={{ color: '#1E293B' }} />}
              </IconButton>
            </Tooltip>

            {/* Prominent State & Site Badge */}
            <Tooltip title={user.role === 'SUPER_ADMIN' ? "Click to Switch State & Site" : "Assigned Work Location & Site"}>
              <Chip
                icon={<LocationOn sx={{ color: '#0284c7 !important' }} />}
                label={headerLocationLabel}
                onClick={handleOpenSiteDialog}
                sx={{
                  fontWeight: 'bold',
                  fontSize: { xs: '0.72rem', sm: '0.85rem' },
                  backgroundColor: mode === 'dark' ? '#0369a1' : '#e0f2fe',
                  color: mode === 'dark' ? '#f0f9ff' : '#0369a1',
                  border: '1.5px solid #0284c7',
                  px: 0.5,
                  py: 0.2,
                  cursor: user.role === 'SUPER_ADMIN' ? 'pointer' : 'default',
                  '&:hover': user.role === 'SUPER_ADMIN' ? { backgroundColor: mode === 'dark' ? '#0284c7' : '#bae6fd' } : {},
                  '& .MuiChip-label': { px: 1 }
                }}
              />
            </Tooltip>
            
            {/* User Profile */}
            <Box>
              <Button onClick={handleProfileMenu} color="inherit" sx={{ minWidth: 'auto', p: { xs: 0.5, sm: 1 }, textTransform: 'none' }}>
                <AccountCircle sx={{ mr: 0.5, color: mode === 'dark' ? '#38BDF8' : '#1e293b' }} />
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
                anchorEl={profileAnchorEl}
                anchorOrigin={{ vertical: 'bottom', horizontal: 'right' }}
                keepMounted
                transformOrigin={{ vertical: 'top', horizontal: 'right' }}
                open={Boolean(profileAnchorEl)}
                onClose={handleProfileClose}
              >
                {user.role === 'SUPER_ADMIN' && (
                  <MenuItem onClick={() => { handleProfileClose(); handleOpenSiteDialog(); }} sx={{ fontWeight: 'bold', color: 'primary.main' }}>
                    🏢 Switch State & Site
                  </MenuItem>
                )}
                <MenuItem onClick={handleLogout} sx={{ color: 'error.main' }}>
                  Logout
                </MenuItem>
              </Menu>
            </Box>
          </Box>
        )}
      </Toolbar>

      {/* Super Admin 2-Level State -> Site Selector Dialog */}
      {user?.role === 'SUPER_ADMIN' && (
        <Dialog 
          open={siteDialogOpen} 
          onClose={() => setSiteDialogOpen(false)} 
          maxWidth="md" 
          fullWidth
          PaperProps={{
            sx: { borderRadius: 3, maxHeight: '85vh' }
          }}
        >
          <DialogTitle sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1 }}>
            <Box>
              <Typography variant="h6" fontWeight="bold">Select Location State & Site</Typography>
              <Typography variant="caption" color="text.secondary">
                Select a State to view its sites, then click a Site to view and manage its data.
              </Typography>
            </Box>
            <IconButton onClick={() => setSiteDialogOpen(false)} size="small">
              <CloseIcon />
            </IconButton>
          </DialogTitle>
          <Divider />

          <DialogContent sx={{ p: 2, display: 'flex', flexDirection: 'column', gap: 2 }}>
            {/* Search Input */}
            <TextField 
              size="small"
              placeholder="Search State or Site Name..."
              value={stateSearch}
              onChange={(e) => setStateSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" />
                  </InputAdornment>
                )
              }}
              fullWidth
            />

            {/* Two-Level Selector Layout */}
            <Box sx={{ display: 'flex', flexDirection: { xs: 'column', md: 'row' }, gap: 2, minHeight: '380px' }}>
              {/* Level 1: States List */}
              <Paper 
                variant="outlined" 
                sx={{ 
                  width: { xs: '100%', md: '45%' }, 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  borderRadius: 2,
                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0'
                }}
              >
                <List dense disablePadding>
                  {filteredStates.map((st) => {
                    const isSelected = selectedStateTab === st;
                    const sites = stateSitesMap[st] || [];
                    return (
                      <ListItem key={st} disablePadding divider>
                        <ListItemButton
                          selected={isSelected}
                          onClick={() => setSelectedStateTab(st)}
                          sx={{
                            py: 1.2,
                            px: 2,
                            '&.Mui-selected': {
                              backgroundColor: mode === 'dark' ? '#0369a1' : '#e0f2fe',
                              '&:hover': { backgroundColor: mode === 'dark' ? '#0284c7' : '#bae6fd' }
                            }
                          }}
                        >
                          <ListItemText 
                            primary={<Typography variant="body2" fontWeight={isSelected ? 'bold' : 'medium'}>{st}</Typography>} 
                          />
                          {sites.length > 0 ? (
                            <Chip 
                              label={`${sites.length} Site${sites.length > 1 ? 's' : ''}`} 
                              size="small" 
                              color={isSelected ? 'primary' : 'default'}
                              sx={{ fontSize: '0.7rem', height: 20, mr: 1 }}
                            />
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ mr: 1 }}>0 Sites</Typography>
                          )}
                          <ArrowForwardIosIcon sx={{ fontSize: '0.75rem', color: isSelected ? 'primary.main' : '#94a3b8' }} />
                        </ListItemButton>
                      </ListItem>
                    );
                  })}
                </List>
              </Paper>

              {/* Level 2: Sites under Selected State */}
              <Paper 
                variant="outlined" 
                sx={{ 
                  flexGrow: 1, 
                  p: 2, 
                  maxHeight: '400px', 
                  overflowY: 'auto', 
                  borderRadius: 2,
                  display: 'flex',
                  flexDirection: 'column',
                  gap: 1.5,
                  borderColor: mode === 'dark' ? '#334155' : '#e2e8f0',
                  backgroundColor: mode === 'dark' ? 'rgba(30, 41, 59, 0.4)' : '#f8fafc'
                }}
              >
                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pb: 1, borderBottom: '1px solid #cbd5e1' }}>
                  <Typography variant="subtitle2" fontWeight="bold" color="primary.main">
                    🏢 Sites in {selectedStateTab}:
                  </Typography>
                  <Typography variant="caption" color="text.secondary">
                    {(stateSitesMap[selectedStateTab] || []).length} available
                  </Typography>
                </Box>

                {(!stateSitesMap[selectedStateTab] || stateSitesMap[selectedStateTab].length === 0) ? (
                  <Box sx={{ p: 4, textAlign: 'center' }}>
                    <BusinessIcon sx={{ fontSize: 40, color: '#94a3b8', mb: 1 }} />
                    <Typography variant="body2" color="text.secondary">
                      No custom sites registered under {selectedStateTab} yet.
                    </Typography>
                    <Typography variant="caption" color="text.secondary" display="block" sx={{ mt: 0.5 }}>
                      Go to User Management to create a Store Incharge for a new Site under this State.
                    </Typography>
                  </Box>
                ) : (
                  stateSitesMap[selectedStateTab].map((siteLoc) => {
                    const isCurrent = selectedLocation?.id === siteLoc.id;
                    const assignedUsers = usersBySiteId[siteLoc.id] || [];
                    const siteTitle = siteLoc.siteName || siteLoc.name || 'Main Site';

                    return (
                      <Paper
                        key={siteLoc.id}
                        elevation={isCurrent ? 2 : 0}
                        onClick={() => handleSelectSite(siteLoc)}
                        sx={{
                          p: 1.5,
                          borderRadius: 2,
                          cursor: 'pointer',
                          border: isCurrent ? '2px solid #0284c7' : '1px solid #cbd5e1',
                          backgroundColor: isCurrent ? (mode === 'dark' ? '#0f172a' : '#ffffff') : (mode === 'dark' ? '#1e293b' : '#ffffff'),
                          transition: 'all 0.2s',
                          '&:hover': {
                            borderColor: '#0284c7',
                            transform: 'translateY(-1px)',
                            boxShadow: '0 4px 12px rgba(2, 132, 199, 0.15)'
                          }
                        }}
                      >
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 0.5 }}>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <BusinessIcon sx={{ color: isCurrent ? '#0284c7' : '#64748b', fontSize: '1.25rem' }} />
                            <Typography variant="subtitle2" fontWeight="bold">
                              {siteTitle}
                            </Typography>
                          </Box>
                          {isCurrent && (
                            <Chip 
                              icon={<CheckCircleIcon sx={{ fontSize: '0.85rem !important', color: '#16a34a !important' }} />}
                              label="ACTIVE SITE" 
                              size="small" 
                              sx={{ fontWeight: 'bold', fontSize: '0.65rem', backgroundColor: '#dcfce7', color: '#166534', height: 22 }}
                            />
                          )}
                        </Box>

                        <Box sx={{ pl: 3.5 }}>
                          {assignedUsers.length > 0 ? (
                            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.3, mt: 0.5 }}>
                              {assignedUsers.map(u => (
                                <Typography key={u.id} variant="caption" sx={{ display: 'flex', alignItems: 'center', gap: 0.5, color: '#475569' }}>
                                  <PersonIcon sx={{ fontSize: '0.85rem', color: '#64748b' }} />
                                  <Box component="span" fontWeight="bold">{u.fullName || u.userId}</Box> 
                                  <Box component="span" color="text.secondary">({u.role === 'STORE_INCHARGE' ? 'Incharge' : 'Viewer'})</Box>
                                </Typography>
                              ))}
                            </Box>
                          ) : (
                            <Typography variant="caption" color="text.secondary" sx={{ fontStyle: 'italic' }}>
                              Default State Location
                            </Typography>
                          )}
                        </Box>
                      </Paper>
                    );
                  })
                )}
              </Paper>
            </Box>
          </DialogContent>

          <DialogActions sx={{ px: 2, py: 1.5, borderTop: '1px solid #e2e8f0' }}>
            <Button onClick={() => setSiteDialogOpen(false)} variant="outlined">Close</Button>
          </DialogActions>
        </Dialog>
      )}
    </AppBar>
  );
};

export default Header;
