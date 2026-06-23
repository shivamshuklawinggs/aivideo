import React from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  LinearProgress,
  Avatar,
  Chip,
  IconButton,
  Tooltip,
} from '@mui/material';
import {
  Book,
  VideoLibrary,
  Mic,
  TrendingUp,
  PlayArrow,
  Upload,
  Settings,
  Refresh,
} from '@mui/icons-material';

import { useAppSelector } from '../../store';

const DashboardPage: React.FC = () => {
  const { user } = useAppSelector((state) => state.auth);
  const { webtoons } = useAppSelector((state) => state.webtoon);
  const { videos } = useAppSelector((state) => state.video);
  const { voiceProfiles } = useAppSelector((state) => state.voice);

  const stats = [
    {
      title: 'Total Webtoons',
      value: webtoons.length,
      icon: <Book />,
      color: '#8b5cf6',
      link: '/webtoons',
    },
    {
      title: 'Generated Videos',
      value: videos.length,
      icon: <VideoLibrary />,
      color: '#ec4899',
      link: '/videos',
    },
    {
      title: 'Voice Profiles',
      value: voiceProfiles.length,
      icon: <Mic />,
      color: '#10b981',
      link: '/voice-profiles',
    },
    {
      title: 'Storage Used',
      value: user ? `${Math.round((user.usage.storageUsed / user.usage.monthlyStorageLimit) * 100)}%` : '0%',
      icon: <TrendingUp />,
      color: '#f59e0b',
      link: '/settings',
    },
  ];

  const recentActivity = [
    {
      id: 1,
      type: 'video',
      title: 'Chapter 1 Explanation',
      status: 'completed',
      time: '2 hours ago',
    },
    {
      id: 2,
      type: 'webtoon',
      title: 'One Piece Manga',
      status: 'processing',
      time: '4 hours ago',
    },
    {
      id: 3,
      type: 'voice',
      title: 'Narrator Voice',
      status: 'ready',
      time: '1 day ago',
    },
  ];

  const quickActions = [
    {
      title: 'Upload Comic',
      description: 'Add a new webtoon or manga',
      icon: <Upload />,
      color: '#8b5cf6',
      link: '/upload',
    },
    {
      title: 'Create Video',
      description: 'Generate a new explanation video',
      icon: <PlayArrow />,
      color: '#ec4899',
      link: '/video-editor',
    },
    {
      title: 'Voice Profile',
      description: 'Create or manage voice profiles',
      icon: <Mic />,
      color: '#10b981',
      link: '/voice-profiles',
    },
    {
      title: 'Settings',
      description: 'Manage your account settings',
      icon: <Settings />,
      color: '#6b7280',
      link: '/settings',
    },
  ];

  return (
    <Box>
      <Box sx={{ mb: 4 }}>
        <Typography variant="h4" gutterBottom>
          Welcome back, {user?.name}!
        </Typography>
        <Typography variant="body1" sx={{ color: '#a0a0b8' }}>
          Here's what's happening with your AI Webtoon Explainer projects.
        </Typography>
      </Box>

      {/* Stats Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {stats.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card
              className="feature-card"
              sx={{
                cursor: 'pointer',
                '&:hover': {
                  transform: 'translateY(-4px)',
                },
              }}
            >
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: stat.color,
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    {stat.icon}
                  </Avatar>
                  <Box>
                    <Typography variant="h4" sx={{ fontWeight: 600 }}>
                      {stat.value}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      {stat.title}
                    </Typography>
                  </Box>
                </Box>
                {stat.title === 'Storage Used' && user && (
                  <LinearProgress
                    variant="determinate"
                    value={(user.usage.storageUsed / user.usage.monthlyStorageLimit) * 100}
                    sx={{
                      height: 8,
                      borderRadius: 4,
                      bgcolor: '#2a2a3e',
                      '& .MuiLinearProgress-bar': {
                        bgcolor: stat.color,
                      },
                    }}
                  />
                )}
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3}>
        {/* Quick Actions */}
        <Grid item xs={12} md={8}>
          <Card className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Quick Actions
              </Typography>
              <Grid container spacing={2}>
                {quickActions.map((action, index) => (
                  <Grid item xs={12} sm={6} key={index}>
                    <Card
                      sx={{
                        p: 2,
                        cursor: 'pointer',
                        border: '1px solid #2a2a3e',
                        '&:hover': {
                          borderColor: action.color,
                          bgcolor: 'rgba(255, 255, 255, 0.02)',
                        },
                      }}
                    >
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar
                          sx={{
                            bgcolor: action.color,
                            mr: 2,
                            width: 40,
                            height: 40,
                          }}
                        >
                          {action.icon}
                        </Avatar>
                        <Box>
                          <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                            {action.title}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                            {action.description}
                          </Typography>
                        </Box>
                      </Box>
                    </Card>
                  </Grid>
                ))}
              </Grid>
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Activity */}
        <Grid item xs={12} md={4}>
          <Card className="feature-card">
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                <Typography variant="h6" sx={{ flexGrow: 1 }}>
                  Recent Activity
                </Typography>
                <Tooltip title="Refresh">
                  <IconButton size="small">
                    <Refresh />
                  </IconButton>
                </Tooltip>
              </Box>

              <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                {recentActivity.map((activity) => (
                  <Box
                    key={activity.id}
                    sx={{
                      p: 2,
                      borderRadius: 2,
                      bgcolor: '#2a2a3e',
                      border: '1px solid #3a3a4e',
                    }}
                  >
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ fontWeight: 600 }}>
                        {activity.title}
                      </Typography>
                      <Chip
                        size="small"
                        label={activity.status}
                        sx={{
                          ml: 'auto',
                          fontSize: '0.75rem',
                          height: 24,
                          bgcolor:
                            activity.status === 'completed'
                              ? '#10b981'
                              : activity.status === 'processing'
                              ? '#f59e0b'
                              : '#6b7280',
                        }}
                      />
                    </Box>
                    <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                      {activity.time}
                    </Typography>
                  </Box>
                ))}
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default DashboardPage;
