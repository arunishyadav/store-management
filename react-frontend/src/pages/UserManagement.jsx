import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, FormControl, InputLabel, Select, MenuItem, Alert, Card, CardContent, Chip, useMediaQuery, useTheme, Autocomplete } from '@mui/material';
import { DataGrid } from '@mui/x-data-grid';
import { Person as PersonIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Lock as LockIcon, Email as EmailIcon, LocationOn as LocationIcon } from '@mui/icons-material';
import useAuthStore from '../store/authStore';
import api from '../services/api';

export default function UserManagement() {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [users, setUsers] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openUserDialog, setOpenUserDialog] = useState(false);
  
  const [selectedUser, setSelectedUser] = useState(null);
  const [isEditing, setIsEditing] = useState(false);
  
  // New/Edit user form state
  const [userForm, setUserForm] = useState({ userId: '', email: '', password: '', fullName: '', role: 'USER', locationId: '', active: true });
  const [error, setError] = useState('');

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
    if (user) {
      setIsEditing(true);
      setSelectedUser(user);
      setUserForm({
        userId: user.userId,
        password: user.password || '',
        email: user.email || '',
        fullName: user.fullName,
        role: user.role,
        locationId: user.locationId || '',
        active: user.active
      });
    } else {
      setIsEditing(false);
      setSelectedUser(null);
      setUserForm({ userId: '', email: '', password: '', fullName: '', role: 'USER', locationId: currentLocation.id, active: true });
    }
    setOpenUserDialog(true);
    setError('');
  };

  const handleSaveUser = async () => {
    try {
      if (isEditing) {
        await api.put(`/api/v1/users/${selectedUser.id}`, userForm);
      } else {
        await api.post('/api/v1/users', userForm);
      }
      setOpenUserDialog(false);
      fetchData();
    } catch (err) {
      setError(err.response?.data?.message || `Failed to ${isEditing ? 'update' : 'create'} user`);
    }
  };

  const handleDeleteUser = async (user) => {
    if (window.confirm(`Are you sure you want to delete user "${user.userId}" (${user.fullName || 'User'})?`)) {
      try {
        await api.delete(`/api/v1/users/${user.id}`);
        fetchData();
      } catch (err) {
        setError(err.response?.data?.message || 'Failed to delete user');
      }
    }
  };

  const columns = [
    { field: 'userId', headerName: 'User ID', width: 140 },
    { field: 'fullName', headerName: 'Full Name', width: 140 },
    { field: 'email', headerName: 'Email', width: 170 },
    { field: 'password', headerName: 'Password', width: 110 },
    { 
      field: 'role', 
      headerName: 'Role', 
      width: 240, 
      renderCell: (params) => {
        if (params.value === 'USER') return 'Viewer (Only View)';
        if (params.value === 'STORE_INCHARGE') return 'Store Incharge (Add/Edit Entries)';
        if (params.value === 'SUPER_ADMIN') return 'Admin (Full Access)';
        return params.value;
      }
    },
    { field: 'locationName', headerName: 'Assigned State', width: 160 },
    { field: 'active', headerName: 'Status', width: 90, renderCell: (params) => params.value ? 'Active' : 'Inactive' },
    {
      field: 'actions',
      headerName: 'Actions',
      width: 170,
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
    return <Typography color="error" variant="h6">Access Denied</Typography>;
  }

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', display: 'flex', flexDirection: 'column', p: { xs: 1.5, sm: 2 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'row' }, justifyContent: 'space-between', alignItems: 'center', mb: 2, gap: 2 }}>
        <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '2.125rem' } }}>User Management (Global)</Typography>
        <Button variant="contained" color="primary" onClick={() => handleOpenDialog()} sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}>
          + Add User
        </Button>
      </Box>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Paper sx={{ width: '100%', flexGrow: 1, borderRadius: 3, display: 'flex', flexDirection: 'column', overflow: 'hidden', p: isMobile ? 1.5 : 0, backgroundColor: isMobile ? 'transparent' : '#fff', boxShadow: isMobile ? 'none' : 1 }}>
        {loading ? (
          <Box display="flex" justifyContent="center" alignItems="center" height="200px"><CircularProgress /></Box>
        ) : isMobile ? (
          /* Mobile View: Clean Responsive Cards */
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
                      color={u.role === 'SUPER_ADMIN' ? 'primary' : (u.role === 'STORE_INCHARGE' ? 'success' : 'default')}
                      size="small"
                      sx={{ fontWeight: 'bold', fontSize: '0.7rem' }}
                    />
                  </Box>

                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5, my: 1.5, pl: 0.5, borderLeft: '3px solid #cbd5e1' }}>
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#334155', fontSize: '0.825rem' }}>
                      <EmailIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} /> {u.email || 'N/A'}
                    </Typography>
                    {u.password && (
                      <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#334155', fontSize: '0.825rem' }}>
                        <LockIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} /> Password: {u.password}
                      </Typography>
                    )}
                    <Typography variant="body2" sx={{ display: 'flex', alignItems: 'center', gap: 1, color: '#334155', fontSize: '0.825rem' }}>
                      <LocationIcon sx={{ fontSize: '1rem', color: '#94a3b8' }} /> State: {u.locationName || 'Global'}
                    </Typography>
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

      {/* Add/Edit User Dialog */}
      <Dialog open={openUserDialog} onClose={() => setOpenUserDialog(false)}>
        <DialogTitle>{isEditing ? 'Edit User' : `Add New User`}</DialogTitle>
        <DialogContent sx={{ display: 'flex', flexDirection: 'column', gap: 2, mt: 1, minWidth: 400 }}>
          
          <FormControl fullWidth>
            <InputLabel>Role</InputLabel>
            <Select value={userForm.role} label="Role" onChange={(e) => setUserForm({...userForm, role: e.target.value})}>
              <MenuItem value="USER">Viewer (Only View)</MenuItem>
              <MenuItem value="STORE_INCHARGE">Store Incharge (Add/Edit Entries)</MenuItem>
              <MenuItem value="SUPER_ADMIN">Admin (Full Access)</MenuItem>
            </Select>
          </FormControl>
          
          {userForm.role !== 'SUPER_ADMIN' && (
            <FormControl fullWidth>
              <Autocomplete
                options={locations}
                getOptionLabel={(option) => option.name}
                value={locations.find(l => l.id === userForm.locationId) || null}
                onChange={(event, newValue) => {
                  setUserForm({...userForm, locationId: newValue ? newValue.id : ''});
                }}
                renderInput={(params) => <TextField {...params} label="Assigned State (Location)" />}
              />
            </FormControl>
          )}

          <TextField label="User ID" value={userForm.userId} onChange={(e) => setUserForm({...userForm, userId: e.target.value})} fullWidth />
          <TextField label="Full Name" value={userForm.fullName} onChange={(e) => setUserForm({...userForm, fullName: e.target.value})} fullWidth />
          <TextField label="Email Address (For Alerts)" type="email" value={userForm.email} onChange={(e) => setUserForm({...userForm, email: e.target.value})} fullWidth />
          <TextField 
            label={isEditing ? "Password (Leave blank to keep unchanged)" : "Password"} 
            type="text" 
            value={userForm.password} 
            onChange={(e) => setUserForm({...userForm, password: e.target.value})} 
            fullWidth 
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
        <DialogActions>
          <Button onClick={() => setOpenUserDialog(false)}>Cancel</Button>
          <Button variant="contained" onClick={handleSaveUser}>{isEditing ? 'Save Changes' : 'Create'}</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
}
