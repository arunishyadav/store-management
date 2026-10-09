import React, { useState, useEffect, useMemo } from 'react';
import { 
  Box, Typography, Button, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, 
  DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Card, 
  CardContent, Chip, useMediaQuery, useTheme, Autocomplete, Tabs, Tab, Tooltip, IconButton
} from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { 
  Person as PersonIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Lock as LockIcon, 
  Email as EmailIcon, LocationOn as LocationIcon, Business as BusinessIcon, Send as SendIcon,
  CheckCircle as CheckCircleIcon, Warning as WarningIcon, Domain as DomainIcon
} from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import api from '../services/api';

const INDIAN_STATES = [
  "Andhra Pradesh", "Arunachal Pradesh", "Assam", "Bihar", "Chhattisgarh", "Goa", "Gujarat", "Haryana", 
  "Himachal Pradesh", "Jharkhand", "Karnataka", "Kerala", "Madhya Pradesh", "Maharashtra", "Manipur", 
  "Meghalaya", "Mizoram", "Nagaland", "Odisha", "Punjab", "Rajasthan", "Sikkim", "Tamil Nadu", "Telangana", 
  "Tripura", "Uttar Pradesh", "Uttarakhand", "West Bengal"
];

export default function UserManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(0); // 0: Users List, 1: Sites Capacity Overview
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  const [openTestEmailDialog, setOpenTestEmailDialog] = useState(false);
  const [testEmailAddress, setTestEmailAddress] = useState('');
  const [testEmailLoading, setTestEmailLoading] = useState(false);
  const [testEmailStatus, setTestEmailStatus] = useState(null);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // New/Edit user form state
  const [userForm, setUserForm] = useState({ 
    userId: '', 
    email: '', 
    password: '', 
    fullName: '', 
    role: 'STORE_INCHARGE', 
    locationId: '', 
    stateName: 'Madhya Pradesh', 
    siteName: 'Main Site', 
    active: true 
  });
  const [error, setError] = useState('');
  const [dialogError, setDialogError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');

  const currentLocation = useAuthStore(state => state.selectedLocation);
  const currentUser = useAuthStore(state => state.user);

  useEffect(() => {
    fetchData();
    api.get('/api/v1/locations').then(res => setLocations(res.data)).catch(err => console.error("Error fetching locations:", err));
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const userRes = await api.get(`/api/v1/users`);
      setUsers(userRes.data);
    } catch (err) {
      console.error(err);
      setError('Failed to fetch data');
    }
    setLoading(false);
  };

  const handleOpenDialog = (user = null) => {
    setDialogError('');
    if (user) {
      setIsEditing(true);
      setSelectedUser(user);
      setUserForm({
        userId: user.userId,
        password: user.password || '',
        email: user.email || '',
        fullName: user.fullName || '',
        role: user.role,
        locationId: user.locationId || '',
        stateName: user.stateName || user.locationName || 'Madhya Pradesh',
        siteName: user.siteName || 'Main Site',
        active: user.active
      });
    } else {
      setIsEditing(false);
      setSelectedUser(null);
      const curState = currentLocation?.stateName || currentLocation?.name || 'Madhya Pradesh';
      const curSite = currentLocation?.siteName || 'Main Site';
      setUserForm({ 
        userId: '', 
        email: '', 
        password: '', 
        fullName: '', 
        role: 'STORE_INCHARGE', 
        locationId: currentLocation?.id || '', 
        stateName: curState, 
        siteName: curSite, 
        active: true 
      });
    }
    setOpenUserDialog(true);
  };

  const existingSitesForState = useMemo(() => {
    if (!userForm.stateName) return ['Main Site'];
    const siteSet = new Set(['Main Site']);
    locations.forEach(loc => {
      const s = loc.stateName || loc.name;
      if (s && s.toLowerCase() === userForm.stateName.toLowerCase()) {
        if (loc.siteName && loc.siteName.trim()) siteSet.add(loc.siteName.trim());
      }
    });
    users.forEach(u => {
      const s = u.stateName || u.locationName;
      if (s && s.toLowerCase() === userForm.stateName.toLowerCase()) {
        if (u.siteName && u.siteName.trim()) siteSet.add(u.siteName.trim());
      }
    });
    return Array.from(siteSet);
  }, [locations, users, userForm.stateName]);

  // Real-time capacity conflict check (1 Store Incharge & 1 Viewer per Site)
  const siteConflict = useMemo(() => {
    if (userForm.role === 'SUPER_ADMIN') return null;
    if (userForm.active === false) return null; // Inactive users don't conflict

    const curState = (userForm.stateName || '').trim().toLowerCase();
    const curSite = (userForm.siteName || '').trim().toLowerCase();
    if (!curState || !curSite) return null;

    if (userForm.role === 'STORE_INCHARGE') {
      const existing = users.find(u => 
        u.active && 
        u.id !== selectedUser?.id && 
        u.role === 'STORE_INCHARGE' && 
        (u.stateName || u.locationName || '').trim().toLowerCase() === curState && 
        (u.siteName || 'Main Site').trim().toLowerCase() === curSite
      );
      if (existing) {
        return {
          type: 'STORE_INCHARGE',
          user: existing,
          message: `Site "${userForm.siteName}" already has an active Store Incharge: "${existing.fullName}" (User ID: ${existing.userId}). Exactly 1 Store Incharge is allowed per site.`
        };
      }
    }

    if (userForm.role === 'USER') {
      const existing = users.find(u => 
        u.active && 
        u.id !== selectedUser?.id && 
        u.role === 'USER' && 
        (u.stateName || u.locationName || '').trim().toLowerCase() === curState && 
        (u.siteName || 'Main Site').trim().toLowerCase() === curSite
      );
      if (existing) {
        return {
          type: 'USER',
          user: existing,
          message: `Site "${userForm.siteName}" already has an active Viewer: "${existing.fullName}" (User ID: ${existing.userId}). Exactly 1 Viewer is allowed per site.`
        };
      }
    }

    return null;
  }, [userForm.role, userForm.stateName, userForm.siteName, userForm.active, users, selectedUser]);

  // Site Capacity Overview Map
  const siteSummaries = useMemo(() => {
    const siteMap = new Map();
    locations.forEach(loc => {
      const state = loc.stateName || loc.name;
      const site = loc.siteName || 'Main Site';
      const key = `${state}:::${site}`;
      if (!siteMap.has(key)) {
        siteMap.set(key, { state, site, incharge: null, viewer: null });
      }
    });

    users.forEach(u => {
      if (!u.active || u.role === 'SUPER_ADMIN') return;
      const state = u.stateName || u.locationName || 'Unknown';
      const site = u.siteName || 'Main Site';
      const key = `${state}:::${site}`;
      if (!siteMap.has(key)) {
        siteMap.set(key, { state, site, incharge: null, viewer: null });
      }
      const entry = siteMap.get(key);
      if (u.role === 'STORE_INCHARGE') entry.incharge = u;
      if (u.role === 'USER') entry.viewer = u;
    });

    return Array.from(siteMap.values()).sort((a, b) => a.state.localeCompare(b.state) || a.site.localeCompare(b.site));
  }, [locations, users]);

  const handleSaveUser = async () => {
    setDialogError('');
    setError('');
    try {
      if (isEditing) {
        await api.put(`/api/v1/users/${selectedUser.id}`, userForm);
      } else {
        await api.post('/api/v1/users', userForm);
      }
      setOpenUserDialog(false);
      setSuccessMessage(`User "${userForm.userId}" ${isEditing ? 'updated' : 'created'} successfully! ${userForm.email ? `Login details emailed to ${userForm.email}.` : ''}`);
      setTimeout(() => setSuccessMessage(''), 8000);
      fetchData();
      api.get('/api/v1/locations').then(res => setLocations(res.data)).catch(console.error);
    } catch (err) {
      setDialogError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.userId}" (${user.fullName || 'User'})?`)) {
      try {
        await api.delete(`/api/v1/users/${user.id}`);
        setSuccessMessage(`User "${user.userId}" deleted successfully.`);
        setTimeout(() => setSuccessMessage(''), 5000);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const handleSendTestEmail = async () => {
    if (!testEmailAddress || !testEmailAddress.includes('@')) {
      setTestEmailStatus({ success: false, message: 'Please enter a valid email address.' });
      return;
    }
    setTestEmailLoading(true);
    setTestEmailStatus(null);
    try {
      const res = await api.post('/api/v1/users/test-email', { email: testEmailAddress });
      setTestEmailStatus({ success: true, message: res.data.message || 'Email sent successfully!' });
    } catch (err) {
      setTestEmailStatus({ 
        success: false, 
        message: err.response?.data?.message || 'Failed to send test email. Please verify SMTP host and credentials in server settings.' 
      });
    } finally {
      setTestEmailLoading(false);
    }
  };

  const columns = [
    { field: 'userId', headerName: 'User ID', width: 140 },
    { field: 'fullName', headerName: 'Full Name', width: 140 },
    { field: 'email', headerName: 'Email Address', width: 180 },
    { field: 'password', headerName: 'Password', width: 120 },
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 200, 
      renderCell: (params) => {
        if (params.value === 'USER') return <Chip label="Viewer (Only View)" size="small" variant="outlined" color="primary" />;
        if (params.value === 'STORE_INCHARGE') return <Chip label="Store Incharge (Add/Edit)" size="small" color="success" />;
        if (params.value === 'SUPER_ADMIN') return <Chip label="Super Admin (Full)" size="small" color="secondary" />;
        return params.value;
      }
    },
    { 
      field: 'stateName', 
      headerName: 'Assigned State', 
      width: 150,
      renderCell: (params) => params.row.stateName || params.row.locationName || 'All States'
    },
    { 
      field: 'siteName', 
      headerName: 'Site Name', 
      width: 170,
      renderCell: (params) => (
        <Chip 
          label={params.row.siteName || (params.row.role === 'SUPER_ADMIN' ? 'All Sites' : 'Main Site')} 
          size="small" 
          color="info" 
          variant="outlined" 
          sx={{ fontWeight: 'bold' }} 
        />
      )
    },
    { 
      field: 'active', 
      headerName: 'Status', 
      width: 100, 
      renderCell: (params) => (
        <Chip 
          label={params.value ? 'Active' : 'Inactive'} 
          size="small" 
          color={params.value ? 'success' : 'error'} 
          variant="outlined" 
        />
      )
    },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 160,
      renderCell: (params) => (
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, height: '100%' }}>
          <Button 
            size="small" 
            variant="outlined" 
            startIcon={<EditIcon fontSize="small" />}
            onClick={() => handleOpenDialog(params.row)}
            sx={{ py: 0.2, px: 1, minWidth: 'auto', fontWeight: 'bold' }}
          >
            Edit
          </Button>

          <Button 
            size="small" 
            variant="outlined" 
            color="error"
            startIcon={<DeleteIcon fontSize="small" />}
            onClick={() => handleDeleteUser(params.row)}
            sx={{ py: 0.2, px: 1, minWidth: 'auto', fontWeight: 'bold' }}
          >
            Delete
          </Button>
        </Box>
      )
    }
  ];

  if (currentUser?.role !== 'SUPER_ADMIN') {
    return <Typography color="error" variant="h6">Access Denied: Super Admin only.</Typography>;
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
      {/* Top Header */}
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, mb: 2, gap: 1.5 }}>
        <Box>
          <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.75rem' }, color: '#0f172a' }}>
            User Management & Sites
          </Typography>
          <Typography variant="caption" sx={{ color: '#64748b' }}>
            Multi-Site Architecture • Rule: Exactly 1 Store Incharge & 1 Viewer per Site
          </Typography>
        </Box>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button 
            variant="outlined" 
            color="info" 
            startIcon={<EmailIcon />}
            onClick={() => {
              setTestEmailAddress(currentUser?.email || '');
              setTestEmailStatus(null);
              setOpenTestEmailDialog(true);
            }}
            sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.875rem' } }}
          >
            Test Email
          </Button>
          <Button 
            variant="contained" 
            color="primary" 
            onClick={() => handleOpenDialog()} 
            sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
          >
            + Add User
          </Button>
        </Box>
      </Box>

      {successMessage && <Alert severity="success" sx={{ mb: 2, borderRadius: 2 }}>{successMessage}</Alert>}
      {error && <Alert severity="error" sx={{ mb: 2, borderRadius: 2 }}>{error}</Alert>}

      {/* Tabs: Users List vs Sites Capacity Overview */}
      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2 }}>
        <Tabs value={activeTab} onChange={(e, val) => setActiveTab(val)}>
          <Tab label={`All Users (${users.length})`} sx={{ fontWeight: 'bold' }} />
          <Tab label={`Site Capacity & Slots (${siteSummaries.length} Sites)`} sx={{ fontWeight: 'bold' }} />
        </Tabs>
      </Box>

      {/* Tab 0: Users Table / Cards */}
      {activeTab === 0 && (
        <Paper sx={{ width: '100%', flexGrow: 1, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: isMobile ? 1.5 : 0, backgroundColor: isMobile ? 'transparent' : '#fff', boxShadow: isMobile ? 'none' : 1 }}>
          {loading ? (
            <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>
          ) : isMobile ? (
            /* Mobile View */
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, pb: 4 }}>
              {users.map((u) => (
                <Card key={u.id} variant="outlined" sx={{ borderRadius: 2.5, boxShadow: '0 2px 8px rgba(0,0,0,0.04)', borderColor: '#e2e8f0' }}>
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <PersonIcon sx={{ color: 'primary.main', fontSize: '1.5rem' }} />
                        <Box>
                          <Typography variant="subtitle1" sx={{ fontWeight: 'bold', lineHeight: 1.2, color: '#0f172a' }}>
                            {u.fullName || 'User'}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'medium' }}>
                            ID: {u.userId}
                          </Typography>
                        </Box>
                      </Box>
                      <Chip 
                        label={u.role === 'SUPER_ADMIN' ? 'Super Admin' : (u.role === 'STORE_INCHARGE' ? 'Store Incharge' : 'Viewer')} 
                        color={u.role === 'SUPER_ADMIN' ? 'secondary' : (u.role === 'STORE_INCHARGE' ? 'success' : 'primary')}
                        size="small"
                        sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                      />
                    </Box>

                    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1.5, background: '#f8fafc', p: 1.2, borderRadius: 2 }}>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LocationIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                        <Typography variant="body2" sx={{ color: '#334155' }}>
                          State: <strong>{u.stateName || u.locationName || 'All States'}</strong>
                        </Typography>
                      </Box>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <BusinessIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                        <Typography variant="body2" sx={{ color: '#334155' }}>
                          Site: <strong>{u.siteName || (u.role === 'SUPER_ADMIN' ? 'All Sites' : 'Main Site')}</strong>
                        </Typography>
                      </Box>
                      {u.email && (
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <EmailIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                          <Typography variant="body2" sx={{ color: '#334155' }}>
                            Email: {u.email}
                          </Typography>
                        </Box>
                      )}
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                        <LockIcon sx={{ fontSize: '0.9rem', color: '#64748b' }} />
                        <Typography variant="body2" sx={{ color: '#334155' }}>
                          Password: <strong>{u.password || '••••••••'}</strong>
                        </Typography>
                      </Box>
                    </Box>

                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', pt: 1, borderTop: '1px solid #f1f5f9' }}>
                      <Chip 
                        label={u.active ? 'Active' : 'Inactive'} 
                        color={u.active ? 'success' : 'error'} 
                        variant="outlined" 
                        size="small" 
                      />
                      <Box sx={{ display: 'flex', gap: 1 }}>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          startIcon={<EditIcon />} 
                          onClick={() => handleOpenDialog(u)}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Edit
                        </Button>
                        <Button 
                          size="small" 
                          variant="outlined" 
                          color="error" 
                          startIcon={<DeleteIcon />} 
                          onClick={() => handleDeleteUser(u)}
                          sx={{ fontWeight: 'bold' }}
                        >
                          Delete
                        </Button>
                      </Box>
                    </Box>
                  </CardContent>
                </Card>
              ))}
            </Box>
          ) : (
            <Box sx={{ flexGrow: 1, width: '100%' }}>
              <DataGrid rows={users} columns={columns} density="comfortable" sx={{ border: 'none' }} />
            </Box>
          )}
        </Paper>
      )}

      {/* Tab 1: Sites Capacity Overview */}
      {activeTab === 1 && (
        <Paper sx={{ p: 2, borderRadius: 3 }}>
          <Typography variant="subtitle1" fontWeight="bold" sx={{ mb: 1, color: '#0f172a' }}>
            Site Allocation Status (1 Store Incharge & 1 Viewer per Site)
          </Typography>
          <Typography variant="body2" sx={{ mb: 2, color: '#64748b' }}>
            Each site can have at most one Store Incharge (with add/edit entry permissions) and one Viewer (read-only).
          </Typography>

          <Box sx={{ display: 'grid', gridTemplateColumns: { xs: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }, gap: 2 }}>
            {siteSummaries.map((item, index) => (
              <Card key={index} variant="outlined" sx={{ borderRadius: 2, borderColor: '#e2e8f0', p: 1.5 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 1 }}>
                  <DomainIcon color="primary" />
                  <Box>
                    <Typography variant="subtitle2" fontWeight="bold" sx={{ color: '#0f172a' }}>
                      {item.site}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#64748b' }}>
                      State: {item.state}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, mt: 1 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', p: 1, borderRadius: 1.5 }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#475569' }}>
                      Store Incharge:
                    </Typography>
                    {item.incharge ? (
                      <Chip 
                        label={`${item.incharge.fullName} (${item.incharge.userId})`} 
                        color="success" 
                        size="small" 
                        sx={{ fontWeight: 'bold', maxWidth: 180 }} 
                      />
                    ) : (
                      <Chip label="Vacant (Available)" size="small" variant="outlined" color="default" />
                    )}
                  </Box>

                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#f8fafc', p: 1, borderRadius: 1.5 }}>
                    <Typography variant="caption" fontWeight="bold" sx={{ color: '#475569' }}>
                      Viewer (Only View):
                    </Typography>
                    {item.viewer ? (
                      <Chip 
                        label={`${item.viewer.fullName} (${item.viewer.userId})`} 
                        color="primary" 
                        size="small" 
                        sx={{ fontWeight: 'bold', maxWidth: 180 }} 
                      />
                    ) : (
                      <Chip label="Vacant (Available)" size="small" variant="outlined" color="default" />
                    )}
                  </Box>
                </Box>
              </Card>
            ))}
          </Box>
        </Paper>
      )}

      {/* Add / Edit User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)} maxWidth="sm" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold', pb: 1 }}>
          {isEditing ? `Edit User: ${userForm.userId}` : 'Add New User'}
        </DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          
          {dialogError && (
            <Alert severity="error" sx={{ borderRadius: 2 }}>
              {dialogError}
            </Alert>
          )}

          {siteConflict && (
            <Alert severity="warning" icon={<WarningIcon />} sx={{ borderRadius: 2 }}>
              {siteConflict.message}
            </Alert>
          )}

          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select 
              value={userForm.role} 
              label="Role" 
              onChange={(e) => setUserForm({...userForm, role: e.target.value})}
            >
              <MenuItem value="STORE_INCHARGE">Store Incharge (Add/Edit Entries)</MenuItem>
              <MenuItem value="USER">Viewer (Only View)</MenuItem>
              <MenuItem value="SUPER_ADMIN">Admin (Full Access)</MenuItem>
            </Select>
          </FormControl>
          
          {userForm.role !== 'SUPER_ADMIN' && (
            <>
              <FormControl fullWidth>
                <Autocomplete
                  options={INDIAN_STATES}
                  value={userForm.stateName || null}
                  onChange={(event, newValue) => {
                    setUserForm(prev => ({ ...prev, stateName: newValue || '' }));
                  }}
                  renderInput={(params) => <TextField {...params} label="Assigned State (Location)" required />}
                />
              </FormControl>

              <FormControl fullWidth>
                <Autocomplete
                  freeSolo
                  options={existingSitesForState}
                  value={userForm.siteName || ''}
                  onInputChange={(event, newInputValue) => {
                    setUserForm(prev => ({ ...prev, siteName: newInputValue }));
                  }}
                  onChange={(event, newValue) => {
                    setUserForm(prev => ({ ...prev, siteName: newValue || '' }));
                  }}
                  renderInput={(params) => (
                    <TextField 
                      {...params} 
                      label="Site Name" 
                      required 
                      placeholder="e.g. Indore Solar Plant, Jaipur Unit 1, Main Site"
                      helperText="Type any new Site Name or pick an existing site in this state"
                    />
                  )}
                />
              </FormControl>
            </>
          )}

          <TextField 
            label="User ID" 
            value={userForm.userId} 
            onChange={(e) => setUserForm({...userForm, userId: e.target.value})} 
            fullWidth 
            required 
            helperText="Exact User ID for logging in"
          />
          <TextField 
            label="Full Name" 
            value={userForm.fullName} 
            onChange={(e) => setUserForm({...userForm, fullName: e.target.value})} 
            fullWidth 
            required 
          />
          <TextField 
            label="Email Address (Login details will be sent here)" 
            type="email" 
            value={userForm.email} 
            onChange={(e) => setUserForm({...userForm, email: e.target.value})} 
            fullWidth 
            helperText="Complete login credentials and instructions will be emailed to this address"
          />
          <TextField 
            label={isEditing ? "Password (Leave blank to keep unchanged)" : "Password"} 
            type="text" 
            value={userForm.password} 
            onChange={(e) => setUserForm({...userForm, password: e.target.value})} 
            fullWidth 
            required={!isEditing}
          />
          {isEditing && (
             <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={userForm.active ? "true" : "false"} label="Status" onChange={(e) => setUserForm({...userForm, active: e.target.value === "true"})}>
                  <MenuItem value="true">Active</MenuItem>
                  <MenuItem value="false">Inactive</MenuItem>
                </Select>
             </FormControl>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, pt: 0 }}>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Tooltip title={siteConflict ? siteConflict.message : ''}>
            <span>
              <Button 
                variant="contained" 
                disabled={Boolean(siteConflict)} 
                onClick={handleSaveUser}
                sx={{ fontWeight: 'bold' }}
              >
                {isEditing ? 'Save Changes' : 'Create User'}
              </Button>
            </span>
          </Tooltip>
        </DialogActions>
      </Dialog>

      {/* Test Email Dialog */}
      <Dialog open={openTestEmailDialog} onClose={() => setOpenTestEmailDialog(false)} maxWidth="xs" fullWidth>
        <DialogTitle sx={{ fontWeight: 'bold' }}>Test Email Delivery</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1 }}>
          <Typography variant="body2" sx={{ color: '#475569' }}>
            Send a live test verification email to ensure the system is properly delivering credentials to inboxes.
          </Typography>
          <TextField 
            label="Recipient Email Address" 
            type="email" 
            value={testEmailAddress} 
            onChange={(e) => setTestEmailAddress(e.target.value)} 
            fullWidth 
            placeholder="e.g. yourname@gmail.com"
          />
          {testEmailStatus && (
            <Alert severity={testEmailStatus.success ? 'success' : 'error'} sx={{ borderRadius: 2 }}>
              {testEmailStatus.message}
            </Alert>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={() => setOpenTestEmailDialog(false)}>Close</Button>
          <Button 
            variant="contained" 
            onClick={handleSendTestEmail} 
            disabled={testEmailLoading}
            startIcon={testEmailLoading ? <CircularProgress size={16} /> : <SendIcon />}
            sx={{ fontWeight: 'bold' }}
          >
            {testEmailLoading ? 'Sending...' : 'Send Test'}
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
