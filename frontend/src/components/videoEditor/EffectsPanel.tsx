'use client';

import React from 'react';
import {
  Box,
  Typography,
  TextField,
  Button,
  IconButton,
} from '@mui/material';
import {
  TextSnippet,
  Refresh,
  Save,
  Subtitles,
} from '@mui/icons-material';

interface Scene {
  index: number;
  text: string;
  wordCount: number;
  duration: number;
}

interface EffectsPanelProps {
  scenes: Scene[];
  scenesInput: string;
  onScenesInputChange: (value: string) => void;
  onApplyScenes: () => void;
  onApplyDurations: () => void;
  onDownloadSRT: () => void;
  onDownloadVTT: () => void;
}

export default function EffectsPanel({
  scenes,
  scenesInput,
  onScenesInputChange,
  onApplyScenes,
  onApplyDurations,
  onDownloadSRT,
  onDownloadVTT,
}: EffectsPanelProps) {
  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
        Scenes & Subtitles
      </Typography>
      
      <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
        <Button
          variant="outlined"
          size="small"
          startIcon={<TextSnippet />}
          onClick={onApplyScenes}
          disabled={!scenesInput}
          sx={{
            borderColor: '#4a90d9',
            color: '#4a90d9',
            '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
          }}
        >
          Apply Scenes
        </Button>
        <Button
          variant="outlined"
          size="small"
          startIcon={<Refresh />}
          onClick={onApplyDurations}
          disabled={!scenes.length}
          sx={{
            borderColor: '#4a90d9',
            color: '#4a90d9',
            '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
          }}
        >
          Apply Durations
        </Button>
      </Box>

      {scenes.length > 0 && (
        <Box mb={2}>
          <TextField
            label="Scenes JSON (editable)"
            multiline
            fullWidth
            minRows={6}
            maxRows={10}
            value={scenesInput}
            onChange={(e) => onScenesInputChange(e.target.value)}
            helperText="Edit scene text, then Apply to update durations/subtitles"
            variant="filled"
            InputProps={{
              sx: {
                bgcolor: '#2d2d2d',
                color: '#fff',
                '& textarea': { color: '#fff' },
              },
            }}
            InputLabelProps={{ sx: { color: '#888' } }}
            FormHelperTextProps={{ sx: { color: '#888' } }}
          />
          <Box display="flex" gap={1} mt={1} flexWrap="wrap" alignItems="center">
            <Button
              variant="outlined"
              size="small"
              startIcon={<Save />}
              onClick={onApplyScenes}
              sx={{
                borderColor: '#4a90d9',
                color: '#4a90d9',
                '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
              }}
            >
              Apply
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Subtitles />}
              onClick={onDownloadSRT}
              disabled={!scenes.length}
              sx={{
                borderColor: '#4a90d9',
                color: '#4a90d9',
                '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
              }}
            >
              SRT
            </Button>
            <Button
              variant="outlined"
              size="small"
              startIcon={<Subtitles />}
              onClick={onDownloadVTT}
              disabled={!scenes.length}
              sx={{
                borderColor: '#4a90d9',
                color: '#4a90d9',
                '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
              }}
            >
              VTT
            </Button>
          </Box>
        </Box>
      )}
    </Box>
  );
}
