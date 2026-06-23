import React, { useState, useEffect } from 'react';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  MoreVert,
  PlayArrow,
  Stop,
  Refresh,
  Visibility,
  Download,
  Delete,
  Error as ErrorIcon,
  CheckCircle,
  Schedule,
} from '@mui/icons-material';


interface RenderJob {
  id: string;
  videoId: string;
  videoTitle: string;
  jobType: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  totalSteps?: number;
  startedAt?: string;
  estimatedCompletion?: string;
  processingTime?: number;
  errorMessage?: string;
}

const RenderQueuePage: React.FC = () => {

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedJob, setSelectedJob] = useState<string | null>(null);
  const [detailsDialogOpen, setDetailsDialogOpen] = useState(false);
  const [selectedJobDetails, setSelectedJobDetails] = useState<RenderJob | null>(null);

  // Mock data - in real app this would come from API
  const [jobs, setJobs] = useState<RenderJob[]>([
    {
      id: '1',
      videoId: '1',
      videoTitle: 'Chapter 1 Explanation',
      jobType: 'video_generation',
      status: 'processing',
      progress: 65,
      currentStep: 'Rendering video scenes',
      totalSteps: 5,
      startedAt: new Date(Date.now() - 10 * 60 * 1000).toISOString(),
      estimatedCompletion: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
    },
    {
      id: '2',
      videoId: '2',
      videoTitle: 'Chapter 2 Analysis',
      jobType: 'audio_generation',
      status: 'queued',
      progress: 0,
      startedAt: new Date(Date.now() - 5 * 60 * 1000).toISOString(),
    },
    {
      id: '3',
      videoId: '3',
      videoTitle: 'Chapter 3 Review',
      jobType: 'final_render',
      status: 'completed',
      progress: 100,
      startedAt: new Date(Date.now() - 30 * 60 * 1000).toISOString(),
      processingTime: 25 * 60,
    },
    {
      id: '4',
      videoId: '4',
      videoTitle: 'Chapter 4 Summary',
      jobType: 'video_generation',
      status: 'failed',
      progress: 35,
      startedAt: new Date(Date.now() - 45 * 60 * 1000).toISOString(),
      errorMessage: 'Insufficient disk space for rendering',
    },
  ]);

  useEffect(() => {
    // Simulate real-time updates
    const interval = setInterval(() => {
      setJobs(prevJobs => 
        prevJobs.map(job => {
          if (job.status === 'processing' && job.progress < 100) {
            const newProgress = Math.min(100, job.progress + Math.random() * 5);
            return { ...job, progress: newProgress, status: newProgress >= 100 ? 'completed' : 'processing' };
          }
          return job;
        })
      );
    }, 3000);

    return () => clearInterval(interval);
  }, []);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, jobId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedJob(jobId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedJob(null);
  };

  const handleViewDetails = (job: RenderJob) => {
    setSelectedJobDetails(job);
    setDetailsDialogOpen(true);
    handleMenuClose();
  };

  const handleRetryJob = (jobId: string) => {
    // Retry logic
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { ...job, status: 'queued', progress: 0, errorMessage: undefined }
          : job
      )
    );
    handleMenuClose();
  };

  const handleCancelJob = (jobId: string) => {
    // Cancel logic
    setJobs(prevJobs => 
      prevJobs.map(job => 
        job.id === jobId 
          ? { ...job, status: 'cancelled' }
          : job
      )
    );
    handleMenuClose();
  };

  const handleDeleteJob = (jobId: string) => {
    // Delete logic
    setJobs(prevJobs => prevJobs.filter(job => job.id !== jobId));
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      case 'cancelled':
        return '#6b7280';
      default:
        return '#6b7280';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle />;
      case 'processing':
        return <Schedule />;
      case 'failed':
        return <ErrorIcon />;
      case 'cancelled':
        return <Stop />;
      default:
        return <Schedule />;
    }
  };

  const getJobTypeLabel = (jobType: string) => {
    switch (jobType) {
      case 'video_generation':
        return 'Video Generation';
      case 'audio_generation':
        return 'Audio Generation';
      case 'subtitle_generation':
        return 'Subtitle Generation';
      case 'final_render':
        return 'Final Render';
      default:
        return jobType.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase());
    }
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}h ${minutes}m ${secs}s`;
    } else if (minutes > 0) {
      return `${minutes}m ${secs}s`;
    } else {
      return `${secs}s`;
    }
  };

  const activeJobs = jobs.filter(job => job.status === 'processing' || job.status === 'queued');
  const completedJobs = jobs.filter(job => job.status === 'completed');
  const failedJobs = jobs.filter(job => job.status === 'failed');

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Render Queue</Typography>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => {/* Refresh logic */}}
          sx={{
            borderColor: '#2a2a3e',
            color: '#ffffff',
            '&:hover': {
              borderColor: '#4a4a6a',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Refresh
        </Button>
      </Box>

      {/* Stats Cards */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <Card sx={{ flex: 1, bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#f59e0b' }}>
              {activeJobs.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
              Active Jobs
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#10b981' }}>
              {completedJobs.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
              Completed
            </Typography>
          </CardContent>
        </Card>
        <Card sx={{ flex: 1, bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
          <CardContent sx={{ textAlign: 'center', py: 2 }}>
            <Typography variant="h4" sx={{ color: '#ef4444' }}>
              {failedJobs.length}
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
              Failed
            </Typography>
          </CardContent>
        </Card>
      </Box>

      {/* Jobs Table */}
      <Card className="feature-card">
        <CardContent>
          <Typography variant="h6" gutterBottom>
            All Jobs
          </Typography>

          <TableContainer component={Paper} sx={{ bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
            <Table>
              <TableHead>
                <TableRow>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Video
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Type
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Status
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Progress
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Started
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Duration
                  </TableCell>
                  <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                    Actions
                  </TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {jobs.map((job) => (
                  <TableRow key={job.id} sx={{ '&:hover': { bgcolor: '#2a2a3e' } }}>
                    <TableCell sx={{ color: '#ffffff', borderBottom: '1px solid #2a2a3e' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Avatar sx={{ bgcolor: '#2a2a3e', mr: 2, width: 32, height: 32 }}>
                          <PlayArrow sx={{ fontSize: 16 }} />
                        </Avatar>
                        <Box>
                          <Typography variant="body2" sx={{ color: '#ffffff' }}>
                            {job.videoTitle}
                          </Typography>
                          <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                            ID: {job.id}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                      <Chip
                        label={getJobTypeLabel(job.jobType)}
                        size="small"
                        sx={{ bgcolor: '#2a2a3e', color: '#a0a0b8' }}
                      />
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #2a2a3e' }}>
                      <Box sx={{ display: 'flex', alignItems: 'center' }}>
                        <Box sx={{ color: getStatusColor(job.status), mr: 1 }}>
                          {getStatusIcon(job.status)}
                        </Box>
                        <Chip
                          label={job.status.charAt(0).toUpperCase() + job.status.slice(1)}
                          size="small"
                          sx={{
                            bgcolor: getStatusColor(job.status),
                            color: '#ffffff',
                          }}
                        />
                      </Box>
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #2a2a3e' }}>
                      <Box sx={{ minWidth: 120 }}>
                        <LinearProgress
                          variant="determinate"
                          value={job.progress}
                          sx={{
                            height: 8,
                            borderRadius: 4,
                            bgcolor: '#2a2a3e',
                            '& .MuiLinearProgress-bar': {
                              bgcolor: getStatusColor(job.status),
                            },
                          }}
                        />
                        <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                          {job.progress.toFixed(0)}%
                        </Typography>
                        {job.currentStep && (
                          <Typography variant="caption" sx={{ color: '#6a6a8a', display: 'block' }}>
                            {job.currentStep}
                          </Typography>
                        )}
                      </Box>
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                      {job.startedAt ? new Date(job.startedAt).toLocaleString() : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ color: '#a0a0b8', borderBottom: '1px solid #2a2a3e' }}>
                      {job.processingTime ? formatDuration(job.processingTime) : 'N/A'}
                    </TableCell>
                    <TableCell sx={{ borderBottom: '1px solid #2a2a3e' }}>
                      <IconButton
                        size="small"
                        onClick={(e) => handleMenuOpen(e, job.id)}
                        sx={{ color: '#a0a0b8' }}
                      >
                        <MoreVert />
                      </IconButton>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </CardContent>
      </Card>

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
            '& .MuiMenuItem-root': {
              color: '#ffffff',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            },
          },
        }}
      >
        {selectedJob && (
          <>
            <MenuItem onClick={() => handleViewDetails(jobs.find(j => j.id === selectedJob)!)}>
              <Visibility sx={{ mr: 2 }} />
              View Details
            </MenuItem>
            {jobs.find(j => j.id === selectedJob)?.status === 'failed' && (
              <MenuItem onClick={() => handleRetryJob(selectedJob)}>
                <Refresh sx={{ mr: 2 }} />
                Retry
              </MenuItem>
            )}
            {(jobs.find(j => j.id === selectedJob)?.status === 'processing' || 
              jobs.find(j => j.id === selectedJob)?.status === 'queued') && (
              <MenuItem onClick={() => handleCancelJob(selectedJob)}>
                <Stop sx={{ mr: 2 }} />
                Cancel
              </MenuItem>
            )}
            {jobs.find(j => j.id === selectedJob)?.status === 'completed' && (
              <MenuItem>
                <Download sx={{ mr: 2 }} />
                Download
              </MenuItem>
            )}
            <MenuItem onClick={() => handleDeleteJob(selectedJob)}>
              <Delete sx={{ mr: 2 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Job Details Dialog */}
      <Dialog
        open={detailsDialogOpen}
        onClose={() => setDetailsDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>Job Details</DialogTitle>
        <DialogContent>
          {selectedJobDetails && (
            <Box>
              <Typography variant="h6" gutterBottom>
                {selectedJobDetails.videoTitle}
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                  Job Information
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Type: {getJobTypeLabel(selectedJobDetails.jobType)}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Status: {selectedJobDetails.status}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Progress: {selectedJobDetails.progress}%
                </Typography>
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                  Timing
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Started: {selectedJobDetails.startedAt ? new Date(selectedJobDetails.startedAt).toLocaleString() : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Processing Time: {selectedJobDetails.processingTime ? formatDuration(selectedJobDetails.processingTime) : 'N/A'}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                  Estimated Completion: {selectedJobDetails.estimatedCompletion ? new Date(selectedJobDetails.estimatedCompletion).toLocaleString() : 'N/A'}
                </Typography>
              </Box>

              {selectedJobDetails.errorMessage && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#ef4444' }}>
                    Error Message
                  </Typography>
                  <Typography variant="body2" sx={{ color: '#ef4444' }}>
                    {selectedJobDetails.errorMessage}
                  </Typography>
                </Box>
              )}
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setDetailsDialogOpen(false)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default RenderQueuePage;
