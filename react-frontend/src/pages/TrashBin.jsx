import React, { useState, useEffect, useMemo } from 'react';
import {
  Box,
  Typography,
  Paper,
  Button,
  IconButton,
  Chip,
  Checkbox,
  TextField,
  InputAdornment,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogContentText,
  DialogActions,
  CircularProgress,
  Snackbar,
  Alert,
  Tooltip,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Card,
  CardContent,
  Grid,
  Divider,
  Stack
} from '@mui/material';
import {
  DeleteSweep as TrashIcon,
  RestoreFromTrash as RestoreIcon,
  DeleteForever as DeleteForeverIcon,
  Search as SearchIcon,
  Refresh as RefreshIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Inventory as InventoryIcon,
  TableChart as TableChartIcon
} from '@mui/icons-material';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const TrashBin = () => {
  const [trashItems, setTrashItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filterModule, setFilterModule] = useState('ALL'); // ALL, ENTRY_BOOK, MATERIAL
  const [selectedIds, setSelectedIds] = useState([]);
  const [confirmDialogOpen, setConfirmDialogOpen] = useState(false);
  const [itemToDeletePermanently, setItemToDeletePermanently] = useState(null); // null = batch delete
  const [actionLoading, setActionLoading] = useState(false);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'info' });

  const user = useAuthStore((state) => state.user);
  const selectedLocation = useAuthStore((state) => state.selectedLocation);
  const locationId = selectedLocation?.id || (user?.locationId ? user.locationId : null);
  const [showAllLocations, setShowAllLocations] = useState(false);

  const fetchTrashItems = async () => {
    setLoading(true);
    try {
      const params = {};
      if (locationId && !showAllLocations) {
        params.locationId = locationId;
      }
      const response = await api.get('/api/v1/trash', { params });
      setTrashItems(Array.isArray(response.data) ? response.data : []);
      setSelectedIds([]);
    } catch (err) {
      console.error('Error fetching trash items:', err);
      showSnackbar('Failed to load trash items', 'error');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTrashItems();
  }, [locationId, showAllLocations]);

  const showSnackbar = (message, severity = 'success') => {
    setSnackbar({ open: true, message, severity });
  };

  const handleCloseSnackbar = () => {
    setSnackbar({ ...snackbar, open: false });
  };

  // Filter items
  const filteredItems = useMemo(() => {
    return trashItems.filter((item) => {
      // Strict Location filter: only show items matching current site unless "Show All Sites" is toggled
      if (!showAllLocations && locationId) {
        if (item.location?.id && String(item.location.id) !== String(locationId)) {
          return false;
        }
        if (selectedLocation?.name && item.location?.name && item.location.name.trim().toLowerCase() !== selectedLocation.name.trim().toLowerCase()) {
          return false;
        }
      }
      // Module filter
      if (filterModule !== 'ALL' && item.sourceModule !== filterModule) {
        return false;
      }
      // Search filter
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      const code = (item.materialCode || '').toLowerCase();
      const name = (item.materialName || '').toLowerCase();
      const user = (item.deletedBy || '').toLowerCase();
      const loc = (item.location?.name || '').toLowerCase();
      const date = (item.originalDate || '').toLowerCase();
      return code.includes(q) || name.includes(q) || user.includes(q) || loc.includes(q) || date.includes(q);
    });
  }, [trashItems, filterModule, searchQuery, locationId, showAllLocations, selectedLocation]);

  // Checkbox handlers
  const handleSelectAll = (event) => {
    if (event.target.checked) {
      setSelectedIds(filteredItems.map((item) => item.id));
    } else {
      setSelectedIds([]);
    }
  };

  const handleToggleSelect = (id) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((i) => i !== id) : [...prev, id]
    );
  };

  const isAllSelected = filteredItems.length > 0 && selectedIds.length === filteredItems.length;
  const isIndeterminate = selectedIds.length > 0 && selectedIds.length < filteredItems.length;

  // Restore Single
  const handleRestoreSingle = async (item) => {
    setActionLoading(true);
    try {
      await api.post(`/api/v1/trash/restore/${item.id}`);
      showSnackbar(`Restored ${item.materialName || 'item'} successfully!`);
      fetchTrashItems();
    } catch (err) {
      console.error('Restore error:', err);
      showSnackbar(err.response?.data?.message || 'Failed to restore item', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Restore Batch
  const handleRestoreBatch = async () => {
    if (selectedIds.length === 0) return;
    setActionLoading(true);
    try {
      await api.post('/api/v1/trash/restore-batch', selectedIds);
      showSnackbar(`Restored ${selectedIds.length} items successfully!`);
      fetchTrashItems();
    } catch (err) {
      console.error('Batch restore error:', err);
      showSnackbar('Failed to restore selected items', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Confirm Permanent Delete
  const openConfirmDelete = (item = null) => {
    setItemToDeletePermanently(item);
    setConfirmDialogOpen(true);
  };

  const handlePermanentDelete = async () => {
    setActionLoading(true);
    setConfirmDialogOpen(false);
    try {
      if (itemToDeletePermanently) {
        await api.delete(`/api/v1/trash/${itemToDeletePermanently.id}`);
        showSnackbar(`Permanently deleted ${itemToDeletePermanently.materialName || 'item'}`);
      } else {
        if (selectedIds.length === 0) return;
        await api.post('/api/v1/trash/delete-batch', selectedIds);
        showSnackbar(`Permanently deleted ${selectedIds.length} items`);
      }
      setItemToDeletePermanently(null);
      fetchTrashItems();
    } catch (err) {
      console.error('Permanent delete error:', err);
      showSnackbar('Failed to delete items permanently', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return '-';
    try {
      const [y, m, d] = dateStr.split('-');
      return `${d}-${m}-${y}`;
    } catch {
      return dateStr;
    }
  };

  const formatDateTime = (dtStr) => {
    if (!dtStr) return '-';
    try {
      const dt = new Date(dtStr);
      return dt.toLocaleString('en-IN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return dtStr;
    }
  };

  return (
    <Box sx={{ p: { xs: 1, sm: 2, md: 3 } }}>
      {/* Header Banner */}
      <Paper
        elevation={2}
        sx={{
          p: { xs: 2, sm: 2.5 },
          mb: 3,
          borderRadius: 2,
          background: 'linear-gradient(135deg, #1e293b 0%, #0f172a 100%)',
          color: 'white'
        }}
      >
        <Stack direction={{ xs: 'column', sm: 'row' }} justifyContent="space-between" alignItems={{ xs: 'flex-start', sm: 'center' }} gap={2}>
          <Box display="flex" alignItems="center" gap={1.5}>
            <TrashIcon sx={{ fontSize: { xs: 32, sm: 40 }, color: '#f87171' }} />
            <Box>
              <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
                <Typography variant="h5" fontWeight="bold" sx={{ fontSize: { xs: '1.25rem', sm: '1.5rem' } }}>
                  Trash Bin / Recycle Bin
                </Typography>
                <Chip
                  label={`SITE: ${selectedLocation?.siteName || selectedLocation?.name || user?.siteName || user?.location || 'Main Site'}`}
                  color="primary"
                  size="small"
                  sx={{ fontWeight: 'bold', fontSize: '0.75rem', height: 22 }}
                />
              </Box>
              <Typography variant="body2" sx={{ color: '#cbd5e1', mt: 0.5 }}>
                Deleted records from Entry Book and Materials. Restore items anytime or delete permanently.
              </Typography>
            </Box>
          </Box>
          <Stack direction="row" spacing={1} alignItems="center">
            {user?.role === 'SUPER_ADMIN' && (
              <Button
                variant={showAllLocations ? "contained" : "outlined"}
                color={showAllLocations ? "warning" : "inherit"}
                size="small"
                onClick={() => setShowAllLocations(!showAllLocations)}
                sx={{
                  color: 'white',
                  borderColor: 'rgba(255,255,255,0.4)',
                  fontWeight: 'bold',
                  fontSize: '0.75rem',
                  textTransform: 'none',
                  whiteSpace: 'nowrap'
                }}
              >
                {showAllLocations ? "Showing All Sites" : `Show All Sites`}
              </Button>
            )}
            <Button
              variant="outlined"
              onClick={fetchTrashItems}
              startIcon={<RefreshIcon />}
              disabled={loading}
              sx={{
                color: 'white',
                borderColor: 'rgba(255,255,255,0.3)',
                '&:hover': { borderColor: 'white', backgroundColor: 'rgba(255,255,255,0.1)' }
              }}
            >
              Refresh
            </Button>
          </Stack>
        </Stack>
      </Paper>

      {/* Control Toolbar */}
      <Paper elevation={1} sx={{ p: 2, mb: 3, borderRadius: 2 }}>
        <Grid container spacing={2} alignItems="center">
          {/* Search Box */}
          <Grid item xs={12} sm={5} md={4}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search code, name, user, date..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon color="action" />
                  </InputAdornment>
                )
              }}
            />
          </Grid>

          {/* Module Filter Chips */}
          <Grid item xs={12} sm={7} md={4}>
            <Stack direction="row" spacing={1} flexWrap="wrap">
              <Chip
                label={`All (${trashItems.length})`}
                onClick={() => setFilterModule('ALL')}
                color={filterModule === 'ALL' ? 'primary' : 'default'}
                variant={filterModule === 'ALL' ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                icon={<TableChartIcon />}
                label={`Entry Book (${trashItems.filter((i) => i.sourceModule === 'ENTRY_BOOK').length})`}
                onClick={() => setFilterModule('ENTRY_BOOK')}
                color={filterModule === 'ENTRY_BOOK' ? 'primary' : 'default'}
                variant={filterModule === 'ENTRY_BOOK' ? 'filled' : 'outlined'}
                size="small"
              />
              <Chip
                icon={<InventoryIcon />}
                label={`Materials (${trashItems.filter((i) => i.sourceModule === 'MATERIAL').length})`}
                onClick={() => setFilterModule('MATERIAL')}
                color={filterModule === 'MATERIAL' ? 'primary' : 'default'}
                variant={filterModule === 'MATERIAL' ? 'filled' : 'outlined'}
                size="small"
              />
            </Stack>
          </Grid>

          {/* Batch Actions */}
          <Grid item xs={12} md={4}>
            <Stack direction="row" spacing={1} justifyContent={{ xs: 'flex-start', md: 'flex-end' }} alignItems="center">
              {selectedIds.length > 0 && (
                <Chip
                  label={`Selected: ${selectedIds.length}`}
                  color="secondary"
                  size="small"
                  sx={{ fontWeight: 'bold' }}
                />
              )}
              <Button
                variant="contained"
                color="success"
                size="small"
                startIcon={<RestoreIcon />}
                disabled={selectedIds.length === 0 || actionLoading}
                onClick={handleRestoreBatch}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Restore Selected
              </Button>
              <Button
                variant="contained"
                color="error"
                size="small"
                startIcon={<DeleteForeverIcon />}
                disabled={selectedIds.length === 0 || actionLoading}
                onClick={() => openConfirmDelete(null)}
                sx={{ textTransform: 'none', fontWeight: 600 }}
              >
                Delete Permanently
              </Button>
            </Stack>
          </Grid>
        </Grid>
      </Paper>

      {/* Main Content: Table on Desktop, Cards on Mobile */}
      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" py={10}>
          <CircularProgress />
        </Box>
      ) : filteredItems.length === 0 ? (
        <Paper elevation={1} sx={{ p: 6, textAlign: 'center', borderRadius: 2 }}>
          <TrashIcon sx={{ fontSize: 64, color: '#94a3b8', mb: 2 }} />
          <Typography variant="h6" color="text.secondary">
            Trash Bin is Empty
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 1 }}>
            {searchQuery ? 'No matching deleted records found.' : 'There are no deleted items in the Trash Bin.'}
          </Typography>
        </Paper>
      ) : (
        <>
          {/* Desktop Table View */}
          <TableContainer component={Paper} elevation={1} sx={{ display: { xs: 'none', md: 'block' }, borderRadius: 2 }}>
            <Table size="small">
              <TableHead sx={{ backgroundColor: (theme) => theme.palette.mode === 'dark' ? '#0f172a' : '#f8fafc' }}>
                <TableRow>
                  <TableCell padding="checkbox">
                    <Checkbox
                      checked={isAllSelected}
                      indeterminate={isIndeterminate}
                      onChange={handleSelectAll}
                    />
                  </TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Source</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Type</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Material Code & Name</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="right">Qty / Unit</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Original Date</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Deleted Date & Time</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Deleted By</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }}>Location</TableCell>
                  <TableCell sx={{ fontWeight: 'bold' }} align="center">Actions</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredItems.map((item) => {
                  const isSelected = selectedIds.includes(item.id);
                  const isEntryBook = item.sourceModule === 'ENTRY_BOOK';
                  const isOut = item.entryType === 'OUT';
                  return (
                    <TableRow
                      key={item.id}
                      hover
                      selected={isSelected}
                      sx={{ '&:last-child td, &:last-child th': { border: 0 } }}
                    >
                      <TableCell padding="checkbox">
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                        />
                      </TableCell>
                      <TableCell>
                        <Chip
                          icon={isEntryBook ? <TableChartIcon /> : <InventoryIcon />}
                          label={isEntryBook ? 'Entry Book' : 'Material'}
                          size="small"
                          color={isEntryBook ? 'primary' : 'secondary'}
                          variant="outlined"
                          sx={{ fontSize: '0.75rem', fontWeight: 600 }}
                        />
                      </TableCell>
                      <TableCell>
                        {item.entryType === 'MATERIAL' ? (
                          <Chip label="Master Material" size="small" color="info" sx={{ fontWeight: 600 }} />
                        ) : isOut ? (
                          <Chip
                            icon={<ArrowUpwardIcon />}
                            label="ISSUE (OUT)"
                            size="small"
                            sx={{ backgroundColor: '#fed7aa', color: '#9a3412', fontWeight: 600 }}
                          />
                        ) : (
                          <Chip
                            icon={<ArrowDownwardIcon />}
                            label="ARRIVAL (IN)"
                            size="small"
                            sx={{ backgroundColor: '#bbf7d0', color: '#166534', fontWeight: 600 }}
                          />
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" fontWeight="600">
                          {item.materialCode || '-'}
                        </Typography>
                        <Typography variant="caption" color="text.secondary">
                          {item.materialName || '-'}
                        </Typography>
                      </TableCell>
                      <TableCell align="right">
                        {item.entryType !== 'MATERIAL' ? (
                          <Typography variant="body2" fontWeight="600">
                            {item.quantity != null ? item.quantity : 0} {item.unit || ''}
                          </Typography>
                        ) : (
                          <Typography variant="body2" color="text.secondary">
                            -
                          </Typography>
                        )}
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2">
                          {formatDate(item.originalDate)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ fontSize: '0.8rem' }}>
                          {formatDateTime(item.deletedAt)}
                        </Typography>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={item.deletedBy || 'System'}
                          size="small"
                          variant="outlined"
                          sx={{ fontSize: '0.75rem' }}
                        />
                      </TableCell>
                      <TableCell>
                        <Typography variant="body2" color="text.secondary">
                          {item.location?.name || 'All'}
                        </Typography>
                      </TableCell>
                      <TableCell align="center">
                        <Stack direction="row" spacing={1} justifyContent="center">
                          <Tooltip title="Restore to original location and date">
                            <Button
                              variant="outlined"
                              color="success"
                              size="small"
                              startIcon={<RestoreIcon />}
                              onClick={() => handleRestoreSingle(item)}
                              disabled={actionLoading}
                              sx={{ textTransform: 'none', py: 0.5, px: 1.5, fontSize: '0.8rem' }}
                            >
                              Restore
                            </Button>
                          </Tooltip>
                          <Tooltip title="Delete Permanently (Cannot be undone)">
                            <IconButton
                              color="error"
                              size="small"
                              onClick={() => openConfirmDelete(item)}
                              disabled={actionLoading}
                            >
                              <DeleteForeverIcon fontSize="small" />
                            </IconButton>
                          </Tooltip>
                        </Stack>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
            </Table>
          </TableContainer>

          {/* Mobile Card View */}
          <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 1.5 }}>
            <Box display="flex" alignItems="center" gap={1} px={1}>
              <Checkbox
                checked={isAllSelected}
                indeterminate={isIndeterminate}
                onChange={handleSelectAll}
              />
              <Typography variant="body2" fontWeight="bold">
                Select All ({filteredItems.length})
              </Typography>
            </Box>
            {filteredItems.map((item) => {
              const isSelected = selectedIds.includes(item.id);
              const isEntryBook = item.sourceModule === 'ENTRY_BOOK';
              const isOut = item.entryType === 'OUT';
              return (
                <Card
                  key={item.id}
                  variant="outlined"
                  sx={{
                    borderRadius: 2,
                    borderColor: isSelected ? 'primary.main' : 'divider',
                    backgroundColor: isSelected ? 'action.selected' : 'background.paper'
                  }}
                >
                  <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                    <Stack direction="row" justifyContent="space-between" alignItems="flex-start" mb={1}>
                      <Box display="flex" alignItems="center" gap={1}>
                        <Checkbox
                          checked={isSelected}
                          onChange={() => handleToggleSelect(item.id)}
                          sx={{ p: 0 }}
                        />
                        <Chip
                          label={isEntryBook ? 'Entry Book' : 'Material'}
                          size="small"
                          color={isEntryBook ? 'primary' : 'secondary'}
                          variant="outlined"
                          sx={{ fontSize: '0.7rem', height: 22 }}
                        />
                        {item.entryType === 'MATERIAL' ? (
                          <Chip label="Master" size="small" color="info" sx={{ fontSize: '0.7rem', height: 22 }} />
                        ) : isOut ? (
                          <Chip label="OUT" size="small" sx={{ backgroundColor: '#fed7aa', color: '#9a3412', fontSize: '0.7rem', height: 22 }} />
                        ) : (
                          <Chip label="IN" size="small" sx={{ backgroundColor: '#bbf7d0', color: '#166534', fontSize: '0.7rem', height: 22 }} />
                        )}
                      </Box>
                      {item.entryType !== 'MATERIAL' && (
                        <Typography variant="subtitle2" fontWeight="bold" color={isOut ? 'warning.dark' : 'success.dark'}>
                          {item.quantity} {item.unit}
                        </Typography>
                      )}
                    </Stack>

                    <Typography variant="body1" fontWeight="bold">
                      {item.materialCode || '-'}
                    </Typography>
                    <Typography variant="body2" color="text.secondary" mb={1}>
                      {item.materialName || '-'}
                    </Typography>

                    <Divider sx={{ my: 1 }} />

                    <Grid container spacing={1} sx={{ fontSize: '0.75rem', color: 'text.secondary' }}>
                      <Grid item xs={6}>
                        <strong>Orig Date:</strong> {formatDate(item.originalDate)}
                      </Grid>
                      <Grid item xs={6}>
                        <strong>Deleted By:</strong> {item.deletedBy || 'System'}
                      </Grid>
                      <Grid item xs={12}>
                        <strong>Deleted At:</strong> {formatDateTime(item.deletedAt)}
                      </Grid>
                    </Grid>

                    <Stack direction="row" spacing={1} justifyContent="flex-end" mt={2}>
                      <Button
                        variant="outlined"
                        color="success"
                        size="small"
                        startIcon={<RestoreIcon />}
                        onClick={() => handleRestoreSingle(item)}
                        disabled={actionLoading}
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                      >
                        Restore
                      </Button>
                      <Button
                        variant="outlined"
                        color="error"
                        size="small"
                        startIcon={<DeleteForeverIcon />}
                        onClick={() => openConfirmDelete(item)}
                        disabled={actionLoading}
                        sx={{ textTransform: 'none', fontSize: '0.8rem' }}
                      >
                        Delete
                      </Button>
                    </Stack>
                  </CardContent>
                </Card>
              );
            })}
          </Box>
        </>
      )}

      {/* Permanent Delete Confirmation Dialog */}
      <Dialog
        open={confirmDialogOpen}
        onClose={() => setConfirmDialogOpen(false)}
        aria-labelledby="confirm-delete-dialog-title"
      >
        <DialogTitle id="confirm-delete-dialog-title" sx={{ color: 'error.main', fontWeight: 'bold' }}>
          Permanent Deletion Warning
        </DialogTitle>
        <DialogContent>
          <DialogContentText>
            {itemToDeletePermanently ? (
              <>
                Are you sure you want to permanently delete <strong>{itemToDeletePermanently.materialName} ({itemToDeletePermanently.materialCode})</strong>?
                <br /><br />
                This action <strong>cannot be undone</strong> and will completely wipe this record from the database.
              </>
            ) : (
              <>
                Are you sure you want to permanently delete the <strong>{selectedIds.length} selected records</strong>?
                <br /><br />
                This action <strong>cannot be undone</strong> and will completely wipe these records from the database.
              </>
            )}
          </DialogContentText>
        </DialogContent>
        <DialogActions sx={{ px: 3, pb: 2 }}>
          <Button onClick={() => setConfirmDialogOpen(false)} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handlePermanentDelete}
            color="error"
            variant="contained"
            disabled={actionLoading}
          >
            {actionLoading ? 'Deleting...' : 'Delete Permanently'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Snackbar Feedback */}
      <Snackbar
        open={snackbar.open}
        autoHideDuration={4000}
        onClose={handleCloseSnackbar}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert onClose={handleCloseSnackbar} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default TrashBin;
