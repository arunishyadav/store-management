import React, { useState, useEffect } from 'react';
import { Box, Typography, Button, Paper, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Grid, Card, CardContent, CardActions, IconButton } from '@mui/material';
import { Add as AddIcon, Edit as EditIcon, Delete as DeleteIcon, Email as EmailIcon, Phone as PhoneIcon, Person as PersonIcon } from '@mui/icons-material';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const HelpSupport = () => {
  const [contacts, setContacts] = useState([]);
  const [loading, setLoading] = useState(false);
  const currentUser = useAuthStore(state => state.user);
  
  const [open, setOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({ designation: '', name: '', contactNumber: '', email: '' });

  useEffect(() => {
    fetchContacts();
  }, []);

  const fetchContacts = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/v1/support-contacts');
      setContacts(res.data);
    } catch (error) {
      console.error("Error fetching support contacts:", error);
    }
    setLoading(false);
  };

  const handleOpen = (contact = null) => {
    if (contact) {
      setEditingId(contact.id);
      setFormData({ designation: contact.designation, name: contact.name, contactNumber: contact.contactNumber || '', email: contact.email || '' });
    } else {
      setEditingId(null);
      setFormData({ designation: '', name: '', contactNumber: '', email: '' });
    }
    setOpen(true);
  };

  const handleClose = () => setOpen(false);

  const handleSubmit = async () => {
    try {
      if (editingId) {
        await api.put(`/api/v1/support-contacts/${editingId}`, formData);
      } else {
        await api.post('/api/v1/support-contacts', formData);
      }
      fetchContacts();
      handleClose();
    } catch (error) {
      console.error("Save failed", error);
      if (error.response?.status === 404) {
         alert("Failed! It seems the new Backend code isn't loaded yet. Please Restart your Spring Boot Terminal!");
      } else {
         alert("Failed to save contact. Please check your details.");
      }
    }
  };

  const handleDelete = async (id) => {
    if (window.confirm("Are you sure you want to delete this contact?")) {
      try {
        await api.delete(`/api/v1/support-contacts/${id}`);
        fetchContacts();
      } catch (error) {
        console.error("Delete failed", error);
        alert("Failed to delete contact.");
      }
    }
  };

  const isAdmin = currentUser?.role === 'SUPER_ADMIN';

  return (
    <Box sx={{ p: { xs: 0, sm: 1, md: 2 } }}>
      <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'flex-start', sm: 'center' }, mb: { xs: 2, sm: 4 }, gap: 2 }}>
        <Typography variant="h4" fontWeight="bold" sx={{ fontSize: { xs: '1.5rem', sm: '2.125rem' } }}>Help & Support</Typography>
        {isAdmin && (
          <Button variant="contained" startIcon={<AddIcon />} onClick={() => handleOpen()} sx={{ width: { xs: '100%', sm: 'auto' } }}>
            Add Contact
          </Button>
        )}
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center"><CircularProgress /></Box>
      ) : (
        <Grid container spacing={3}>
          {contacts.map((contact) => (
            <Grid item xs={12} sm={6} md={4} key={contact.id}>
              <Card elevation={3} sx={{ borderRadius: 3, transition: '0.3s', '&:hover': { transform: 'translateY(-5px)', boxShadow: 6 } }}>
                <CardContent>
                  <Typography variant="h6" color="primary" fontWeight="bold" gutterBottom>
                    {contact.designation}
                  </Typography>
                  <Box display="flex" alignItems="center" gap={1} mb={1}>
                    <PersonIcon color="action" />
                    <Typography variant="body1" fontWeight="500">{contact.name}</Typography>
                  </Box>
                  {contact.contactNumber && (
                    <Box display="flex" alignItems="center" gap={1} mb={1}>
                      <PhoneIcon color="action" />
                      <Typography variant="body2">{contact.contactNumber}</Typography>
                    </Box>
                  )}
                  {contact.email && (
                    <Box display="flex" alignItems="center" gap={1}>
                      <EmailIcon color="action" />
                      <Typography variant="body2">{contact.email}</Typography>
                    </Box>
                  )}
                </CardContent>
                {isAdmin && (
                  <CardActions sx={{ justifyContent: 'flex-end', px: 2, pb: 2 }}>
                    <IconButton color="primary" onClick={() => handleOpen(contact)}>
                      <EditIcon />
                    </IconButton>
                    <IconButton color="error" onClick={() => handleDelete(contact.id)}>
                      <DeleteIcon />
                    </IconButton>
                  </CardActions>
                )}
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      <Dialog open={open} onClose={handleClose} maxWidth="sm" fullWidth>
        <DialogTitle>{editingId ? 'Edit Contact' : 'Add Contact'}</DialogTitle>
        <DialogContent dividers>
          <TextField autoFocus margin="dense" label="Designation (e.g. IT Engineer)" fullWidth variant="outlined" value={formData.designation} onChange={e => setFormData({...formData, designation: e.target.value})} />
          <TextField margin="dense" label="Name" fullWidth variant="outlined" value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} />
          <TextField margin="dense" label="Contact Number" fullWidth variant="outlined" value={formData.contactNumber} onChange={e => setFormData({...formData, contactNumber: e.target.value})} />
          <TextField margin="dense" label="Email" type="email" fullWidth variant="outlined" value={formData.email} onChange={e => setFormData({...formData, email: e.target.value})} />
        </DialogContent>
        <DialogActions sx={{ p: 2 }}>
          <Button onClick={handleClose} color="inherit">Cancel</Button>
          <Button onClick={handleSubmit} variant="contained" disabled={!formData.designation || !formData.name}>Save</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default HelpSupport;
