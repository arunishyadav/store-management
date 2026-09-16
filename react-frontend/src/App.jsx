import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, Outlet } from 'react-router-dom';
import { Box, Toolbar } from '@mui/material';
import useAuthStore from './store/authStore';
import Header from './components/Header';
import Sidebar from './components/Sidebar';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Materials from './pages/Materials';
import StockLedger from './pages/StockLedger';
import MISReport from './pages/MISReport';
import UserManagement from './pages/UserManagement';
import HelpSupport from './pages/HelpSupport';
import BottomNav from './components/BottomNav';
import AiChatbot from './components/AiChatbot';

const ProtectedLayout = () => {
  const token = useAuthStore((state) => state.token);
  const [mobileOpen, setMobileOpen] = React.useState(false);

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  const handleDrawerToggle = () => {
    setMobileOpen(!mobileOpen);
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <Header onDrawerToggle={handleDrawerToggle} />
      <Sidebar mobileOpen={mobileOpen} handleDrawerToggle={handleDrawerToggle} />
      <Box component="main" sx={{ 
        flexGrow: 1, 
        p: { xs: 1, sm: 2, md: 3 },
        pb: { xs: 8, sm: 2, md: 3 }, // Extra space for BottomNav on mobile
        backgroundColor: 'background.default', 
        minHeight: '100vh',
        width: { xs: '100%', sm: `calc(100% - 240px)` },
        maxWidth: '100vw',
        boxSizing: 'border-box',
        overflowX: 'hidden'
      }}>
        <Toolbar />
        <Outlet />
      </Box>
      <BottomNav />
      <AiChatbot />
    </Box>
  );
};

const App = () => {
  const token = useAuthStore((state) => state.token);

  return (
    <BrowserRouter>
      <Routes>
        <Route path="/login" element={token ? <Navigate to="/entry-book" replace /> : <Login />} />
        
        <Route path="/" element={<ProtectedLayout />}>
          <Route index element={<Navigate to="/entry-book" replace />} />
          <Route path="entry-book" element={<StockLedger />} />
          <Route path="materials" element={<Materials />} />
          <Route path="mis-report" element={<MISReport />} />
          <Route path="users" element={<UserManagement />} />
          <Route path="help" element={<HelpSupport />} />
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
};

export default App;
