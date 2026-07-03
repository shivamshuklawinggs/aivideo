import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemIcon,
  IconButton,
  Paper,
  Divider,
  Alert,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Description,
  VideoLibrary,
  PlayArrow,
  Refresh,
  CheckCircle,
  Error,
  Pending,
  Sync,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { sukuyamiApi, Chapter, ScriptGenerationOptions, VideoGenerationOptions } from '../../services/api/sukuyamiApi';

const ChapterDetailsPage: React.FC = () => {
  const { chapterId } = useParams<{ chapterId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [scriptDialogOpen, setScriptDialogOpen] = useState(false);
  const [videoDialogOpen, setVideoDialogOpen] = useState(false);
  const [scriptOptions, setScriptOptions] = useState<ScriptGenerationOptions>({
    style: 'narrative',
    durationPerPanel: 3,
    model: 'phi3:mini',
  });
  const [videoOptions, setVideoOptions] = useState<VideoGenerationOptions>({
    format: 'mp4',
    quality: 'medium',
    fps: 30,
  });

  const { data: chapter, isLoading, error } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => sukuyamiApi.getChapter(chapterId!),
    enabled: !!chapterId,
    refetchInterval: 10000, // Refresh every 10 seconds for processing status
  });

  const generateScriptMutation = useMutation({
    mutationFn: (options: ScriptGenerationOptions) => 
      sukuyamiApi.generateScript(chapterId!, options),
    onSuccess: () => {
      toast.success('Script generation started');
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      setScriptDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Script generation failed: ${error.message}`);
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: (options: VideoGenerationOptions) => 
      sukuyamiApi.generateVideo(chapterId!, options),
    onSuccess: () => {
      toast.success('Video generation started');
      queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] });
      setVideoDialogOpen(false);
    },
    onError: (error: any) => {
      toast.error(`Video generation failed: ${error.message}`);
    },
  });

  const handleGenerateScript = () => {
    generateScriptMutation.mutate(scriptOptions);
  };

  const handleGenerateVideo = () => {
    generateVideoMutation.mutate(videoOptions);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
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

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error || !chapter) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">Failed to load chapter details</Alert>
      </Box>
    );
  }

  const chapterData = chapter as Chapter;

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate(-1)} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Typography variant="h4" sx={{ flexGrow: 1 }}>
          Chapter {chapterData.chapterNumber}: {chapterData.title}
        </Typography>
        <Box>
          <Chip
            icon={getStatusIcon(chapterData.processingStatus)}
            label={chapterData.processingStatus}
            color={getStatusColor(chapterData.processingStatus) as any}
            sx={{ mr: 2 }}
          />
          <Button
            variant="outlined"
            startIcon={<Refresh />}
            onClick={() => queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] })}
            sx={{ mr: 2 }}
          >
            Refresh
          </Button>
        </Box>
      </Box>

      {/* Progress Bar */}
      {chapterData.processingStatus === 'processing' && (
        <Paper sx={{ p: 2, mb: 3 }}>
          <Typography variant="body2" gutterBottom>
            Processing Progress: {chapterData.processingProgress}%
          </Typography>
          <LinearProgress 
            variant="determinate" 
            value={chapterData.processingProgress} 
          />
        </Paper>
      )}

      <Grid container spacing={3}>
        {/* Chapter Info */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Chapter Information
            </Typography>
            
            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Chapter Number
              </Typography>
              <Typography variant="body1">
                {chapterData.chapterNumber}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Total Pages
              </Typography>
              <Typography variant="body1">
                {chapterData.totalPages}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Panels
              </Typography>
              <Typography variant="body1">
                {chapterData.panels.length}
              </Typography>
            </Box>

            <Box sx={{ mb: 2 }}>
              <Typography variant="body2" color="textSecondary">
                Estimated Read Time
              </Typography>
              <Typography variant="body1">
                {Math.round(chapterData.metadata.estimatedReadTime)} seconds
              </Typography>
            </Box>

            <Divider sx={{ my: 2 }} />

            <Typography variant="h6" gutterBottom>
              Actions
            </Typography>
            
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 1 }}>
              <Button
                variant="contained"
                startIcon={<Description />}
                onClick={() => setScriptDialogOpen(true)}
                disabled={generateScriptMutation.isPending || chapterData.processingStatus === 'processing'}
                fullWidth
              >
                {chapterData.generatedScript ? 'Regenerate Script' : 'Generate Script'}
              </Button>
              
              <Button
                variant="contained"
                color="secondary"
                startIcon={<VideoLibrary />}
                onClick={() => setVideoDialogOpen(true)}
                disabled={generateVideoMutation.isPending || chapterData.processingStatus === 'processing'}
                fullWidth
              >
                {chapterData.videoUrl ? 'Regenerate Video' : 'Generate Video'}
              </Button>

              {chapterData.videoUrl && (
                <Button
                  variant="outlined"
                  startIcon={<PlayArrow />}
                  onClick={() => window.open(chapterData.videoUrl, '_blank')}
                  fullWidth
                >
                  Watch Video
                </Button>
              )}
            </Box>
          </Paper>
        </Grid>

        {/* Panels Grid */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 2 }}>
            <Typography variant="h6" gutterBottom>
              Panels ({chapterData.panels.length})
            </Typography>
            
            <Grid container spacing={2}>
              {chapterData.panels.map((panel, index) => (
                <Grid item xs={12} sm={6} md={4} key={index}>
                  <Card>
                    <CardMedia
                      component="img"
                      height="200"
                      image={panel.imageUrl}
                      alt={`Panel ${index + 1}`}
                      sx={{ objectFit: 'cover' }}
                    />
                    <CardContent sx={{ p: 1 }}>
                      <Typography variant="body2" color="textSecondary">
                        Panel {panel.sequence} • {panel.duration}s
                      </Typography>
                    </CardContent>
                  </Card>
                </Grid>
              ))}
            </Grid>
          </Paper>
        </Grid>

        {/* Generated Script */}
        {chapterData.generatedScript && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Generated Script
              </Typography>
              
              <Box sx={{ mb: 2 }}>
                <Typography variant="body2" color="textSecondary">
                  Title: {chapterData.generatedScript.title}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Duration: {chapterData.generatedScript.totalDuration}s
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Model: {chapterData.generatedScript.modelUsed}
                </Typography>
                <Typography variant="body2" color="textSecondary">
                  Generated: {new Date(chapterData.generatedScript.generatedAt).toLocaleString()}
                </Typography>
              </Box>

              <Typography variant="subtitle1" gutterBottom>
                Script Content:
              </Typography>
              
              <Paper variant="outlined" sx={{ p: 2, maxHeight: 300, overflow: 'auto' }}>
                <Typography variant="body2" component="pre">
                  {chapterData.generatedScript.content}
                </Typography>
              </Paper>

              {/* Scenes */}
              <Typography variant="subtitle1" sx={{ mt: 2 }} gutterBottom>
                Scenes ({chapterData.generatedScript.scenes.length}):
              </Typography>
              
              <List>
                {chapterData.generatedScript.scenes.map((scene, index) => (
                  <ListItem key={index} divider>
                    <ListItemIcon>
                      <PlayArrow />
                    </ListItemIcon>
                    <ListItemText
                      primary={`Scene ${scene.sceneNumber + 1} (${scene.startTime}s - ${scene.endTime}s)`}
                      secondary={
                        <>
                          <Typography variant="body2" component="div">
                            {scene.narration}
                          </Typography>
                          <Typography variant="caption" color="textSecondary">
                            Panels: {scene.panels.join(', ')} • Duration: {scene.duration}s
                          </Typography>
                        </>
                      }
                    />
                  </ListItem>
                ))}
              </List>
            </Paper>
          </Grid>
        )}

        {/* Video Info */}
        {chapterData.videoUrl && (
          <Grid item xs={12}>
            <Paper sx={{ p: 2 }}>
              <Typography variant="h6" gutterBottom>
                Generated Video
              </Typography>
              
              <Grid container spacing={2}>
                <Grid item xs={12} md={6}>
                  <Box sx={{ mb: 2 }}>
                    <Typography variant="body2" color="textSecondary">
                      Duration: {chapterData.videoDuration}s
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Format: {chapterData.videoFormat}
                    </Typography>
                    <Typography variant="body2" color="textSecondary">
                      Size: {Math.round((chapterData.videoSize || 0) / 1024 / 1024)} MB
                    </Typography>
                  </Box>
                  
                  <Button
                    variant="contained"
                    startIcon={<PlayArrow />}
                    onClick={() => window.open(chapterData.videoUrl, '_blank')}
                    fullWidth
                  >
                    Watch Video
                  </Button>
                </Grid>
                
                <Grid item xs={12} md={6}>
                  <video
                    controls
                    style={{ width: '100%', maxHeight: '300px' }}
                    src={chapterData.videoUrl}
                  >
                    Your browser does not support the video tag.
                  </video>
                </Grid>
              </Grid>
            </Paper>
          </Grid>
        )}
      </Grid>

      {/* Script Generation Dialog */}
      <Dialog open={scriptDialogOpen} onClose={() => setScriptDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Script</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Style</InputLabel>
              <Select
                value={scriptOptions.style}
                label="Style"
                onChange={(e) => setScriptOptions(prev => ({ ...prev, style: e.target.value as any }))}
              >
                <MenuItem value="narrative">Narrative</MenuItem>
                <MenuItem value="dramatic">Dramatic</MenuItem>
                <MenuItem value="educational">Educational</MenuItem>
                <MenuItem value="casual">Casual</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="Duration per Panel (seconds)"
              type="number"
              value={scriptOptions.durationPerPanel}
              onChange={(e) => setScriptOptions(prev => ({ ...prev, durationPerPanel: Number(e.target.value) }))}
            />

            <TextField
              fullWidth
              label="AI Model"
              value={scriptOptions.model}
              onChange={(e) => setScriptOptions(prev => ({ ...prev, model: e.target.value }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setScriptDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateScript} 
            variant="contained"
            disabled={generateScriptMutation.isPending}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>

      {/* Video Generation Dialog */}
      <Dialog open={videoDialogOpen} onClose={() => setVideoDialogOpen(false)} maxWidth="sm" fullWidth>
        <DialogTitle>Generate Video</DialogTitle>
        <DialogContent>
          <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2, pt: 1 }}>
            <FormControl fullWidth>
              <InputLabel>Format</InputLabel>
              <Select
                value={videoOptions.format}
                label="Format"
                onChange={(e) => setVideoOptions(prev => ({ ...prev, format: e.target.value as any }))}
              >
                <MenuItem value="mp4">MP4</MenuItem>
                <MenuItem value="webm">WebM</MenuItem>
                <MenuItem value="avi">AVI</MenuItem>
              </Select>
            </FormControl>

            <FormControl fullWidth>
              <InputLabel>Quality</InputLabel>
              <Select
                value={videoOptions.quality}
                label="Quality"
                onChange={(e) => setVideoOptions(prev => ({ ...prev, quality: e.target.value as any }))}
              >
                <MenuItem value="low">Low</MenuItem>
                <MenuItem value="medium">Medium</MenuItem>
                <MenuItem value="high">High</MenuItem>
              </Select>
            </FormControl>

            <TextField
              fullWidth
              label="FPS"
              type="number"
              value={videoOptions.fps}
              onChange={(e) => setVideoOptions(prev => ({ ...prev, fps: Number(e.target.value) }))}
            />
          </Box>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setVideoDialogOpen(false)}>Cancel</Button>
          <Button 
            onClick={handleGenerateVideo} 
            variant="contained"
            disabled={generateVideoMutation.isPending}
          >
            Generate
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChapterDetailsPage;
