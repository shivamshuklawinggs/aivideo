'use client';
import React from 'react';
import {
  Drawer, List, ListItem, ListItemButton, ListItemIcon,
  ListItemText, Toolbar, Typography, Divider, Box,
} from '@mui/material';
import {
  Dashboard, Book, VideoLibrary, Description,
  Search, Settings,
} from '@mui/icons-material';
import { useRouter, usePathname } from 'next/navigation';

const drawerWidth = 240;

const menuItems = [
  { text: 'Dashboard', icon: <Dashboard />, path: '/dashboard' },
  { text: 'Webtoons', icon: <Book />, path: '/webtoons' },
  { text: 'Chapters', icon: <VideoLibrary />, path: '/chapters' },
  { text: 'Scripts', icon: <Description />, path: '/scripts' },
  { text: 'Search', icon: <Search />, path: '/search' },
  { text: 'Settings', icon: <Settings />, path: '/settings' },
];

interface SidebarProps {
  mobileOpen: boolean;
  onClose: () => void;
}

const DrawerContent = () => {
  const router = useRouter();
  const pathname = usePathname();

  return (
    <div>
      <Toolbar>
        <Typography variant="h6" noWrap component="div" sx={{ fontWeight: 700 }}>
          AI Webtoon
        </Typography>
      </Toolbar>
      <Divider />
      <List>
        {menuItems.map((item) => (
          <ListItem key={item.text} disablePadding>
            <ListItemButton
              selected={pathname === item.path || pathname.startsWith(item.path + '/')}
              onClick={() => router.push(item.path)}
              sx={{
                '&.Mui-selected': {
                  bgcolor: 'rgba(139, 92, 246, 0.15)',
                  borderRight: '3px solid #8b5cf6',
                },
                '&.Mui-selected:hover': { bgcolor: 'rgba(139, 92, 246, 0.2)' },
              }}
            >
              <ListItemIcon sx={{ color: pathname === item.path ? 'primary.main' : 'inherit' }}>
                {item.icon}
              </ListItemIcon>
              <ListItemText primary={item.text} />
            </ListItemButton>
          </ListItem>
        ))}
      </List>
    </div>
  );
};

export default function Sidebar({ mobileOpen, onClose }: SidebarProps) {
  return (
    <Box component="nav" sx={{ width: { sm: drawerWidth }, flexShrink: { sm: 0 } }}>
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', sm: 'none' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
      >
        <DrawerContent />
      </Drawer>
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', sm: 'block' },
          '& .MuiDrawer-paper': { boxSizing: 'border-box', width: drawerWidth },
        }}
        open
      >
        <DrawerContent />
      </Drawer>
    </Box>
  );
}

export { drawerWidth };
