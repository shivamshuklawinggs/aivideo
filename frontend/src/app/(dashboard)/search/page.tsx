'use client';
import React, { useState } from 'react';
import {
  Box, Typography, TextField, Card, CardMedia, CardContent,
  Button, Grid, Chip, InputAdornment, LinearProgress, List,
  ListItem, ListItemAvatar, Avatar, ListItemText,
} from '@mui/material';
import { Search as SearchIcon, Book, Add } from '@mui/icons-material';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { toast } from 'react-toastify';
import { useRouter } from 'next/navigation';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';

export default function SearchPage() {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<any[]>([]);
  const queryClient = useQueryClient();
  const router = useRouter();

  const searchMutation = useMutation({
    mutationFn: (q: string) => sukuyamiApi.searchWebtoons({ query: q, limit: 20 }),
    onSuccess: (data) => setResults(data),
    onError: (e: any) => toast.error(`Search failed: ${e.message}`),
  });

  const addMutation = useMutation({
    mutationFn: (id: string) => sukuyamiApi.addWebtoon(id),
    onSuccess: () => { toast.success('Webtoon added to your collection!'); queryClient.invalidateQueries({ queryKey: ['webtoons'] }); },
    onError: (e: any) => toast.error(`Failed to add: ${e.message}`),
  });

  const handleSearch = () => {
    if (query.trim()) searchMutation.mutate(query.trim());
  };

  return (
    <Box sx={{ flexGrow: 1 }}>
      <Typography variant="h4" gutterBottom>Search Webtoons</Typography>

      <Card sx={{ mb: 3 }}>
        <CardContent>
          <Box display="flex" gap={2}>
            <TextField
              fullWidth
              placeholder="Search webtoons on SUKUYAMI..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon /></InputAdornment> }}
            />
            <Button variant="contained" onClick={handleSearch} disabled={searchMutation.isPending} sx={{ minWidth: 120 }}>
              {searchMutation.isPending ? 'Searching...' : 'Search'}
            </Button>
          </Box>
        </CardContent>
      </Card>

      {searchMutation.isPending && <LinearProgress sx={{ mb: 2 }} />}

      {results.length > 0 && (
        <Grid container spacing={3}>
          {results.map((r: any) => (
            <Grid item xs={12} sm={6} md={4} lg={3} key={r.id}>
              <Card sx={{ height: '100%', display: 'flex', flexDirection: 'column', transition: 'transform 0.2s', '&:hover': { transform: 'translateY(-4px)' } }}>
                <CardMedia component="div" sx={{ height: 160, bgcolor: '#2a2a3e', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                  {r.coverImage ? (
                    <Box component="img" src={r.coverImage} alt={r.title} sx={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  ) : (
                    <Book sx={{ fontSize: 60, color: 'text.secondary' }} />
                  )}
                </CardMedia>
                <CardContent sx={{ flexGrow: 1 }}>
                  <Typography variant="h6" noWrap gutterBottom>{r.title}</Typography>
                  <Typography variant="body2" color="textSecondary" sx={{ mb: 1 }}>{r.author}</Typography>
                  <Box display="flex" gap={1} mb={2} flexWrap="wrap">
                    <Chip label={r.status || 'Unknown'} size="small" color={r.status === 'ongoing' ? 'success' : 'default'} />
                    <Chip label={`${r.totalChapters || 0} ch`} size="small" variant="outlined" />
                  </Box>
                  <Button fullWidth variant="outlined" startIcon={<Add />}
                    onClick={() => addMutation.mutate(r.id)} disabled={addMutation.isPending}>
                    Add to Collection
                  </Button>
                </CardContent>
              </Card>
            </Grid>
          ))}
        </Grid>
      )}

      {!searchMutation.isPending && results.length === 0 && query && (
        <Box textAlign="center" py={8}>
          <SearchIcon sx={{ fontSize: 60, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">No results found for &quot;{query}&quot;</Typography>
          <Typography variant="body2" color="textSecondary">Try different keywords</Typography>
        </Box>
      )}

      {!query && results.length === 0 && (
        <Box textAlign="center" py={8}>
          <SearchIcon sx={{ fontSize: 80, color: 'text.secondary', mb: 2 }} />
          <Typography variant="h6" color="textSecondary">Search for webtoons</Typography>
          <Typography variant="body2" color="textSecondary">Find and add webtoons from the SUKUYAMI catalogue</Typography>
        </Box>
      )}
    </Box>
  );
}
