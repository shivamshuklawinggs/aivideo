'use client';

import React from 'react';
import {
  Box,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  Typography,
  IconButton,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  Delete,
  DragIndicator,
} from '@mui/icons-material';

type Effect = 'none' | 'fade' | 'zoom' | 'slide' | 'kenburns';

interface Clip {
  url: string;
  duration: number;
  effect: Effect;
}

interface ClipListProps {
  clips: Clip[];
  onUpdateClip: (index: number, updates: Partial<Clip>) => void;
  onMoveClip: (index: number, direction: -1 | 1) => void;
  onRemoveClip: (index: number) => void;
}

export default function ClipList({
  clips,
  onUpdateClip,
  onMoveClip,
  onRemoveClip,
}: ClipListProps) {
  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
        Clips ({clips.length})
      </Typography>
      <List dense sx={{ bgcolor: '#2d2d2d', borderRadius: 1 }}>
        {clips.map((clip, index) => (
          <ListItem
            key={`${index}-${clip.url}`}
            sx={{
              pr: 12,
              borderBottom: '1px solid #3d3d3d',
              '&:last-child': { borderBottom: 'none' },
            }}
            secondaryAction={
              <Box display="flex" gap={0.5}>
                <IconButton
                  edge="end"
                  size="small"
                  disabled={index === 0}
                  onClick={() => onMoveClip(index, -1)}
                  sx={{ color: '#888' }}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  disabled={index === clips.length - 1}
                  onClick={() => onMoveClip(index, 1)}
                  sx={{ color: '#888' }}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={() => onRemoveClip(index)}
                  sx={{ color: '#ff4444' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar
                src={clip.url}
                variant="rounded"
                sx={{ width: 56, height: 56, mr: 1 }}
              />
            </ListItemAvatar>
            <Box flex={1}>
              <Typography variant="body2" fontWeight={500} sx={{ color: '#fff' }}>
                Clip {index + 1}
              </Typography>
              <Box display="flex" gap={1} mt={0.5} alignItems="center" flexWrap="wrap">
                <TextField
                  type="number"
                  size="small"
                  label="Duration (s)"
                  value={clip.duration}
                  onChange={(e) =>
                    onUpdateClip(index, { duration: Math.max(0.5, parseFloat(e.target.value) || 0) })
                  }
                  inputProps={{ step: 0.5, min: 0.5 }}
                  sx={{ width: 100 }}
                  variant="filled"
                  InputProps={{
                    sx: { bgcolor: '#3d3d3d', color: '#fff', '& input': { color: '#fff' } },
                  }}
                  InputLabelProps={{ sx: { color: '#888' } }}
                />
                <FormControl size="small" sx={{ width: 120 }} variant="filled">
                  <InputLabel sx={{ color: '#888' }}>Effect</InputLabel>
                  <Select
                    value={clip.effect}
                    label="Effect"
                    onChange={(e) => onUpdateClip(index, { effect: e.target.value as Effect })}
                    sx={{ bgcolor: '#3d3d3d', color: '#fff', '& .MuiSelect-icon': { color: '#888' } }}
                  >
                    <MenuItem value="none">None</MenuItem>
                    <MenuItem value="fade">Fade In</MenuItem>
                    <MenuItem value="zoom">Zoom</MenuItem>
                    <MenuItem value="slide">Slide</MenuItem>
                    <MenuItem value="kenburns">Ken Burns</MenuItem>
                  </Select>
                </FormControl>
              </Box>
            </Box>
          </ListItem>
        ))}
      </List>
    </Box>
  );
}
