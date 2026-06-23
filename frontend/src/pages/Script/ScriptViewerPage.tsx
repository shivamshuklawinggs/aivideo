import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  LinearProgress,
  Chip,
  Paper,
  Grid,
} from '@mui/material';
import {
  ArrowBack,
  PlayArrow,
  Edit,
  Download,
  Timer,
} from '@mui/icons-material';


interface ScriptData {
  _id: string;
  title: string;
  summary: string;
  detailedExplanation: string;
  hook: string;
  ending: string;
  characters: Array<{
    name: string;
    description: string;
    appearances: number[];
  }>;
  keyEvents: Array<{
    event: string;
    panelNumbers: number[];
    importance: 'high' | 'medium' | 'low';
  }>;
  emotions: Array<{
    emotion: string;
    intensity: number;
    panelNumbers: number[];
  }>;
  scriptSegments: Array<{
    panelNumber: number;
    narration: string;
    duration: number;
  }>;
  metadata: {
    totalDuration: number;
    wordCount: number;
    estimatedReadTime: number;
    aiModel: string;
    generatedAt: string;
  };
}

const ScriptViewerPage: React.FC = () => {
  const { scriptId } = useParams<{ scriptId: string }>();
  const navigate = useNavigate();
 
  // Mock data - in real app this would come from API
  const [script, setScript] = useState<ScriptData | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'overview' | 'script' | 'analysis'>('overview');

  useEffect(() => {
    // Simulate API call
    setTimeout(() => {
      setScript({
        _id: scriptId || '1',
        title: 'Chapter 1: The Beginning',
        summary: 'A young hero embarks on an epic journey to save the world from darkness.',
        detailedExplanation: 'In this chapter, we meet our protagonist as they discover their hidden powers and face their first real challenge. The story begins in a peaceful village where our hero lives a normal life, unaware of the destiny that awaits them.',
        hook: 'What if everything you knew about your life was a lie?',
        ending: 'With newfound determination, our hero sets forth on a path that will change everything.',
        characters: [
          { name: 'Hero', description: 'Main protagonist with hidden powers', appearances: [1, 2, 3, 4, 5] },
          { name: 'Mentor', description: 'Wise guide who reveals the truth', appearances: [3, 4] },
          { name: 'Villain', description: 'Dark force threatening the world', appearances: [5] },
        ],
        keyEvents: [
          { event: 'Hero discovers powers', panelNumbers: [2, 3], importance: 'high' },
          { event: 'Mentor appears', panelNumbers: [3], importance: 'high' },
          { event: 'First battle', panelNumbers: [4, 5], importance: 'medium' },
        ],
        emotions: [
          { emotion: 'Surprise', intensity: 8, panelNumbers: [2] },
          { emotion: 'Fear', intensity: 6, panelNumbers: [3] },
          { emotion: 'Determination', intensity: 9, panelNumbers: [4, 5] },
        ],
        scriptSegments: [
          { panelNumber: 1, narration: 'Our story begins in a peaceful village, where life has been normal for generations.', duration: 4.5 },
          { panelNumber: 2, narration: 'But today, something extraordinary happens that will change everything.', duration: 3.2 },
          { panelNumber: 3, narration: 'A mysterious figure appears, revealing secrets about our hero\'s true nature.', duration: 5.1 },
          { panelNumber: 4, narration: 'The first test of power comes unexpectedly, forcing our hero to make a choice.', duration: 4.8 },
          { panelNumber: 5, narration: 'With newfound purpose, our hero accepts their destiny and prepares for the journey ahead.', duration: 4.2 },
        ],
        metadata: {
          totalDuration: 21.8,
          wordCount: 156,
          estimatedReadTime: 2.5,
          aiModel: 'Llama 3 70B',
          generatedAt: new Date().toISOString(),
        },
      });
      setIsLoading(false);
    }, 1000);
  }, [scriptId]);

  const handleGenerateVideo = () => {
    navigate(`/video-editor/new?script=${scriptId}`);
  };

  const handleEditScript = () => {
    // Navigate to script editor
    console.log('Edit script');
  };

  const handleExportScript = () => {
    // Export script to file
    console.log('Export script');
  };

  const getImportanceColor = (importance: string) => {
    switch (importance) {
      case 'high':
        return '#ef4444';
      case 'medium':
        return '#f59e0b';
      case 'low':
        return '#10b981';
      default:
        return '#6b7280';
    }
  };

  const getEmotionColor = (intensity: number) => {
    if (intensity >= 8) return '#ef4444';
    if (intensity >= 6) return '#f59e0b';
    return '#10b981';
  };

  if (isLoading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
        <LinearProgress sx={{ width: '100%', maxWidth: 800 }} />
      </Box>
    );
  }

  if (!script) {
    return (
      <Box sx={{ textAlign: 'center', py: 8 }}>
        <Typography variant="h6" sx={{ color: '#a0a0b8' }}>
          Script not found
        </Typography>
      </Box>
    );
  }

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
          {script.title}
        </Typography>
        <Box sx={{ display: 'flex', gap: 1 }}>
          <Button
            variant="outlined"
            startIcon={<Edit />}
            onClick={handleEditScript}
            sx={{
              borderColor: '#2a2a3e',
              color: '#ffffff',
              '&:hover': {
                borderColor: '#4a4a6a',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleExportScript}
            sx={{
              borderColor: '#2a2a3e',
              color: '#ffffff',
              '&:hover': {
                borderColor: '#4a4a6a',
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            }}
          >
            Export
          </Button>
          <Button
            variant="contained"
            startIcon={<PlayArrow />}
            onClick={handleGenerateVideo}
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
      </Box>

      {/* Tabs */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3, borderBottom: '1px solid #2a2a3e' }}>
        <Button
          variant={activeTab === 'overview' ? 'contained' : 'text'}
          onClick={() => setActiveTab('overview')}
          sx={{
            color: activeTab === 'overview' ? '#ffffff' : '#a0a0b8',
            bgcolor: activeTab === 'overview' ? '#8b5cf6' : 'transparent',
            '&:hover': {
              bgcolor: activeTab === 'overview' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Overview
        </Button>
        <Button
          variant={activeTab === 'script' ? 'contained' : 'text'}
          onClick={() => setActiveTab('script')}
          sx={{
            color: activeTab === 'script' ? '#ffffff' : '#a0a0b8',
            bgcolor: activeTab === 'script' ? '#8b5cf6' : 'transparent',
            '&:hover': {
              bgcolor: activeTab === 'script' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Script
        </Button>
        <Button
          variant={activeTab === 'analysis' ? 'contained' : 'text'}
          onClick={() => setActiveTab('analysis')}
          sx={{
            color: activeTab === 'analysis' ? '#ffffff' : '#a0a0b8',
            bgcolor: activeTab === 'analysis' ? '#8b5cf6' : 'transparent',
            '&:hover': {
              bgcolor: activeTab === 'analysis' ? '#7c3aed' : 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Analysis
        </Button>
      </Box>

      {/* Tab Content */}
      {activeTab === 'overview' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={8}>
            <Card className="feature-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Script Overview
                </Typography>
                
                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 1 }}>
                    Hook
                  </Typography>
                  <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#ffffff' }}>
                    "{script.hook}"
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 1 }}>
                    Summary
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#a0a0b8' }}>
                    {script.summary}
                  </Typography>
                </Box>

                <Box sx={{ mb: 3 }}>
                  <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 1 }}>
                    Ending
                  </Typography>
                  <Typography variant="body1" sx={{ fontStyle: 'italic', color: '#ffffff' }}>
                    "{script.ending}"
                  </Typography>
                </Box>

                <Box>
                  <Typography variant="subtitle2" sx={{ color: '#8b5cf6', mb: 1 }}>
                    Detailed Explanation
                  </Typography>
                  <Typography variant="body1" sx={{ color: '#a0a0b8', lineHeight: 1.6 }}>
                    {script.detailedExplanation}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card className="feature-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Script Metrics
                </Typography>
                
                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      <Timer sx={{ verticalAlign: 'middle', mr: 1 }} />
                      Duration
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>
                      {script.metadata.totalDuration}s
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      Word Count
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>
                      {script.metadata.wordCount}
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      Read Time
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>
                      {script.metadata.estimatedReadTime} min
                    </Typography>
                  </Box>
                </Box>

                <Box sx={{ mb: 2 }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      AI Model
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#ffffff' }}>
                      {script.metadata.aiModel}
                    </Typography>
                  </Box>
                </Box>

                <Box>
                  <Typography variant="body2" sx={{ color: '#6a6a8a' }}>
                    Generated: {new Date(script.metadata.generatedAt).toLocaleDateString()}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}

      {activeTab === 'script' && (
        <Card className="feature-card">
          <CardContent>
            <Typography variant="h6" gutterBottom>
              Script Segments
            </Typography>
            
            {script.scriptSegments.map((segment, index) => (
              <Box key={index} sx={{ mb: 3 }}>
                <Paper sx={{ p: 2, bgcolor: '#2a2a3e', border: '1px solid #3a3a4e' }}>
                  <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 1 }}>
                    <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                      Panel {segment.panelNumber}
                    </Typography>
                    <Chip
                      label={`${segment.duration}s`}
                      size="small"
                      sx={{ bgcolor: '#1a1a2e', color: '#a0a0b8' }}
                    />
                  </Box>
                  <Typography variant="body1" sx={{ color: '#ffffff', lineHeight: 1.6 }}>
                    {segment.narration}
                  </Typography>
                </Paper>
              </Box>
            ))}
          </CardContent>
        </Card>
      )}

      {activeTab === 'analysis' && (
        <Grid container spacing={3}>
          <Grid item xs={12} md={6}>
            <Card className="feature-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Characters
                </Typography>
                
                {script.characters.map((character, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                      {character.name}
                    </Typography>
                    <Typography variant="body2" sx={{ color: '#a0a0b8' }}>
                      {character.description}
                    </Typography>
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      Appears in panels: {character.appearances.join(', ')}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card className="feature-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Key Events
                </Typography>
                
                {script.keyEvents.map((event, index) => (
                  <Box key={index} sx={{ mb: 2 }}>
                    <Box sx={{ display: 'flex', alignItems: 'center', mb: 1 }}>
                      <Chip
                        label={event.importance}
                        size="small"
                        sx={{
                          bgcolor: getImportanceColor(event.importance),
                          color: '#ffffff',
                          mr: 1,
                        }}
                      />
                      <Typography variant="subtitle2" sx={{ color: '#8b5cf6' }}>
                        {event.event}
                      </Typography>
                    </Box>
                    <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                      Panels: {event.panelNumbers.join(', ')}
                    </Typography>
                  </Box>
                ))}
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12}>
            <Card className="feature-card">
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  Emotional Arc
                </Typography>
                
                <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
                  {script.emotions.map((emotion, index) => (
                    <Box key={index}>
                      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1 }}>
                        <Typography variant="body2" sx={{ color: '#8b5cf6' }}>
                          {emotion.emotion}
                        </Typography>
                        <Typography variant="body2" sx={{ color: '#ffffff' }}>
                          Intensity: {emotion.intensity}/10
                        </Typography>
                      </Box>
                      <LinearProgress
                        variant="determinate"
                        value={emotion.intensity * 10}
                        sx={{
                          height: 8,
                          borderRadius: 4,
                          bgcolor: '#2a2a3e',
                          '& .MuiLinearProgress-bar': {
                            bgcolor: getEmotionColor(emotion.intensity),
                          },
                        }}
                      />
                      <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                        Panels: {emotion.panelNumbers.join(', ')}
                      </Typography>
                    </Box>
                  ))}
                </Box>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      )}
    </Box>
  );
};

export default ScriptViewerPage;
