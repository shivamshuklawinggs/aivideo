'use client';
import React from 'react';
import {
  Box, Typography, Card, CardContent, Grid, Chip, Button,
  LinearProgress,
} from '@mui/material';
import { ArrowBack, CheckCircle } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';
import VideoEditor from '@/components/videoEditor/VideoEditor';

export default function ChapterDetailPage() {
  const router = useRouter();
  const { chapterId } = useParams<{ chapterId: string }>();
  const queryClient = useQueryClient();

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

  const markReadMutation = useMutation({
    mutationFn: () => sukuyamiApi.markChapterAsRead(chapterId),
    onSuccess: () => { toast.success('Marked as read'); queryClient.invalidateQueries({ queryKey: ['chapter', chapterId] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load chapter</Typography></Box>;

  const chapter = data;
  if (!chapter) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>Back</Button>
      <Button variant="outlined" startIcon={<CheckCircle />} onClick={() => markReadMutation.mutate()} disabled={markReadMutation.isPending || chapter.isRead} sx={{ mb: 2, ml: 2 }}>
        {chapter.isRead ? 'Read' : 'Mark as Read'}
      </Button>

      <Typography variant="h4" gutterBottom>
        Chapter {chapter.chapterNumber}: {chapter.name || ''}
      </Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2}>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">Read</Typography><br />
              <Chip label={chapter.isRead ? 'Read' : 'Unread'} size="small" color={chapter.isRead ? 'success' : 'warning'} />
            </Grid>
            <Grid item xs={6} sm={3}>
              <Typography variant="caption" color="textSecondary">Panels</Typography><br />
              <Typography variant="h6">{chapter.pageCount || pagesData?.pages?.length || 0}</Typography>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Inline Video Editor */}
      <VideoEditor
        pages={pagesData?.pages ?? []}
        title={chapter.name}
        chapterNumber={chapter.chapterNumber}
      />
    </Box>
  );
}
