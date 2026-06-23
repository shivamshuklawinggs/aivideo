import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  PlayArrow,
  Download,
  Share,
  Edit,
  Delete,
  Visibility,
  ThumbUp,
  VolumeUp,
  Timer,
} from '@mui/icons-material';

import { useAppSelector } from '../../store';

interface GeneratedVideo {
  id: string;
  title: string;
  description: string;
  thumbnail?: string;
  videoUrl?: string;
  duration: number;
  resolution: string;
  format: string;
  fileSize: number;
  views: number;
  likes: number;
  isPublic: boolean;
  createdAt: string;
  status: 'completed' | 'processing' | 'failed';
  progress?: number;
}

const GeneratedVideosPage: React.FC = () => {
  const { isLoading } = useAppSelector((state) => state.video);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedVideo, setSelectedVideo] = useState<string | null>(null);
  const [previewDialogOpen, setPreviewDialogOpen] = useState(false);
  const [selectedVideoDetails, setSelectedVideoDetails] = useState<GeneratedVideo | null>(null);

  // Mock data - in real app this would come from API
  const [videoList, setVideoList] = useState<GeneratedVideo[]>([
    {
      id: '1',
      title: 'Chapter 1: The Beginning',
      description: 'Our hero discovers their powers and begins their journey',
      thumbnail: '',
      videoUrl: '',
      duration: 180,
      resolution: '1080p',
      format: 'mp4',
      fileSize: 125000000,
      views: 234,
      likes: 45,
      isPublic: true,
      createdAt: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
    },
    {
      id: '2',
      title: 'Chapter 2: The First Battle',
      description: 'The hero faces their first real challenge',
      thumbnail: '',
      videoUrl: '',
      duration: 165,
      resolution: '1080p',
      format: 'mp4',
      fileSize: 118000000,
      views: 156,
      likes: 32,
      isPublic: false,
      createdAt: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
      status: 'completed',
    },
    {
      id: '3',
      title: 'Chapter 3: New Allies',
      description: 'Meeting new friends and forming alliances',
      thumbnail: '',
      videoUrl: '',
      duration: 195,
      resolution: '1440p',
      format: 'mp4',
      fileSize: 245000000,
      views: 89,
      likes: 21,
      isPublic: true,
      createdAt: new Date(Date.now() - 3 * 60 * 60 * 1000).toISOString(),
      status: 'processing',
      progress: 75,
    },
  ]);

  const videosPerPage = 12;
  const totalPages = Math.ceil(videoList.length / videosPerPage);
  const paginatedVideos = videoList.slice((page - 1) * videosPerPage, page * videosPerPage);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, videoId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedVideo(videoId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedVideo(null);
  };

  const handlePreview = (video: GeneratedVideo) => {
    setSelectedVideoDetails(video);
    setPreviewDialogOpen(true);
    handleMenuClose();
  };

  const handleDownload = (videoId: string) => {
    // Download logic
    console.log('Download video:', videoId);
    handleMenuClose();
  };

  const handleShare = (videoId: string) => {
    // Share logic
    console.log('Share video:', videoId);
    handleMenuClose();
  };

  const handleEdit = (videoId: string) => {
    // Edit logic
    console.log('Edit video:', videoId);
    handleMenuClose();
  };

  const handleDelete = (videoId: string) => {
    // Delete logic
    setVideoList(prevList => prevList.filter(video => video.id !== videoId));
    handleMenuClose();
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const formatDuration = (seconds: number) => {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    const secs = Math.floor(seconds % 60);

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    } else {
      return `${minutes}:${secs.toString().padStart(2, '0')}`;
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Unknown';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Generated Videos</Typography>
      </Box>

      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search videos..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': { borderColor: '#2a2a3e' },
              '&:hover fieldset': { borderColor: '#4a4a6a' },
              '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
            },
            '& .MuiInputLabel-root': { color: '#a0a0b8' },
            '& .MuiInputBase-input': { color: '#ffffff' },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          sx={{
            borderColor: '#2a2a3e',
            color: '#ffffff',
            '&:hover': {
              borderColor: '#4a4a6a',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Filter
        </Button>
      </Box>

      {/* Videos Grid */}
      <Grid container spacing={3}>
        {paginatedVideos.map((video) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={video.id}>
            <Card
              className="feature-card"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <CardMedia
                component="div"
                sx={{
                  height: 200,
                  bgcolor: '#2a2a3e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {video.thumbnail ? (
                  <img
                    src={video.thumbnail}
                    alt={video.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <PlayArrow sx={{ fontSize: 48, color: '#4a4a6a' }} />
                )}
                
                <Chip
                  label={getStatusText(video.status)}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: getStatusColor(video.status),
                    color: '#ffffff',
                    fontSize: '0.75rem',
                  }}
                />

                {video.status === 'processing' && video.progress && (
                  <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 1, bgcolor: 'rgba(0, 0, 0, 0.7)' }}>
                    <LinearProgress
                      variant="determinate"
                      value={video.progress}
                      sx={{
                        height: 4,
                        borderRadius: 2,
                        bgcolor: '#2a2a3e',
                        '& .MuiLinearProgress-bar': {
                          bgcolor: '#8b5cf6',
                        },
                      }}
                    />
                  </Box>
                )}
              </CardMedia>

              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap gutterBottom>
                  {video.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1, height: 40, overflow: 'hidden' }}>
                  {video.description || 'No description available'}
                </Typography>
                
                <Box sx={{ display: 'flex', gap: 1, mb: 1, flexWrap: 'wrap' }}>
                  <Chip
                    label={formatDuration(video.duration)}
                    size="small"
                    sx={{
                      bgcolor: '#2a2a3e',
                      color: '#a0a0b8',
                      fontSize: '0.7rem',
                    }}
                  />
                  <Chip
                    label={video.resolution}
                    size="small"
                    sx={{
                      bgcolor: '#2a2a3e',
                      color: '#a0a0b8',
                      fontSize: '0.7rem',
                    }}
                  />
                </Box>

                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 1 }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      <Visibility sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                      {video.views}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      <ThumbUp sx={{ fontSize: 16, verticalAlign: 'middle', mr: 0.5 }} />
                      {video.likes}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, video.id)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                  {formatFileSize(video.fileSize)} • {new Date(video.createdAt).toLocaleDateString()}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!isLoading && videoList.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <PlayArrow sx={{ fontSize: 64, color: '#4a4a6a', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#a0a0b8', mb: 2 }}>
            No videos yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#6a6a8a', mb: 3 }}>
            Generate your first video to see it here
          </Typography>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            Create Video
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

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
        {selectedVideo && (
          <>
            <MenuItem onClick={() => handlePreview(videoList.find(v => v.id === selectedVideo)!)}>
              <PlayArrow sx={{ mr: 2 }} />
              Preview
            </MenuItem>
            <MenuItem onClick={() => handleDownload(selectedVideo)}>
              <Download sx={{ mr: 2 }} />
              Download
            </MenuItem>
            <MenuItem onClick={() => handleShare(selectedVideo)}>
              <Share sx={{ mr: 2 }} />
              Share
            </MenuItem>
            <MenuItem onClick={() => handleEdit(selectedVideo)}>
              <Edit sx={{ mr: 2 }} />
              Edit
            </MenuItem>
            <MenuItem onClick={() => handleDelete(selectedVideo)}>
              <Delete sx={{ mr: 2 }} />
              Delete
            </MenuItem>
          </>
        )}
      </Menu>

      {/* Preview Dialog */}
      <Dialog
        open={previewDialogOpen}
        onClose={() => setPreviewDialogOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>
          {selectedVideoDetails?.title}
        </DialogTitle>
        <DialogContent>
          {selectedVideoDetails && (
            <Box>
              {/* Video Player Placeholder */}
              <Box
                sx={{
                  width: '100%',
                  aspectRatio: '16/9',
                  bgcolor: '#0f0f23',
                  border: '2px solid #2a2a3e',
                  borderRadius: 2,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  mb: 2,
                }}
              >
                <PlayArrow sx={{ fontSize: 64, color: '#4a4a6a' }} />
              </Box>

              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1 }}>
                  {selectedVideoDetails.description}
                </Typography>
              </Box>

              <Box sx={{ display: 'flex', gap: 2, mb: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Timer sx={{ fontSize: 16, color: '#a0a0b8', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                    {formatDuration(selectedVideoDetails.duration)}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <VolumeUp sx={{ fontSize: 16, color: '#a0a0b8', mr: 1 }} />
                  <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                    {selectedVideoDetails.resolution}
                  </Typography>
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center' }}>
                  <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                    {formatFileSize(selectedVideoDetails.fileSize)}
                  </Typography>
                </Box>
              </Box>

              <Box sx={{ display: 'flex', gap: 1 }}>
                <Chip
                  label={`${selectedVideoDetails.views} views`}
                  size="small"
                  sx={{ bgcolor: '#2a2a3e', color: '#a0a0b8' }}
                />
                <Chip
                  label={`${selectedVideoDetails.likes} likes`}
                  size="small"
                  sx={{ bgcolor: '#2a2a3e', color: '#a0a0b8' }}
                />
                <Chip
                  label={selectedVideoDetails.isPublic ? 'Public' : 'Private'}
                  size="small"
                  sx={{
                    bgcolor: selectedVideoDetails.isPublic ? '#10b981' : '#6b7280',
                    color: '#ffffff',
                  }}
                />
              </Box>
            </Box>
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setPreviewDialogOpen(false)}>Close</Button>
          <Button
            variant="contained"
            startIcon={<Download />}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            Download
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default GeneratedVideosPage;
