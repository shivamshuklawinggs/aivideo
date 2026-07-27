'use client';

import React, { useRef, useState } from 'react';
import { Box, Typography, Tooltip } from '@mui/material';
import { Scene, FPS } from './types';

interface TimelineProps {
  scenes: Scene[];
  totalDuration: number;
  currentTime: number;
  onTimeChange: (time: number) => void;
  onSelectScene: (index: number) => void;
  selectedSceneIndex: number;
}

export default function Timeline({
  scenes,
  totalDuration,
  currentTime,
  onTimeChange,
  onSelectScene,
  selectedSceneIndex,
}: TimelineProps) {
  const timelineRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);

  const getTimeFromEvent = (e: React.MouseEvent<HTMLDivElement> | MouseEvent) => {
    const rect = timelineRef.current?.getBoundingClientRect();
    if (!rect) return 0;
    const x = ('clientX' in e ? e.clientX : 0) - rect.left;
    const percentage = Math.max(0, Math.min(1, x / rect.width));
    return percentage * totalDuration;
  };

  const handleMouseDown = (e: React.MouseEvent<HTMLDivElement>) => {
    setIsDragging(true);
    onTimeChange(getTimeFromEvent(e));
  };

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (isDragging) {
      onTimeChange(getTimeFromEvent(e));
    }
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  const effectColors: Record<string, string> = {
    none: '#4a90d9',
    fade: '#9c27b0',
    zoom: '#ff9800',
    slide: '#4caf50',
    kenburns: '#e91e63',
    crossfade: '#00bcd4',
    wipe: '#ffeb3b',
  };

  const safeDuration = totalDuration || 1;

  return (
    <Box sx={{ width: '100%', bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
        Timeline
      </Typography>

      {/* Time ruler */}
      <Box sx={{ position: 'relative', height: 20, mb: 0.5 }}>
        {Array.from({ length: Math.ceil(totalDuration) + 1 }).map((_, i) => (
          <Box
            key={i}
            sx={{
              position: 'absolute',
              left: `${(i / safeDuration) * 100}%`,
              top: 0,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              alignItems: 'center',
            }}
          >
            <Box sx={{ width: 1, height: 8, bgcolor: '#444' }} />
            <Typography variant="caption" sx={{ color: '#666', fontSize: 8, mt: 0.2 }}>
              {i}s
            </Typography>
          </Box>
        ))}
      </Box>

      {/* Video track */}
      <Box sx={{ mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#888', fontSize: 9, pl: 0.5 }}>
          VIDEO
        </Typography>
      </Box>
      <Box
        ref={timelineRef}
        sx={{
          position: 'relative',
          height: 48,
          bgcolor: '#1a1a2e',
          borderRadius: 1,
          cursor: 'pointer',
          overflow: 'hidden',
          border: '1px solid #333',
        }}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {scenes.map((scene, index) => {
          const startOffset = scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);
          const widthPercentage = (scene.duration / safeDuration) * 100;
          const leftPercentage = (startOffset / safeDuration) * 100;
          const color = effectColors[scene.effect] || '#4a90d9';

          return (
            <Tooltip key={scene.id} title={`Scene ${index + 1} • ${scene.duration.toFixed(1)}s • ${scene.effect}`}>
              <Box
                onClick={(e) => {
                  e.stopPropagation();
                  onSelectScene(index);
                }}
                sx={{
                  position: 'absolute',
                  left: `${leftPercentage}%`,
                  width: `${widthPercentage}%`,
                  height: '100%',
                  bgcolor: color,
                  opacity: selectedSceneIndex === index ? 1 : 0.7,
                  border: selectedSceneIndex === index ? '2px solid #fff' : '1px solid rgba(255,255,255,0.2)',
                  borderRadius: 0.5,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: 11,
                  color: '#fff',
                  fontWeight: 600,
                  transition: 'opacity 0.2s',
                  '&:hover': { opacity: 1 },
                  overflow: 'hidden',
                }}
              >
                <Box
                  sx={{
                    position: 'absolute',
                    inset: 0,
                    backgroundImage: `url(${scene.imageUrl})`,
                    backgroundSize: 'cover',
                    backgroundPosition: 'center',
                    opacity: 0.3,
                  }}
                />
                <Typography sx={{ position: 'relative', zIndex: 1, fontSize: 10, fontWeight: 600 }}>
                  {index + 1}
                </Typography>
              </Box>
            </Tooltip>
          );
        })}

        {/* Playhead */}
        <Box
          sx={{
            position: 'absolute',
            left: `${(currentTime / safeDuration) * 100}%`,
            top: -4,
            bottom: -4,
            width: 2,
            bgcolor: '#ff4444',
            transform: 'translateX(-50%)',
            zIndex: 20,
            pointerEvents: 'none',
            '&::before': {
              content: '""',
              position: 'absolute',
              top: 0,
              left: '50%',
              transform: 'translateX(-50%)',
              width: 8,
              height: 8,
              bgcolor: '#ff4444',
              borderRadius: '50%',
            },
          }}
        />
      </Box>

      {/* Audio track */}
      <Box sx={{ mt: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#888', fontSize: 9, pl: 0.5 }}>
          AUDIO
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative',
          height: 28,
          bgcolor: '#1a2e1a',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        {scenes.map((scene, index) => {
          const startOffset = scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);

          return scene.audioClips.map((audio) => {
            const audioStart = startOffset + audio.startTime;
            const leftPercentage = (audioStart / safeDuration) * 100;
            const widthPercentage = (audio.duration / safeDuration) * 100;

            return (
              <Tooltip key={audio.id} title={`${audio.name} • ${audio.duration.toFixed(1)}s`}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${leftPercentage}%`,
                    width: `${widthPercentage}%`,
                    height: '100%',
                    bgcolor: audio.type === 'voiceover' ? '#4caf50' : '#2196f3',
                    opacity: 0.8,
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 9,
                    color: '#fff',
                    px: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {audio.name}
                </Box>
              </Tooltip>
            );
          });
        })}
      </Box>

      {/* Subtitle track */}
      <Box sx={{ mt: 1, mb: 0.5 }}>
        <Typography variant="caption" sx={{ color: '#888', fontSize: 9, pl: 0.5 }}>
          SUBTITLES
        </Typography>
      </Box>
      <Box
        sx={{
          position: 'relative',
          height: 24,
          bgcolor: '#2e1a2e',
          borderRadius: 1,
          overflow: 'hidden',
          border: '1px solid #333',
        }}
      >
        {scenes.map((scene, index) => {
          const startOffset = scenes.slice(0, index).reduce((sum, s) => sum + s.duration, 0);

          return scene.subtitles.map((sub) => {
            const subStart = startOffset + sub.startTime;
            const subDuration = sub.endTime - sub.startTime;
            const leftPercentage = (subStart / safeDuration) * 100;
            const widthPercentage = (subDuration / safeDuration) * 100;

            return (
              <Tooltip key={sub.id} title={sub.text}>
                <Box
                  sx={{
                    position: 'absolute',
                    left: `${leftPercentage}%`,
                    width: `${widthPercentage}%`,
                    height: '100%',
                    bgcolor: '#9c27b0',
                    opacity: 0.8,
                    borderRadius: 0.5,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    fontSize: 8,
                    color: '#fff',
                    px: 0.5,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                  }}
                >
                  {sub.text}
                </Box>
              </Tooltip>
            );
          });
        })}
      </Box>

      {/* Time display */}
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mt: 1 }}>
        <Typography variant="caption" sx={{ color: '#aaa', fontFamily: 'monospace', fontSize: 10 }}>
          {formatTime(currentTime)}
        </Typography>
        <Typography variant="caption" sx={{ color: '#888', fontSize: 10 }}>
          Total: {formatTime(totalDuration)}
        </Typography>
      </Box>
    </Box>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 10);
  return `${m}:${s.toString().padStart(2, '0')}.${ms}`;
}
