'use client';
import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, TextField,
  Button, Select, MenuItem, FormControl, InputLabel, Pagination,
  Chip, IconButton, LinearProgress,
  Tooltip, Paper, InputAdornment,
} from '@mui/material';
import { Search, Sync, Visibility, Description, VideoLibrary, FilterList } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { sukuyamiApi, Webtoon, WebtoonSearchParams } from '@/services/api/sukuyamiApi';

export default function WebtoonsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [params, setParams] = useState<WebtoonSearchParams>({ page: 1, limit: 20, status: 'all', sortBy: 'updatedAt', sortOrder: 'desc' });

  const { data: webtoonsData, isLoading } = useQuery({
    queryKey: ['webtoons', params],
    queryFn: () => sukuyamiApi.getWebtoons(params),
    placeholderData: (prev) => prev,
  });

  const syncMutation = useMutation({
    mutationFn: () => sukuyamiApi.syncWebtoons({}),
    onSuccess: () => { toast.success('Synced successfully'); queryClient.invalidateQueries({ queryKey: ['webtoons'] }); },
    onError: (e: any) => toast.error(`Sync failed: ${e.message}`),
  });

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
        <Typography variant="h4">Webtoons</Typography>
        <Box display="flex" gap={2}>
          <Button variant="outlined" startIcon={<FilterList />} onClick={() => router.push('/my-page')}>
            My Page
          </Button>
          <Button variant="outlined" startIcon={<Sync />} onClick={() => syncMutation.mutate()} disabled={syncMutation.isPending}>
            Sync All
          </Button>
          <Button variant="contained" color="secondary" startIcon={<VideoLibrary />} onClick={() => router.push('/popular')}>
            Popular
          </Button>
        </Box>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth placeholder="Search webtoons..."
              value={params.search || ''}
              onChange={(e) => setParams((p) => ({ ...p, search: e.target.value, page: 1 }))}
              InputProps={{ startAdornment: <InputAdornment position="start"><Search /></InputAdornment> }}
            />
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select value={params.status || 'all'} label="Status" onChange={(e) => setParams((p) => ({ ...p, status: e.target.value, page: 1 }))}>
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="ongoing">Ongoing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="hiatus">Hiatus</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select value={params.sortBy || 'updatedAt'} label="Sort By" onChange={(e) => setParams((p) => ({ ...p, sortBy: e.target.value, page: 1 }))}>
                <MenuItem value="createdAt">Created</MenuItem>
                <MenuItem value="updatedAt">Updated</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="totalChapters">Chapters</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select value={params.sortOrder || 'desc'} label="Order" onChange={(e) => setParams((p) => ({ ...p, sortOrder: e.target.value }))}>
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} md={2}>
            <Button fullWidth variant="outlined" startIcon={<FilterList />} onClick={() => queryClient.invalidateQueries({ queryKey: ['webtoons'] })}>
              Apply
            </Button>
          </Grid>
        </Grid>
      </Paper>

      <Grid container spacing={3}>
        {webtoonsData?.data?.map((webtoon: Webtoon) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={webtoon._id}>
            <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)', boxShadow: 4 } }}
              onClick={() => router.push(`/webtoons/${webtoon._id}`)}>
              <CardMedia component="img" height="180" image={webtoon.coverImage || '/placeholder.jpg'} alt={webtoon.title} sx={{ objectFit: 'cover' }} />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap gutterBottom>{webtoon.title}</Typography>
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{webtoon.author}</Typography>
                <Typography variant="body2" sx={{ mb: 2, overflow: 'hidden', textOverflow: 'ellipsis', display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical' }}>
                  {webtoon.description}
                </Typography>
                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Chip label={webtoon.status} color={getStatusColor(webtoon.status) as any} size="small" />
                  <Typography variant="body2" color="textSecondary">{webtoon.totalChapters} chapters</Typography>
                </Box>
                <Box display="flex" justifyContent="space-between" mt={1}>
                  <Tooltip title="View Chapters">
                    <IconButton size="small" onClick={(e) => { e.stopPropagation(); router.push(`/webtoons/${webtoon._id}/chapters`); }}>
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  <Tooltip title="Scripts"><IconButton size="small"><Description /></IconButton></Tooltip>
                  <Tooltip title="Videos"><IconButton size="small"><VideoLibrary /></IconButton></Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {webtoonsData?.pagination && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination count={webtoonsData.pagination.pages ?? webtoonsData.pagination.totalPages ?? 1} page={params.page || 1}
            onChange={(_, v) => setParams((p) => ({ ...p, page: v }))} color="primary" />
        </Box>
      )}

    </Box>
  );
}
