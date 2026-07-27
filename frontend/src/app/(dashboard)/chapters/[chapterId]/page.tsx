'use client';
import React, { useState, useCallback } from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress, Stepper, Step, StepLabel, StepContent, Alert,
  CircularProgress, Divider,
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
import VideoEditor from '@/components/videoEditor/VideoEditor';

export default function ChapterDetailPage() {
  const router = useRouter();
  const { chapterId } = useParams<{ chapterId: string }>();
  const queryClient = useQueryClient();

  const [activeStep, setActiveStep] = useState(0);
  const [pipelineStatus, setPipelineStatus] = useState<string>('idle');
  const [currentJob, setCurrentJob] = useState<JobStatus | null>(null);
  const [storyData, setStoryData] = useState<any>(null);

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
      toast.info('Analysis started...');

      const result = await pipelineApi.pollJob(jobId, (job) => {
        setCurrentJob(job);
      });

      if (result.status === 'completed') {
        toast.success('Panel analysis complete!');
        setActiveStep(1);
        setPipelineStatus('analyzed');
        refetchResult();
      } else {
        toast.error(`Analysis failed: ${result.error}`);
        setPipelineStatus('error');
      }
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId, refetchResult]);

  // Pipeline Step 2: Story
  const handleStory = useCallback(async () => {
    try {
      setPipelineStatus('generating_story');
      const { story } = await pipelineApi.generateStory(chapterId, mangaId);
      setStoryData(story);
      toast.success('Story generated!');
      setActiveStep(2);
      setPipelineStatus('story_ready');
      refetchResult();
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId, refetchResult]);

  // Pipeline Step 3: Narration
  const handleNarration = useCallback(async () => {
    try {
      setPipelineStatus('generating_narration');
      setActiveStep(2);
      const { jobId } = await pipelineApi.generateNarration(chapterId, mangaId);
      toast.info('Generating narration...');

      const result = await pipelineApi.pollJob(jobId, (job) => {
        setCurrentJob(job);
      });

      if (result.status === 'completed') {
        toast.success('Narration & subtitles ready!');
        setActiveStep(3);
        setPipelineStatus('narrated');
        refetchResult();
      } else {
        toast.error(`Narration failed: ${result.error}`);
        setPipelineStatus('error');
      }
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId, refetchResult]);

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
      toast.info('Generating video...');

      const result = await pipelineApi.pollJob(jobId, (job) => {
        setCurrentJob(job);
      });

      if (result.status === 'completed') {
        toast.success('Video generated!');
        setActiveStep(4);
        setPipelineStatus('complete');
        refetchResult();
      } else {
        toast.error(`Video generation failed: ${result.error}`);
        setPipelineStatus('error');
      }
    } catch (err: any) {
      toast.error(err.message);
      setPipelineStatus('error');
    }
  }, [chapterId, mangaId, refetchResult]);

  // Full auto pipeline
  const handleFullPipeline = useCallback(async () => {
    await handleAnalyze();
    await handleStory();
    await handleNarration();
    await handleVideo();
  }, [handleAnalyze, handleStory, handleNarration, handleVideo]);

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load chapter</Typography></Box>;
  if (!chapter) return null;

  const isProcessing = ['analyzing', 'generating_story', 'generating_narration', 'generating_video'].includes(pipelineStatus);

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
          {(storyData || chapterResult?.story?.narrative) && (
            <Card sx={{ mb: 3 }}>
              <CardContent>
                <Typography variant="h6" gutterBottom>
                  {storyData?.title || chapterResult?.story?.title || 'Generated Story'}
                </Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 2 }}>
                  {storyData?.summary || chapterResult?.story?.summary}
                </Typography>
                <Divider sx={{ my: 1 }} />
                <Typography variant="body1" sx={{ whiteSpace: 'pre-wrap', mt: 2 }}>
                  {storyData?.narrative || chapterResult?.story?.narrative}
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

              {currentJob && isProcessing && (
                <Box sx={{ mb: 2 }}>
                  <LinearProgress variant="determinate" value={currentJob.progress} sx={{ mb: 0.5 }} />
                  <Typography variant="caption" color="textSecondary">
                    {currentJob.currentStep?.replace(/_/g, ' ')} — {currentJob.progress}%
                  </Typography>
                </Box>
              )}

              <Divider sx={{ my: 2 }} />

              <Stepper activeStep={activeStep} orientation="vertical">
                <Step>
                  <StepLabel>Analyze Panels</StepLabel>
                  <StepContent>
                    <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                      OCR + Vision analysis on {pagesData?.pages?.length || 0} panels
                    </Typography>
                    <Button size="small" variant="outlined" startIcon={<AutoFixHigh />} onClick={handleAnalyze} disabled={isProcessing}>
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
                    <Button size="small" variant="outlined" startIcon={<MenuBook />} onClick={handleStory} disabled={isProcessing}>
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
                    <Button size="small" variant="outlined" startIcon={<RecordVoiceOver />} onClick={handleNarration} disabled={isProcessing}>
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
                    <Button size="small" variant="outlined" startIcon={<Movie />} onClick={handleVideo} disabled={isProcessing}>
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
      />
    </Box>
  );
}
