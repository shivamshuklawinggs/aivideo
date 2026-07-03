import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  TextField,
  Button,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Pagination,
  Chip,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  List,
  ListItem,
  ListItemText,
  ListItemAvatar,
  Avatar,
  LinearProgress,
  Tooltip,
  Paper,
} from '@mui/material';
import {
  Search,
  Add,
  Sync,
  Visibility,
  Description,
  VideoLibrary,
  FilterList,
  Book,
} from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useNavigate } from 'react-router-dom';
import { sukuyamiApi, Webtoon, WebtoonSearchParams } from '../../services/api/sukuyamiApi';

const WebtoonsPage: React.FC = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  
  const [searchParams, setSearchParams] = useState<WebtoonSearchParams>({
    page: 1,
    limit: 20,
    status: 'all',
    sortBy: 'updatedAt',
    sortOrder: 'desc',
  });
  
  const [searchDialogOpen, setSearchDialogOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<any[]>([]);

  const { data: webtoonsData, isLoading, error } = useQuery({
    queryKey: ['webtoons', searchParams],
    queryFn: () => sukuyamiApi.getWebtoons(searchParams),
    placeholderData: (previousData) => previousData,
  });

  const syncMutation = useMutation({
    mutationFn: (options: any) => sukuyamiApi.syncWebtoons(options),
    onSuccess: () => {
      toast.success('Webtoons synced successfully');
      queryClient.invalidateQueries({ queryKey: ['webtoons'] });
    },
    onError: (error: any) => {
      toast.error(`Sync failed: ${error.message}`);
    },
  });

  const addWebtoonMutation = useMutation({
    mutationFn: (sukuyamiId: string) => sukuyamiApi.addWebtoon(sukuyamiId),
    onSuccess: () => {
      toast.success('Webtoon added successfully');
      queryClient.invalidateQueries({ queryKey: ['webtoons'] });
      setSearchDialogOpen(false);
      setSearchQuery('');
      setSearchResults([]);
    },
    onError: (error: any) => {
      toast.error(`Failed to add webtoon: ${error.message}`);
    },
  });

  const searchMutation = useMutation({
    mutationFn: (query: string) => sukuyamiApi.searchWebtoons({ query, limit: 20 }),
    onSuccess: (results) => {
      setSearchResults(results);
    },
    onError: (error: any) => {
      toast.error(`Search failed: ${error.message}`);
    },
  });

  const handleSearch = () => {
    if (searchQuery.trim()) {
      searchMutation.mutate(searchQuery.trim());
    }
  };

  const handleAddWebtoon = (sukuyamiId: string) => {
    addWebtoonMutation.mutate(sukuyamiId);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setSearchParams(prev => ({ ...prev, page: value }));
  };

  const handleFilterChange = (field: keyof WebtoonSearchParams, value: any) => {
    setSearchParams(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'ongoing':
        return 'success';
      case 'completed':
        return 'primary';
      case 'hiatus':
        return 'warning';
      default:
        return 'default';
    }
  };

  if (isLoading) {
    return (
      <Box sx={{ width: '100%', mt: 2 }}>
        <LinearProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Typography color="error">Failed to load webtoons</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box display="flex" justifyContent="space-between" alignItems="center" mb={3}>
        <Typography variant="h4">Webtoons</Typography>
        <Box>
          <Button
            variant="outlined"
            startIcon={<Sync />}
            onClick={() => syncMutation.mutate({})}
            disabled={syncMutation.isPending}
            sx={{ mr: 2 }}
          >
            Sync All
          </Button>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={() => setSearchDialogOpen(true)}
          >
            Add Webtoon
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search webtoons..."
              value={searchParams.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />,
              }}
            />
          </Grid>
          
          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Status</InputLabel>
              <Select
                value={searchParams.status || 'all'}
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

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Sort By</InputLabel>
              <Select
                value={searchParams.sortBy || 'updatedAt'}
                label="Sort By"
                onChange={(e) => handleFilterChange('sortBy', e.target.value)}
              >
                <MenuItem value="createdAt">Created</MenuItem>
                <MenuItem value="updatedAt">Updated</MenuItem>
                <MenuItem value="title">Title</MenuItem>
                <MenuItem value="totalChapters">Chapters</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <FormControl fullWidth>
              <InputLabel>Order</InputLabel>
              <Select
                value={searchParams.sortOrder || 'desc'}
                label="Order"
                onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
              >
                <MenuItem value="asc">Ascending</MenuItem>
                <MenuItem value="desc">Descending</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={3}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['webtoons'] })}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Webtoons Grid */}
      <Grid container spacing={3}>
        {webtoonsData?.data?.map((webtoon: Webtoon) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={webtoon._id}>
            <Card 
              sx={{ 
                height: '100%', 
                display: 'flex', 
                flexDirection: 'column',
                cursor: 'pointer',
                transition: 'transform 0.2s',
                '&:hover': {
                  transform: 'translateY(-4px)',
                  boxShadow: 4,
                },
              }}
              onClick={() => navigate(`/webtoons/${webtoon._id}`)}
            >
              <CardMedia
                component="img"
                height="200"
                image={webtoon.coverImage || '/placeholder-webtoon.jpg'}
                alt={webtoon.title}
                sx={{ objectFit: 'cover' }}
              />
              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap gutterBottom>
                  {webtoon.title}
                </Typography>
                
                <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>
                  {webtoon.author}
                </Typography>

                <Typography variant="body2" sx={{ 
                  mb: 2, 
                  overflow: 'hidden', 
                  textOverflow: 'ellipsis',
                  display: '-webkit-box',
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: 'vertical',
                }}>
                  {webtoon.description}
                </Typography>

                <Box display="flex" justifyContent="space-between" alignItems="center" mb={2}>
                  <Chip 
                    label={webtoon.status} 
                    color={getStatusColor(webtoon.status) as any}
                    size="small"
                  />
                  <Typography variant="body2" color="textSecondary">
                    {webtoon.totalChapters} chapters
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" alignItems="center">
                  <Typography variant="body2" color="textSecondary">
                    Rating: {webtoon.sukuyamiData.rating}/10
                  </Typography>
                  <Typography variant="body2" color="textSecondary">
                    Popularity: {webtoon.sukuyamiData.popularity}
                  </Typography>
                </Box>

                <Box display="flex" justifyContent="space-between" mt={2}>
                  <Tooltip title="View Chapters">
                    <IconButton 
                      size="small"
                      onClick={(e) => {
                        e.stopPropagation();
                        navigate(`/webtoons/${webtoon._id}/chapters`);
                      }}
                    >
                      <Visibility />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Generate Scripts">
                    <IconButton size="small">
                      <Description />
                    </IconButton>
                  </Tooltip>
                  
                  <Tooltip title="Generate Videos">
                    <IconButton size="small">
                      <VideoLibrary />
                    </IconButton>
                  </Tooltip>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Pagination */}
      {webtoonsData?.pagination && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={webtoonsData.pagination.totalPages}
            page={webtoonsData.pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Add Webtoon Dialog */}
      <Dialog 
        open={searchDialogOpen} 
        onClose={() => setSearchDialogOpen(false)}
        maxWidth="md"
        fullWidth
      >
        <DialogTitle>Add Webtoon from SUKUYAMI</DialogTitle>
        <DialogContent>
          <Box display="flex" gap={2} mb={2}>
            <TextField
              fullWidth
              placeholder="Search for webtoons..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{
                startAdornment: <Search sx={{ mr: 1 }} />,
              }}
            />
            <Button
              variant="contained"
              onClick={handleSearch}
              disabled={searchMutation.isPending}
            >
              Search
            </Button>
          </Box>

          {searchMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}

          <List>
            {searchResults.map((result: any) => (
              <ListItem key={result.id}>
                <ListItemAvatar>
                  <Avatar src={result.coverImage} alt={result.title}>
                    <Book />
                  </Avatar>
                </ListItemAvatar>
                <ListItemText
                  primary={result.title}
                  secondary={`${result.author} • ${result.totalChapters} chapters • ${result.status}`}
                />
                <Button
                  variant="outlined"
                  onClick={() => handleAddWebtoon(result.id)}
                  disabled={addWebtoonMutation.isPending}
                >
                  Add
                </Button>
              </ListItem>
            ))}
          </List>
        </DialogContent>
        <DialogActions>
          <Button onClick={() => setSearchDialogOpen(false)}>
            Cancel
          </Button>
        </DialogActions>
      </Dialog>
    </Box>
  );
};

export default WebtoonsPage;
