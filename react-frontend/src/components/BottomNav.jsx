import React from 'react';
import { Paper, BottomNavigation, BottomNavigationAction } from '@mui/material';
import { TableChart, Inventory, Assessment, People, HelpOutline } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const BottomNav = () => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  // Helper to determine the active tab based on pathname
  let currentValue = location.pathname;
  if (!['/entry-book', '/materials', '/mis-report', '/users', '/help'].includes(currentValue)) {
    currentValue = '/entry-book';
  }

  return (
    <Paper sx={{ position: 'fixed', bottom: 0, left: 0, right: 0, zIndex: 1000, display: { xs: 'block', sm: 'none' } }} elevation={10}>
      <BottomNavigation
        showLabels
        value={currentValue}
        onChange={(event, newValue) => {
          navigate(newValue);
        }}
        sx={{
          '& .MuiBottomNavigationAction-root': { minWidth: 'auto', padding: '6px 0px' },
          '& .MuiBottomNavigationAction-label': { fontSize: '0.65rem', '&.Mui-selected': { fontSize: '0.7rem' } }
        }}
      >
        <BottomNavigationAction label="Entry" value="/entry-book" icon={<TableChart />} />
        <BottomNavigationAction label="Stock" value="/materials" icon={<Inventory />} />
        <BottomNavigationAction label="MIS" value="/mis-report" icon={<Assessment />} />
        {user?.role === 'SUPER_ADMIN' && (
           <BottomNavigationAction label="Users" value="/users" icon={<People />} />
        )}
        <BottomNavigationAction label="Help" value="/help" icon={<HelpOutline />} />
      </BottomNavigation>
    </Paper>
  );
};

export default BottomNav;
