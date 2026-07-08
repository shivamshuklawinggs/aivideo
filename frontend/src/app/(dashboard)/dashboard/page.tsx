'use client';
import React from 'react';
import {
  Box, Grid, Card, CardContent, Typography, Paper,
  LinearProgress, Chip, Button, List, ListItem,
  ListItemText, ListItemIcon, Divider, Avatar, IconButton,
} from '@mui/material';
import {
  Book, VideoLibrary, Description, Sync,
  PlayArrow, Refresh, TrendingUp, CheckCircle, Error, Pending,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { sukuyamiApi, DashboardStats } from '@/services/api/sukuyamiApi';

export default function DashboardPage() {
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: sukuyamiApi.getDashboardStats,
    refetchInterval: 30000,
  });

  const { data: cronStatus } = useQuery({
    queryKey: ['cronStatus'],
    queryFn: sukuyamiApi.getCronStatus,
    refetchInterval: 60000,
  });

  const runCronMutation = useMutation({
    mutationFn: (jobName: string) => sukuyamiApi.runCronJob(jobName),
    onSuccess: () => {
      toast.success('Cron job started successfully');
      queryClient.invalidateQueries({ queryKey: ['cronStatus'] });
    },
    onError: (err: any) => toast.error(`Failed: ${err.message}`),
  });

  const getStatusIcon = (status: string) => {
    if (status === 'completed') return <CheckCircle color="success" />;
    if (status === 'processing') return <Sync color="warning" />;
    if (status === 'failed') return <Error color="error" />;
    return <Pending color="inherit" />;
  };

  const getActivityIcon = (type: string) => {
    if (type === 'webtoon_added') return <Book color="primary" />;
    if (type === 'chapter_synced') return <Sync color="info" />;
    if (type === 'script_generated') return <Description color="secondary" />;
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
          { label: 'Generated Scripts', value: s.totalScripts, color: 'secondary.main', icon: <Description /> },
          { label: 'Generated Videos', value: s.totalVideos, color: 'success.main', icon: <VideoLibrary /> },
        ].map((item) => (
          <Grid item xs={12} sm={6} md={3} key={item.label}>
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
            <Typography variant="h6" gutterBottom>Processing Status</Typography>
            {[
              { label: 'Pending', value: s.processingStats.pending, color: 'default' as const },
              { label: 'Processing', value: s.processingStats.processing, color: 'warning' as const },
              { label: 'Completed', value: s.processingStats.completed, color: 'success' as const },
              { label: 'Failed', value: s.processingStats.failed, color: 'error' as const },
            ].map((item) => (
              <Box sx={{ mb: 2 }} key={item.label}>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                  <Typography variant="body2">{item.label}</Typography>
                  <Chip label={item.value} color={item.color} size="small" />
                </Box>
                <LinearProgress
                  variant="determinate"
                  value={(item.value / total) * 100}
                  color={item.color === 'default' ? 'inherit' : item.color}
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

        <Grid item xs={12}>
          <Paper sx={{ p: 2 }}>
            <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
              <Typography variant="h6">Automated Tasks</Typography>
              <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['cronStatus'] })}>
                <Refresh />
              </IconButton>
            </Box>
            <Grid container spacing={2}>
              {cronStatus && Object.entries(cronStatus).map(([jobName, status]: [string, any]) => (
                <Grid item xs={12} sm={6} md={3} key={jobName}>
                  <Card variant="outlined">
                    <CardContent>
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="subtitle2">{jobName.replace(/([A-Z])/g, ' $1').trim()}</Typography>
                        {getStatusIcon(status.isRunning ? 'processing' : 'completed')}
                      </Box>
                      <Typography variant="body2" color="textSecondary">
                        {status.isRunning ? 'Running' : 'Idle'}
                      </Typography>
                      {status.lastRun && (
                        <Typography variant="body2" color="textSecondary" sx={{ mt: 0.5 }}>
                          Last: {new Date(status.lastRun).toLocaleString()}
                        </Typography>
                      )}
                      <Box display="flex" justifyContent="space-between" mt={1} mb={1}>
                        <Typography variant="body2">✓ {status.successCount}</Typography>
                        <Typography variant="body2">✗ {status.failureCount}</Typography>
                      </Box>
                      <Button
                        fullWidth variant="outlined" size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => runCronMutation.mutate(jobName)}
                        disabled={runCronMutation.isPending}
                      >
                        Run Now
                      </Button>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}
