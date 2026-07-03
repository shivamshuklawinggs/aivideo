import React, { useState } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  Typography,
  Button,
  Chip,
  LinearProgress,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  IconButton,
  Tooltip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Pagination,
  TextField,
} from '@mui/material';
import {
  ArrowBack,
  Description,
  VideoLibrary,
  PlayArrow,
  Refresh,
  Visibility,
  Sync,
  CheckCircle,
  Error,
  Pending,
  FilterList,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { sukuyamiApi, Chapter, ChapterSearchParams } from '../../services/api/sukuyamiApi';

const ChaptersPage: React.FC = () => {
  const { webtoonId } = useParams<{ webtoonId: string }>();
  const navigate = useNavigate();
  const queryClient = useQueryClient();

  const [searchParams, setSearchParams] = useState<ChapterSearchParams>({
    page: 1,
    limit: 20,
    status: 'all',
  });

  const { data: chaptersData, isLoading, error } = useQuery({
    queryKey: ['chapters', webtoonId, searchParams],
    queryFn: () => sukuyamiApi.getChapters(webtoonId!, searchParams),
    enabled: !!webtoonId,
    placeholderData: (previousData) => previousData,
  });

  const { data: webtoon } = useQuery({
    queryKey: ['webtoon', webtoonId],
    queryFn: () => sukuyamiApi.getWebtoon(webtoonId!),
    enabled: !!webtoonId,
  });

  const generateScriptMutation = useMutation({
    mutationFn: (chapterId: string) => 
      sukuyamiApi.generateScript(chapterId, {}),
    onSuccess: () => {
      toast.success('Script generation started');
      queryClient.invalidateQueries({ queryKey: ['chapters', webtoonId] });
    },
    onError: (error: any) => {
      toast.error(`Script generation failed: ${error.message}`);
    },
  });

  const generateVideoMutation = useMutation({
    mutationFn: (chapterId: string) => 
      sukuyamiApi.generateVideo(chapterId, {}),
    onSuccess: () => {
      toast.success('Video generation started');
      queryClient.invalidateQueries({ queryKey: ['chapters', webtoonId] });
    },
    onError: (error: any) => {
      toast.error(`Video generation failed: ${error.message}`);
    },
  });

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setSearchParams(prev => ({ ...prev, page: value }));
  };

  const handleFilterChange = (field: keyof ChapterSearchParams, value: any) => {
    setSearchParams(prev => ({ ...prev, [field]: value, page: 1 }));
  };

  const handleGenerateScript = (chapterId: string) => {
    generateScriptMutation.mutate(chapterId);
  };

  const handleGenerateVideo = (chapterId: string) => {
    generateVideoMutation.mutate(chapterId);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return 'success';
      case 'processing':
        return 'warning';
      case 'failed':
        return 'error';
      default:
        return 'default';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'completed':
        return <CheckCircle color="success" />;
      case 'processing':
        return <Sync color="warning" />;
      case 'failed':
        return <Error color="error" />;
      default:
        return <Pending color="inherit" />;
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
        <Typography color="error">Failed to load chapters</Typography>
      </Box>
    );
  }

  return (
    <Box sx={{ flexGrow: 1 }}>
      {/* Header */}
      <Box display="flex" alignItems="center" mb={3}>
        <IconButton onClick={() => navigate('/webtoons')} sx={{ mr: 2 }}>
          <ArrowBack />
        </IconButton>
        <Box sx={{ flexGrow: 1 }}>
          <Typography variant="h4">
            {webtoon?.title || 'Loading...'} - Chapters
          </Typography>
          <Typography variant="body2" color="textSecondary">
            {webtoon?.author} • {webtoon?.totalChapters} total chapters
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<Refresh />}
          onClick={() => queryClient.invalidateQueries({ queryKey: ['chapters', webtoonId] })}
        >
          Refresh
        </Button>
      </Box>

      {/* Filters */}
      <Paper sx={{ p: 2, mb: 3 }}>
        <Grid container spacing={2} alignItems="center">
          <Grid item xs={12} sm={6} md={3}>
            <TextField
              fullWidth
              placeholder="Search chapters..."
              value={searchParams.search || ''}
              onChange={(e) => handleFilterChange('search', e.target.value)}
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
                <MenuItem value="pending">Pending</MenuItem>
                <MenuItem value="syncing">Syncing</MenuItem>
                <MenuItem value="processing">Processing</MenuItem>
                <MenuItem value="completed">Completed</MenuItem>
                <MenuItem value="failed">Failed</MenuItem>
              </Select>
            </FormControl>
          </Grid>

          <Grid item xs={12} sm={6} md={2}>
            <Button
              fullWidth
              variant="outlined"
              startIcon={<FilterList />}
              onClick={() => queryClient.invalidateQueries({ queryKey: ['chapters', webtoonId] })}
            >
              Apply Filters
            </Button>
          </Grid>
        </Grid>
      </Paper>

      {/* Chapters Table */}
      <Paper sx={{ width: '100%', overflow: 'hidden' }}>
        <TableContainer sx={{ maxHeight: 600 }}>
          <Table stickyHeader aria-label="chapters table">
            <TableHead>
              <TableRow>
                <TableCell>Chapter</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Pages</TableCell>
                <TableCell>Panels</TableCell>
                <TableCell>Script</TableCell>
                <TableCell>Video</TableCell>
                <TableCell>Progress</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chaptersData && 'data' in chaptersData ? chaptersData.data.map((chapter: Chapter) => (
                <TableRow 
                  key={chapter._id}
                  hover
                  sx={{ cursor: 'pointer' }}
                  onClick={() => navigate(`/chapters/${chapter._id}`)}
                >
                  <TableCell>
                    <Box>
                      <Typography variant="body1" fontWeight="medium">
                        Chapter {chapter.chapterNumber}
                      </Typography>
                      <Typography variant="body2" color="textSecondary">
                        {chapter.title}
                      </Typography>
                      <Typography variant="caption" color="textSecondary">
                        {new Date(chapter.createdAt).toLocaleDateString()}
                      </Typography>
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Chip
                      icon={getStatusIcon(chapter.processingStatus)}
                      label={chapter.processingStatus}
                      color={getStatusColor(chapter.processingStatus) as any}
                      size="small"
                    />
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {chapter.totalPages}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    <Typography variant="body2">
                      {chapter.panels.length}
                    </Typography>
                  </TableCell>
                  
                  <TableCell>
                    {chapter.generatedScript ? (
                      <Tooltip title="Script Generated">
                        <Description color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="No Script">
                        <Description color="disabled" />
                      </Tooltip>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    {chapter.videoUrl ? (
                      <Tooltip title="Video Available">
                        <VideoLibrary color="success" />
                      </Tooltip>
                    ) : (
                      <Tooltip title="No Video">
                        <VideoLibrary color="disabled" />
                      </Tooltip>
                    )}
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ width: 100 }}>
                      <Typography variant="body2" gutterBottom>
                        {chapter.processingProgress}%
                      </Typography>
                      <LinearProgress 
                        variant="determinate" 
                        value={chapter.processingProgress} 
                      />
                    </Box>
                  </TableCell>
                  
                  <TableCell>
                    <Box sx={{ display: 'flex', gap: 1 }}>
                      <Tooltip title="View Details">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            navigate(`/chapters/${chapter._id}`);
                          }}
                        >
                          <Visibility />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Generate Script">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateScript(chapter._id);
                          }}
                          disabled={generateScriptMutation.isPending}
                        >
                          <Description />
                        </IconButton>
                      </Tooltip>
                      
                      <Tooltip title="Generate Video">
                        <IconButton 
                          size="small"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleGenerateVideo(chapter._id);
                          }}
                          disabled={generateVideoMutation.isPending}
                        >
                          <VideoLibrary />
                        </IconButton>
                      </Tooltip>
                      
                      {chapter.videoUrl && (
                        <Tooltip title="Watch Video">
                          <IconButton 
                            size="small"
                            onClick={(e) => {
                              e.stopPropagation();
                              window.open(chapter.videoUrl, '_blank');
                            }}
                          >
                            <PlayArrow />
                          </IconButton>
                        </Tooltip>
                      )}
                    </Box>
                  </TableCell>
                </TableRow>
              )) : null}
            </TableBody>
          </Table>
        </TableContainer>
      </Paper>

      {/* Pagination */}
      {chaptersData && 'pagination' in chaptersData && chaptersData.pagination && (
        <Box display="flex" justifyContent="center" mt={4}>
          <Pagination
            count={chaptersData.pagination.totalPages}
            page={chaptersData.pagination.page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Summary Stats */}
      <Grid container spacing={3} sx={{ mt: 3 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {chaptersData && 'pagination' in chaptersData ? chaptersData.pagination.total : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Total Chapters
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {chaptersData && 'data' in chaptersData ? chaptersData.data.filter((c: Chapter) => c.generatedScript).length : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Scripts Generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {chaptersData && 'data' in chaptersData ? chaptersData.data.filter((c: Chapter) => c.videoUrl).length : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Videos Generated
              </Typography>
            </CardContent>
          </Card>
        </Grid>
        
        <Grid item xs={12} sm={6} md={3}>
          <Card>
            <CardContent>
              <Typography variant="h6">
                {chaptersData && 'data' in chaptersData ? chaptersData.data.filter((c: Chapter) => c.processingStatus === 'processing').length : 0}
              </Typography>
              <Typography variant="body2" color="textSecondary">
                Processing
              </Typography>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default ChaptersPage;
