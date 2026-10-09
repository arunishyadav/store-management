import React, { useState, useMemo } from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Button,
  Typography,
  Box,
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  Card,
  CardContent,
  Grid,
  Divider,
  IconButton,
  Tooltip,
  useTheme,
  useMediaQuery
} from '@mui/material';
import {
  Close as CloseIcon,
  ArrowDownward as ArrowDownwardIcon,
  ArrowUpward as ArrowUpwardIcon,
  Inventory as InventoryIcon,
  LocalShipping as ShippingIcon,
  Person as PersonIcon,
  Receipt as ReceiptIcon,
  EventNote as EventNoteIcon
} from '@mui/icons-material';

export default function MaterialHistoryModal({
  open,
  onClose,
  initialTab = 'ARRIVAL', // 'ARRIVAL' | 'OUTGOING'
  materialRow = null,
  allStockEntries = [],
  masterMaterials = []
}) {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  const [activeTab, setActiveTab] = useState(initialTab);

  // Sync activeTab when initialTab changes on open
  React.useEffect(() => {
    if (open) {
      setActiveTab(initialTab);
    }
  }, [open, initialTab]);

  // Clean identifier matching
  const clean = (s) => String(s || '').trim().toLowerCase().replace(/[^a-z0-9]/g, '');

  const isMatchingMaterial = (entry, target) => {
    if (!entry || !target) return false;
    const id1 = entry.materialId || entry.material?.id;
    const id2 = target.materialId || target.material?.id || target.id;
    if (id1 && id2 && String(id1) === String(id2)) return true;

    const code1 = clean(entry.materialCode || entry.material?.materialCode);
    const code2 = clean(target.materialCode || target.material?.materialCode);
    const name1 = clean(entry.materialName || entry.material?.name || entry.name);
    const name2 = clean(target.materialName || target.material?.name || target.name);

    if (code1 && code2 && code1 === code2) return true;
    if (name1 && name2 && name1 === name2) return true;
    if (code1 && name2 && code1 === name2) return true;
    if (name1 && code2 && name1 === code2) return true;

    return false;
  };

  const matName = materialRow?.materialName || materialRow?.name || materialRow?.material?.name || 'Material Details';
  const matCode = materialRow?.materialCode || materialRow?.material?.materialCode || '';
  const matCategory = materialRow?.category || 'Hardware';

  // Extract all matching transactions
  const { arrivalEntries, outgoingEntries, totalArrival, totalOutgoing, currentBalance } = useMemo(() => {
    if (!materialRow || !allStockEntries) {
      return { arrivalEntries: [], outgoingEntries: [], totalArrival: 0, totalOutgoing: 0, currentBalance: 0 };
    }

    const matched = allStockEntries.filter(e => isMatchingMaterial(e, materialRow));

    const arrivals = matched
      .filter(e => parseFloat(e.arrivalQuantity || 0) > 0)
      .sort((a, b) => {
        const dateA = String(a.arrivalDate || '');
        const dateB = String(b.arrivalDate || '');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String(b.arrivalTime || '').localeCompare(String(a.arrivalTime || ''));
      });

    const issues = matched
      .filter(e => parseFloat(e.outgoingQuantity || 0) > 0)
      .sort((a, b) => {
        const dateA = String(a.issueDate || '');
        const dateB = String(b.issueDate || '');
        if (dateA !== dateB) return dateB.localeCompare(dateA);
        return String(b.issueTime || '').localeCompare(String(a.issueTime || ''));
      });

    // Group deduplicated arrivals
    let arrivalGroups = {};
    arrivals.forEach(e => {
      const arrQty = parseFloat(e.arrivalQuantity || 0);
      const arrDate = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : 'nodate';
      const arrTime = e.arrivalTime || 'notime';
      const key = e.id || `${arrDate}_${arrTime}_${arrQty}`;
      if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
        arrivalGroups[key] = arrQty;
      }
    });

    let sumArr = 0;
    Object.values(arrivalGroups).forEach(v => { sumArr += v; });

    let sumOut = 0;
    issues.forEach(e => { sumOut += parseFloat(e.outgoingQuantity || 0); });

    const balance = Math.max(0, sumArr - sumOut);

    return {
      arrivalEntries: arrivals,
      outgoingEntries: issues,
      totalArrival: sumArr,
      totalOutgoing: sumOut,
      currentBalance: balance
    };
  }, [materialRow, allStockEntries]);

  return (
    <Dialog
      open={open}
      onClose={onClose}
      maxWidth="md"
      fullWidth
      fullScreen={isMobile}
      PaperProps={{
        sx: {
          borderRadius: isMobile ? 0 : 3,
          maxHeight: isMobile ? '100%' : '88vh'
        }
      }}
    >
      <DialogTitle sx={{ p: 2, pb: 1, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0' }}>
        <Box display="flex" justifyContent="space-between" alignItems="flex-start">
          <Box>
            <Box display="flex" alignItems="center" gap={1} flexWrap="wrap">
              <Typography variant="h6" fontWeight="bold" color="text.primary" sx={{ fontSize: { xs: '1rem', sm: '1.2rem' } }}>
                {matName}
              </Typography>
              {matCode && (
                <Chip label={matCode} size="small" variant="outlined" sx={{ fontWeight: 600, fontSize: '0.75rem' }} />
              )}
              <Chip label={matCategory} size="small" color="primary" variant="filled" sx={{ height: 20, fontSize: '0.7rem' }} />
            </Box>
            <Typography variant="caption" color="text.secondary" sx={{ display: 'block', mt: 0.5 }}>
              Live Store Stock: <strong>{currentBalance}</strong> | Total Inward: <strong>{totalArrival}</strong> | Total Outgoing: <strong>{totalOutgoing}</strong>
            </Typography>
          </Box>
          <IconButton onClick={onClose} size="small" sx={{ color: 'text.secondary' }}>
            <CloseIcon />
          </IconButton>
        </Box>

        {/* Tab Switcher */}
        <Box sx={{ mt: 1.5, borderBottom: 1, borderColor: 'divider' }}>
          <Tabs
            value={activeTab}
            onChange={(e, val) => setActiveTab(val)}
            variant="fullWidth"
            textColor="primary"
            indicatorColor="primary"
            sx={{ minHeight: 40 }}
          >
            <Tab
              value="ARRIVAL"
              icon={<ArrowDownwardIcon sx={{ color: '#16a34a' }} />}
              iconPosition="start"
              label={`Inward / Arrivals (${arrivalEntries.length})`}
              sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.9rem' }, minHeight: 40, py: 0.5 }}
            />
            <Tab
              value="OUTGOING"
              icon={<ArrowUpwardIcon sx={{ color: '#ea580c' }} />}
              iconPosition="start"
              label={`Outgoing / Issues (${outgoingEntries.length})`}
              sx={{ fontWeight: 'bold', fontSize: { xs: '0.8rem', sm: '0.9rem' }, minHeight: 40, py: 0.5 }}
            />
          </Tabs>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ p: { xs: 1.5, sm: 2.5 }, backgroundColor: '#ffffff' }}>
        {activeTab === 'ARRIVAL' ? (
          /* ARRIVAL / INWARD HISTORY */
          <Box>
            {/* Summary Banner */}
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                backgroundColor: '#f0fdf4',
                border: '1px solid #bbf7d0',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <ShippingIcon sx={{ color: '#16a34a' }} />
                <Typography variant="body2" fontWeight="bold" color="#166534">
                  All Inward Shipments
                </Typography>
              </Box>
              <Box display="flex" gap={2}>
                <Typography variant="body2" color="#166534">
                  Total Shipments: <strong>{arrivalEntries.length}</strong>
                </Typography>
                <Typography variant="body2" color="#166534">
                  Total Arrived: <strong style={{ fontSize: '1rem', color: '#15803d' }}>+{totalArrival}</strong>
                </Typography>
              </Box>
            </Box>

            {arrivalEntries.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">No arrival records found for this material.</Typography>
              </Box>
            ) : isMobile ? (
              /* Mobile Cards View */
              <Box display="flex" flexDirection="column" gap={1.5}>
                {arrivalEntries.map((item, idx) => (
                  <Card key={item.id || idx} variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#fafafa' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                          <EventNoteIcon fontSize="small" color="primary" />
                          <Typography variant="body2" fontWeight="bold">
                            {item.arrivalDate ? String(item.arrivalDate).substring(0, 10) : 'N/A'}
                          </Typography>
                          {item.arrivalTime && (
                            <Typography variant="caption" color="text.secondary">
                              ({item.arrivalTime})
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`+${item.arrivalQuantity}`}
                          color="success"
                          size="small"
                          sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                        />
                      </Box>
                      <Divider sx={{ my: 0.8 }} />
                      <Grid container spacing={0.5}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Lane Wala (Brought By):</Typography>
                          <Typography variant="body2" fontWeight={500}>{item.broughtBy || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Bill Number:</Typography>
                          <Typography variant="body2" fontWeight={500}>{item.billNumber || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Store Incharge:</Typography>
                          <Typography variant="body2">{item.storeInchargeName || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              /* Desktop Table View */
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Arrival Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Quantity Arrived</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Lane Wala (Brought By)</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Bill Number</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Store Incharge</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {arrivalEntries.map((item, idx) => (
                      <TableRow key={item.id || idx} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {item.arrivalDate ? String(item.arrivalDate).substring(0, 10) : 'N/A'}
                        </TableCell>
                        <TableCell>{item.arrivalTime || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={`+${item.arrivalQuantity}`}
                            color="success"
                            size="small"
                            sx={{ fontWeight: 'bold', minWidth: 60 }}
                          />
                        </TableCell>
                        <TableCell>{item.broughtBy || '-'}</TableCell>
                        <TableCell>{item.billNumber || '-'}</TableCell>
                        <TableCell>{item.storeInchargeName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        ) : (
          /* OUTGOING / ISSUE HISTORY */
          <Box>
            {/* Summary Banner */}
            <Box
              sx={{
                p: 1.5,
                mb: 2,
                borderRadius: 2,
                backgroundColor: '#fff7ed',
                border: '1px solid #fed7aa',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                flexWrap: 'wrap',
                gap: 1
              }}
            >
              <Box display="flex" alignItems="center" gap={1}>
                <ArrowUpwardIcon sx={{ color: '#ea580c' }} />
                <Typography variant="body2" fontWeight="bold" color="#9a3412">
                  All Outgoing / Issue Details
                </Typography>
              </Box>
              <Box display="flex" gap={2}>
                <Typography variant="body2" color="#9a3412">
                  Total Issues: <strong>{outgoingEntries.length}</strong>
                </Typography>
                <Typography variant="body2" color="#9a3412">
                  Total Issued: <strong style={{ fontSize: '1rem', color: '#c2410c' }}>-{totalOutgoing}</strong>
                </Typography>
              </Box>
            </Box>

            {outgoingEntries.length === 0 ? (
              <Box py={4} textAlign="center">
                <Typography color="text.secondary">No outgoing / issue records found for this material.</Typography>
              </Box>
            ) : isMobile ? (
              /* Mobile Cards View */
              <Box display="flex" flexDirection="column" gap={1.5}>
                {outgoingEntries.map((item, idx) => (
                  <Card key={item.id || idx} variant="outlined" sx={{ borderRadius: 2, backgroundColor: '#fafafa' }}>
                    <CardContent sx={{ p: 1.5, '&:last-child': { pb: 1.5 } }}>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Box display="flex" alignItems="center" gap={0.8}>
                          <EventNoteIcon fontSize="small" color="warning" />
                          <Typography variant="body2" fontWeight="bold">
                            {item.issueDate ? String(item.issueDate).substring(0, 10) : 'N/A'}
                          </Typography>
                          {item.issueTime && (
                            <Typography variant="caption" color="text.secondary">
                              ({item.issueTime})
                            </Typography>
                          )}
                        </Box>
                        <Chip
                          label={`-${item.outgoingQuantity}`}
                          color="warning"
                          size="small"
                          sx={{ fontWeight: 'bold', fontSize: '0.85rem' }}
                        />
                      </Box>
                      <Divider sx={{ my: 0.8 }} />
                      <Grid container spacing={0.5}>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Issued By / To:</Typography>
                          <Typography variant="body2" fontWeight={500}>{item.issuedBy || '-'}</Typography>
                        </Grid>
                        <Grid item xs={6}>
                          <Typography variant="caption" color="text.secondary">Bill / Slip No:</Typography>
                          <Typography variant="body2" fontWeight={500}>{item.billNumber || '-'}</Typography>
                        </Grid>
                        <Grid item xs={12} sx={{ mt: 0.5 }}>
                          <Typography variant="caption" color="text.secondary">Store Incharge:</Typography>
                          <Typography variant="body2">{item.storeInchargeName || '-'}</Typography>
                        </Grid>
                      </Grid>
                    </CardContent>
                  </Card>
                ))}
              </Box>
            ) : (
              /* Desktop Table View */
              <TableContainer component={Paper} variant="outlined" sx={{ borderRadius: 2 }}>
                <Table size="small">
                  <TableHead sx={{ backgroundColor: '#f1f5f9' }}>
                    <TableRow>
                      <TableCell sx={{ fontWeight: 'bold' }}>Issue Date</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Time</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Quantity Issued</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Issued By / To</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Bill / Slip No</TableCell>
                      <TableCell sx={{ fontWeight: 'bold' }}>Store Incharge</TableCell>
                    </TableRow>
                  </TableHead>
                  <TableBody>
                    {outgoingEntries.map((item, idx) => (
                      <TableRow key={item.id || idx} hover sx={{ '&:nth-of-type(odd)': { backgroundColor: '#f8fafc' } }}>
                        <TableCell sx={{ fontWeight: 600 }}>
                          {item.issueDate ? String(item.issueDate).substring(0, 10) : 'N/A'}
                        </TableCell>
                        <TableCell>{item.issueTime || '-'}</TableCell>
                        <TableCell>
                          <Chip
                            label={`-${item.outgoingQuantity}`}
                            color="warning"
                            size="small"
                            sx={{ fontWeight: 'bold', minWidth: 60 }}
                          />
                        </TableCell>
                        <TableCell sx={{ fontWeight: 500 }}>{item.issuedBy || '-'}</TableCell>
                        <TableCell>{item.billNumber || '-'}</TableCell>
                        <TableCell>{item.storeInchargeName || '-'}</TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </TableContainer>
            )}
          </Box>
        )}
      </DialogContent>

      <DialogActions sx={{ p: 1.5, px: 2, backgroundColor: '#f8fafc', borderTop: '1px solid #e2e8f0', justifyContent: 'space-between' }}>
        <Typography variant="caption" color="text.secondary">
          Click the tabs above to switch between Inward (Arrival) and Outgoing (Issues).
        </Typography>
        <Button onClick={onClose} variant="contained" color="inherit" size="small" sx={{ fontWeight: 'bold' }}>
          Close
        </Button>
      </DialogActions>
    </Dialog>
  );
}
