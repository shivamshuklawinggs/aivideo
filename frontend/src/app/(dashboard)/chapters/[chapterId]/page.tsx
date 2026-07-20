'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress, Divider, Select, MenuItem,
  FormControl, InputLabel,
} from '@mui/material';
import { ArrowBack, Description, CheckCircle, Videocam } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';
import VideoEditor from '@/components/VideoEditor';

export default function ChapterDetailPage() {
  const router = useRouter();
  const { chapterId } = useParams<{ chapterId: string }>();
  const queryClient = useQueryClient();

  const [scriptStyle, setScriptStyle] = useState('narrative');
  const [videoEditorOpen, setVideoEditorOpen] = useState(false);

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

  const markReadMutation = useMutation({
    mutationFn: () => sukuyamiApi.markChapterAsRead(chapterId),
    onSuccess: () => { toast.success('Marked as read'); queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['chapter-pages', chapterId],
    queryFn: () => sukuyamiApi.getChapterPages(chapterId),
    enabled: !!chapterId,
  });

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load chapter</Typography></Box>;

  const chapter = data?.chapter ?? data;
  if (!chapter) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>Back</Button>
      <Button variant="outlined" startIcon={<CheckCircle />} onClick={() => markReadMutation.mutate()} disabled={markReadMutation.isPending || chapter.isRead} sx={{ mb: 2, ml: 2 }}>
        {chapter.isRead ? 'Read' : 'Mark as Read'}
      </Button>

      <Typography variant="h4" gutterBottom>
        Chapter {chapter.chapterNumber}: {chapter.title || ''}
      </Typography>

      <Grid container spacing={3}>
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Chapter Info</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}><Typography variant="caption" color="textSecondary">Read</Typography><br /><Chip label={chapter.isRead ? 'Read' : 'Unread'} size="small" color={chapter.isRead ? 'success' : 'warning'} /></Grid>
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

          <Card sx={{ mt: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Panels</Typography>
              {pagesLoading && <LinearProgress />}
              {pagesData?.pages?.length ? (
                <Box display="flex" flexDirection="column" gap={2}>
                  {pagesData.pages.map((url: string, idx: number) => (
                    <Box key={idx}>
                      <Typography variant="caption" color="textSecondary" sx={{ mb: 0.5, display: 'block' }}>Page {idx + 1}</Typography>
                      <img src={url} alt={`Page ${idx + 1}`} style={{ width: '100%', borderRadius: 8, display: 'block' }} loading="lazy" />
                    </Box>
                  ))}
                </Box>
              ) : (
                !pagesLoading && <Typography variant="body2" color="textSecondary">No pages loaded yet.</Typography>
              )}
            </CardContent>
          </Card>
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
                <Videocam /> Generate Video
              </Typography>
              <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                Build a video from the manga panels in your browser. Reorder panels, adjust duration, and add effects.
              </Typography>
              <Button fullWidth variant="contained" color="secondary" startIcon={<Videocam />}
                onClick={() => setVideoEditorOpen(true)}>
                Open Video Editor
              </Button>
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      <VideoEditor
        open={videoEditorOpen}
        onClose={() => setVideoEditorOpen(false)}
        pages={pagesData?.pages ?? []}
        title={chapter.title}
        chapterNumber={chapter.chapterNumber}
      />
    </Box>
  );
}
