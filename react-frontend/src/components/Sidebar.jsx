import React from 'react';
import { Drawer, List, ListItem, ListItemButton, ListItemIcon, ListItemText, Toolbar, Box, Typography } from '@mui/material';
import { Dashboard as DashboardIcon, Inventory as InventoryIcon, TableChart as TableChartIcon, Assessment as AssessmentIcon, People as PeopleIcon, HelpOutline as HelpIcon } from '@mui/icons-material';
import { useLocation, useNavigate } from 'react-router-dom';
import useAuthStore from '../store/authStore';

const drawerWidth = 240;

const Sidebar = ({ mobileOpen, handleDrawerToggle }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const user = useAuthStore(state => state.user);

  let menuItems = [
    { text: 'Entry Book', icon: <TableChartIcon />, path: '/entry-book' },
    { text: 'Materials', icon: <InventoryIcon />, path: '/materials' },
    { text: 'MIS Report', icon: <AssessmentIcon />, path: '/mis-report' },
    { text: 'Help', icon: <HelpIcon />, path: '/help' }
  ];

  if (user?.role === 'SUPER_ADMIN') {
    menuItems.push({ text: 'User Management', icon: <PeopleIcon />, path: '/users' });
  }

  const drawerContent = (
    <>
      <Toolbar>
        <Box display="flex" alignItems="center" gap={1}>
          <img src="/logo.svg" alt="FR Logo" style={{ width: '32px', height: '32px' }} />
          <Typography variant="h6" color="primary" sx={{ fontWeight: 'bold' }}>
            Finsen Ritter
          </Typography>
        </Box>
      </Toolbar>
      <Box sx={{ overflow: 'auto' }}>
        <List>
          {menuItems.map((item) => {
            const isSelected = location.pathname.startsWith(item.path);
            return (
              <ListItem key={item.text} disablePadding>
                <ListItemButton 
                  selected={isSelected}
                  onClick={() => {
                    navigate(item.path);
                    if (handleDrawerToggle) handleDrawerToggle(); // Close on mobile click
                  }}
                  sx={{
                    mx: 1,
                    my: 0.5,
                    borderRadius: 2, // More rounded for modern look
                    padding: '10px 16px', // Taller buttons
                    '&.Mui-selected': {
                      backgroundColor: 'primary.light',
                      color: 'primary.contrastText',
                      '&:hover': {
                        backgroundColor: 'primary.main',
                      },
                      '& .MuiListItemIcon-root': {
                        color: 'primary.contrastText',
                      }
                    }
                  }}
                >
                  <ListItemIcon sx={{ color: isSelected ? 'inherit' : 'text.secondary', minWidth: 40 }}>
                    {item.icon}
                  </ListItemIcon>
                  <ListItemText primary={item.text} primaryTypographyProps={{ fontWeight: isSelected ? 600 : 400, fontSize: '1.05rem' }} />
                </ListItemButton>
              </ListItem>
            );
          })}
        </List>
      </Box>
    </>
  );

  return (
    <Box
      component="nav"
      sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}
    >
      {/* Mobile Drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={handleDrawerToggle}
        ModalProps={{
          keepMounted: true, // Better open performance on mobile.
        }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        {drawerContent}
      </Drawer>
      
      {/* Desktop Drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth, borderRight: '1px solid #E2E8F0' },
        }}
        open
      >
        {drawerContent}
      </Drawer>
    </Box>
  );
};
export default Sidebar;
