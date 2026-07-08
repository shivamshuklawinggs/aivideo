'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress, Paper, Divider, Select, MenuItem,
  FormControl, InputLabel, TextField,
} from '@mui/material';
import { ArrowBack, PlayArrow, Description, VideoLibrary } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';

export default function ChapterDetailPage() {
  const router = useRouter();
  const { chapterId } = useParams<{ chapterId: string }>();
  const queryClient = useQueryClient();

  const [scriptStyle, setScriptStyle] = useState('narrative');
  const [videoQuality, setVideoQuality] = useState('medium');
  const [videoFormat, setVideoFormat] = useState('mp4');

  const { data, isLoading, error } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => sukuyamiApi.getChapter(chapterId),
    enabled: !!chapterId,
  });

  const scriptMutation = useMutation({
    mutationFn: () => sukuyamiApi.generateScript(chapterId, { style: scriptStyle }),
    onSuccess: () => { toast.success('Script generation started!'); queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const videoMutation = useMutation({
    mutationFn: () => sukuyamiApi.generateVideo(chapterId, { format: videoFormat, quality: videoQuality }),
    onSuccess: () => { toast.success('Video generation started!'); queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load chapter</Typography></Box>;

  const chapter = data?.chapter ?? data;
  if (!chapter) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>Back</Button>

      <Typography variant="h4" gutterBottom>
        Chapter {chapter.chapterNumber}: {chapter.title || ''}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Chapter Info</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="textSecondary">Status</Typography><br /><Chip label={chapter.status} size="small" color={chapter.status === 'completed' ? 'success' : 'warning'} /></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="textSecondary">Panels</Typography><br /><Typography variant="h6">{chapter.panelCount || 0}</Typography></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="textSecondary">Script</Typography><br /><Chip label={chapter.scriptGenerated ? 'Generated' : 'Not yet'} size="small" color={chapter.scriptGenerated ? 'success' : 'default'} /></Grid>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="textSecondary">Video</Typography><br /><Chip label={chapter.videoGenerated ? 'Generated' : 'Not yet'} size="small" color={chapter.videoGenerated ? 'success' : 'default'} /></Grid>
              </Grid>
            </CardContent>
          </Card>

          {chapter.script && (
            <Card>
              <CardContent>
                <Typography variant="h6" gutterBottom>Script</Typography>
                <Divider sx={{ mb: 2 }} />
                <Typography variant="body2" sx={{ whiteSpace: 'pre-wrap', fontFamily: 'monospace', fontSize: '0.85rem' }}>
                  {typeof chapter.script === 'string' ? chapter.script : JSON.stringify(chapter.script, null, 2)}
                </Typography>
              </CardContent>
            </Card>
          )}

          {chapter.videoUrl && (
            <Card sx={{ mt: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generated Video</Typography>
                <video controls width="100%" style={{ borderRadius: 8 }}>
                  <source src={chapter.videoUrl} type="video/mp4" />
                </video>
              </CardContent>
            </Card>
          )}
        </Grid>

        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <Description /> Generate Script
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Style</InputLabel>
                <Select value={scriptStyle} label="Style" onChange={(e) => setScriptStyle(e.target.value)}>
                  <MenuItem value="narrative">Narrative</MenuItem>
                  <MenuItem value="dramatic">Dramatic</MenuItem>
                  <MenuItem value="educational">Educational</MenuItem>
                  <MenuItem value="casual">Casual</MenuItem>
                </Select>
              </FormControl>
              <Button fullWidth variant="contained" startIcon={<Description />}
                onClick={() => scriptMutation.mutate()} disabled={scriptMutation.isPending}>
                {scriptMutation.isPending ? 'Generating...' : 'Generate Script'}
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <VideoLibrary /> Generate Video
              </Typography>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Format</InputLabel>
                <Select value={videoFormat} label="Format" onChange={(e) => setVideoFormat(e.target.value)}>
                  <MenuItem value="mp4">MP4</MenuItem>
                  <MenuItem value="webm">WebM</MenuItem>
                </Select>
              </FormControl>
              <FormControl fullWidth sx={{ mb: 2 }}>
                <InputLabel>Quality</InputLabel>
                <Select value={videoQuality} label="Quality" onChange={(e) => setVideoQuality(e.target.value)}>
                  <MenuItem value="low">Low</MenuItem>
                  <MenuItem value="medium">Medium</MenuItem>
                  <MenuItem value="high">High</MenuItem>
                </Select>
              </FormControl>
              <Button fullWidth variant="contained" color="secondary" startIcon={<VideoLibrary />}
                onClick={() => videoMutation.mutate()} disabled={videoMutation.isPending || !chapter.scriptGenerated}>
                {videoMutation.isPending ? 'Generating...' : 'Generate Video'}
              </Button>
              {!chapter.scriptGenerated && (
                <Typography variant="caption" color="textSecondary" sx={{ mt: 1, display: 'block' }}>
                  Generate a script first before creating a video.
                </Typography>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
