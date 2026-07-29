'use client';
import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  LinearProgress, Chip, List, ListItem,
  ListItemText, ListItemIcon, Divider, Avatar,
} from '@mui/material';
import {
  Book, VideoLibrary, Sync, TrendingUp,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { sukuyamiApi, DashboardStats } from '@/services/api/sukuyamiApi';

export default function DashboardPage() {

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: sukuyamiApi.getDashboardStats,
    refetchInterval: 30000,
  });

  const getActivityIcon = (type: string) => {
    if (type === 'webtoon_added') return <Book color="primary" />;
    if (type === 'chapter_synced') return <Sync color="info" />;
    if (type === 'video_generated') return <VideoLibrary color="success" />;
    return <TrendingUp />;
  };

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load dashboard data</Typography></Box>;

  const s = stats as DashboardStats;
  const total = s.processingStats.pending + s.processingStats.processing + s.processingStats.completed + s.processingStats.failed || 1;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>Dashboard</Typography>

      <Grid container spacing={3} sx={{ mb: 4 }}>
        {[
          { label: 'Total Webtoons', value: s.totalWebtoons, color: 'primary.main', icon: <Book /> },
          { label: 'Total Chapters', value: s.totalChapters, color: 'info.main', icon: <VideoLibrary /> },
          { label: 'Read Chapters', value: s.totalScripts, color: 'success.main', icon: <VideoLibrary /> },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={4} key={item.label}>
            <Card>
              <CardContent>
                <Box display="flex" alignItems="center">
                  <Avatar sx={{ bgcolor: item.color, mr: 2 }}>{item.icon}</Avatar>
                  <Box>
                    <Typography variant="h4">{item.value}</Typography>
                    <Typography color="textSecondary">{item.label}</Typography>
                  </Box>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>Reading Progress</Typography>
            {[
              { label: 'Read', value: s.processingStats.completed, color: 'success' as const },
              { label: 'Unread', value: s.totalChapters - s.processingStats.completed, color: 'warning' as const },
            ].map((item) => (
              <Box sx={{ mb: 2 }} key={item.label}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">{item.label}</Typography>
                  <Chip label={item.value} color={item.color} size="small" />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(item.value / total) * 100}
                  color={item.color}
                />
              </Box>
            ))}
          </Paper>
        </Grid>

        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>Recent Activity</Typography>
            <List>
              {s.recentActivity.map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>{getActivityIcon(activity.type)}</ListItemIcon>
                    <ListItemText
                      primary={activity.webtoonTitle}
                      secondary={`${activity.type.replace('_', ' ')} • ${new Date(activity.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                  {index < s.recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
