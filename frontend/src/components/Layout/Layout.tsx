import React, { useState } from 'react';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import {
  Box,
  Drawer,
  AppBar,
  Toolbar,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Typography,
  IconButton,
  Avatar,
  Menu,
  MenuItem,
  Badge,
  Tooltip,
  Divider,
} from '@mui/material';
import {
  Menu as MenuIcon,
  Dashboard,
  Book,
  Upload,
  Mic,
  VideoLibrary,
  Settings,
  AccountCircle,
  Notifications,
  Logout,
  Movie,
  Queue,
  Description,
} from '@mui/icons-material';

import { useAppSelector, useAppDispatch } from '../../store';
import { toggleSidebar } from '../../store/slices/uiSlice';
import { logout } from '../../store/slices/authSlice';
import { useAppSelector as useAuthSelector } from '../../store';

const drawerWidth = 280;

const Layout: React.FC = () => {
  const dispatch = useAppDispatch();
  const navigate = useNavigate();
  const location = useLocation();
  const { sidebarOpen } = useAppSelector((state) => state.ui);
  const { user } = useAuthSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [notificationAnchor, setNotificationAnchor] = useState<null | HTMLElement>(null);

  const menuItems = [
    { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
    { text: 'Webtoon Library', icon: <Book />, path: '/webtoons' },
    { text: 'Upload Comic', icon: <Upload />, path: '/upload' },
    { text: 'Voice Profiles', icon: <Mic />, path: '/voice-profiles' },
    { text: 'Video Editor', icon: <Movie />, path: '/video-editor' },
    { text: 'Render Queue', icon: <Queue />, path: '/render-queue' },
    { text: 'Generated Videos', icon: <VideoLibrary />, path: '/videos' },
    { text: 'Scripts', icon: <Description />, path: '/scripts' },
    { text: 'Settings', icon: <Settings />, path: '/settings' },
  ];

  const handleProfileMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setAnchorEl(event.currentTarget);
  };

  const handleProfileMenuClose = () => {
    setAnchorEl(null);
  };

  const handleNotificationMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setNotificationAnchor(event.currentTarget);
  };

  const handleNotificationMenuClose = () => {
    setNotificationAnchor(null);
  };

  const handleLogout = () => {
    dispatch(logout());
    navigate('/login');
    handleProfileMenuClose();
  };

  const handleDrawerToggle = () => {
    dispatch(toggleSidebar());
  };

  return (
    <Box sx={{ display: 'flex' }}>
      <AppBar
        position="fixed"
        sx={{
          width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          ml: sidebarOpen ? `${drawerWidth}px` : 0,
          bgcolor: '#1a1a2e',
          boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
        }}
      >
        <Toolbar>
          <IconButton
            color="inherit"
            aria-label="open drawer"
            onClick={handleDrawerToggle}
            edge="start"
            sx={{ mr: 2 }}
          >
            <MenuIcon />
          </IconButton>

          <Typography variant="h6" noWrap component="div" sx={{ flexGrow: 1 }}>
            <span className="text-gradient">AI Webtoon Explainer</span>
          </Typography>

          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Tooltip title="Notifications">
              <IconButton color="inherit" onClick={handleNotificationMenuOpen}>
                <Badge badgeContent={3} color="error">
                  <Notifications />
                </Badge>
              </IconButton>
            </Tooltip>

            <Tooltip title="Profile">
              <IconButton
                onClick={handleProfileMenuOpen}
                sx={{ p: 0 }}
              >
                <Avatar sx={{ bgcolor: '#8b5cf6', width: 32, height: 32 }}>
                  {user?.name?.charAt(0).toUpperCase() || 'U'}
                </Avatar>
              </IconButton>
            </Tooltip>
          </Box>
        </Toolbar>
      </AppBar>

      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleProfileMenuClose}
        onClick={handleProfileMenuClose}
        PaperProps={{
          sx: {
            mt: 2,
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
            '& .MuiListItemIcon': {
              color: '#a0a0b8',
            },
            '& .MuiListItemText-primary': {
              color: '#ffffff',
            },
          },
        }}
      >
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <AccountCircle />
          </ListItemIcon>
          Profile
        </MenuItem>
        <MenuItem onClick={() => { navigate('/settings'); handleProfileMenuClose(); }}>
          <ListItemIcon>
            <Settings />
          </ListItemIcon>
          Settings
        </MenuItem>
        <Divider sx={{ borderColor: '#2a2a3e' }} />
        <MenuItem onClick={handleLogout}>
          <ListItemIcon>
            <Logout />
          </ListItemIcon>
          Logout
        </MenuItem>
      </Menu>

      <Menu
        anchorEl={notificationAnchor}
        open={Boolean(notificationAnchor)}
        onClose={handleNotificationMenuClose}
        PaperProps={{
          sx: {
            mt: 2,
            width: 320,
            maxHeight: 400,
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <Box sx={{ p: 2, borderBottom: '1px solid #2a2a3e' }}>
          <Typography variant="h6">Notifications</Typography>
        </Box>
        <MenuItem sx={{ py: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#8b5cf6' }}>
              Video Rendering Completed
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
              Your video "Chapter 1 Explanation" is ready
            </Typography>
          </Box>
        </MenuItem>
        <MenuItem sx={{ py: 2 }}>
          <Box>
            <Typography variant="body2" sx={{ color: '#10b981' }}>
              Voice Profile Ready
            </Typography>
            <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
              Your voice profile "Narrator" is ready to use
            </Typography>
          </Box>
        </MenuItem>
      </Menu>

      <Drawer
        variant={sidebarOpen ? 'persistent' : 'temporary'}
        open={sidebarOpen}
        onClose={handleDrawerToggle}
        sx={{
          width: drawerWidth,
          flexShrink: 0,
          '& .MuiDrawer-paper': {
            width: drawerWidth,
            boxSizing: 'border-box',
            bgcolor: '#1a1a2e',
            border: 'none',
          },
        }}
      >
        <Toolbar />
        <Box sx={{ overflow: 'auto', py: 2 }}>
          <List>
            {menuItems.map((item) => (
              <ListItem key={item.text} disablePadding>
                <ListItemButton
                  onClick={() => navigate(item.path)}
                  selected={location.pathname === item.path}
                  sx={{
                    mx: 1,
                    borderRadius: 2,
                    '&.Mui-selected': {
                      bgcolor: 'rgba(139, 92, 246, 0.1)',
                      '&:hover': {
                        bgcolor: 'rgba(139, 92, 246, 0.15)',
                      },
                      '& .MuiListItemIcon': {
                        color: '#8b5cf6',
                      },
                      '& .MuiListItemText-primary': {
                        color: '#8b5cf6',
                        fontWeight: 500,
                      },
                    },
                    '&:hover': {
                      bgcolor: 'rgba(255, 255, 255, 0.05)',
                    },
                    '& .MuiListItemIcon': {
                      color: '#a0a0b8',
                    },
                    '& .MuiListItemText-primary': {
                      color: '#ffffff',
                    },
                  }}
                >
                  <ListItemIcon>{item.icon}</ListItemIcon>
                  <ListItemText primary={item.text} />
                </ListItemButton>
              </ListItem>
            ))}
          </List>
        </Box>
      </Drawer>

      <Box
        component="main"
        sx={{
          flexGrow: 1,
          p: 3,
          width: sidebarOpen ? `calc(100% - ${drawerWidth}px)` : '100%',
          minHeight: '100vh',
          bgcolor: '#0f0f23',
        }}
      >
        <Toolbar />
        <Outlet />
      </Box>
    </Box>
  );
};

export default Layout;
