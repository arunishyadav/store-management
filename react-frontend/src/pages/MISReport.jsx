import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Card, CardContent, Button, CircularProgress, Tabs, Tab, TextField, Stack, Grid, Paper, Chip, ToggleButton, ToggleButtonGroup, InputAdornment } from '@mui/material';
import { DataGrid, GridToolbarContainer, GridToolbarExport, GridToolbarFilterButton } from '@mui/x-data-grid';
import { Download as DownloadIcon, Print as PrintIcon, Search as SearchIcon } from '@mui/icons-material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as ChartTooltip, Legend, ResponsiveContainer, LineChart, Line, PieChart, Pie, Cell } from 'recharts';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { exportToCSV, printPDF } from '../utils/exportUtils';

const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8', '#82ca9d'];

function CustomToolbar() {
  return (
    <GridToolbarContainer>
      <GridToolbarExport printOptions={{ disableToolbarButton: true }} />
      <GridToolbarFilterButton />
    </GridToolbarContainer>
  );
}

const MISReport = () => {
  const [materials, setMaterials] = useState([]);
  const [entries, setEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // 'ALL' | 'YES' | 'NO'
  const [mobileSearch, setMobileSearch] = useState('');
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const locationId = useAuthStore(state => state.selectedLocation?.id);
  
  const todayStr = new Date().toISOString().split('T')[0];
  const [startDate, setStartDate] = useState(''); // Default All Data
  const [endDate, setEndDate] = useState('');
  const [tabValue, setTabValue] = useState(0);

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const locParam = locationId ? `?locationId=${locationId}` : '';
      const [matRes, stockRes] = await Promise.all([
        api.get(`/api/v1/materials${locParam}`),
        api.get(`/api/v1/stock-entries${locParam}`)
      ]);
      setMaterials(matRes.data || []);
      setEntries(stockRes.data || []);
    } catch (error) {
      console.error("Error fetching MIS data:", error);
    }
    setLoading(false);
  };

  const handleTabChange = (event, newValue) => {
    setTabValue(newValue);
  };

  const setPresetDate = (months) => {
      const start = new Date();
      start.setMonth(start.getMonth() - months);
      setStartDate(start.toISOString().split('T')[0]);
      setEndDate(todayStr);
  };

  // Process data for the Closing Report based on startDate and endDate
  const reportData = useMemo(() => {
      if (!materials.length || !entries.length) return [];
      
      const startStr = startDate || '1970-01-01';
      const endStr = endDate || todayStr;

      const aggregatedData = {};
      
      const getNormalizedDate = (d) => {
          if (!d) return '';
          return String(d).substring(0, 10);
      };

      materials.forEach(mat => {
          const matCodeLower = String(mat.materialCode || '').trim().toLowerCase();
          const matEntries = entries.filter(e => 
              (e.material?.id && e.material.id === mat.id) ||
              (e.materialCode && String(e.materialCode).trim().toLowerCase() === matCodeLower)
          );
          
          let openingArrivalGroups = {};
          let inwardGroups = {};
          let openingOut = 0;
          let issuedRange = 0;

          matEntries.forEach(e => {
             const arrDateStr = getNormalizedDate(e.arrivalDate);
             const arrTime = e.arrivalTime || 'notime';
             const arrQty = parseFloat(e.arrivalQuantity || 0);
             const key = `${arrDateStr}_${arrTime}_${arrQty}`;
             const outQty = parseFloat(e.outgoingQuantity || 0);
             const issDateStr = getNormalizedDate(e.issueDate || e.arrivalDate);

             // Opening Stock Logic (Before Start Date)
             if (arrDateStr && arrDateStr < startStr) {
                 if (!openingArrivalGroups[key] || arrQty > openingArrivalGroups[key]) {
                     openingArrivalGroups[key] = arrQty;
                 }
             } else if (arrDateStr && arrDateStr >= startStr && arrDateStr <= endStr) {
                 // Inward Logic (During Range)
                 if (!inwardGroups[key] || arrQty > inwardGroups[key]) {
                     inwardGroups[key] = arrQty;
                 }
             }
             
             if (issDateStr && issDateStr < startStr) {
                 openingOut += outQty;
             } else if (issDateStr && issDateStr >= startStr && issDateStr <= endStr) {
                 issuedRange += outQty;
             }
          });

          let openingArr = 0;
          Object.values(openingArrivalGroups).forEach(val => openingArr += val);
          
          let inwardRange = 0;
          Object.values(inwardGroups).forEach(val => inwardRange += val);

          const rawOpeningStock = openingArr - openingOut;
          const openingStock = Math.max(0, rawOpeningStock);
          const rawClosingStock = openingStock + inwardRange - issuedRange;
          const closingStock = Math.max(0, rawClosingStock);

          if (aggregatedData[mat.materialCode]) {
              aggregatedData[mat.materialCode].openingStock += openingStock;
              aggregatedData[mat.materialCode].inward += inwardRange;
              aggregatedData[mat.materialCode].issued += issuedRange;
              aggregatedData[mat.materialCode].closingStock += closingStock;
          } else {
              aggregatedData[mat.materialCode] = {
                  id: mat.materialCode, // use code as unique id
                  materialCode: mat.materialCode,
                  materialName: mat.name,
                  category: mat.category || 'Unknown',
                  openingStock,
                  inward: inwardRange,
                  issued: issuedRange,
                  closingStock
              };
          }
      });

      const hasDateFilter = Boolean(startDate || endDate);

      return Object.values(aggregatedData).filter(item => {
          return item.openingStock !== 0 || item.inward !== 0 || item.issued !== 0 || item.closingStock !== 0;
      });
  }, [materials, entries, startDate, endDate]);

  // Filtered Report Data by Availability & Mobile Search
  const filteredReportData = useMemo(() => {
    return reportData.filter(r => {
      let matchesStock = true;
      if (availabilityFilter === 'YES') matchesStock = r.closingStock > 0;
      if (availabilityFilter === 'NO') matchesStock = r.closingStock <= 0;

      let matchesSearch = true;
      if (mobileSearch && mobileSearch.trim() !== '') {
        const q = mobileSearch.trim().toLowerCase();
        const code = String(r.materialCode || '').toLowerCase();
        const name = String(r.materialName || '').toLowerCase();
        const cat = String(r.category || '').toLowerCase();
        matchesSearch = code.includes(q) || name.includes(q) || cat.includes(q);
      }

      return matchesStock && matchesSearch;
    });
  }, [reportData, availabilityFilter, mobileSearch]);

  const handleExportCSV = () => {
    const exportData = filteredReportData.map(r => ({
      'Item Code': r.materialCode,
      'Item Name': r.materialName,
      'Category': r.category,
      'Opening Stock': r.openingStock,
      'Inward (+)': r.inward,
      'Issued (-)': r.issued,
      'Closing Stock (=)': r.closingStock,
      'Status': r.closingStock > 0 ? 'YES' : 'NO'
    }));
    exportToCSV(exportData, `MIS_Report_${availabilityFilter}_Stock_${startDate || 'All'}_to_${endDate || 'All'}.csv`);
  };

  const handlePrintPDF = () => {
    const printData = filteredReportData.map(r => ({
      code: r.materialCode,
      name: r.materialName,
      category: r.category,
      opening: r.openingStock,
      inward: r.inward,
      issued: r.issued,
      closing: r.closingStock,
      status: r.closingStock > 0 ? 'YES' : 'NO'
    }));
    printPDF(printData, `MIS Report (${startDate || 'All'} to ${endDate || 'All'} - Stock: ${availabilityFilter})`, [
      { field: 'code', headerName: 'Item Code' },
      { field: 'name', headerName: 'Item Name' },
      { field: 'category', headerName: 'Category' },
      { field: 'opening', headerName: 'Opening' },
      { field: 'inward', headerName: 'Inward' },
      { field: 'issued', headerName: 'Issued' },
      { field: 'closing', headerName: 'Closing Stock' },
      { field: 'status', headerName: 'Status' }
    ]);
  };

  // Data for Charts
  const chartData = useMemo(() => {
      const topIssued = [...filteredReportData].sort((a, b) => b.issued - a.issued).slice(0, 5);
      
      const categoryMap = {};
      filteredReportData.forEach(r => {
          if (r.closingStock > 0) {
              categoryMap[r.category] = (categoryMap[r.category] || 0) + r.closingStock;
          }
      });
      const categoryData = Object.keys(categoryMap).map(k => ({ name: k, value: categoryMap[k] }));

      return { topIssued, categoryData };
  }, [filteredReportData]);

  // Entry Book Filtered Data (Transaction Log History)
  const filteredEntries = useMemo(() => {
      const startStr = startDate ? startDate : null;
      const endStr = endDate ? endDate : null;
      
      return entries.filter(e => {
          const arrDateStr = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : '';
          const issDateStr = e.issueDate ? String(e.issueDate).substring(0, 10) : '';
          const entryDateStr = issDateStr || arrDateStr;
          
          let matchesDate = true;
          if (startStr && entryDateStr) {
              matchesDate = matchesDate && (entryDateStr >= startStr);
          }
          if (endStr && entryDateStr) {
              matchesDate = matchesDate && (entryDateStr <= endStr);
          }

          let matchesSearch = true;
          if (mobileSearch && mobileSearch.trim() !== '') {
            const q = mobileSearch.trim().toLowerCase();
            const code = String(e.material?.materialCode || e.materialCode || '').toLowerCase();
            const name = String(e.material?.name || e.materialName || '').toLowerCase();
            const issued = String(e.issuedBy || '').toLowerCase();
            const brought = String(e.broughtBy || '').toLowerCase();
            matchesSearch = code.includes(q) || name.includes(q) || issued.includes(q) || brought.includes(q);
          }

          return matchesDate && matchesSearch;
      }).map(r => ({
          ...r,
          id: r.id || r.entryNo || Math.random(),
          materialName: r.material?.name || r.materialName,
          materialCode: r.material?.materialCode || r.materialCode
      }));
  }, [entries, startDate, endDate, mobileSearch]);


  const reportColumns = [
    { field: 'materialCode', headerName: 'Item Code', width: 130 },
    { field: 'materialName', headerName: 'Item Name', flex: 1, minWidth: 200 },
    { field: 'category', headerName: 'Category', width: 150 },
    { field: 'openingStock', headerName: 'Opening Stock', width: 150, type: 'number' },
    { field: 'inward', headerName: 'Inward (+)', width: 150, type: 'number' },
    { field: 'issued', headerName: 'Issued (-)', width: 150, type: 'number' },
    { field: 'closingStock', headerName: 'Closing Stock (=)', width: 150, type: 'number',
      renderCell: (params) => (
        <Typography fontWeight="bold" color={params.value < 0 ? 'error' : 'success.main'}>
          {params.value}
        </Typography>
      )
    },
  ];

  const entryColumns = [
    { field: 'billNumber', headerName: 'Bill number', width: 130 },
    { field: 'materialCode', headerName: 'Item Code', width: 130 },
    { field: 'materialName', headerName: 'Item Name', flex: 1, minWidth: 150 },
    { field: 'arrivalQuantity', headerName: 'Arrival Qty', type: 'number', width: 110 },
    { field: 'arrivalDate', headerName: 'Store Arrival Date', width: 150 },
    { field: 'outgoingQuantity', headerName: 'Outgoing Qty', type: 'number', width: 120 },
    { field: 'issueDate', headerName: 'Issue Date', width: 150 },
    { field: 'issuedBy', headerName: 'Issued By', width: 130 },
  ];

  return (
    <Box sx={{ minHeight: 'calc(100vh - 100px)', height: 'auto', display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1, md: 2 }, maxWidth: '100vw', boxSizing: 'border-box', pb: { xs: 10, md: 2 } }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <Typography variant="h4" sx={{ fontWeight: 'bold', color: 'primary.main', fontSize: { xs: '1.4rem', sm: '2.125rem' }, px: { xs: 1.5, sm: 0 } }}>
            MIS Dashboard
          </Typography>

          {/* Desktop Toolbar */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, flexWrap: 'wrap', gap: 1.5, alignItems: 'center' }}>
             <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
               <Typography variant="caption" fontWeight="bold">Stock:</Typography>
               <ToggleButtonGroup
                 size="small"
                 value={availabilityFilter}
                 exclusive
                 onChange={(e, val) => val && setAvailabilityFilter(val)}
                 color="primary"
               >
                 <ToggleButton value="ALL" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold' }}>ALL</ToggleButton>
                 <ToggleButton value="YES" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold', color: 'success.main' }}>YES (In Stock)</ToggleButton>
                 <ToggleButton value="NO" sx={{ px: 1.5, py: 0.5, fontWeight: 'bold', color: 'error.main' }}>NO (Out of Stock)</ToggleButton>
               </ToggleButtonGroup>
             </Box>

             <Button size="small" variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleExportCSV}>
               Export CSV
             </Button>
             <Button size="small" variant="outlined" color="secondary" startIcon={<PrintIcon />} onClick={handlePrintPDF}>
               Print PDF
             </Button>

              <Stack direction="row" spacing={1} sx={{ flexWrap: 'wrap', gap: 1 }}>
                <Button variant="contained" color="primary" size="small" onClick={() => { setStartDate(''); setEndDate(''); }}>All Data</Button>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(1)}>1 Mo</Button>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(6)}>6 Mo</Button>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(12)}>1 Yr</Button>
              </Stack>
             
             <Stack direction="row" spacing={1} alignItems="center">
               <TextField 
                 label="Start Date" 
                 type="date" 
                 value={startDate} 
                 onChange={e => setStartDate(e.target.value)} 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 sx={{ minWidth: 120 }}
               />
               <Typography variant="body2">to</Typography>
               <TextField 
                 label="End Date" 
                 type="date" 
                 value={endDate} 
                 onChange={e => setEndDate(e.target.value)} 
                 size="small" 
                 InputLabelProps={{ shrink: true }} 
                 sx={{ minWidth: 120 }}
               />
             </Stack>
          </Box>
        </Box>

        {/* STICKY MOBILE TOOLBAR (< md) */}
        <Box sx={{ 
          display: { xs: 'flex', md: 'none' }, 
          flexDirection: 'column', 
          gap: 1, 
          p: 1.2, 
          backgroundColor: '#ffffff', 
          borderBottom: '1px solid #e2e8f0',
          position: 'sticky',
          top: 0,
          zIndex: 10,
          boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
        }}>
          {/* Row 1: Search Input + Settings Toggle */}
          <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
            <TextField
              fullWidth
              size="small"
              placeholder="Search code, name, category, issued by..."
              value={mobileSearch}
              onChange={(e) => setMobileSearch(e.target.value)}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <SearchIcon fontSize="small" color="primary" />
                  </InputAdornment>
                ),
                endAdornment: mobileSearch ? (
                  <InputAdornment position="end">
                    <Button size="small" sx={{ minWidth: 0, p: 0.2 }} onClick={() => setMobileSearch('')}>✕</Button>
                  </InputAdornment>
                ) : null
              }}
            />
            <Button
              size="small"
              variant={showMobileFilters ? "contained" : "outlined"}
              color="primary"
              onClick={() => setShowMobileFilters(!showMobileFilters)}
              sx={{ minWidth: '42px', px: 1, py: 0.7, fontWeight: 'bold', fontSize: '0.8rem', whiteSpace: 'nowrap' }}
            >
              ⚙️
            </Button>
          </Box>

          {/* Row 2: Stock Filter */}
          <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
            <ToggleButtonGroup
              size="small"
              value={availabilityFilter}
              exclusive
              onChange={(e, val) => val && setAvailabilityFilter(val)}
              color="primary"
            >
              <ToggleButton value="ALL" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold' }}>ALL</ToggleButton>
              <ToggleButton value="YES" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'success.main' }}>YES (Stock)</ToggleButton>
              <ToggleButton value="NO" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'error.main' }}>NO (Out)</ToggleButton>
            </ToggleButtonGroup>
          </Box>

          {/* Expandable Section: Export CSV, Print PDF, Date Controls */}
          {showMobileFilters && (
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1, pt: 1, borderTop: '1px dashed #e2e8f0' }}>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <Button size="small" variant="outlined" color="primary" startIcon={<DownloadIcon />} onClick={handleExportCSV} fullWidth sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  Export CSV
                </Button>
                <Button size="small" variant="outlined" color="secondary" startIcon={<PrintIcon />} onClick={handlePrintPDF} fullWidth sx={{ fontWeight: 'bold', fontSize: '0.75rem' }}>
                  Print PDF
                </Button>
              </Box>

              <Stack direction="row" spacing={1} sx={{ width: '100%' }}>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(1)} sx={{ flexGrow: 1, fontSize: '0.75rem' }}>1 Mo</Button>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(6)} sx={{ flexGrow: 1, fontSize: '0.75rem' }}>6 Mo</Button>
                <Button variant="outlined" size="small" onClick={() => setPresetDate(12)} sx={{ flexGrow: 1, fontSize: '0.75rem' }}>1 Yr</Button>
              </Stack>
              
              <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                <input 
                  type="date" 
                  value={startDate} 
                  onChange={e => setStartDate(e.target.value)} 
                  style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', width: '100%' }}
                />
                <Typography variant="caption">to</Typography>
                <input 
                  type="date" 
                  value={endDate} 
                  onChange={e => setEndDate(e.target.value)} 
                  style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', width: '100%' }}
                />
              </Box>
            </Box>
          )}
        </Box>
      </Box>

      <Box sx={{ borderBottom: 1, borderColor: 'divider', mb: 2, px: { xs: 2, sm: 0 } }}>
        <Tabs value={tabValue} onChange={handleTabChange} textColor="primary" indicatorColor="primary" variant="scrollable" scrollButtons="auto">
          <Tab label="Closing Stock & Analytics" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
          <Tab label="Transaction Log" sx={{ fontWeight: 'bold', textTransform: 'none' }} />
        </Tabs>
      </Box>

      {loading ? (
        <Box display="flex" justifyContent="center" alignItems="center" flexGrow={1}><CircularProgress /></Box>
      ) : (
        <Box sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', overflowY: 'auto', px: { xs: 2, sm: 0 }, pb: 2, minHeight: 0 }}>
          {tabValue === 0 && (
             <Grid container spacing={3}>
                <Grid item xs={12} md={12}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Stock Movement (Opening vs Closing)</Typography>
                         <ResponsiveContainer width="100%" height={350}>
                            <BarChart data={reportData.filter(r => r.openingStock > 0 || r.closingStock > 0 || r.inward > 0 || r.issued > 0)}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="materialName" />
                               <YAxis />
                               <ChartTooltip cursor={{fill: '#f5f5f5'}} />
                               <Legend />
                               <Bar dataKey="openingStock" fill="#8884d8" name="Opening Stock" radius={[4, 4, 0, 0]} />
                               <Bar dataKey="closingStock" fill="#82ca9d" name="Closing Stock" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Top 5 Issued Materials</Typography>
                         <ResponsiveContainer width="100%" height={300}>
                            <BarChart data={chartData.topIssued}>
                               <CartesianGrid strokeDasharray="3 3" vertical={false} />
                               <XAxis dataKey="materialName" />
                               <YAxis />
                               <ChartTooltip cursor={{fill: 'transparent'}} />
                               <Legend />
                               <Bar dataKey="issued" fill="#0088FE" name="Issued Quantity" radius={[4, 4, 0, 0]} />
                            </BarChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                <Grid item xs={12} md={6}>
                   <Card elevation={2}>
                      <CardContent>
                         <Typography variant="h6" gutterBottom color="textSecondary">Closing Stock by Category</Typography>
                         <ResponsiveContainer width="100%" height={300}>
                            <PieChart>
                               <Pie data={chartData.categoryData} dataKey="value" nameKey="name" cx="50%" cy="50%" outerRadius={100} label>
                                  {chartData.categoryData.map((entry, index) => (
                                     <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                                  ))}
                               </Pie>
                               <ChartTooltip />
                               <Legend />
                            </PieChart>
                         </ResponsiveContainer>
                      </CardContent>
                   </Card>
                </Grid>
                 <Grid item xs={12} sx={{ flexGrow: 1, display: 'flex', flexDirection: 'column', minHeight: 300 }}>
                    <Paper sx={{ width: '100%', mt: 2, flexGrow: 1, minHeight: 0, display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'hidden' } }} elevation={2}>
                       {/* Desktop DataGrid */}
                       <Box sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1, width: '100%', minHeight: 0 }}>
                          <DataGrid
                            rows={filteredReportData}
                            columns={reportColumns}
                            density="comfortable"
                            slots={{ toolbar: CustomToolbar }}
                            initialState={{
                               pagination: { paginationModel: { page: 0, pageSize: 25 } },
                               sorting: { sortModel: [{ field: 'closingStock', sort: 'desc' }] }
                            }}
                            pageSizeOptions={[10, 25, 50, 100]}
                            disableRowSelectionOnClick
                            sx={{ border: 'none' }}
                          />
                       </Box>

                       {/* Mobile Cards View (< md) */}
                       <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', flexGrow: 1, p: 1.5, pb: 12 }}>
                          <Typography variant="subtitle2" fontWeight="bold" color="primary" gutterBottom>
                             Closing Stock Breakdown
                          </Typography>
                          {filteredReportData.map((row) => (
                             <Card key={row.id} sx={{ mb: 1.5, p: 1.5, borderRadius: 2, border: '1px solid #e2e8f0' }}>
                                <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                                   <Typography variant="body2" fontWeight="bold" color="primary.main">
                                      {row.materialCode} - {row.materialName}
                                   </Typography>
                                   <Chip label={row.category} size="small" variant="outlined" />
                                </Box>
                                <Grid container spacing={1} sx={{ fontSize: '0.8rem' }}>
                                   <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Opening Stock:</Typography>
                                      <Typography variant="body2">{row.openingStock}</Typography>
                                   </Grid>
                                   <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Inward (+):</Typography>
                                      <Typography variant="body2" color="success.main">+{row.inward}</Typography>
                                   </Grid>
                                   <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Issued (-):</Typography>
                                      <Typography variant="body2" color="error.main">-{row.issued}</Typography>
                                   </Grid>
                                   <Grid item xs={6}>
                                      <Typography variant="caption" color="text.secondary">Closing Stock (=):</Typography>
                                      <Typography variant="body2" fontWeight="bold" color={row.closingStock < 0 ? 'error.main' : 'success.main'}>
                                         {row.closingStock}
                                      </Typography>
                                   </Grid>
                                </Grid>
                             </Card>
                          ))}
                       </Box>
                    </Paper>
                 </Grid>
              </Grid>
           )}

           {tabValue === 1 && (
              <Paper sx={{ flexGrow: 1, width: '100%', display: 'flex', flexDirection: 'column', overflow: { xs: 'visible', md: 'hidden' }, minHeight: 300 }} elevation={2}>
                 {/* Desktop DataGrid */}
                 <Box sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1, width: '100%', minHeight: 0 }}>
                    <DataGrid
                      rows={filteredEntries}
                      columns={entryColumns}
                      density="comfortable"
                      slots={{ toolbar: CustomToolbar }}
                      initialState={{
                         pagination: { paginationModel: { page: 0, pageSize: 25 } },
                      }}
                      pageSizeOptions={[10, 25, 50, 100]}
                      disableRowSelectionOnClick
                      sx={{ border: 'none' }}
                     />
                  </Box>

                  {/* Mobile Cards View (< md) */}
                  <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', gap: 2, p: 1.5, pb: 12 }}>
                     <Typography variant="h6" fontWeight="bold" sx={{ color: '#0f172a', mb: 0.5 }}>
                        Transaction Log History
                     </Typography>
                     {filteredEntries.map((e) => (
                        <Card 
                          key={e.id} 
                          variant="outlined" 
                          sx={{ 
                            borderRadius: 3, 
                            boxShadow: '0 4px 12px rgba(0, 0, 0, 0.04)', 
                            borderColor: '#cbd5e1', 
                            backgroundColor: '#ffffff',
                            overflow: 'hidden'
                          }}
                        >
                           {/* Card Header: Code, Category / Name & Status Badge */}
                           <Box sx={{ p: 2, backgroundColor: '#f8fafc', borderBottom: '1px solid #e2e8f0', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 1 }}>
                              <Box>
                                 <Typography variant="subtitle1" fontWeight="bold" sx={{ color: 'primary.main', fontSize: '1rem', lineHeight: 1.2 }}>
                                    {e.materialCode}
                                 </Typography>
                                 <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#1e293b', mt: 0.3 }}>
                                    {e.materialName || 'Product'}
                                 </Typography>
                              </Box>
                              <Chip 
                                label={parseFloat(e.outgoingQuantity || 0) > 0 ? `OUT: -${e.outgoingQuantity}` : `ARR: +${e.arrivalQuantity || 0}`}
                                color={parseFloat(e.outgoingQuantity || 0) > 0 ? "error" : "success"}
                                size="small"
                                sx={{ fontWeight: 'bold', fontSize: '0.75rem', borderRadius: 1.5, px: 0.5 }}
                              />
                           </Box>

                           {/* Card Body Grid Details */}
                           <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                              <Grid container spacing={1.5} sx={{ fontSize: '0.85rem' }}>
                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Store Arrival Date:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                                       {e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : 'N/A'} {e.arrivalTime ? `(${e.arrivalTime})` : ''}
                                    </Typography>
                                 </Grid>

                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Issue Date:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'bold', color: '#0f172a' }}>
                                       {e.issueDate ? String(e.issueDate).substring(0, 10) : 'N/A'}
                                    </Typography>
                                 </Grid>

                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Lane Wala (Brought By):</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#334155' }}>
                                       {e.broughtBy || 'N/A'}
                                    </Typography>
                                 </Grid>

                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Store Incharge Name:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#334155' }}>
                                       {e.storeInchargeName || 'N/A'}
                                    </Typography>
                                 </Grid>

                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Issued By:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#334155' }}>
                                       {e.issuedBy || 'N/A'}
                                    </Typography>
                                 </Grid>

                                 <Grid item xs={6}>
                                    <Typography variant="caption" sx={{ color: '#64748b', fontWeight: 'bold', display: 'block' }}>Bill Number:</Typography>
                                    <Typography variant="body2" sx={{ fontWeight: 'medium', color: '#334155' }}>
                                       {e.billNumber || 'N/A'}
                                    </Typography>
                                 </Grid>
                              </Grid>

                              {/* Optional Physical Attributes (Length / ID / KG) */}
                              {(e.productLength || e.innerDiameter || e.kg) && (
                                 <Box sx={{ mt: 1.5, pt: 1.5, borderTop: '1px dashed #e2e8f0', display: 'flex', gap: 2, flexWrap: 'wrap' }}>
                                    {e.productLength && <Typography variant="caption" sx={{ color: '#475569' }}>Len: <strong>{e.productLength}</strong></Typography>}
                                    {e.innerDiameter && <Typography variant="caption" sx={{ color: '#475569' }}>ID: <strong>{e.innerDiameter}</strong></Typography>}
                                    {e.kg && <Typography variant="caption" sx={{ color: '#475569' }}>KG: <strong>{e.kg}</strong></Typography>}
                                 </Box>
                              )}
                           </CardContent>
                        </Card>
                     ))}
                  </Box>
              </Paper>
           )}
        </Box>
      )}
    </Box>
  );
};

export default MISReport;
