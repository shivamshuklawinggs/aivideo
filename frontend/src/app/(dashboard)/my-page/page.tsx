'use client';
import React, { useState } from 'react';
import {
  Box, Grid, Card, CardContent, CardMedia, Typography, TextField,
  Button, Select, MenuItem, FormControl, InputLabel, Chip,
  IconButton, LinearProgress, Paper, ToggleButton, ToggleButtonGroup,
  InputAdornment,
} from '@mui/material';
import { Search, FilterList, Close } from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'next/navigation';
import { sukuyamiApi, Webtoon, WebtoonSearchParams } from '@/services/api/sukuyamiApi';

export default function MyPage() {
  const router = useRouter();
  const [params, setParams] = useState<WebtoonSearchParams>({ 
    page: 1, 
    limit: 20, 
    status: 'all', 
    sortBy: 'updatedAt', 
    sortOrder: 'desc' 
  });
  const [searchQuery, setSearchQuery] = useState('');

  const { data: webtoonsData, isLoading } = useQuery({
    queryKey: ['my-webtoons', params],
    queryFn: () => sukuyamiApi.getWebtoons(params),
    placeholderData: (prev) => prev,
  });

  const handleFilterChange = (field: keyof WebtoonSearchParams, value: any) => {
    setParams((p) => ({ ...p, [field]: value, page: 1 }));
  };

  const handleSearch = () => {
    setParams((p) => ({ ...p, search: searchQuery, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    if (status === 'ongoing') return 'success';
    if (status === 'completed') return 'primary';
    if (status === 'hiatus') return 'warning';
    return 'default';
  };

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;

  const webtoons = webtoonsData?.data || [];

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">My Page</Typography>
        <IconButton onClick={() => router.back()}><Close /></IconButton>
      </Box>

      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={4}>
            <TextField
              fullWidth placeholder="Search webtoons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: (
                  <InputAdornment position="start">
                    <Search />
                  </InputAdornment>
                ),
              }}
            />
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Status</InputLabel>
              <Select
                value={params.status}
                label="Status"
                onChange={(e) => handleFilterChange('status', e.target.value)}
              >
                <MenuItem value="all">All</MenuItem>
                <MenuItem value="ongoing">Ongoing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="hiatus">Hiatus</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={6} sm={3} md={2}>
            <FormControl fullWidth size="small">
              <InputLabel>Sort By</InputLabel>
              <Select
                value={params.sortBy}
                label="Sort By"
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <MenuItem value="updatedAt">Updated</MenuItem>
                <MenuItem value="createdAt">Added</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="totalChapters">Chapters</MenuItem>
              </Select>
            </FormControl>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <ToggleButtonGroup
              value={params.sortOrder}
              exclusive
              onChange={(e, newOrder) => newOrder && handleFilterChange('sortOrder', newOrder)}
              size="small"
              fullWidth
            >
              <ToggleButton value="asc">Asc</ToggleButton>
              <ToggleButton value="desc">Desc</ToggleButton>
            </ToggleButtonGroup>
          </Grid>
          <Grid item xs={12} sm={6} md={2}>
            <Button 
              fullWidth 
              variant="contained" 
              startIcon={<FilterList />}
              onClick={handleSearch}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {webtoons.length === 0 ? (
        <Box textAlign="center" py={6}>
          <Typography color="textSecondary">No webtoons found. Try adjusting your filters or search terms.</Typography>
        </Box>
      ) : (
        <>
          <Typography variant="body2" color="textSecondary" mb={2}>
            Found {webtoons.length} webtoons
          </Typography>
          <Grid container spacing={3}>
            {webtoons.map((webtoon: Webtoon) => (
              <Grid item xs={12} sm={6} md={4} lg={3} key={webtoon.id}>
                <Card
                  sx={{ height: '100%', display: 'flex', flexDirection: 'column', cursor: 'pointer' }}
                  onClick={() => router.push(`/webtoons/${webtoon.id}`)}
                >
                  <CardMedia
                    component="img"
                    height="200"
                    image={webtoon.thumbnailUrl || '/placeholder.jpg'}
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
                      <Chip label={`${webtoon.chapters?.totalCount ?? 0} chapters`} size="small" variant="outlined" />
                      {webtoon && webtoon?.unreadCount && webtoon.unreadCount > 0 && (
                        <Chip 
                          label={`${webtoon.unreadCount} unread`} 
                          size="small" 
                          color="warning" 
                          variant="outlined"
                        />
                      )}
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
                </Card>
              </Grid>
            ))}
          </Grid>
        </>
      )}
    </Box>
  );
}
