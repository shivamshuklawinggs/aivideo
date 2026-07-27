'use client';

import React, { useRef, useEffect } from 'react';
import { Box } from '@mui/material';

interface PreviewPanelProps {
  width: number;
  height: number;
  onCanvasRef: (ref: HTMLCanvasElement | null) => void;
}

export default function PreviewPanel({ width, height, onCanvasRef }: PreviewPanelProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    onCanvasRef(canvasRef.current);
  }, [onCanvasRef]);

  return (
    <Box
      sx={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        bgcolor: '#0a0a0a',
        borderRadius: 2,
        p: 2,
        minHeight: 400,
      }}
    >
      <canvas
        ref={canvasRef}
        width={width}
        height={height}
        style={{
          maxWidth: '100%',
          height: 'auto',
          borderRadius: 8,
          boxShadow: '0 4px 20px rgba(0,0,0,0.5)',
        }}
      />
    </Box>
  );
}
