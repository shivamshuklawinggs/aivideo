'use client';

import React from 'react';
import { Box, Button, Typography, LinearProgress } from '@mui/material';
import {
  PlayArrow,
  Stop,
  Videocam,
  Download,
} from '@mui/icons-material';

interface ControlsBarProps {
  isPreviewing: boolean;
  isGenerating: boolean;
  progress: number;
  totalDuration: number;
  resultUrl: string | null;
  onPreviewToggle: () => void;
  onGenerate: () => void;
  onDownload: () => void;
}

export default function ControlsBar({
  isPreviewing,
  isGenerating,
  progress,
  totalDuration,
  resultUrl,
  onPreviewToggle,
  onGenerate,
  onDownload,
}: ControlsBarProps) {
  return (
    <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <Box display="flex" gap={2} alignItems="center" flexWrap="wrap">
        <Button
          variant="contained"
          startIcon={isPreviewing ? <Stop /> : <PlayArrow />}
          onClick={onPreviewToggle}
          disabled={isGenerating}
          sx={{
            bgcolor: '#4a90d9',
            '&:hover': { bgcolor: '#3a80c9' },
            '&:disabled': { bgcolor: '#3d3d3d' },
          }}
        >
          {isPreviewing ? 'Stop' : 'Preview'}
        </Button>
        <Button
          variant="contained"
          startIcon={<Videocam />}
          onClick={onGenerate}
          disabled={isGenerating || isPreviewing}
          sx={{
            bgcolor: '#28a745',
            '&:hover': { bgcolor: '#218838' },
            '&:disabled': { bgcolor: '#3d3d3d' },
          }}
        >
          {isGenerating ? 'Exporting...' : 'Export Video'}
        </Button>
        {resultUrl && (
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={onDownload}
            sx={{
              borderColor: '#4a90d9',
              color: '#4a90d9',
              '&:hover': { borderColor: '#3a80c9', bgcolor: 'rgba(74, 144, 217, 0.1)' },
            }}
          >
            Download
          </Button>
        )}
      </Box>

      {isGenerating && (
        <Box>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{
              bgcolor: '#2d2d2d',
              '& .MuiLinearProgress-bar': { bgcolor: '#4a90d9' },
            }}
          />
          <Typography variant="caption" sx={{ color: '#888', mt: 0.5, display: 'block' }}>
            {formatTime(progress * totalDuration)} / {formatTime(totalDuration)}
          </Typography>
        </Box>
      )}
    </Box>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}
