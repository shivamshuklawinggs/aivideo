'use client';
import React from 'react';
import {
  Box, Typography, Card, CardContent, CardMedia, Grid,
  Chip, Button, LinearProgress, Avatar, Divider,
} from '@mui/material';
import { ArrowBack, Book, Sync, VideoLibrary } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';

export default function WebtoonDetailPage() {
  const router = useRouter();
  const { webtoonId } = useParams<{ webtoonId: string }>();

  const { data, isLoading, error } = useQuery({
    queryKey: ['webtoon', webtoonId],
    queryFn: () => sukuyamiApi.getWebtoon(webtoonId),
    enabled: !!webtoonId,
  });

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;
  if (error) return <Box sx={{ p: 3 }}><Typography color="error">Failed to load webtoon</Typography></Box>;

  const webtoon = data;
  if (!webtoon) return null;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Button startIcon={<ArrowBack />} onClick={() => router.back()} sx={{ mb: 2 }}>
        Back
      </Button>

      <Grid container spacing={3}>
        <Grid item xs={12} md={4}>
          <Card>
            <CardMedia component="img" image={webtoon.thumbnailUrl || '/placeholder.jpg'} alt={webtoon.title} sx={{ height: 400, objectFit: 'cover' }} />
            <CardContent>
              <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
                {webtoon.genre?.map((g: string) => <Chip key={g} label={g} size="small" variant="outlined" />)}
              </Box>
              <Button fullWidth variant="contained" startIcon={<Sync />} sx={{ mb: 1 }} onClick={() => router.push(`/webtoons/${webtoonId}/chapters`)}>
                View Chapters
              </Button>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} md={8}>
          <Card>
            <CardContent>
              <Typography variant="h4" gutterBottom>{webtoon.title}</Typography>
              <Typography variant="subtitle1" color="textSecondary" gutterBottom>by {webtoon.author}</Typography>
              <Chip label={webtoon.status} color={webtoon.status === 'ongoing' ? 'success' : 'primary'} sx={{ mb: 2 }} />
              <Divider sx={{ mb: 2 }} />
              <Typography variant="body1" paragraph>{webtoon.description}</Typography>
              <Divider sx={{ mb: 2 }} />
              <Grid container spacing={2}>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'primary.main', mx: 'auto', mb: 1 }}><Book /></Avatar>
                    <Typography variant="h5">{webtoon.chapters?.totalCount ?? 0}</Typography>
                    <Typography variant="caption" color="textSecondary">Chapters</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'warning.main', mx: 'auto', mb: 1 }}><VideoLibrary /></Avatar>
                    <Typography variant="h5">{webtoon.unreadCount ?? 0}</Typography>
                    <Typography variant="caption" color="textSecondary">Unread</Typography>
                  </Box>
                </Grid>
                <Grid item xs={6} sm={3}>
                  <Box textAlign="center">
                    <Avatar sx={{ bgcolor: 'info.main', mx: 'auto', mb: 1 }}><Sync /></Avatar>
                    <Typography variant="h5">{webtoon.downloadCount ?? 0}</Typography>
                    <Typography variant="caption" color="textSecondary">Downloads</Typography>
                  </Box>
                </Grid>
              </Grid>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}
