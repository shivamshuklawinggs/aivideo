import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  IconButton,
  Paper,
  Slider,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
  Chip,
  Divider,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Pause,
  Stop,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  Save,
  Preview,
} from '@mui/icons-material';


const VideoEditorPage: React.FC = () => {
  const navigate = useNavigate();

  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isMuted, setIsMuted] = useState(false);
  const [selectedScene, setSelectedScene] = useState(0);

  // Mock data - in real app this would come from API
  const [videoData, setVideoData] = useState({
    title: 'Chapter 1 Explanation',
    scenes: [
      {
        id: 1,
        panelNumber: 1,
        duration: 5.0,
        animationType: 'zoom-in',
        narration: 'Our story begins in a peaceful village...',
        startTime: 0,
        endTime: 5.0,
      },
      {
        id: 2,
        panelNumber: 2,
        duration: 4.5,
        animationType: 'pan-right',
        narration: 'But today, something extraordinary happens...',
        startTime: 5.0,
        endTime: 9.5,
      },
      {
        id: 3,
        panelNumber: 3,
        duration: 6.0,
        animationType: 'fade-in',
        narration: 'A mysterious figure appears with important news...',
        startTime: 9.5,
        endTime: 15.5,
      },
    ],
    settings: {
      resolution: '1080p',
      fps: 30,
      format: 'mp4',
      musicVolume: 0.3,
      narrationVolume: 1.0,
    },
  });

  useEffect(() => {
    setDuration(videoData.scenes.reduce((total, scene) => total + scene.duration, 0));
  }, [videoData.scenes]);

  const handlePlayPause = () => {
    setIsPlaying(!isPlaying);
  };

  const handleTimeChange = (newTime: number) => {
    setCurrentTime(newTime);
    // Update selected scene based on time
    const currentScene = videoData.scenes.findIndex(
      (scene) => newTime >= scene.startTime && newTime <= scene.endTime
    );
    if (currentScene !== -1) {
      setSelectedScene(currentScene);
    }
  };

  const handleVolumeChange = (newVolume: number) => {
    setVolume(newVolume);
    setIsMuted(false);
  };

  const handleMuteToggle = () => {
    setIsMuted(!isMuted);
  };

  const handleSceneSelect = (sceneIndex: number) => {
    setSelectedScene(sceneIndex);
    setCurrentTime(videoData.scenes[sceneIndex].startTime);
  };

  const handleAnimationChange = (sceneIndex: number, animationType: string) => {
    const updatedScenes = [...videoData.scenes];
    updatedScenes[sceneIndex].animationType = animationType;
    setVideoData({ ...videoData, scenes: updatedScenes });
  };

  const handleDurationChange = (sceneIndex: number, newDuration: number) => {
    const updatedScenes = [...videoData.scenes];
    updatedScenes[sceneIndex].duration = newDuration;
    
    // Recalculate start and end times
    let startTime = 0;
    updatedScenes.forEach((scene, _index) => {
      scene.startTime = startTime;
      scene.endTime = startTime + scene.duration;
      startTime += scene.duration;
    });
    
    setVideoData({ ...videoData, scenes: updatedScenes });
    setDuration(startTime);
  };

  const animationTypes = [
    'zoom-in',
    'zoom-out',
    'pan-left',
    'pan-right',
    'fade-in',
    'fade-out',
    'slide-up',
    'slide-down',
    'ken-burns',
    'camera-shake',
  ];

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(-1)}
          sx={{ mr: 2 }}
        >
          Back
        </Button>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Video Editor
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Preview />}
            sx={{
              borderColor: '#2a2a3e',
              color: '#ffffff',
              '&:hover': {
                borderColor: '#4a4a6a',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            Preview
          </Button>
          <Button
            variant="contained"
            startIcon={<Save />}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            Save Changes
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Video Preview */}
        <Grid item xs={12} md={8}>
          <Card className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Video Preview
              </Typography>
              
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
                  position: 'relative',
                }}
              >
                <Typography variant="h6" sx={{ color: '#4a4a6a' }}>
                  Video Preview Area
                </Typography>
                
                {/* Current Scene Indicator */}
                <Box
                  sx={{
                    position: 'absolute',
                    top: 16,
                    right: 16,
                    bgcolor: 'rgba(0, 0, 0, 0.7)',
                    color: '#ffffff',
                    px: 2,
                    py: 1,
                    borderRadius: 1,
                    fontSize: '0.875rem',
                  }}
                >
                  Scene {selectedScene + 1} of {videoData.scenes.length}
                </Box>
              </Box>

              {/* Video Controls */}
              <Box sx={{ bgcolor: '#2a2a3e', p: 2, borderRadius: 2 }}>
                {/* Progress Bar */}
                <Box sx={{ mb: 2 }}>
                  <Slider
                    value={currentTime}
                    max={duration}
                    onChange={(_, value) => handleTimeChange(value as number)}
                    sx={{
                      '& .MuiSlider-thumb': {
                        bgcolor: '#8b5cf6',
                      },
                      '& .MuiSlider-track': {
                        bgcolor: '#8b5cf6',
                      },
                      '& .MuiSlider-rail': {
                        bgcolor: '#4a4a6a',
                      },
                    }}
                  />
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
                    <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                      {currentTime.toFixed(1)}s
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                      {duration.toFixed(1)}s
                    </Typography>
                  </Box>
                </Box>

                {/* Control Buttons */}
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" sx={{ color: '#ffffff' }}>
                      <SkipPrevious />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={handlePlayPause}
                      sx={{ color: '#ffffff' }}
                    >
                      {isPlaying ? <Pause /> : <PlayArrow />}
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#ffffff' }}>
                      <Stop />
                    </IconButton>
                    <IconButton size="small" sx={{ color: '#ffffff' }}>
                      <SkipNext />
                    </IconButton>
                  </Box>

                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <IconButton size="small" onClick={handleMuteToggle} sx={{ color: '#ffffff' }}>
                      {isMuted ? <VolumeOff /> : <VolumeUp />}
                    </IconButton>
                    <Slider
                      value={isMuted ? 0 : volume}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(_, value) => handleVolumeChange(value as number)}
                      sx={{ width: 100 }}
                    />
                    <IconButton size="small" sx={{ color: '#ffffff' }}>
                      <Fullscreen />
                    </IconButton>
                  </Box>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>

        {/* Scene Editor */}
        <Grid item xs={12} md={4}>
          <Card className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Scene Editor
              </Typography>

              {/* Scene List */}
              <Box sx={{ maxHeight: 400, overflowY: 'auto', mb: 2 }}>
                {videoData.scenes.map((scene, index) => (
                  <Paper
                    key={scene.id}
                    sx={{
                      p: 2,
                      mb: 1,
                      bgcolor: selectedScene === index ? '#2a2a3e' : '#1a1a2e',
                      border: selectedScene === index ? '1px solid #8b5cf6' : '1px solid #2a2a3e',
                      cursor: 'pointer',
                      '&:hover': {
                        bgcolor: '#2a2a3e',
                      },
                    }}
                    onClick={() => handleSceneSelect(index)}
                  >
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                      <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                        Scene {index + 1}
                      </Typography>
                      <Chip
                        label={`Panel ${scene.panelNumber}`}
                        size="small"
                        sx={{ bgcolor: '#4a4a6a', color: '#ffffff' }}
                      />
                    </Box>
                    
                    <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1, fontSize: '0.8rem' }}>
                      {scene.narration.substring(0, 50)}...
                    </Typography>
                    
                    <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                        {scene.startTime.toFixed(1)}s - {scene.endTime.toFixed(1)}s
                      </Typography>
                      <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                        {scene.duration.toFixed(1)}s
                      </Typography>
                    </Box>
                  </Paper>
                ))}
              </Box>

              <Divider sx={{ my: 2, borderColor: '#2a2a3e' }} />

              {/* Scene Properties */}
              {selectedScene < videoData.scenes.length && (
                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 2 }}>
                    Scene {selectedScene + 1} Properties
                  </Typography>

                  <FormControl fullWidth sx={{ mb: 2 }}>
                    <InputLabel sx={{ color: '#a0a0b8' }}>Animation Type</InputLabel>
                    <Select
                      value={videoData.scenes[selectedScene].animationType}
                      onChange={(e) => handleAnimationChange(selectedScene, e.target.value)}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#2a2a3e' },
                          '&:hover fieldset': { borderColor: '#4a4a6a' },
                          '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                        '& .MuiInputLabel-root': { color: '#a0a0b8' },
                        '& .MuiSelect-select': { color: '#ffffff' },
                      }}
                    >
                      {animationTypes.map((type) => (
                        <MenuItem key={type} value={type}>
                          {type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                        </MenuItem>
                      ))}
                    </Select>
                  </FormControl>

                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1 }}>
                      Duration: {videoData.scenes[selectedScene].duration.toFixed(1)}s
                    </Typography>
                    <Slider
                      value={videoData.scenes[selectedScene].duration}
                      min={1}
                      max={10}
                      step={0.5}
                      onChange={(_, value) => handleDurationChange(selectedScene, value as number)}
                      sx={{
                        '& .MuiSlider-thumb': {
                          bgcolor: '#8b5cf6',
                        },
                        '& .MuiSlider-track': {
                          bgcolor: '#8b5cf6',
                        },
                        '& .MuiSlider-rail': {
                          bgcolor: '#4a4a6a',
                        },
                      }}
                    />
                  </Box>

                  <TextField
                    fullWidth
                    label="Narration"
                    multiline
                    rows={3}
                    value={videoData.scenes[selectedScene].narration}
                    onChange={(e) => {
                      const updatedScenes = [...videoData.scenes];
                      updatedScenes[selectedScene].narration = e.target.value;
                      setVideoData({ ...videoData, scenes: updatedScenes });
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
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Video Settings */}
        <Grid item xs={12}>
          <Card className="feature-card">
            <CardContent>
              <Typography variant="h6" gutterBottom>
                Video Settings
              </Typography>

              <Grid container spacing={3}>
                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#a0a0b8' }}>Resolution</InputLabel>
                    <Select
                      value={videoData.settings.resolution}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#2a2a3e' },
                          '&:hover fieldset': { borderColor: '#4a4a6a' },
                          '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                        '& .MuiInputLabel-root': { color: '#a0a0b8' },
                        '& .MuiSelect-select': { color: '#ffffff' },
                      }}
                    >
                      <MenuItem value="720p">720p</MenuItem>
                      <MenuItem value="1080p">1080p</MenuItem>
                      <MenuItem value="1440p">1440p</MenuItem>
                      <MenuItem value="4K">4K</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#a0a0b8' }}>Frame Rate</InputLabel>
                    <Select
                      value={videoData.settings.fps}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#2a2a3e' },
                          '&:hover fieldset': { borderColor: '#4a4a6a' },
                          '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                        '& .MuiInputLabel-root': { color: '#a0a0b8' },
                        '& .MuiSelect-select': { color: '#ffffff' },
                      }}
                    >
                      <MenuItem value="24">24 fps</MenuItem>
                      <MenuItem value="30">30 fps</MenuItem>
                      <MenuItem value="60">60 fps</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <FormControl fullWidth>
                    <InputLabel sx={{ color: '#a0a0b8' }}>Format</InputLabel>
                    <Select
                      value={videoData.settings.format}
                      sx={{
                        '& .MuiOutlinedInput-root': {
                          '& fieldset': { borderColor: '#2a2a3e' },
                          '&:hover fieldset': { borderColor: '#4a4a6a' },
                          '&.Mui-focused fieldset': { borderColor: '#8b5cf6' },
                        },
                        '& .MuiInputLabel-root': { color: '#a0a0b8' },
                        '& .MuiSelect-select': { color: '#ffffff' },
                      }}
                    >
                      <MenuItem value="mp4">MP4</MenuItem>
                      <MenuItem value="mov">MOV</MenuItem>
                      <MenuItem value="webm">WebM</MenuItem>
                    </Select>
                  </FormControl>
                </Grid>

                <Grid item xs={12} sm={6} md={3}>
                  <Box>
                    <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1 }}>
                      Total Duration: {duration.toFixed(1)}s
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      Total Scenes: {videoData.scenes.length}
                    </Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default VideoEditorPage;
