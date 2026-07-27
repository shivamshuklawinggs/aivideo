'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import { Player, PlayerRef } from '@remotion/player';
import { RemotionComposition } from './RemotionComposition';
import { Box, IconButton, Slider, Tooltip, Typography } from '@mui/material';
import {
  PlayArrow,
  Pause,
  SkipNext,
  SkipPrevious,
  VolumeUp,
  VolumeOff,
  Fullscreen,
  Speed,
  Loop,
} from '@mui/icons-material';
import { Scene, FPS, WIDTH, HEIGHT } from './types';

interface RemotionPlayerProps {
  scenes: Scene[];
  onTimeUpdate?: (frame: number) => void;
}

export default function RemotionPlayer({ scenes, onTimeUpdate }: RemotionPlayerProps) {
  const playerRef = useRef<PlayerRef>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentFrame, setCurrentFrame] = useState(0);
  const [isMuted, setIsMuted] = useState(false);
  const [volume, setVolume] = useState(1);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [isLooping, setIsLooping] = useState(false);
  const animFrameRef = useRef<number>(0);

  const safeScenes = scenes || [];
  const totalDurationInFrames = Math.max(
    1,
    safeScenes.reduce((sum, scene) => sum + Math.max(1, Math.round(scene.duration * FPS)), 0)
  );
  const totalDuration = totalDurationInFrames / FPS;

  useEffect(() => {
    const player = playerRef.current;
    if (!player) return;

    const updateFrame = () => {
      const frame = player.getCurrentFrame();
      setCurrentFrame(frame);
      onTimeUpdate?.(frame);
      animFrameRef.current = requestAnimationFrame(updateFrame);
    };
    animFrameRef.current = requestAnimationFrame(updateFrame);

    return () => {
      cancelAnimationFrame(animFrameRef.current);
    };
  }, [onTimeUpdate]);

  const handlePlayPause = useCallback(() => {
    const player = playerRef.current;
    if (!player) return;
    if (isPlaying) {
      player.pause();
      setIsPlaying(false);
    } else {
      player.play();
      setIsPlaying(true);
    }
  }, [isPlaying]);

  const handleSeek = (_event: Event, newValue: number | number[]) => {
    const frame = Math.round(newValue as number);
    playerRef.current?.seekTo(frame);
    setCurrentFrame(frame);
  };

  const handleNextFrame = () => {
    const newFrame = Math.min(currentFrame + 1, totalDurationInFrames - 1);
    playerRef.current?.seekTo(newFrame);
    setCurrentFrame(newFrame);
  };

  const handlePreviousFrame = () => {
    const newFrame = Math.max(currentFrame - 1, 0);
    playerRef.current?.seekTo(newFrame);
    setCurrentFrame(newFrame);
  };

  const handleSkipForward = () => {
    const newFrame = Math.min(currentFrame + FPS * 5, totalDurationInFrames - 1);
    playerRef.current?.seekTo(newFrame);
    setCurrentFrame(newFrame);
  };

  const handleSkipBackward = () => {
    const newFrame = Math.max(currentFrame - FPS * 5, 0);
    playerRef.current?.seekTo(newFrame);
    setCurrentFrame(newFrame);
  };

  const handleVolumeChange = (_event: Event, newValue: number | number[]) => {
    const vol = newValue as number;
    setVolume(vol);
    setIsMuted(vol === 0);
  };

  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  const cyclePlaybackRate = () => {
    const rates = [0.5, 0.75, 1, 1.25, 1.5, 2];
    const currentIndex = rates.indexOf(playbackRate);
    const nextIndex = (currentIndex + 1) % rates.length;
    setPlaybackRate(rates[nextIndex]);
  };

  const handleFullscreen = () => {
    const container = document.querySelector('.remotion-player-container');
    if (container) {
      container.requestFullscreen?.();
    }
  };

  const currentTime = currentFrame / FPS;

  return (
    <Box sx={{ width: '100%', bgcolor: '#0a0a0a', borderRadius: 2, p: 2 }}>
      <Box
        className="remotion-player-container"
        sx={{
          position: 'relative',
          width: '100%',
          aspectRatio: '16/9',
          backgroundColor: '#000',
          borderRadius: 1,
          overflow: 'hidden',
          mb: 2,
          cursor: 'pointer',
        }}
        onClick={handlePlayPause}
      >
        {safeScenes.length > 0 ? (
          <Player
            ref={playerRef}
            component={RemotionComposition}
            inputProps={{ scenes: safeScenes }}
            durationInFrames={totalDurationInFrames}
            compositionWidth={WIDTH}
            compositionHeight={HEIGHT}
            fps={FPS}
            style={{ width: '100%', height: '100%' }}
            loop={isLooping}
            playbackRate={playbackRate}
          />
        ) : (
          <Box
            sx={{
              width: '100%',
              height: '100%',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#555',
            }}
          >
            <Typography>Add scenes to preview</Typography>
          </Box>
        )}
      </Box>

      {/* Seek bar */}
      <Box sx={{ px: 1, mb: 1 }}>
        <Slider
          value={currentFrame}
          min={0}
          max={totalDurationInFrames - 1}
          onChange={handleSeek}
          sx={{
            color: '#4a90d9',
            height: 4,
            '& .MuiSlider-thumb': {
              width: 12,
              height: 12,
              backgroundColor: '#4a90d9',
              '&:hover': { boxShadow: '0 0 0 6px rgba(74,144,217,0.2)' },
            },
            '& .MuiSlider-rail': { backgroundColor: '#2d2d2d' },
          }}
        />
      </Box>

      {/* Controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 0.5 }}>
        <Tooltip title="Previous frame (←)">
          <IconButton onClick={handlePreviousFrame} size="small" sx={{ color: '#ccc' }}>
            <SkipPrevious fontSize="small" />
          </IconButton>
        </Tooltip>

        <Tooltip title={isPlaying ? 'Pause (Space)' : 'Play (Space)'}>
          <IconButton
            onClick={handlePlayPause}
            sx={{
              color: '#fff',
              bgcolor: '#4a90d9',
              '&:hover': { bgcolor: '#3a80c9' },
              width: 36,
              height: 36,
            }}
          >
            {isPlaying ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
          </IconButton>
        </Tooltip>

        <Tooltip title="Next frame (→)">
          <IconButton onClick={handleNextFrame} size="small" sx={{ color: '#ccc' }}>
            <SkipNext fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Time display */}
        <Typography variant="caption" sx={{ color: '#aaa', mx: 1, fontFamily: 'monospace', fontSize: 11 }}>
          {formatTime(currentTime)} / {formatTime(totalDuration)}
        </Typography>

        <Box sx={{ flex: 1 }} />

        {/* Volume */}
        <Tooltip title={isMuted ? 'Unmute' : 'Mute'}>
          <IconButton onClick={toggleMute} size="small" sx={{ color: '#ccc' }}>
            {isMuted ? <VolumeOff fontSize="small" /> : <VolumeUp fontSize="small" />}
          </IconButton>
        </Tooltip>
        <Box sx={{ width: 60 }}>
          <Slider
            value={isMuted ? 0 : volume}
            min={0}
            max={1}
            step={0.1}
            onChange={handleVolumeChange}
            size="small"
            sx={{ color: '#4a90d9', '& .MuiSlider-thumb': { width: 10, height: 10 } }}
          />
        </Box>

        {/* Playback speed */}
        <Tooltip title={`Speed: ${playbackRate}x`}>
          <IconButton onClick={cyclePlaybackRate} size="small" sx={{ color: '#ccc' }}>
            <Speed fontSize="small" />
          </IconButton>
        </Tooltip>
        <Typography variant="caption" sx={{ color: '#888', fontSize: 10, minWidth: 24 }}>
          {playbackRate}x
        </Typography>

        {/* Loop */}
        <Tooltip title={isLooping ? 'Disable loop' : 'Enable loop'}>
          <IconButton
            onClick={() => setIsLooping(!isLooping)}
            size="small"
            sx={{ color: isLooping ? '#4a90d9' : '#666' }}
          >
            <Loop fontSize="small" />
          </IconButton>
        </Tooltip>

        {/* Fullscreen */}
        <Tooltip title="Fullscreen">
          <IconButton onClick={handleFullscreen} size="small" sx={{ color: '#ccc' }}>
            <Fullscreen fontSize="small" />
          </IconButton>
        </Tooltip>
      </Box>
    </Box>
  );
}

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  const ms = Math.floor((seconds % 1) * 100);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
}
