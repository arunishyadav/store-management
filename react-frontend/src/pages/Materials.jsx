import React, { useState, useEffect, useMemo } from 'react';
import { Box, Typography, Button, Paper, Chip, CircularProgress, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Autocomplete, Card, CardContent, Grid, Divider, ToggleButton, ToggleButtonGroup, InputAdornment, Tooltip } from '@mui/material';
import { DataGrid, GridRowModes, GridToolbar, GridActionsCellItem } from '@mui/x-data-grid';
import { Add as AddIcon, Edit as EditIcon, DeleteOutlined as DeleteIcon, Save as SaveIcon, Close as CancelIcon, Search as SearchIcon, Download as DownloadIcon, Print as PrintIcon } from '@mui/icons-material';
import api from '../services/api';
import useAuthStore from '../store/authStore';
import { exportToCSV, printPDF } from '../utils/exportUtils';

const Materials = () => {
  const [rawMaterials, setRawMaterials] = useState([]);
  const [rawStockEntries, setRawStockEntries] = useState([]);
  const [mobileSearch, setMobileSearch] = useState('');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL'); // 'ALL' | 'YES' | 'NO'
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [rowModesModel, setRowModesModel] = useState({});
  const [loading, setLoading] = useState(false);
  const locationId = useAuthStore(state => state.selectedLocation?.id);
  const currentUser = useAuthStore(state => state.user);
  const todayStr = new Date().toISOString().split('T')[0];
  const [selectedDate, setSelectedDate] = useState(todayStr); // By default TODAY's date is filled!
  const [isAllData, setIsAllData] = useState(false); // Only true when "All Data" / "ALL" button is tapped!
  const [lastUsedDate, setLastUsedDate] = useState(todayStr);
  const [showMobileFilters, setShowMobileFilters] = useState(false);
  const [open, setOpen] = useState(false);
  const [newMat, setNewMat] = useState({ 
    name: '', code: '', category: 'Hardware', 
    arrivalQuantity: '', arrivalDate: todayStr, arrivalTime: '', broughtBy: '' 
  });

  useEffect(() => {
    fetchData();
  }, [locationId]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const locQuery = locationId ? `?locationId=${locationId}` : '';
      const [matRes, stockRes] = await Promise.all([
        api.get(`/api/v1/materials${locQuery}`),
        api.get(`/api/v1/stock-entries${locQuery}`)
      ]);
      setRawMaterials(matRes.data || []);
      setRawStockEntries(stockRes.data || []);
    } catch (error) {
      console.error("Error fetching materials data:", error);
    }
    setLoading(false);
  };

  const allUniqueMaterials = useMemo(() => {
    const uniqueMaterialsMap = {};
    (rawMaterials || []).forEach(mat => {
      const key = (mat.name || mat.materialCode || mat.id).trim().toLowerCase();
      if (!uniqueMaterialsMap[key]) {
        uniqueMaterialsMap[key] = { ...mat, ids: [mat.id] };
      } else {
        uniqueMaterialsMap[key].ids.push(mat.id);
      }
    });
    return Object.values(uniqueMaterialsMap);
  }, [rawMaterials]);

  const getNormalizedDate = (d) => {
    if (!d) return 'nodate';
    if (d instanceof Date) {
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
    }
    return String(d).substring(0, 10);
  };

  const calculateGroupedArrival = (entriesList) => {
    let arrivalGroups = {};
    entriesList.forEach(e => {
      const outQty = parseFloat(e.outgoingQuantity || 0);
      const arrQty = parseFloat(e.arrivalQuantity || 0);
      if (outQty === 0 && arrQty > 0) {
        const arrDate = getNormalizedDate(e.arrivalDate);
        const arrTime = e.arrivalTime || 'notime';
        const key = `${arrDate}_${arrTime}_${arrQty}`;
        if (!arrivalGroups[key] || arrQty > arrivalGroups[key]) {
          arrivalGroups[key] = arrQty;
        }
      }
    });
    let total = 0;
    Object.values(arrivalGroups).forEach(val => total += val);
    return total;
  };

  const processedRows = useMemo(() => {
    return allUniqueMaterials.map(mat => {
      const matEntries = (rawStockEntries || []).filter(e => 
        mat.ids.includes(e.material?.id) ||
        (e.material?.name && String(e.material?.name).trim().toLowerCase() === String(mat.name).trim().toLowerCase()) ||
        (e.materialCode && String(e.materialCode).trim().toLowerCase() === String(mat.materialCode).trim().toLowerCase() && (!e.material?.name || e.material?.name === mat.name))
      );

      const totalArrival = calculateGroupedArrival(matEntries);
      const totalOutgoing = matEntries.reduce((sum, e) => sum + parseFloat(e.outgoingQuantity || 0), 0);
      const rawNowQuantity = totalArrival - totalOutgoing;
      const nowQuantity = Math.max(0, rawNowQuantity); // Never show negative numbers on screen
      const availableInStore = rawNowQuantity > 0 ? 'YES' : 'NO';

      const sortedArrivals = matEntries
        .filter(e => e.arrivalDate && parseFloat(e.arrivalQuantity || 0) > 0)
        .sort((a, b) => new Date(b.arrivalDate) - new Date(a.arrivalDate));
      const latestArrival = sortedArrivals.length > 0 ? sortedArrivals[0] : null;

      const arrivalDateStr = latestArrival && latestArrival.arrivalDate ? String(latestArrival.arrivalDate).substring(0, 10) : 'N/A';
      const arrivalTimeStr = latestArrival && latestArrival.arrivalTime ? latestArrival.arrivalTime : '';
      const arrivalDateTime = arrivalDateStr !== 'N/A' ? `${arrivalDateStr} ${arrivalTimeStr}`.trim() : 'N/A';
      const laneWalaName = latestArrival ? (latestArrival.broughtBy || 'N/A') : 'N/A';

      const dateSpecificName = (latestArrival && latestArrival.materialName && latestArrival.materialName.trim())
        ? latestArrival.materialName
        : mat.name;

      return {
        id: mat.id,
        ids: mat.ids,
        materialCode: mat.materialCode,
        name: dateSpecificName,
        category: mat.category,
        totalArrival: totalArrival,
        matEntries: matEntries,
        arrivalQuantity: totalArrival,
        arrivalDate: arrivalDateTime,
        rawArrivalDate: arrivalDateStr,
        laneWalaName: laneWalaName,
        nowQuantity: nowQuantity,
        availableInStore: availableInStore,
      };
    });
  }, [allUniqueMaterials, rawStockEntries]);



  const handleAddSubmit = async () => {
      try {
          const trimmedCode = (newMat.code || '').trim();
          const trimmedName = (newMat.name || '').trim();
          
          if (!trimmedCode || !trimmedName) {
              alert("Please enter Item Code and Item Name.");
              return;
          }

          const validLocationId = (locationId && !String(locationId).startsWith('loc-default-')) ? locationId : null;

          // Check if a material with this code already exists
          const existingMaterial = allUniqueMaterials.find(r => r.materialCode.toLowerCase() === trimmedCode.toLowerCase());
          
          let targetMaterialId;

          if (existingMaterial) {
              // Reuse existing material ID
              targetMaterialId = existingMaterial.id;
          } else {
              // Create the new Material
              const matPayload = {
                  name: trimmedName,
                  materialCode: trimmedCode,
                  category: newMat.category || 'Hardware',
                  unit: 'Nos',
                  minQuantity: 1
              };
              if (validLocationId) {
                  matPayload.location = { id: validLocationId };
              }
              const matRes = await api.post('/api/v1/materials', matPayload);
              targetMaterialId = matRes.data.id;
          }

          // Always create a Stock Entry for this arrival
          const formatTime = (timeVal) => {
             if (!timeVal) return null;
             let t = timeVal.trim();
             if (t === "") return null;
             const parts = t.split(':');
             if (parts.length === 1) return `${parts[0].padStart(2, '0')}:00:00`;
             if (parts.length === 2) return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:00`;
             return `${parts[0].padStart(2, '0')}:${parts[1].padStart(2, '0')}:${parts[2].padStart(2, '0')}`;
          };
          
          const savedArrivalDate = newMat.arrivalDate || lastUsedDate || selectedDate || todayStr;
          if (newMat.arrivalDate) {
              setLastUsedDate(newMat.arrivalDate);
          }

          const payload = {
            material: { id: targetMaterialId },
            materialCode: trimmedCode,
            materialName: trimmedName,
            arrivalQuantity: parseFloat(newMat.arrivalQuantity || 0),
            arrivalDate: savedArrivalDate,
            arrivalTime: formatTime(newMat.arrivalTime),
            broughtBy: newMat.broughtBy || '',
            outgoingQuantity: 0,
            issueDate: null,
            issuedBy: 'INITIAL_STOCK', // Secret flag to hide from Entry Book
            storeInchargeName: currentUser?.name || ''
          };
          if (validLocationId) {
              payload.location = { id: validLocationId };
          }

          await api.post('/api/v1/stock-entries', payload);

          setNewMat({ name: '', code: '', category: 'Hardware', arrivalQuantity: '', arrivalDate: savedArrivalDate, arrivalTime: '', broughtBy: '' });
          fetchData();
          setOpen(false);
      } catch (error) {
        console.error("Add Material Error", error);
        alert(error.response?.data?.message || "Failed to add material or its entry.");
      }
  };

  const handleRowModesModelChange = (newRowModesModel) => {
    setRowModesModel(newRowModesModel);
  };

  const handleEditClick = (id) => () => {
    setRowModesModel({ ...rowModesModel, [id]: { mode: GridRowModes.Edit } });
  };

  const handleSaveClick = (id) => () => {
    setRowModesModel((prev) => ({ ...prev, [id]: { mode: GridRowModes.View } }));
  };

  const handleDeleteClick = (id) => async () => {
    if (window.confirm("Are you sure you want to move this material to Trash Bin? You can restore it anytime from Trash Bin.")) {
        try {
          const rowToDelete = processedRows.find(r => r.id === id);
          if (rowToDelete && rowToDelete.ids) {
              await Promise.all(rowToDelete.ids.map(duplicateId => api.delete(`/api/v1/materials/${duplicateId}`)));
          } else {
              await api.delete(`/api/v1/materials/${id}`);
          }
          fetchData();
        } catch (error) {
          console.error("Delete failed", error);
          alert("Cannot delete material: " + (error.response?.data?.message || error.message));
        }
    }
  };

  const handleCancelClick = (id) => () => {
    setRowModesModel((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const processRowUpdate = async (newRow) => {
    try {
      if (!newRow.materialCode || !newRow.name) {
          throw new Error("Item Code and Name cannot be empty.");
      }
      
      const payload = {
          materialCode: newRow.materialCode,
          name: newRow.name,
          category: newRow.category,
          unit: 'Nos',
          minQuantity: 1,
          location: { id: locationId },
          active: true
      };
      
      // Update ALL duplicates
      const idsToUpdate = newRow.ids || [newRow.id];
      await Promise.all(idsToUpdate.map(dupId => api.put(`/api/v1/materials/${dupId}`, payload)));
      
      setRawMaterials(prev => prev.map(m => idsToUpdate.includes(m.id) ? { ...m, ...payload } : m));
      return newRow;
    } catch (error) {
      console.error("Save failed", error);
      alert("Failed to update material.");
      throw error;
    }
  };

  const columns = [
    { field: 'materialCode', headerName: 'Item Code', minWidth: 120, flex: 1, editable: true },
    { 
      field: 'name', 
      headerName: 'Item Name', 
      minWidth: 200, 
      flex: 2, 
      editable: true,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow placement="top-start">
          <Typography variant="body2" sx={{ fontWeight: 600, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
            {params.value}
          </Typography>
        </Tooltip>
      )
    },
    { field: 'category', headerName: 'Category', minWidth: 120, flex: 1, editable: true },
    { field: 'arrivalQuantity', headerName: 'Quantity', type: 'number', minWidth: 100, flex: 0.8, editable: false },
    { field: 'arrivalDate', headerName: 'Arrival Date & Time', minWidth: 170, flex: 1.3, editable: false },
    { 
      field: 'laneWalaName', 
      headerName: 'Lane Wala Ka Name', 
      minWidth: 150, 
      flex: 1.2, 
      editable: false,
      renderCell: (params) => (
        <Tooltip title={params.value || ''} arrow placement="top-start">
          <Typography variant="body2" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', fontSize: '0.84rem' }}>
            {params.value || '-'}
          </Typography>
        </Tooltip>
      )
    },
    { field: 'nowQuantity', headerName: 'Now Quantity', type: 'number', minWidth: 110, flex: 0.9, editable: false },
    {
      field: 'availableInStore',
      headerName: 'Available In Store',
      minWidth: 140,
      flex: 1.1,
      editable: false,
      renderCell: (params) => {
        let color = params.value === 'YES' ? 'success' : 'error';
        return (
          <Chip 
            label={params.value} 
            color={color} 
            size="small" 
            variant="outlined"
            sx={{ fontWeight: 'bold' }}
          />
        );
      },
    }
  ];

  if (currentUser?.role !== 'USER') {
    columns.push({
      field: 'actions',
      type: 'actions',
      headerName: 'Actions',
      width: 100,
      cellClassName: 'actions',
      getActions: ({ id }) => {
        const isInEditMode = rowModesModel[id]?.mode === GridRowModes.Edit;
        if (isInEditMode) {
          return [
            <GridActionsCellItem icon={<SaveIcon />} label="Save" sx={{ color: 'primary.main' }} onClick={handleSaveClick(id)} key="save" />,
            <GridActionsCellItem icon={<CancelIcon />} label="Cancel" onClick={handleCancelClick(id)} key="cancel" />
          ];
        }
        const actions = [
          <GridActionsCellItem icon={<EditIcon />} label="Edit" onClick={handleEditClick(id)} key="edit" />
        ];
        if (currentUser?.role === 'SUPER_ADMIN') {
          actions.push(<GridActionsCellItem icon={<DeleteIcon />} label="Delete" onClick={handleDeleteClick(id)} color="error" key="delete" />);
        }
        return actions;
      },
    });
  }

  const handleAllDataClick = () => {
    setIsAllData(true);
    setSelectedDate('');
    setStartDate('');
    setEndDate('');
    setAvailabilityFilter('ALL');
    setMobileSearch('');
  };

  const filteredRows = useMemo(() => {
    const q = (mobileSearch || '').trim().toLowerCase();

    // Active editing IDs in rowModesModel
    const activeEditingIds = new Set(
      Object.keys(rowModesModel || {}).filter(k => rowModesModel[k]?.mode === GridRowModes.Edit)
    );

    // User requirement: without date entered or "All Data" clicked, do not show any data
    // EXCEPT: rows currently in edit mode must ALWAYS be kept so DataGrid never throws MissingRowIdError
    if (!isAllData && !selectedDate && (!startDate || !endDate)) {
      return processedRows.filter(r => activeEditingIds.has(r.id));
    }

    return processedRows.filter(r => {
      // If row is actively in edit mode, ALWAYS show it!
      if (activeEditingIds.has(r.id)) {
        return true;
      }

      // 1. Stock Availability Filter (YES / NO / ALL)
      const qty = parseFloat(r.nowQuantity || 0);
      if (availabilityFilter === 'YES' && qty <= 0) return false;
      if (availabilityFilter === 'NO' && qty > 0) return false;

      // 2. Date Filter / Date Range (Arrivals only! Outgoing/Issues belong in Entry Book, not Materials)
      if (!isAllData) {
        if (startDate && endDate) {
          const hasRangeArrival = r.matEntries.some(e => {
            const arrD = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : '';
            const arrQty = parseFloat(e.arrivalQuantity || 0);
            return arrD && arrD >= startDate && arrD <= endDate && arrQty > 0;
          });
          if (!hasRangeArrival) return false;
        } else if (selectedDate) {
          const hasDateArrival = r.matEntries.some(e => {
            const arrD = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : '';
            const arrQty = parseFloat(e.arrivalQuantity || 0);
            return arrD === selectedDate && arrQty > 0;
          });
          if (!hasDateArrival) return false;
        } else {
          return false;
        }
      }

      // 3. Search Query
      if (q) {
        const code = String(r.materialCode || '').toLowerCase();
        const name = String(r.name || '').toLowerCase();
        const cat = String(r.category || '').toLowerCase();
        const lane = String(r.laneWalaName || '').toLowerCase();
        if (!code.includes(q) && !name.includes(q) && !cat.includes(q) && !lane.includes(q)) {
          return false;
        }
      }

      return true;
    }).map(r => {
      // When a date is selected, display that date's grouped arrival quantity and arrival info
      if (!isAllData && (selectedDate || (startDate && endDate))) {
        let dateEntries = [];
        if (startDate && endDate) {
          dateEntries = r.matEntries.filter(e => {
            const arrD = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : '';
            const arrQty = parseFloat(e.arrivalQuantity || 0);
            return arrD >= startDate && arrD <= endDate && arrQty > 0;
          });
        } else if (selectedDate) {
          dateEntries = r.matEntries.filter(e => {
            const arrD = e.arrivalDate ? String(e.arrivalDate).substring(0, 10) : '';
            const arrQty = parseFloat(e.arrivalQuantity || 0);
            return arrD === selectedDate && arrQty > 0;
          });
        }
        const dateArrQty = calculateGroupedArrival(dateEntries);
        
        const sortedDateArrivals = [...dateEntries].sort((a, b) => new Date(b.arrivalDate) - new Date(a.arrivalDate));
        const specificArrival = sortedDateArrivals.length > 0 ? sortedDateArrivals[0] : null;

        const dateArrivalDateStr = specificArrival && specificArrival.arrivalDate ? String(specificArrival.arrivalDate).substring(0, 10) : r.rawArrivalDate;
        const dateArrivalTimeStr = specificArrival && specificArrival.arrivalTime ? specificArrival.arrivalTime : '';
        const dateArrivalDateTime = dateArrivalDateStr !== 'N/A' ? `${dateArrivalDateStr} ${dateArrivalTimeStr}`.trim() : r.arrivalDate;
        const dateLaneWala = specificArrival ? (specificArrival.broughtBy || 'N/A') : r.laneWalaName;

        return {
          ...r,
          arrivalQuantity: dateArrQty > 0 ? dateArrQty : r.totalArrival,
          arrivalDate: dateArrivalDateTime,
          rawArrivalDate: dateArrivalDateStr,
          laneWalaName: dateLaneWala
        };
      }
      return r;
    });
  }, [processedRows, availabilityFilter, selectedDate, startDate, endDate, mobileSearch, isAllData, rowModesModel]);

  const handleExportCSV = () => {
    const exportData = filteredRows.map(r => ({
      'Item Code': r.materialCode || 'N/A',
      'Item Name': r.name || 'N/A',
      'Category': r.category || 'Hardware',
      'Total Arrival Qty': r.arrivalQuantity || 0,
      'Now Available Stock': r.nowQuantity || 0,
      'Available Status': (r.nowQuantity > 0) ? 'YES' : 'NO',
      'Arrival Date': r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString() : 'N/A',
      'Arrival Time': r.arrivalTime || '',
      'Brought By': r.broughtBy || 'N/A'
    }));
    exportToCSV(exportData, `Materials_${availabilityFilter}_Stock_${new Date().toISOString().substring(0,10)}.csv`);
  };

  const handlePrintPDF = () => {
    const printData = filteredRows.map(r => ({
      code: r.materialCode || 'N/A',
      name: r.name || 'N/A',
      category: r.category || 'Hardware',
      arrivalQty: r.arrivalQuantity || 0,
      nowQty: Math.max(0, r.nowQuantity || 0),
      status: (r.nowQuantity > 0) ? 'YES' : 'NO',
      date: r.arrivalDate ? new Date(r.arrivalDate).toLocaleDateString() : 'N/A',
      broughtBy: r.broughtBy || 'N/A'
    }));

    const filterTitle = availabilityFilter === 'ALL' ? 'All Materials' : (availabilityFilter === 'YES' ? 'IN STOCK Materials' : 'OUT OF STOCK Materials');

    printPDF(printData, `Materials Master Summary Report (${filterTitle})`, [
      { field: 'code', headerName: 'Item Code' },
      { field: 'name', headerName: 'Material Name' },
      { field: 'category', headerName: 'Category' },
      { field: 'arrivalQty', headerName: 'Total Arrival Qty' },
      { field: 'nowQty', headerName: 'Current Stock Balance' },
      { field: 'status', headerName: 'Available Status' },
      { field: 'date', headerName: 'Last Arrival Date' },
      { field: 'broughtBy', headerName: 'Brought By' }
    ]);
  };

  return (
    <Box sx={{ height: { xs: 'calc(100vh - 120px)', sm: 'calc(100vh - 100px)' }, display: 'flex', flexDirection: 'column', p: { xs: 0, sm: 1, md: 2 }, maxWidth: '100vw', boxSizing: 'border-box' }}>
      {/* Header Bar */}
      <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1.5, mb: { xs: 1, md: 2 } }}>
        <Box sx={{ display: 'flex', flexDirection: { xs: 'column', sm: 'row' }, justifyContent: 'space-between', alignItems: { xs: 'stretch', sm: 'center' }, gap: 1.5 }}>
          <Typography variant="h4" fontWeight="bold" sx={{ px: { xs: 1.5, sm: 0 }, fontSize: { xs: '1.4rem', sm: '2.125rem' } }}>Materials</Typography>
          
          {/* Desktop Toolbar Controls */}
          <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1, flexWrap: 'wrap', alignItems: 'center' }}>
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
              <Typography variant="caption" fontWeight="bold">Stock:</Typography>
              <ToggleButtonGroup
                size="small"
                value={availabilityFilter}
                exclusive
                onChange={(e, val) => {
                  if (val) {
                    setAvailabilityFilter(val);
                    if (val === 'ALL') {
                      setIsAllData(true);
                      setSelectedDate('');
                      setStartDate('');
                      setEndDate('');
                    }
                  }
                }}
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

            {currentUser?.role !== 'USER' && (
              <Button 
                variant="contained" 
                color="primary" 
                startIcon={<AddIcon />} 
                sx={{ whiteSpace: 'nowrap' }}
                onClick={() => {
                  setNewMat(prev => ({ ...prev, arrivalDate: selectedDate || todayStr }));
                  setOpen(true);
                }}
              >
                Add Material
              </Button>
            )}
          </Box>
        </Box>

        {/* Desktop Date & Search Row */}
        <Box sx={{ display: { xs: 'none', md: 'flex' }, gap: 1.5, alignItems: 'center', flexWrap: 'wrap' }}>
          <TextField
            size="small"
            placeholder="Search code, name, category..."
            value={mobileSearch}
            onChange={(e) => setMobileSearch(e.target.value)}
            sx={{ minWidth: '240px', backgroundColor: '#fff' }}
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

          <Box display="flex" alignItems="center" gap={1}>
            <Typography variant="body2" fontWeight="bold" whiteSpace="nowrap">Sheet Date:</Typography>
            <input 
                type="date" 
                value={selectedDate} 
                onChange={(e) => {
                  setSelectedDate(e.target.value);
                  setIsAllData(false);
                  if (e.target.value) { setStartDate(''); setEndDate(''); }
                }} 
                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '150px' }}
            />
          </Box>

          <Typography variant="caption" fontWeight="bold" color="text.secondary">OR Range:</Typography>
          <Box display="flex" alignItems="center" gap={1}>
            <input 
                type="date" 
                value={startDate} 
                onChange={(e) => {
                  setStartDate(e.target.value);
                  setIsAllData(false);
                  if (e.target.value) setSelectedDate('');
                }} 
                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '140px' }}
            />
            <Typography variant="caption">to</Typography>
            <input 
                type="date" 
                value={endDate} 
                onChange={(e) => {
                  setEndDate(e.target.value);
                  setIsAllData(false);
                  if (e.target.value) setSelectedDate('');
                }} 
                style={{ padding: '6px 8px', borderRadius: '6px', border: '1px solid #ccc', maxWidth: '140px' }}
            />
          </Box>

          <Button 
            variant={isAllData ? "contained" : "outlined"} 
            color={isAllData ? "secondary" : "inherit"}
            size="small" 
            onClick={handleAllDataClick}
            sx={{ whiteSpace: 'nowrap', fontWeight: 'bold' }}
          >
            All Data
          </Button>
        </Box>
      </Box>

      <Paper sx={{ width: '100%', flexGrow: 1, borderRadius: { xs: 2, sm: 3 }, display: 'flex', flexDirection: 'column', overflow: 'hidden', minHeight: 0 }}>
        {loading ? (
           <Box display="flex" justifyContent="center" alignItems="center" height="100%"><CircularProgress /></Box>
        ) : (
          <>
            {/* Desktop View (md+) */}
            <Box sx={{ display: { xs: 'none', md: 'block' }, flexGrow: 1, width: '100%', height: '100%', minHeight: 0 }}>
              <DataGrid
                rows={filteredRows}
                columns={columns}
                editMode="row"
                density="comfortable"
                rowModesModel={rowModesModel}
                onRowModesModelChange={handleRowModesModelChange}
                processRowUpdate={processRowUpdate}
                onProcessRowUpdateError={(error) => alert(error.message || "Failed to update material.")}
                slots={{ toolbar: GridToolbar }}
                initialState={{
                  pagination: {
                    paginationModel: { page: 0, pageSize: 100 },
                  },
                }}
                pageSizeOptions={[25, 50, 100]}
                disableRowSelectionOnClick
                sx={{
                  border: 0,
                  '& .MuiDataGrid-columnHeaders': {
                    backgroundColor: '#f5f7fa',
                    borderBottom: '1px solid #e0e0e0',
                  },
                }}
              />
            </Box>

            {/* Mobile View (< md) with STICKY TOP TOOLBAR */}
            <Box sx={{ display: { xs: 'flex', md: 'none' }, flexDirection: 'column', height: '100%', overflow: 'hidden' }}>
              {/* Sticky Mobile Toolbar */}
              <Box sx={{ 
                p: 1.2, 
                borderBottom: '1px solid #e2e8f0', 
                display: 'flex', 
                flexDirection: 'column', 
                gap: 1, 
                backgroundColor: '#ffffff',
                position: 'sticky',
                top: 0,
                zIndex: 10,
                boxShadow: '0 2px 8px rgba(0,0,0,0.06)'
              }}>
                {/* Row 1: Search + Filters Toggle */}
                <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                  <TextField
                    fullWidth
                    size="small"
                    placeholder="Search code, name, category..."
                    value={mobileSearch}
                    onChange={(e) => setMobileSearch(e.target.value)}
                    InputProps={{
                      startAdornment: (
                        <InputAdornment position="start">
                          <SearchIcon fontSize="small" color="primary" />
                        </InputAdornment>
                      )
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

                {/* Row 2: Stock Availability Toggle + Add Material Button */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 1 }}>
                  <ToggleButtonGroup
                    size="small"
                    value={availabilityFilter}
                    exclusive
                    onChange={(e, val) => {
                      if (val) {
                        setAvailabilityFilter(val);
                        if (val === 'ALL') {
                          setIsAllData(true);
                          setSelectedDate('');
                          setStartDate('');
                          setEndDate('');
                        }
                      }
                    }}
                    color="primary"
                  >
                    <ToggleButton value="ALL" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold' }}>ALL</ToggleButton>
                    <ToggleButton value="YES" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'success.main' }}>YES (Stock)</ToggleButton>
                    <ToggleButton value="NO" sx={{ px: 1, py: 0.2, fontSize: '0.75rem', fontWeight: 'bold', color: 'error.main' }}>NO (Out)</ToggleButton>
                  </ToggleButtonGroup>

                  {currentUser?.role !== 'USER' && (
                    <Button 
                      variant="contained" 
                      color="primary" 
                      size="small"
                      startIcon={<AddIcon fontSize="small" />} 
                      onClick={() => {
                        setNewMat(prev => ({ ...prev, arrivalDate: selectedDate || todayStr }));
                        setOpen(true);
                      }}
                      sx={{ py: 0.4, px: 1.2, fontWeight: 'bold', fontSize: '0.75rem', whiteSpace: 'nowrap' }}
                    >
                      + Add
                    </Button>
                  )}
                </Box>

                {/* Collapsible Filters & Export Controls */}
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

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', justifyContent: 'space-between' }}>
                      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexGrow: 1 }}>
                        <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Date:</Typography>
                        <input 
                            type="date" 
                            value={selectedDate} 
                            onChange={(e) => {
                              setSelectedDate(e.target.value);
                              setIsAllData(false);
                              if (e.target.value) { setStartDate(''); setEndDate(''); }
                            }} 
                            style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.8rem', width: '100%' }}
                        />
                      </Box>
                      <Button 
                        variant={isAllData ? "contained" : "outlined"} 
                        color={isAllData ? "secondary" : "inherit"}
                        size="small" 
                        onClick={handleAllDataClick}
                        sx={{ whiteSpace: 'nowrap', fontWeight: 'bold', px: 1, py: 0.3, fontSize: '0.75rem' }}
                      >
                        All Data
                      </Button>
                    </Box>

                    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ fontWeight: 'bold', whiteSpace: 'nowrap' }}>Range:</Typography>
                      <input 
                          type="date" 
                          value={startDate} 
                          onChange={(e) => {
                            setStartDate(e.target.value);
                            setIsAllData(false);
                            if (e.target.value) setSelectedDate('');
                          }} 
                          style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', flexGrow: 1 }}
                      />
                      <Typography variant="caption">to</Typography>
                      <input 
                          type="date" 
                          value={endDate} 
                          onChange={(e) => {
                            setEndDate(e.target.value);
                            setIsAllData(false);
                            if (e.target.value) setSelectedDate('');
                          }} 
                          style={{ padding: '4px 6px', borderRadius: '6px', border: '1px solid #ccc', fontSize: '0.75rem', flexGrow: 1 }}
                      />
                    </Box>
                  </Box>
                )}
              </Box>

              {/* Cards List with full height scroll */}
              <Box sx={{ flexGrow: 1, overflowY: 'auto', p: 1.5, backgroundColor: '#f8fafc' }}>
                {filteredRows.length === 0 ? (
                  <Box sx={{ py: 6, textAlign: 'center', color: 'text.secondary' }}>
                    <Typography variant="body1">No materials found.</Typography>
                  </Box>
                ) : (
                  filteredRows.map((row) => (
                    <Card key={row.id} sx={{ mb: 1.5, borderRadius: 3, boxShadow: '0 2px 10px rgba(0,0,0,0.04)', border: '1px solid #e2e8f0' }}>
                      <CardContent sx={{ p: 2, '&:last-child': { pb: 2 } }}>
                        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', mb: 1 }}>
                          <Box sx={{ flexGrow: 1, mr: 1 }}>
                            <Typography variant="subtitle1" fontWeight="bold" color="primary.main" sx={{ lineHeight: 1.2 }}>
                              {row.materialCode}
                            </Typography>
                            <Typography variant="body2" fontWeight="medium" color="text.primary">
                              {row.name}
                            </Typography>
                          </Box>
                          <Chip label={row.category || 'Hardware'} color="primary" variant="outlined" size="small" sx={{ fontWeight: 'bold' }} />
                        </Box>

                        <Divider sx={{ my: 1 }} />

                        <Grid container spacing={1} sx={{ mt: 0.5 }}>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">Total Arrival</Typography>
                            <Typography variant="body2" fontWeight="bold">{row.arrivalQuantity || 0}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">Now Quantity (Balance)</Typography>
                            <Typography variant="body2" fontWeight="bold" color={row.nowQuantity > 0 ? 'success.main' : 'error.main'}>
                              {row.nowQuantity || 0}
                            </Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">Arrival Date & Time</Typography>
                            <Typography variant="body2">{row.arrivalDate || 'N/A'}</Typography>
                          </Grid>
                          <Grid item xs={6}>
                            <Typography variant="caption" color="text.secondary" display="block">Lane Wala Name</Typography>
                            <Typography variant="body2">{row.laneWalaName || 'N/A'}</Typography>
                          </Grid>
                        </Grid>

                        <Box sx={{ mt: 1.5, p: 1, borderRadius: 2, backgroundColor: row.availableInStore === 'YES' ? '#e6fffa' : '#ffe4e6', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <Typography variant="caption" fontWeight="bold" color="text.primary">Available In Store:</Typography>
                          <Chip
                            label={row.availableInStore}
                            color={row.availableInStore === 'YES' ? 'success' : 'error'}
                            size="small"
                            sx={{ fontWeight: 'bold' }}
                          />
                        </Box>

                        {currentUser?.role === 'SUPER_ADMIN' && (
                          <Box sx={{ display: 'flex', justifyContent: 'flex-end', gap: 1, mt: 1.5 }}>
                            <Button size="small" variant="outlined" color="error" startIcon={<DeleteIcon />} onClick={handleDeleteClick(row.id)}>
                              Delete
                            </Button>
                          </Box>
                        )}
                      </CardContent>
                    </Card>
                  ))
                )}
              </Box>
            </Box>
          </>
        )}
      </Paper>

      <Dialog open={open} onClose={() => setOpen(false)} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ fontWeight: 'bold' }}>Add New Material & Entry</DialogTitle>
          <DialogContent dividers>
              <Typography variant="subtitle2" color="primary" gutterBottom>Master Details (Required)</Typography>
               <Autocomplete
                  freeSolo
                  options={allUniqueMaterials.map(r => ({ code: r.materialCode, name: r.name, category: r.category, id: r.id }))}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.code || ''}
                  renderOption={(props, option) => (
                      <Box component="li" {...props} key={option.id}>
                          <Typography variant="body2">
                              <strong>{option.code}</strong> - {option.name} ({option.category})
                          </Typography>
                      </Box>
                  )}
                  value={newMat.code}
                  onChange={(event, newValue) => {
                      const selectedCode = typeof newValue === 'string' ? newValue : newValue?.code || '';
                      const match = allUniqueMaterials.find(r => r.materialCode.toLowerCase() === String(selectedCode).trim().toLowerCase());

                      setNewMat(prev => ({
                        ...prev,
                        code: selectedCode,
                        name: match ? match.name : (typeof newValue === 'object' && newValue?.name ? newValue.name : prev.name),
                        category: match ? (match.category || prev.category) : (typeof newValue === 'object' && newValue?.category ? newValue.category : prev.category),
                        arrivalQuantity: '',
                        arrivalDate: todayStr,
                        arrivalTime: '',
                        broughtBy: ''
                      }));
                  }}
                  onInputChange={(event, newInputValue) => {
                      const codeVal = newInputValue || '';
                      const match = allUniqueMaterials.find(r => r.materialCode.toLowerCase() === codeVal.trim().toLowerCase());

                      setNewMat(prev => ({
                        ...prev,
                        code: codeVal,
                        name: match ? match.name : prev.name,
                        category: match ? (match.category || prev.category) : prev.category,
                        arrivalQuantity: match ? prev.arrivalQuantity : '',
                        arrivalDate: prev.arrivalDate || todayStr,
                        arrivalTime: match ? prev.arrivalTime : '',
                        broughtBy: match ? prev.broughtBy : ''
                      }));
                  }}
                  renderInput={(params) => (
                      <TextField {...params} autoFocus margin="dense" label="Item Code (e.g. MAT-123)" fullWidth variant="outlined" />
                  )}
              />
              <Autocomplete
                  freeSolo
                  options={allUniqueMaterials.map(r => ({ code: r.materialCode, name: r.name, category: r.category, id: r.id }))}
                  getOptionLabel={(option) => typeof option === 'string' ? option : option.name || ''}
                  renderOption={(props, option) => (
                      <Box component="li" {...props} key={'name-' + option.id}>
                          <Typography variant="body2">
                              {option.name} (<strong>{option.code}</strong>)
                          </Typography>
                      </Box>
                  )}
                  value={newMat.name}
                  onChange={(event, newValue) => {
                      const selectedName = typeof newValue === 'string' ? newValue : newValue?.name || '';
                      const match = allUniqueMaterials.find(r => r.name.toLowerCase() === String(selectedName).trim().toLowerCase());

                      setNewMat(prev => ({
                        ...prev,
                        code: match ? match.materialCode : (typeof newValue === 'object' && newValue?.code ? newValue.code : prev.code),
                        name: selectedName,
                        category: match ? (match.category || prev.category) : (typeof newValue === 'object' && newValue?.category ? newValue.category : prev.category),
                        arrivalQuantity: '',
                        arrivalDate: todayStr,
                        arrivalTime: '',
                        broughtBy: ''
                      }));
                  }}
                  onInputChange={(event, newInputValue) => {
                      const nameVal = newInputValue || '';
                      const match = allUniqueMaterials.find(r => r.name.toLowerCase() === nameVal.trim().toLowerCase());

                      setNewMat(prev => ({
                        ...prev,
                        name: nameVal,
                        code: match ? match.materialCode : prev.code,
                        category: match ? (match.category || prev.category) : prev.category,
                        arrivalQuantity: match ? prev.arrivalQuantity : '',
                        arrivalDate: prev.arrivalDate || todayStr,
                        arrivalTime: match ? prev.arrivalTime : '',
                        broughtBy: match ? prev.broughtBy : ''
                      }));
                  }}
                  renderInput={(params) => (
                      <TextField {...params} margin="dense" label="Item Name" fullWidth variant="outlined" />
                  )}
              />
              <Autocomplete
                  freeSolo
                  options={['Hardware', 'Civil', 'Mechanical', 'Electrical', 'Fabrication', 'Other']}
                  value={newMat.category}
                  onChange={(event, newValue) => {
                      setNewMat({...newMat, category: newValue || ''});
                  }}
                  onInputChange={(event, newInputValue) => {
                      setNewMat({...newMat, category: newInputValue});
                  }}
                  renderInput={(params) => (
                      <TextField {...params} margin="dense" label="Category" fullWidth variant="outlined" />
                  )}
              />
              
              <Typography variant="subtitle2" color="primary" sx={{ mt: 2 }} gutterBottom>Initial Stock Entry (Optional)</Typography>
              <TextField margin="dense" label="Arrival Quantity" type="number" fullWidth variant="outlined" value={newMat.arrivalQuantity} onChange={e => setNewMat({...newMat, arrivalQuantity: e.target.value})} />
              <TextField margin="dense" label="Arrival Date" type="date" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} value={newMat.arrivalDate} onChange={e => setNewMat({...newMat, arrivalDate: e.target.value})} />
              <TextField margin="dense" label="Arrival Time (HH:MM)" type="time" fullWidth variant="outlined" InputLabelProps={{ shrink: true }} value={newMat.arrivalTime} onChange={e => setNewMat({...newMat, arrivalTime: e.target.value})} />
              <TextField margin="dense" label="Lane Wala Ka Name" fullWidth variant="outlined" value={newMat.broughtBy} onChange={e => setNewMat({...newMat, broughtBy: e.target.value})} />
          </DialogContent>
          <DialogActions sx={{ p: 2 }}>
              <Button onClick={() => setOpen(false)} color="inherit">Cancel</Button>
              <Button onClick={handleAddSubmit} variant="contained" disabled={!newMat.code || !newMat.name}>Add Material & Entry</Button>
          </DialogActions>
      </Dialog>
    </Box>
  );
};

export default Materials;
