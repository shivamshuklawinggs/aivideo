'use client';
import React, { useState, useCallback, useEffect } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress, Stepper, Step, StepLabel, StepContent, Alert,
  CircularProgress, Divider, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import {
  ArrowBack, CheckCircle, AutoFixHigh, MenuBook,
  RecordVoiceOver, Movie, PlayArrow,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';
import { pipelineApi, JobStatus } from '@/services/api/pipelineApi';
import { usePipelineSocket } from '@/hooks/usePipelineSocket';
import VideoEditor from '@/components/videoEditor/VideoEditor';

export default function ChapterDetailPage() {
  const router = useRouter();
  const { chapterId } = useParams<{ chapterId: string }>();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<string>('idle');
  const [pipelineMode, setPipelineMode] = useState<'manual' | 'auto'>('manual');
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);

  const socketState = usePipelineSocket(chapterId, currentJob?.jobId);

  const { data, isLoading, error } = useQuery({
    queryKey: ['chapter', chapterId],
    queryFn: () => sukuyamiApi.getChapter(chapterId),
    enabled: !!chapterId,
  });

  const { data: pagesData } = useQuery({
    queryKey: ['chapter-pages', chapterId],
    queryFn: () => sukuyamiApi.getChapterPages(chapterId),
    enabled: !!chapterId,
  });

  const { data: chapterResult, refetch: refetchResult } = useQuery({
    queryKey: ['chapter-result', chapterId],
    queryFn: () => pipelineApi.getChapterResult(chapterId),
    enabled: !!chapterId,
  });

  const markReadMutation = useMutation({
    mutationFn: () => sukuyamiApi.markChapterAsRead(chapterId),
    onSuccess: () => { toast.success('Marked as read'); queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const chapter = data?.chapter ?? data;
  const mangaId = chapter?.webtoonId || '';

  // Pipeline Step 1: Analyze
  const handleAnalyze = useCallback(async () => {
    try {
      setPipelineStatus('analyzing');
      setActiveStep(0);
      const { jobId } = await pipelineApi.analyzeChapter(chapterId, mangaId);
      setCurrentJob({ jobId, chapterId, type: 'analyze', status: 'queued', progress: 0, steps: [] } as any);
      toast.info('Analysis queued in background...');
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId]);

  // Track Socket.IO real-time status and step progress
  useEffect(() => {
    if (socketState.status === 'completed' && pipelineStatus !== 'complete') {
      setPipelineStatus('complete');
      setActiveStep(4);
      refetchResult();
      toast.success('Pipeline complete (real-time)');
    } else if (socketState.status === 'error' && !pipelineStatus.includes('error')) {
      setPipelineStatus('error');
      toast.error('Pipeline reported an error. Check live log.');
    } else if (socketState.status === 'processing') {
      const stepMap: Record<string, number> = {
        vision_analysis: 0,
        story_generation: 1,
        narration: 2,
        video_render: 3,
      };
      const stepIndex = stepMap[socketState.step] ?? activeStep;
      setActiveStep(Math.max(activeStep, stepIndex));
    }
  }, [socketState.status, socketState.step, pipelineStatus, activeStep, refetchResult]);

  // Pipeline Step 2: Story
  const handleStory = useCallback(async () => {
    try {
      setPipelineStatus('generating_story');
      const { jobId } = await pipelineApi.generateStory(chapterId, mangaId);
      setCurrentJob({ jobId, chapterId, type: 'story', status: 'queued', progress: 0, steps: [] } as any);
      toast.info('Story generation queued...');
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId]);

  // Pipeline Step 3: Narration
  const handleNarration = useCallback(async () => {
    try {
      setPipelineStatus('generating_narration');
      setActiveStep(2);
      const { jobId } = await pipelineApi.generateNarration(chapterId, mangaId);
      setCurrentJob({ jobId, chapterId, type: 'narration', status: 'queued', progress: 0, steps: [] } as any);
      toast.info('Narration queued in background...');
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId]);

  // Pipeline Step 4: Video
  const handleVideo = useCallback(async () => {
    try {
      setPipelineStatus('generating_video');
      setActiveStep(3);
      const { jobId } = await pipelineApi.generateVideo(chapterId, mangaId, {
        format: 'mp4',
        quality: 'medium',
        effects: { zoom: true, fade: true },
        subtitles: true,
      });
      setCurrentJob({ jobId, chapterId, type: 'video', status: 'queued', progress: 0, steps: [] } as any);
      toast.info('Video render queued in background...');
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId]);

  // Full auto pipeline
  const handleFullPipeline = useCallback(async () => {
    try {
      setPipelineStatus('analyzing');
      setActiveStep(0);
      const { jobId } = await pipelineApi.runFullPipeline(chapterId, mangaId, {
        format: 'mp4',
        quality: 'medium',
        effects: { zoom: true, fade: true },
        subtitles: true,
      });
      setCurrentJob({ jobId, chapterId, type: 'full_pipeline', status: 'queued', progress: 0, steps: [] } as any);
      toast.info('Full pipeline queued in background. Watch live progress.');
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId]);

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load chapter</Typography></Box>;
  if (!chapter) return null;

  const isProcessing = ['analyzing', 'generating_story', 'generating_narration', 'generating_video'].includes(pipelineStatus) ||
    (socketState.status === 'processing' && !['complete', 'error'].includes(pipelineStatus));

  const displayProgress = Math.max(currentJob?.progress || 0, socketState.progress || 0);
  const displayStep = socketState.step || currentJob?.currentStep || '';

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
        {/* Left: Chapter Info */}
        <Grid item xs={12} md={8}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom>Chapter Info</Typography>
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">Read</Typography><br />
                  <Chip label={chapter.isRead ? 'Read' : 'Unread'} size="small" color={chapter.isRead ? 'success' : 'warning'} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">Panels</Typography><br />
                  <Typography variant="h6">{chapter.panelCount || pagesData?.pages?.length || 0}</Typography>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">AI Status</Typography><br />
                  <Chip label={chapterResult?.status || 'Not processed'} size="small" color={chapterResult?.status === 'video_ready' ? 'success' : 'default'} />
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Typography variant="caption" color="textSecondary">Duration</Typography><br />
                  <Typography variant="h6">{chapterResult?.totalDuration ? `${Math.round(chapterResult.totalDuration)}s` : '—'}</Typography>
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Video result */}
          {chapterResult?.files?.video && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>Generated Video</Typography>
                <video controls width="100%" style={{ borderRadius: 8 }}>
                  <source src={chapterResult.files.video} type="video/mp4" />
                </video>
              </CardContent>
            </Card>
          )}

          {/* Story result */}
          {chapterResult?.story?.narrative && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {chapterResult?.story?.title || 'Generated Story'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {chapterResult?.story?.summary}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                  {chapterResult?.story?.narrative}
                </Typography>
              </CardContent>
            </Card>
          )}
        </Grid>

        {/* Right: AI Pipeline */}
        <Grid item xs={12} md={4}>
          <Card sx={{ mb: 3 }}>
            <CardContent>
              <Typography variant="h6" gutterBottom sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <AutoFixHigh /> AI Pipeline
              </Typography>

              <ToggleButtonGroup
                value={pipelineMode}
                exclusive
                fullWidth
                size="small"
                onChange={(_, value) => value && setPipelineMode(value)}
                sx={{ mb: 2 }}
              >
                <ToggleButton value="manual">Manual</ToggleButton>
                <ToggleButton value="auto">Auto (Socket.IO)</ToggleButton>
              </ToggleButtonGroup>

              {pipelineMode === 'auto' && (
                <Button
                  fullWidth
                  variant="contained"
                  color="secondary"
                  startIcon={isProcessing ? <CircularProgress size={16} color="inherit" /> : <PlayArrow />}
                  onClick={handleFullPipeline}
                  disabled={isProcessing || !pagesData?.pages?.length}
                  sx={{ mb: 2 }}
                >
                  {isProcessing ? 'Processing...' : 'Run Full Pipeline'}
                </Button>
              )}

              {isProcessing && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress variant="determinate" value={displayProgress} sx={{ mb: 0.5 }} />
                  <Typography variant="caption" color="textSecondary">
                    {displayStep.replace(/_/g, ' ')} — {displayProgress}% {socketState.connected ? '(live)' : '(reconnecting)'}
                  </Typography>
                </Box>
              )}

              {Object.keys(socketState.steps).length > 0 && (
                <Box sx={{ mb: 2 }}>
                  <Typography variant="subtitle2" gutterBottom>Step status</Typography>
                  <Box sx={{ display: 'flex', flexDirection: 'column', gap: 0.5 }}>
                    {Object.entries(socketState.steps).map(([step, info]) => {
                      const color = info.status === 'completed' ? 'success' : info.status === 'error' ? 'error' : info.status === 'processing' ? 'primary' : 'default';
                      return (
                        <Box key={step} sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <Typography variant="caption" sx={{ textTransform: 'capitalize' }}>
                            {step.replace(/_/g, ' ')}
                          </Typography>
                          <Chip size="small" label={`${info.status} ${Math.round(info.progress)}%`} color={color} />
                        </Box>
                      );
                    })}
                  </Box>
                </Box>
              )}

              {socketState.events.length > 0 && (
                <Card variant="outlined" sx={{ mb: 2, maxHeight: 200, overflow: 'auto' }}>
                  <CardContent sx={{ py: 1, '&:last-child': { pb: 1 } }}>
                    <Typography variant="subtitle2" gutterBottom>Live log</Typography>
                    {socketState.events.slice(-8).map((ev, i) => (
                      <Box key={i} sx={{ mb: 0.5 }}>
                        <Typography variant="caption" color="textSecondary" component="span">
                          {ev.time.toLocaleTimeString()} —
                        </Typography>
                        <Typography variant="caption" component="span" sx={{ ml: 0.5 }}>
                          {ev.event}
                        </Typography>
                        {ev.data?.panelIndex !== undefined && (
                          <Typography variant="caption" color="textSecondary" component="span" sx={{ ml: 0.5 }}>
                            (panel {ev.data.panelIndex + 1})
                          </Typography>
                        )}
                        {ev.data?.error && (
                          <Typography variant="caption" color="error" component="div" sx={{ ml: 2 }}>
                            {ev.data.error}
                          </Typography>
                        )}
                      </Box>
                    ))}
                  </CardContent>
                </Card>
              )}

              <Divider sx={{ my: 2 }} />

              {pipelineMode === 'manual' && (
                <Alert severity="info" sx={{ mb: 2 }}>
                  Manual mode: run each pipeline step one by one.
                </Alert>
              )}

              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>Analyze Panels</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      OCR + Vision analysis on {pagesData?.pages?.length || 0} panels
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<AutoFixHigh />} onClick={handleAnalyze} disabled={isProcessing || pipelineMode === 'auto'}>
                      Analyze
                    </Button>
                  </StepContent>
                </Step>
                <Step>
                  <StepLabel>Generate Story</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      Create narrative from panel analyses
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<MenuBook />} onClick={handleStory} disabled={isProcessing || pipelineMode === 'auto' || activeStep < 1}>
                      Generate
                    </Button>
                  </StepContent>
                </Step>
                <Step>
                  <StepLabel>Narration & Subtitles</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      TTS voice, timeline, SRT/VTT subtitles
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<RecordVoiceOver />} onClick={handleNarration} disabled={isProcessing || pipelineMode === 'auto' || activeStep < 2}>
                      Narrate
                    </Button>
                  </StepContent>
                </Step>
                <Step>
                  <StepLabel>Generate Video</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      FFmpeg render with effects + audio
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<Movie />} onClick={handleVideo} disabled={isProcessing || pipelineMode === 'auto' || activeStep < 3}>
                      Render
                    </Button>
                  </StepContent>
                </Step>
              </Stepper>

              {pipelineStatus === 'error' && (
                <Alert severity="error" sx={{ mt: 2 }}>
                  Pipeline encountered an error. Check logs.
                </Alert>
              )}
              {pipelineStatus === 'complete' && (
                <Alert severity="success" sx={{ mt: 2 }}>
                  Pipeline complete! Video is ready.
                </Alert>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Inline Video Editor */}
      <VideoEditor
        pages={pagesData?.pages ?? []}
        title={chapter.title}
        chapterNumber={chapter.chapterNumber}
        audioUrl={chapterResult?.files?.audio}
        subtitleUrl={chapterResult?.files?.subtitle}
        videoUrl={chapterResult?.files?.video}
        timeline={chapterResult?.timeline}
      />
    </Box>
  );
}
