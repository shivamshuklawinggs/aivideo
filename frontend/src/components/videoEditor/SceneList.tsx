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
  Chip,
} from '@mui/material';
import {
  ArrowUpward,
  ArrowDownward,
  Delete,
  Image as ImageIcon,
} from '@mui/icons-material';
import { Scene, TransitionEffect } from './types';

interface SceneListProps {
  scenes: Scene[];
  selectedIndex: number;
  onSelectScene: (index: number) => void;
  onUpdateScene: (index: number, patch: Partial<Scene>) => void;
  onMoveScene: (index: number, direction: -1 | 1) => void;
  onRemoveScene: (index: number) => void;
  onAddScene: () => void;
}

export default function SceneList({
  scenes,
  selectedIndex,
  onSelectScene,
  onUpdateScene,
  onMoveScene,
  onRemoveScene,
  onAddScene,
}: SceneListProps) {
  const effects: { value: TransitionEffect; label: string }[] = [
    { value: 'none', label: 'None' },
    { value: 'fade', label: 'Fade In' },
    { value: 'zoom', label: 'Zoom' },
    { value: 'slide', label: 'Slide' },
    { value: 'kenburns', label: 'Ken Burns' },
    { value: 'crossfade', label: 'Crossfade' },
    { value: 'wipe', label: 'Wipe' },
  ];

  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: '#fff' }}>
          Scenes ({scenes.length})
        </Typography>
        <IconButton onClick={onAddScene} size="small" sx={{ color: '#4a90d9' }}>
          <ImageIcon fontSize="small" />
        </IconButton>
      </Box>

      <List dense sx={{ bgcolor: '#2d2d2d', borderRadius: 1, maxHeight: 400, overflow: 'auto' }}>
        {scenes.map((scene, index) => (
          <ListItem
            key={scene.id}
            onClick={() => onSelectScene(index)}
            sx={{
              pr: 12,
              borderBottom: '1px solid #3d3d3d',
              '&:last-child': { borderBottom: 'none' },
              bgcolor: selectedIndex === index ? '#2a3a4d' : 'transparent',
              cursor: 'pointer',
              '&:hover': { bgcolor: selectedIndex === index ? '#2a3a4d' : '#333' },
            }}
            secondaryAction={
              <Box display="flex" gap={0.5}>
                <IconButton
                  edge="end"
                  size="small"
                  disabled={index === 0}
                  onClick={(e) => { e.stopPropagation(); onMoveScene(index, -1); }}
                  sx={{ color: '#888' }}
                >
                  <ArrowUpward fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  disabled={index === scenes.length - 1}
                  onClick={(e) => { e.stopPropagation(); onMoveScene(index, 1); }}
                  sx={{ color: '#888' }}
                >
                  <ArrowDownward fontSize="small" />
                </IconButton>
                <IconButton
                  edge="end"
                  size="small"
                  onClick={(e) => { e.stopPropagation(); onRemoveScene(index); }}
                  sx={{ color: '#ff4444' }}
                >
                  <Delete fontSize="small" />
                </IconButton>
              </Box>
            }
          >
            <ListItemAvatar>
              <Avatar
                src={scene.imageUrl}
                variant="rounded"
                sx={{ width: 56, height: 56, mr: 1 }}
              />
            </ListItemAvatar>
            <Box flex={1}>
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
                <Typography variant="body2" fontWeight={500} sx={{ color: '#fff' }}>
                  Scene {index + 1}
                </Typography>
                {scene.subtitles.length > 0 && (
                  <Chip label={`${scene.subtitles.length} sub`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#9c27b0', color: '#fff' }} />
                )}
                {scene.audioClips.length > 0 && (
                  <Chip label={`${scene.audioClips.length} audio`} size="small" sx={{ height: 16, fontSize: 9, bgcolor: '#4caf50', color: '#fff' }} />
                )}
              </Box>
              <Box display="flex" gap={1} alignItems="center" flexWrap="wrap">
                <TextField
                  type="number"
                  size="small"
                  label="Duration"
                  value={scene.duration}
                  onClick={(e) => e.stopPropagation()}
                  onChange={(e) =>
                    onUpdateScene(index, { duration: Math.max(0.5, parseFloat(e.target.value) || 0) })
                  }
                  inputProps={{ step: 0.5, min: 0.5 }}
                  sx={{
                    width: 80,
                    '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 11, '& fieldset': { borderColor: '#444' } },
                    '& .MuiInputLabel-root': { color: '#888', fontSize: 11 },
                  }}
                />
                <FormControl size="small" sx={{ width: 100 }}>
                  <Select
                    value={scene.effect}
                    onClick={(e) => e.stopPropagation()}
                    onChange={(e) => onUpdateScene(index, { effect: e.target.value as TransitionEffect })}
                    sx={{ color: '#fff', fontSize: 11, '& .MuiSelect-icon': { color: '#888' }, '& fieldset': { borderColor: '#444' } }}
                  >
                    {effects.map((eff) => (
                      <MenuItem key={eff.value} value={eff.value} sx={{ fontSize: 11 }}>
                        {eff.label}
                      </MenuItem>
                    ))}
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
