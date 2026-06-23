import React, { useState, useEffect } from 'react';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardMedia,
  Typography,
  Button,
  TextField,
  InputAdornment,
  Chip,
  IconButton,
  Menu,
  MenuItem,
  Pagination,
  CircularProgress,
  Fab,
} from '@mui/material';
import {
  Search,
  FilterList,
  MoreVert,
  Add,
  Visibility,
  Edit,
  Delete,
  PlayArrow,
  Book,
} from '@mui/icons-material';

import { useAppDispatch, useAppSelector } from '../../store';
import { fetchWebtoons } from '../../store/slices/webtoonSlice';
import { openModal } from '../../store/slices/uiSlice';

const WebtoonLibraryPage: React.FC = () => {
  const dispatch = useAppDispatch();
  const { webtoons, isLoading, pagination } = useAppSelector((state) => state.webtoon);

  const [searchTerm, setSearchTerm] = useState('');
  const [page, setPage] = useState(1);
  const [anchorEl, setAnchorEl] = useState<null | HTMLElement>(null);

  useEffect(() => {
    dispatch(fetchWebtoons({ page, limit: 12, search: searchTerm }));
  }, [dispatch, page, searchTerm]);

  const handleSearchChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    setSearchTerm(event.target.value);
    setPage(1);
  };

  const handlePageChange = (_event: React.ChangeEvent<unknown>, value: number) => {
    setPage(value);
  };

  const handleMenuOpen = (event: React.MouseEvent<HTMLElement>, _webtoonId: string) => {
    setAnchorEl(event.currentTarget);
  };

  const handleMenuClose = () => {
    setAnchorEl(null);
  };

  const handleUpload = () => {
    dispatch(openModal('uploadModal'));
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'completed':
        return '#10b981';
      case 'processing':
        return '#f59e0b';
      case 'failed':
        return '#ef4444';
      default:
        return '#6b7280';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'completed':
        return 'Ready';
      case 'processing':
        return 'Processing';
      case 'failed':
        return 'Failed';
      default:
        return 'Pending';
    }
  };

  return (
    <Box>
      {/* Header */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
        <Typography variant="h4">Webtoon Library</Typography>
        <Button
          variant="contained"
          startIcon={<Add />}
          onClick={handleUpload}
          sx={{
            background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
            '&:hover': {
              background: 'linear-gradient(135deg, #7c3aed, #db2777)',
            },
          }}
        >
          Upload Comic
        </Button>
      </Box>

      {/* Search and Filter */}
      <Box sx={{ display: 'flex', gap: 2, mb: 3 }}>
        <TextField
          fullWidth
          placeholder="Search webtoons..."
          value={searchTerm}
          onChange={handleSearchChange}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <Search />
              </InputAdornment>
            ),
          }}
          sx={{
            '& .MuiOutlinedInput-root': {
              '& fieldset': {
                borderColor: '#2a2a3e',
              },
              '&:hover fieldset': {
                borderColor: '#4a4a6a',
              },
              '&.Mui-focused fieldset': {
                borderColor: '#8b5cf6',
              },
            },
            '& .MuiInputLabel-root': {
              color: '#a0a0b8',
            },
            '& .MuiInputBase-input': {
              color: '#ffffff',
            },
          }}
        />
        <Button
          variant="outlined"
          startIcon={<FilterList />}
          sx={{
            borderColor: '#2a2a3e',
            color: '#ffffff',
            '&:hover': {
              borderColor: '#4a4a6a',
              bgcolor: 'rgba(255, 255, 255, 0.05)',
            },
          }}
        >
          Filter
        </Button>
      </Box>

      {/* Loading State */}
      {isLoading && (
        <Box sx={{ display: 'flex', justifyContent: 'center', py: 4 }}>
          <CircularProgress />
        </Box>
      )}

      {/* Webtoon Grid */}
      <Grid container spacing={3}>
        {webtoons.map((webtoon) => (
          <Grid item xs={12} sm={6} md={4} lg={3} key={webtoon._id}>
            <Card
              className="feature-card"
              sx={{
                height: '100%',
                display: 'flex',
                flexDirection: 'column',
                cursor: 'pointer',
              }}
            >
              <CardMedia
                component="div"
                sx={{
                  height: 200,
                  bgcolor: '#2a2a3e',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  position: 'relative',
                }}
              >
                {webtoon.thumbnail ? (
                  <img
                    src={webtoon.thumbnail}
                    alt={webtoon.title}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                ) : (
                  <Book sx={{ fontSize: 48, color: '#4a4a6a' }} />
                )}
                <Chip
                  label={getStatusText(webtoon.processingStatus)}
                  size="small"
                  sx={{
                    position: 'absolute',
                    top: 8,
                    right: 8,
                    bgcolor: getStatusColor(webtoon.processingStatus),
                    color: '#ffffff',
                    fontSize: '0.75rem',
                  }}
                />
              </CardMedia>

              <CardContent sx={{ flexGrow: 1 }}>
                <Typography variant="h6" noWrap gutterBottom>
                  {webtoon.title}
                </Typography>
                <Typography variant="body2" sx={{ color: '#a0a0b8', mb: 1 }}>
                  {webtoon.description || 'No description available'}
                </Typography>
                <Box sx={{ display: 'flex', gap: 1, mb: 1 }}>
                  <Chip
                    label={`${webtoon.totalChapters} chapters`}
                    size="small"
                    sx={{
                      bgcolor: '#2a2a3e',
                      color: '#a0a0b8',
                      fontSize: '0.7rem',
                    }}
                  />
                  {webtoon.metadata.totalPanels && (
                    <Chip
                      label={`${webtoon.metadata.totalPanels} panels`}
                      size="small"
                      sx={{
                        bgcolor: '#2a2a3e',
                        color: '#a0a0b8',
                        fontSize: '0.7rem',
                      }}
                    />
                  )}
                </Box>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                  <Typography variant="caption" sx={{ color: '#6a6a8a' }}>
                    {webtoon.views} views
                  </Typography>
                  <IconButton
                    size="small"
                    onClick={(e) => handleMenuOpen(e, webtoon._id)}
                  >
                    <MoreVert />
                  </IconButton>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Empty State */}
      {!isLoading && webtoons.length === 0 && (
        <Box
          sx={{
            textAlign: 'center',
            py: 8,
          }}
        >
          <Book sx={{ fontSize: 64, color: '#4a4a6a', mb: 2 }} />
          <Typography variant="h6" sx={{ color: '#a0a0b8', mb: 2 }}>
            No webtoons found
          </Typography>
          <Typography variant="body2" sx={{ color: '#6a6a8a', mb: 3 }}>
            Upload your first comic to get started
          </Typography>
          <Button
            variant="contained"
            startIcon={<Add />}
            onClick={handleUpload}
            sx={{
              background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
              '&:hover': {
                background: 'linear-gradient(135deg, #7c3aed, #db2777)',
              },
            }}
          >
            Upload Comic
          </Button>
        </Box>
      )}

      {/* Pagination */}
      {pagination.totalPages > 1 && (
        <Box sx={{ display: 'flex', justifyContent: 'center', mt: 4 }}>
          <Pagination
            count={pagination.totalPages}
            page={page}
            onChange={handlePageChange}
            color="primary"
          />
        </Box>
      )}

      {/* Context Menu */}
      <Menu
        anchorEl={anchorEl}
        open={Boolean(anchorEl)}
        onClose={handleMenuClose}
        PaperProps={{
          sx: {
            bgcolor: '#1a1a2e',
            border: '1px solid #2a2a3e',
            '& .MuiMenuItem-root': {
              color: '#ffffff',
              '&:hover': {
                bgcolor: 'rgba(255, 255, 255, 0.05)',
              },
            },
          },
        }}
      >
        <MenuItem onClick={handleMenuClose}>
          <Visibility sx={{ mr: 2 }} />
          View Details
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <PlayArrow sx={{ mr: 2 }} />
          Generate Video
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Edit sx={{ mr: 2 }} />
          Edit
        </MenuItem>
        <MenuItem onClick={handleMenuClose}>
          <Delete sx={{ mr: 2 }} />
          Delete
        </MenuItem>
      </Menu>

      {/* Floating Action Button */}
      <Fab
        color="primary"
        aria-label="upload"
        sx={{
          position: 'fixed',
          bottom: 24,
          right: 24,
          background: 'linear-gradient(135deg, #8b5cf6, #ec4899)',
          '&:hover': {
            background: 'linear-gradient(135deg, #7c3aed, #db2777)',
          },
        }}
        onClick={handleUpload}
      >
        <Add />
      </Fab>
    </Box>
  );
};

export default WebtoonLibraryPage;
