'use client';
import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, Button,
  Chip, IconButton, LinearProgress, Paper, ToggleButton, ToggleButtonGroup,
} from '@mui/material';
import { VideoLibrary, Add, FilterList, Close } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { sukuyamiApi, Webtoon } from '@/services/api/sukuyamiApi';

export default function PopularPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [filter, setFilter] = useState<'all' | 'ongoing' | 'completed'>('all');

  const { data: popularWebtoons, isLoading } = useQuery({
    queryKey: ['popular-webtoons', filter],
    queryFn: () => sukuyamiApi.getPopularWebtoons({ limit: 50 }),
  });

  const addToLibraryMutation = useMutation({
    mutationFn: (webtoonId: string) => sukuyamiApi.syncWebtoons({ webtoonIds: [webtoonId] }),
    onSuccess: () => { toast.success('Added to library'); queryClient.invalidateQueries({ queryKey: ['webtoons'] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const filteredWebtoons = popularWebtoons?.filter((w: Webtoon) => {
    if (filter === 'all') return true;
    return w.status === filter;
  }) || [];

  const getStatusColor = (status: string) => {
    if (status === 'ongoing') return 'success';
    if (status === 'completed') return 'primary';
    if (status === 'hiatus') return 'warning';
    return 'default';
  };

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Popular Webtoons</Typography>
        <Box display="flex" gap={2} alignItems="center">
          <ToggleButtonGroup
            value={filter}
            exclusive
            onChange={(e, newFilter) => newFilter && setFilter(newFilter)}
            size="small"
          >
            <ToggleButton value="all">All</ToggleButton>
            <ToggleButton value="ongoing">Ongoing</ToggleButton>
            <ToggleButton value="completed">Completed</ToggleButton>
          </ToggleButtonGroup>
          <IconButton onClick={() => router.back()}><Close /></IconButton>
        </Box>
      </Box>

      {filteredWebtoons.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography color="textSecondary">No popular webtoons found</Typography>
        </Box>
      ) : (
        <Grid container spacing={3}>
          {filteredWebtoons.map((webtoon: Webtoon) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={webtoon._id}>
              <Card
                sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                onClick={() => router.push(`/webtoons/${webtoon._id}`)}
              >
                <CardMedia
                  component="img"
                  height="200"
                  image={webtoon.coverImage}
                  alt={webtoon.title}
                  sx={{ objectFit: 'cover' }}
                />
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap>{webtoon.title}</Typography>
                  <Typography variant="body2" color="textSecondary" gutterBottom>
                    {webtoon.author}
                  </Typography>
                  <Box display="flex" gap={1} flexWrap="wrap" mb={1}>
                    <Chip label={webtoon.status} size="small" color={getStatusColor(webtoon.status)} />
                    <Chip label={`${webtoon.totalChapters} chapters`} size="small" variant="outlined" />
                  </Box>
                  <Typography variant="body2" color="textSecondary" sx={{ 
                    overflow: 'hidden', 
                    textOverflow: 'ellipsis', 
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}>
                    {webtoon.description}
                  </Typography>
                </CardContent>
                <Box p={2} pt={0}>
                  <Button
                    fullWidth
                    variant="contained"
                    startIcon={<Add />}
                    onClick={(e) => {
                      e.stopPropagation();
                      addToLibraryMutation.mutate(webtoon._id);
                    }}
                    disabled={addToLibraryMutation.isPending}
                  >
                    Add to Library
                  </Button>
                </Box>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}
    </Box>
  );
}
