import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardMedia,
  Typography,
  Button,
  LinearProgress,
  Chip,
  IconButton,
  Fab,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
} from '@mui/material';
import {
  ArrowBack,
  ArrowForward,
  ZoomIn,
  ZoomOut,
  Fullscreen,
  PlayArrow,
} from '@mui/icons-material';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchChapterById, fetchPanels } from '../../store/slices/webtoonSlice';

const ChapterViewerPage: React.FC = () => {
  const { webtoonId, chapterId } = useParams<{ webtoonId: string; chapterId: string }>();
  const dispatch = useAppDispatch();
  const navigate = useNavigate();

  const { currentChapter, panels, isLoading } = useAppSelector((state) => state.webtoon);

  const [currentPanelIndex, setCurrentPanelIndex] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [fullscreenPanel, setFullscreenPanel] = useState<string | null>(null);

  useEffect(() => {
    if (webtoonId && chapterId) {
      dispatch(fetchChapterById({ webtoonId, chapterId }));
      dispatch(fetchPanels(chapterId));
    }
  }, [dispatch, webtoonId, chapterId]);

  const handlePrevious = () => {
    setCurrentPanelIndex((prev) => Math.max(0, prev - 1));
  };

  const handleNext = () => {
    if (panels.length > 0) {
      setCurrentPanelIndex((prev) => Math.min(panels.length - 1, prev + 1));
    }
  };

  const handleZoomIn = () => {
    setZoom((prev) => Math.min(3, prev + 0.2));
  };

  const handleZoomOut = () => {
    setZoom((prev) => Math.max(0.5, prev - 0.2));
  };

  const handleFullscreen = (panelUrl: string) => {
    setFullscreenPanel(panelUrl);
  };

  const currentPanel = panels[currentPanelIndex];

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 800 }} />
      </Box>
    );
  }

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', alignItems: 'center', mb: 3 }}>
        <Button
          startIcon={<ArrowBack />}
          onClick={() => navigate(`/webtoons/${webtoonId}`)}
          sx={{ mr: 2 }}
        >
          Back to Webtoon
        </Button>
        <Typography variant="h4">
          {currentChapter?.title || `Chapter ${currentChapter?.chapterNumber}`}
        </Typography>
      </Box>

      {/* Chapter Info */}
      {currentChapter && (
        <Card sx={{ mb: 3, bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
          <Box sx={{ p: 3 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={8}>
                <Typography variant="h6" gutterBottom>
                  Chapter {currentChapter.chapterNumber}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 2 }}>
                  {currentChapter.description || 'No description available'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1 }}>
                  <Chip
                    label={`${currentChapter.panelCount} panels`}
                    size="small"
                    sx={{ bgcolor: '#2a2a3e', color: '#a0a0b8' }}
                  />
                  <Chip
                    label={`${currentChapter.views} views`}
                    size="small"
                    sx={{ bgcolor: '#2a2a3e', color: '#a0a0b8' }}
                  />
                </Box>
              </Grid>
              <Grid item xs={12} md={4}>
                <Box sx={{ display: 'flex', gap: 1, justifyContent: { xs: 'flex-start', md: 'flex-end' } }}>
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
                    Generate Video
                  </Button>
                </Box>
              </Grid>
            </Grid>
          </Box>
        </Card>
      )}

      {/* Panel Viewer */}
      {panels.length > 0 && currentPanel && (
        <Card sx={{ bgcolor: '#1a1a2e', border: '1px solid #2a2a3e' }}>
          <Box sx={{ p: 2, bgcolor: '#2a2a3e' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Typography variant="body2">
                Panel {currentPanelIndex + 1} of {panels.length}
              </Typography>
              <Box sx={{ display: 'flex', gap: 1 }}>
                <IconButton size="small" onClick={handleZoomOut}>
                  <ZoomOut />
                </IconButton>
                <IconButton size="small" onClick={handleZoomIn}>
                  <ZoomIn />
                </IconButton>
                <IconButton
                  size="small"
                  onClick={() => handleFullscreen(currentPanel.imageUrl)}
                >
                  <Fullscreen />
                </IconButton>
              </Box>
            </Box>
          </Box>

          <Box sx={{ position: 'relative', overflow: 'hidden' }}>
            <img
              src={currentPanel.imageUrl}
              alt={`Panel ${currentPanelIndex + 1}`}
              style={{
                width: '100%',
                height: 'auto',
                transform: `scale(${zoom})`,
                transition: 'transform 0.3s ease',
              }}
            />
          </Box>

          {/* Navigation Controls */}
          <Box sx={{ p: 2, bgcolor: '#2a2a3e' }}>
            <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <Button
                startIcon={<ArrowBack />}
                onClick={handlePrevious}
                disabled={currentPanelIndex === 0}
              >
                Previous
              </Button>
              <Typography variant="body2">
                {currentPanelIndex + 1} / {panels.length}
              </Typography>
              <Button
                endIcon={<ArrowForward />}
                onClick={handleNext}
                disabled={currentPanelIndex === panels.length - 1}
              >
                Next
              </Button>
            </Box>
          </Box>
        </Card>
      )}

      {/* Panel Grid */}
      <Box sx={{ mt: 4 }}>
        <Typography variant="h6" gutterBottom>
          All Panels
        </Typography>
        <Grid container spacing={2}>
          {panels.map((panel: any, index: number) => (
            <Grid item xs={6} sm={4} md={3} lg={2} key={panel._id}>
              <Card
                sx={{
                  cursor: 'pointer',
                  border: currentPanelIndex === index ? '2px solid #8b5cf6' : '1px solid #2a2a3e',
                  '&:hover': {
                    borderColor: '#4a4a6a',
                  },
                }}
                onClick={() => setCurrentPanelIndex(index)}
              >
                <CardMedia
                  component="img"
                  image={panel.thumbnailUrl || panel.imageUrl}
                  alt={`Panel ${index + 1}`}
                  sx={{ height: 120, objectFit: 'cover' }}
                />
                <Box sx={{ p: 1, bgcolor: '#1a1a2e' }}>
                  <Typography variant="caption" sx={{ color: '#a0a0b8' }}>
                    Panel {index + 1}
                  </Typography>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      </Box>

      {/* Floating Action Buttons */}
      <Box sx={{ position: 'fixed', bottom: 24, right: 24, display: 'flex', flexDirection: 'column', gap: 1 }}>
        <Fab
          color="primary"
          size="small"
          onClick={() => navigate(`/video-editor/new?chapter=${chapterId}`)}
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            },
          }}
        >
          <PlayArrow />
        </Fab>
      </Box>

      {/* Fullscreen Dialog */}
      <Dialog
        open={!!fullscreenPanel}
        onClose={() => setFullscreenPanel(null)}
        maxWidth="lg"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
          },
        }}
      >
        <DialogTitle sx={{ color: '#ffffff' }}>Panel View</DialogTitle>
        <DialogContent>
          {fullscreenPanel && (
            <img
              src={fullscreenPanel}
              alt="Fullscreen panel"
              style={{
                width: '100%',
                height: 'auto',
                maxHeight: '70vh',
                objectFit: 'contain',
              }}
            />
          )}
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setFullscreenPanel(null)}>Close</Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default ChapterViewerPage;
