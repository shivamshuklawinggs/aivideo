'use client';
import React, { useState } from 'react';
import {
  Box, Typography, Card, CardContent, Button, Grid, Chip,
  LinearProgress, Table, TableBody, TableCell, TableHead, TableRow,
  Paper, IconButton, Tooltip, FormControl, InputLabel, Select, MenuItem,
} from '@mui/material';
import { Description, Refresh, Book } from '@mui/icons-material';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';

export default function ScriptsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [webtoonFilter, setWebtoonFilter] = useState('');

  const { data: webtoonsData, isLoading: webtoonsLoading } = useQuery({
    queryKey: ['webtoons', { limit: 100 }],
    queryFn: () => sukuyamiApi.getWebtoons({ limit: 100 }),
  });

  const { data: chaptersData, isLoading } = useQuery({
    queryKey: ['allChapters', webtoonFilter],
    queryFn: (): Promise<{ data: any[]; pagination?: any }> =>
      webtoonFilter
        ? sukuyamiApi.getChapters(webtoonFilter, { limit: 100 })
        : Promise.resolve({ data: [] }),
    enabled: !!webtoonFilter,
  });

  const scriptMutation = useMutation({
    mutationFn: ({ chapterId, style }: { chapterId: string; style: string }) =>
      sukuyamiApi.generateScript(chapterId, { style }),
    onSuccess: () => { toast.success('Script generation started!'); queryClient.invalidateQueries({ queryKey: ['allChapters'] }); },
    onError: (e: any) => toast.error(`Failed: ${e.message}`),
  });

  const chapters = chaptersData?.data || [];
  const scriptsGenerated = chapters.filter((c: any) => c.scriptGenerated).length;
  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>Scripts & Videos</Typography>

      <Grid container spacing={3} sx={{ mb: 3 }}>
        {[
          { label: 'Scripts Generated', value: scriptsGenerated, color: 'primary.main', icon: <Description /> },
          { label: 'Total Chapters', value: chapters.length, color: 'info.main', icon: <Book /> },
        ].map((stat) => (
          <Grid item xs={12} sm={4} key={stat.label}>
            <Card>
              <CardContent sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                <Box sx={{ p: 1.5, borderRadius: 2, bgcolor: stat.color, display: 'flex' }}>{stat.icon}</Box>
                <Box>
                  <Typography variant="h4">{stat.value}</Typography>
                  <Typography variant="body2" color="textSecondary">{stat.label}</Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2} alignItems="center">
            <FormControl sx={{ minWidth: 280 }}>
              <InputLabel>Select Webtoon</InputLabel>
              <Select value={webtoonFilter} label="Select Webtoon" onChange={(e) => setWebtoonFilter(e.target.value)}>
                <MenuItem value=""><em>— Select a webtoon —</em></MenuItem>
                {webtoonsData?.data?.map((w: any) => (
                  <MenuItem key={w._id} value={w._id}>{w.title}</MenuItem>
                ))}
              </Select>
            </FormControl>
            <IconButton onClick={() => queryClient.invalidateQueries({ queryKey: ['allChapters'] })}><Refresh /></IconButton>
          </Box>
        </CardContent>
      </Card>

      {(isLoading || webtoonsLoading) && <LinearProgress sx={{ mb: 2 }} />}

      {webtoonFilter && chapters.length > 0 && (
        <Paper>
          <Table>
            <TableHead>
              <TableRow>
                <TableCell>#</TableCell>
                <TableCell>Title</TableCell>
                <TableCell>Status</TableCell>
                <TableCell>Script</TableCell>
                <TableCell>Actions</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {chapters.map((chapter: any) => (
                <TableRow key={chapter._id} hover sx={{ cursor: 'pointer' }} onClick={() => router.push(`/chapters/${chapter._id}`)}>
                  <TableCell>{chapter.chapterNumber}</TableCell>
                  <TableCell>{chapter.title || `Chapter ${chapter.chapterNumber}`}</TableCell>
                  <TableCell><Chip label={chapter.status} size="small" /></TableCell>
                  <TableCell><Chip label={chapter.scriptGenerated ? 'Done' : 'Pending'} color={chapter.scriptGenerated ? 'success' : 'default'} size="small" /></TableCell>
                  <TableCell>
                    <Box display="flex" gap={0.5} onClick={(e) => e.stopPropagation()}>
                      <Tooltip title="Generate Script">
                        <IconButton size="small" color="primary" onClick={() => scriptMutation.mutate({ chapterId: chapter._id, style: 'narrative' })} disabled={scriptMutation.isPending}>
                          <Description fontSize="small" />
                        </IconButton>
                      </Tooltip>
                    </Box>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </Paper>
      )}

      {webtoonFilter && !isLoading && chapters.length === 0 && (
        <Box textAlign="center" py={6}>
          <Typography color="textSecondary">No chapters found for this webtoon.</Typography>
        </Box>
      )}

      {!webtoonFilter && (
        <Box textAlign="center" py={8}>
          <Description sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">Select a webtoon to manage scripts & videos</Typography>
        </Box>
      )}
    </Box>
  );
}
