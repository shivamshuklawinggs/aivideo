import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  LinearProgress,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Avatar,
  CircularProgress,
} from '@mui/material';
import {
  Mic,
  MoreVert,
  PlayArrow,
  Edit,
  Delete,
  Add,
  VolumeUp,
  Settings,
  Star,
} from '@mui/icons-material';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchVoiceProfiles, setDefaultVoiceProfile } from '../../store/slices/voiceSlice';

const VoiceProfilesPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { voiceProfiles, isLoading, isProcessing } = useAppSelector((state) => state.voice);

  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);
  const [selectedProfile, setSelectedProfile] = useState<string | null>(null);
  const [createDialogOpen, setCreateDialogOpen] = useState(false);
  const [testDialogOpen, setTestDialogOpen] = useState(false);
  const [newProfile, setNewProfile] = useState({
    name: '',
    description: '',
  });

  useEffect(() => {
    dispatch(fetchVoiceProfiles({}));
  }, [dispatch]);

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, profileId: string) => {
    setAnchorEl(event.currentTarget);
    setSelectedProfile(profileId);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
    setSelectedProfile(null);
  };

  const handleCreateProfile = async () => {
    // This would typically open a file upload dialog
    // For now, we'll just show the concept
    setCreateDialogOpen(true);
  };

  const handleSetDefault = async (profileId: string) => {
    try {
      await dispatch(setDefaultVoiceProfile(profileId)).unwrap();
    } catch (error) {
      // Error handling
    }
    handleMenuClose();
  };

  const handleTestVoice = (profileId: string) => {
    setSelectedProfile(profileId);
    setTestDialogOpen(true);
    handleMenuClose();
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ready':
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
      case 'ready':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Voice Profiles</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleCreateProfile}
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            },
          }}
        >
          Create Voice Profile
        </Button>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Voice Profiles Grid */}
      <Grid container spacing={3}>
        {voiceProfiles.map((profile) => (
          <Grid item xs={12} sm={6} md={4} key={profile._id}>
            <Card
              className="feature-card"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                position: 'relative',
              }}
            >
              {profile.isDefault && (
                <Box sx={{ position: 'absolute', top: 8, right: 8, zIndex: 1 }}>
                  <Star sx={{ color: '#f59e0b', fontSize: 20 }} />
                </Box>
              )}

              <CardContent sx={{ flexGrow: 1 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', mb: 2 }}>
                  <Avatar
                    sx={{
                      bgcolor: getStatusColor(profile.status),
                      mr: 2,
                      width: 48,
                      height: 48,
                    }}
                  >
                    <Mic />
                  </Avatar>
                  <Box sx={{ flexGrow: 1 }}>
                    <Typography variant="h6" noWrap>
                      {profile.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      {profile.description || 'No description'}
                    </Typography>
                  </Box>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, profile._id)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Chip
                    label={getStatusText(profile.status)}
                    size="small"
                    sx={{
                      bgcolor: getStatusColor(profile.status),
                      color: '#ffffff',
                      fontSize: '0.75rem',
                    }}
                  />
                  {profile.usageCount > 0 && (
                    <Chip
                      label={`Used ${profile.usageCount} times`}
                      size="small"
                      sx={{
                        ml: 1,
                        bgcolor: '#2a2a3e',
                        color: '#a0a0b8',
                        fontSize: '0.75rem',
                      }}
                    />
                  )}
                </Box>

                {profile.metadata && (
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      Duration: {profile.metadata.duration ? `${profile.metadata.duration.toFixed(1)}s` : 'N/A'}
                    </Typography>
                    <br />
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      Quality: {profile.metadata.sampleRate || 'N/A'} Hz
                    </Typography>
                  </Box>
                )}

                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<PlayArrow />}
                    onClick={() => handleTestVoice(profile._id)}
                    disabled={profile.status !== 'ready'}
                    sx={{
                      borderColor: '#2a2a3e',
                      color: '#ffffff',
                      '&:hover': {
                        borderColor: '#4a4a6a',
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    Test
                  </Button>
                  <Button
                    variant="outlined"
                    size="small"
                    startIcon={<Settings />}
                    sx={{
                      borderColor: '#2a2a3e',
                      color: '#ffffff',
                      '&:hover': {
                        borderColor: '#4a4a6a',
                        bgcolor: 'rgba(255, 255, 255, 0.05)',
                      },
                    }}
                  >
                    Settings
                  </Button>
                </Box>
              </CardContent>

              {/* Processing Overlay */}
              {profile.status === 'processing' && (
                <Box sx={{ position: 'absolute', bottom: 0, left: 0, right: 0, p: 2, bgcolor: 'rgba(26, 26, 46, 0.9)' }}>
                  <Typography variant="caption" sx={{ color: '#a0a0b8', mb: 1, display: 'block' }}>
                    Processing voice...
                  </Typography>
                  <LinearProgress
                    variant="determinate"
                    value={profile.processingProgress}
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
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!isLoading && voiceProfiles.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <Mic sx={{ fontSize: 64, color: '#4a4a6a', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#a0a0b8', mb: 2 }}>
            No voice profiles yet
          </Typography>
          <Typography variant="body2" sx={{ color: '#6a6a8a', mb: 3 }}>
            Create your first voice profile to start generating videos
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleCreateProfile}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            Create Voice Profile
          </Button>
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
        <MenuItem onClick={() => handleTestVoice(selectedProfile!)}>
          <VolumeUp sx={{ mr: 2 }} />
          Test Voice
        </MenuItem>
        <MenuItem onClick={() => handleSetDefault(selectedProfile!)}>
          <Star sx={{ mr: 2 }} />
          Set as Default
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit sx={{ mr: 2 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Delete sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Create Profile Dialog */}
      <Dialog
        open={createDialogOpen}
        onClose={() => setCreateDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>Create Voice Profile</DialogTitle>
        <DialogContent>
          <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 3 }}>
            Upload a voice sample (at least 30 seconds) to create your custom voice profile.
          </Typography>
          
          <Box sx={{ border: '2px dashed #4a4a6a', borderRadius: 2, p: 4, textAlign: 'center', mb: 3 }}>
            <VolumeUp sx={{ fontSize: 48, color: '#4a4a6a', mb: 2 }} />
            <Typography variant="h6" gutterBottom>
              Upload Voice Sample
            </Typography>
            <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
              Drag & drop or click to browse
            </Typography>
            <Typography variant="caption" sx={{ color: '#6a6a8a', mt: 2, display: 'block' }}>
              Supported formats: MP3, WAV, M4A (Max 50MB)
            </Typography>
          </Box>

          <TextField
            fullWidth
            label="Profile Name"
            value={newProfile.name}
            onChange={(e) => setNewProfile({ ...newProfile, name: e.target.value })}
            margin="normal"
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

          <TextField
            fullWidth
            label="Description (Optional)"
            value={newProfile.description}
            onChange={(e) => setNewProfile({ ...newProfile, description: e.target.value })}
            margin="normal"
            multiline
            rows={2}
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setCreateDialogOpen(false)}>Cancel</Button>
          <Button
            variant="contained"
            disabled={!newProfile.name || isProcessing}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            {isProcessing ? <CircularProgress size={20} /> : 'Create Profile'}
          </Button>
        </DialogActions>
      </Dialog>

      {/* Test Voice Dialog */}
      <Dialog
        open={testDialogOpen}
        onClose={() => setTestDialogOpen(false)}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>Test Voice</DialogTitle>
        <DialogContent>
          <TextField
            fullWidth
            label="Test Text"
            defaultValue="Hello! This is a test of my voice profile. How does it sound?"
            multiline
            rows={3}
            margin="normal"
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
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setTestDialogOpen(false)}>Cancel</Button>
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
            Generate Test
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default VoiceProfilesPage;
