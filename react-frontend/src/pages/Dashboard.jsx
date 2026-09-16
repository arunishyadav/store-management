import React, { useState, useEffect } from 'react';
import { Box, Grid, Card, CardContent, Typography, CircularProgress } from '@mui/material';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend, LabelList } from 'recharts';
import Inventory2OutlinedIcon from '@mui/icons-material/Inventory2Outlined';
import WarningAmberOutlinedIcon from '@mui/icons-material/WarningAmberOutlined';
import CheckCircleOutlineOutlinedIcon from '@mui/icons-material/CheckCircleOutlineOutlined';
import LocalShippingOutlinedIcon from '@mui/icons-material/LocalShippingOutlined';
import api from '../services/api';
import useAuthStore from '../store/authStore';

const StatCard = ({ title, value, icon, color }) => (
  <Card sx={{ height: '100%' }}>
    <CardContent sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
      <Box>
        <Typography color="text.secondary" gutterBottom variant="subtitle2">
          {title}
        </Typography>
        <Typography variant="h4" color="text.primary">
          {value}
        </Typography>
      </Box>
      <Box sx={{ backgroundColor: `${color}15`, p: 1.5, borderRadius: 2, display: 'flex' }}>
        {React.cloneElement(icon, { sx: { color, fontSize: 32 } })}
      </Box>
    </CardContent>
  </Card>
);

const Dashboard = () => {
  const [categoryData, setCategoryData] = useState({});
  const [loading, setLoading] = useState(true);

  const selectedLocation = useAuthStore(state => state.selectedLocation);

  useEffect(() => {
    fetchDashboardData();
  }, [selectedLocation]);

  const fetchDashboardData = async () => {
    setLoading(true);
    try {
      const url = selectedLocation?.id 
        ? `/api/v1/dashboard/charts?locationId=${selectedLocation.id}`
        : `/api/v1/dashboard/charts`;
      const response = await api.get(url);
      setCategoryData(response.data);
      setLoading(false);
    } catch (error) {
      console.error("Error fetching dashboard data:", error);
      setLoading(false);
    }
  };

  if (loading) {
    return <Box sx={{ display: 'flex', justifyContent: 'center', mt: 5 }}><CircularProgress /></Box>;
  }

  // Calculate totals for StatCards
  let totalItems = 0;
  let totalStock = 0;
  let totalOutgoing = 0;

  Object.values(categoryData).forEach(items => {
    totalItems += items.length;
    items.forEach(item => {
      totalStock += item.stock || 0;
      totalOutgoing += item.outgoing || 0;
    });
  });

  return (
    <Box>
      <Typography variant="h5" sx={{ mb: 4, fontWeight: 'bold', color: 'primary.main' }}>
        Dashboard Overview
      </Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Products" 
            value={totalItems} 
            icon={<Inventory2OutlinedIcon />} 
            color="#0B4F6C" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Items In Stock" 
            value={totalStock} 
            icon={<CheckCircleOutlineOutlinedIcon />} 
            color="#2e7d32" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="Total Issued Items" 
            value={totalOutgoing} 
            icon={<LocalShippingOutlinedIcon />} 
            color="#ed6c02" 
          />
        </Grid>
        <Grid item xs={12} sm={6} md={3}>
          <StatCard 
            title="System Status" 
            value="Active" 
            icon={<WarningAmberOutlinedIcon />} 
            color="#d32f2f" 
          />
        </Grid>
      </Grid>

      {Object.keys(categoryData).length === 0 ? (
        <Typography variant="body1">No chart data available. Please add material stock entries.</Typography>
      ) : (
        Object.entries(categoryData).map(([category, data]) => (
          <Card key={category} sx={{ mb: 4 }}>
            <CardContent>
              <Typography variant="h6" sx={{ mb: 3 }}>
                Stock Overview: {category}
              </Typography>
              <Box sx={{ height: 400, width: '100%' }}>
                <ResponsiveContainer>
                  <BarChart
                    data={data}
                    margin={{ top: 20, right: 30, left: 20, bottom: 5 }}
                  >
                    <CartesianGrid strokeDasharray="3 3" vertical={false} />
                    <XAxis dataKey="name" />
                    <YAxis />
                    <Tooltip 
                      cursor={{fill: 'rgba(0,0,0,0.05)'}}
                      contentStyle={{ borderRadius: 8, border: 'none', boxShadow: '0 4px 6px rgba(0,0,0,0.1)' }}
                    />
                    <Legend />
                    <Bar dataKey="stock" name="Available Stock" fill="#2e7d32" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="stock" position="top" style={{ fill: '#2e7d32', fontSize: 12, fontWeight: 'bold' }} />
                    </Bar>
                    <Bar dataKey="outgoing" name="Total Issued" fill="#d32f2f" radius={[4, 4, 0, 0]}>
                      <LabelList dataKey="outgoing" position="top" style={{ fill: '#d32f2f', fontSize: 12, fontWeight: 'bold' }} />
                    </Bar>
                  </BarChart>
                </ResponsiveContainer>
              </Box>
            </CardContent>
          </Card>
        ))
      )}
    </Box>
  );
};

export default Dashboard;
