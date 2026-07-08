'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, Chip,
  LinearProgress, Pagination, Select, MenuItem, FormControl,
  InputLabel, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, IconButton, Tooltip,
} from '@mui/material';
import { ArrowBack, PlayArrow, Description, VideoLibrary, Sync } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter, useParams } from 'next/navigation';
import { sukuyamiApi, Chapter } from '@/services/api/sukuyamiApi';

export default function ChaptersPage() {
  const router = useRouter();
  const { webtoonId } = useParams<{ webtoonId: string }>();
  const queryClient = useQueryClient();
  const [page, setPage] = useState(1);
  const [status, setStatus] = useState('all');

  const { data, isLoading } = useQuery({
    queryKey: ['chapters', webtoonId, page, status],
    queryFn: () => sukuyamiApi.getChapters(webtoonId, { page, limit: 50, status }),
    enabled: !!webtoonId,
    placeholderData: (prev) => prev,
  });

  const scriptMutation = useMutation({
    mutationFn: (chapterId: string) => sukuyamiApi.generateScript(chapterId),
    onSuccess: () => { toast.success('Script generation started'); queryClient.invalidateQueries({ queryKey: ['chapters'] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const videoMutation = useMutation({
    mutationFn: (chapterId: string) => sukuyamiApi.generateVideo(chapterId),
    onSuccess: () => { toast.success('Video generation started'); queryClient.invalidateQueries({ queryKey: ['chapters'] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const getStatusColor = (s: string) => {
    if (s === 'completed') return 'success';
    if (s === 'processing') return 'warning';
    if (s === 'failed') return 'error';
    if (s === 'pending') return 'default';
    return 'info';
  };

  if (isLoading) return <Box sx={{ width: '100%', mt: 2 }}><LinearProgress /></Box>;

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Box display="flex" alignItems="center" gap={2} mb={3}>
        <Button startIcon={<ArrowBack />} onClick={() => router.back()}>Back</Button>
        <Typography variant="h4">Chapters</Typography>
      </Box>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} sm={4}>
              <FormControl fullWidth>
                <InputLabel>Status</InputLabel>
                <Select value={status} label="Status" onChange={(e) => setStatus(e.target.value)}>
                  <MenuItem value="all">All</MenuItem>
                  <MenuItem value="pending">Pending</MenuItem>
                  <MenuItem value="syncing">Syncing</MenuItem>
                  <MenuItem value="processing">Processing</MenuItem>
                  <MenuItem value="completed">Completed</MenuItem>
                  <MenuItem value="failed">Failed</MenuItem>
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} sm={4}>
              <Button variant="outlined" startIcon={<Sync />} onClick={() => queryClient.invalidateQueries({ queryKey: ['chapters'] })}>
                Refresh
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      <Paper>
        <Table>
          <TableHead>
            <TableRow>
              <TableCell>#</TableCell>
              <TableCell>Title</TableCell>
              <TableCell>Status</TableCell>
              <TableCell>Panels</TableCell>
              <TableCell>Script</TableCell>
              <TableCell>Video</TableCell>
              <TableCell>Actions</TableCell>
            </TableRow>
          </TableHead>
          <TableBody>
            {data?.data?.map((chapter: Chapter) => (
              <TableRow key={chapter._id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/chapters/${chapter._id}`)}>
                <TableCell>{chapter.chapterNumber}</TableCell>
                <TableCell>{chapter.title || `Chapter ${chapter.chapterNumber}`}</TableCell>
                <TableCell><Chip label={chapter.status} color={getStatusColor(chapter.status) as any} size="small" /></TableCell>
                <TableCell>{chapter.panelCount || '-'}</TableCell>
                <TableCell>
                  <Chip label={chapter.scriptGenerated ? 'Done' : 'No'} color={chapter.scriptGenerated ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Chip label={chapter.videoGenerated ? 'Done' : 'No'} color={chapter.videoGenerated ? 'success' : 'default'} size="small" />
                </TableCell>
                <TableCell>
                  <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
                    <Tooltip title="Generate Script">
                      <IconButton size="small" color="primary" onClick={() => scriptMutation.mutate(chapter._id)} disabled={scriptMutation.isPending}>
                        <Description fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    <Tooltip title="Generate Video">
                      <IconButton size="small" color="secondary" onClick={() => videoMutation.mutate(chapter._id)} disabled={videoMutation.isPending}>
                        <VideoLibrary fontSize="small" />
                      </IconButton>
                    </Tooltip>
                    {chapter.videoUrl && (
                      <Tooltip title="Play Video">
                        <IconButton size="small" color="success" onClick={() => window.open(chapter.videoUrl, '_blank')}>
                          <PlayArrow fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    )}
                  </Box>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </Paper>

      {data?.pagination && (
        <Box display="flex" justifyContent="center" mt={3}>
          <Pagination count={data.pagination.pages ?? data.pagination.totalPages ?? 1} page={page} onChange={(_, v) => setPage(v)} color="primary" />
        </Box>
      )}
    </Box>
  );
}
