import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Paper,
  LinearProgress,
  Chip,
  Button,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  Divider,
  Avatar,
  IconButton,
} from '@mui/material';
import {
  Book,
  VideoLibrary,
  Description,
  Sync,
  PlayArrow,
  Refresh,
  TrendingUp,
  CheckCircle,
  Error,
  Pending,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { sukuyamiApi, DashboardStats } from '../../services/api/sukuyamiApi';

const DashboardPage: React.FC = () => {
  const queryClient = useQueryClient();

  const { data: stats, isLoading, error } = useQuery({
    queryKey: ['dashboardStats'],
    queryFn: () => sukuyamiApi.getDashboardStats(),
    refetchInterval: 30000, // Refresh every 30 seconds
  });

  const { data: cronStatus } = useQuery({
    queryKey: ['cronStatus'],
    queryFn: () => sukuyamiApi.getCronStatus(),
    refetchInterval: 60000, // Refresh every minute
  });

  const runCronMutation = useMutation({
    mutationFn: (jobName: string) => sukuyamiApi.runCronJob(jobName),
    onSuccess: () => {
      toast.success('Cron job started successfully');
      queryClient.invalidateQueries({ queryKey: ['cronStatus'] });
    },
    onError: (error: any) => {
      toast.error(`Failed to run cron job: ${error.message}`);
    },
  });

  const handleRunCronJob = (jobName: string) => {
    runCronMutation.mutate(jobName);
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <Sync color="warning" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return <Pending color="inherit" />;
    }
  };

  const getActivityIcon = (type: string) => {
    switch (type) {
      case 'webtoon_added':
        return <Book color="primary" />;
      case 'chapter_synced':
        return <Sync color="info" />;
      case 'script_generated':
        return <Description color="secondary" />;
      case 'video_generated':
        return <VideoLibrary color="success" />;
      default:
        return <TrendingUp />;
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load dashboard data</Typography>
      </Box>
    );
  }

  const dashboardStats = stats as DashboardStats;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>
        Dashboard
      </Typography>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'primary.main', mr: 2 }}>
                  <Book />
                </Avatar>
                <Box>
                  <Typography variant="h4">{dashboardStats.totalWebtoons}</Typography>
                  <Typography color="textSecondary">Total Webtoons</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'info.main', mr: 2 }}>
                  <VideoLibrary />
                </Avatar>
                <Box>
                  <Typography variant="h4">{dashboardStats.totalChapters}</Typography>
                  <Typography color="textSecondary">Total Chapters</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'secondary.main', mr: 2 }}>
                  <Description />
                </Avatar>
                <Box>
                  <Typography variant="h4">{dashboardStats.totalScripts}</Typography>
                  <Typography color="textSecondary">Generated Scripts</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Box display="flex" alignItems="center">
                <Avatar sx={{ bgcolor: 'success.main', mr: 2 }}>
                  <VideoLibrary />
                </Avatar>
                <Box>
                  <Typography variant="h4">{dashboardStats.totalVideos}</Typography>
                  <Typography color="textSecondary">Generated Videos</Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <Grid container spacing={3}>
        {/* Processing Status */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Processing Status
            </Typography>
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Pending</Typography>
                <Chip label={dashboardStats.processingStats.pending} color="default" size="small" />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(dashboardStats.processingStats.pending / (dashboardStats.processingStats.pending + dashboardStats.processingStats.processing + dashboardStats.processingStats.completed + dashboardStats.processingStats.failed)) * 100} 
              />
            </Box>
            
            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Processing</Typography>
                <Chip label={dashboardStats.processingStats.processing} color="warning" size="small" />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(dashboardStats.processingStats.processing / (dashboardStats.processingStats.pending + dashboardStats.processingStats.processing + dashboardStats.processingStats.completed + dashboardStats.processingStats.failed)) * 100} 
                color="warning"
              />
            </Box>

            <Box sx={{ mb: 2 }}>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Completed</Typography>
                <Chip label={dashboardStats.processingStats.completed} color="success" size="small" />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(dashboardStats.processingStats.completed / (dashboardStats.processingStats.pending + dashboardStats.processingStats.processing + dashboardStats.processingStats.completed + dashboardStats.processingStats.failed)) * 100} 
                color="success"
              />
            </Box>

            <Box>
              <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                <Typography variant="body2">Failed</Typography>
                <Chip label={dashboardStats.processingStats.failed} color="error" size="small" />
              </Box>
              <LinearProgress 
                variant="determinate" 
                value={(dashboardStats.processingStats.failed / (dashboardStats.processingStats.pending + dashboardStats.processingStats.processing + dashboardStats.processingStats.completed + dashboardStats.processingStats.failed)) * 100} 
                color="error"
              />
            </Box>
          </Paper>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={6}>
          <Paper sx={{ p: 2, maxHeight: 400, overflow: 'auto' }}>
            <Typography variant="h6" gutterBottom>
              Recent Activity
            </Typography>
            <List>
              {dashboardStats.recentActivity.map((activity, index) => (
                <React.Fragment key={index}>
                  <ListItem>
                    <ListItemIcon>
                      {getActivityIcon(activity.type)}
                    </ListItemIcon>
                    <ListItemText
                      primary={activity.webtoonTitle}
                      secondary={`${activity.type.replace('_', ' ')} - ${new Date(activity.timestamp).toLocaleString()}`}
                    />
                  </ListItem>
                  {index < dashboardStats.recentActivity.length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          </Paper>
        </Grid>

        {/* Cron Job Status */}
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
                        <Typography variant="subtitle2">
                          {jobName.replace(/([A-Z])/g, ' $1').trim()}
                        </Typography>
                        {getStatusIcon(status.isRunning ? 'processing' : 'completed')}
                      </Box>
                      
                      <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                        Status: {status.isRunning ? 'Running' : 'Idle'}
                      </Typography>
                      
                      {status.lastRun && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                          Last Run: {new Date(status.lastRun).toLocaleString()}
                        </Typography>
                      )}
                      
                      {status.nextRun && (
                        <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                          Next Run: {new Date(status.nextRun).toLocaleString()}
                        </Typography>
                      )}
                      
                      <Box display="flex" justifyContent="space-between" alignItems="center" mb={1}>
                        <Typography variant="body2">
                          Success: {status.successCount}
                        </Typography>
                        <Typography variant="body2">
                          Failed: {status.failureCount}
                        </Typography>
                      </Box>
                      
                      <Button
                        fullWidth
                        variant="outlined"
                        size="small"
                        startIcon={<PlayArrow />}
                        onClick={() => handleRunCronJob(jobName)}
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
};

export default DashboardPage;
