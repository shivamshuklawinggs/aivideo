'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  Typography,
  Slider,
  List,
  ListItem,
  ListItemText,
  Chip,
  Tooltip,
  LinearProgress,
} from '@mui/material';
import {
  Mic,
  Stop,
  Delete,
  PlayArrow,
  Pause,
  VolumeUp,
  Upload,
  FiberManualRecord,
} from '@mui/icons-material';
import { AudioClip, Scene } from './types';

interface VoiceRecorderProps {
  scenes: Scene[];
  currentSceneIndex: number;
  onAddAudio: (sceneIndex: number, audio: AudioClip) => void;
  onRemoveAudio: (sceneIndex: number, audioId: string) => void;
  onUpdateAudio: (sceneIndex: number, audioId: string, patch: Partial<AudioClip>) => void;
}

export default function VoiceRecorder({
  scenes,
  currentSceneIndex,
  onAddAudio,
  onRemoveAudio,
  onUpdateAudio,
}: VoiceRecorderProps) {
  const [isRecording, setIsRecording] = useState(false);
  const [recordingDuration, setRecordingDuration] = useState(0);
  const [playingAudioId, setPlayingAudioId] = useState<string | null>(null);
  const [recordingLevel, setRecordingLevel] = useState(0);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const chunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const audioPlayerRef = useRef<HTMLAudioElement | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animFrameRef = useRef<number>(0);

  const generateId = () => `audio_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const startRecording = useCallback(async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          sampleRate: 44100,
        },
      });

      const audioContext = new AudioContext();
      const source = audioContext.createMediaStreamSource(stream);
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      source.connect(analyser);
      analyserRef.current = analyser;

      const updateLevel = () => {
        if (!analyserRef.current) return;
        const data = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(data);
        const avg = data.reduce((sum, val) => sum + val, 0) / data.length;
        setRecordingLevel(avg / 255);
        animFrameRef.current = requestAnimationFrame(updateLevel);
      };
      animFrameRef.current = requestAnimationFrame(updateLevel);

      const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm;codecs=opus' });
      mediaRecorderRef.current = mediaRecorder;
      chunksRef.current = [];

      mediaRecorder.ondataavailable = (e) => {
        if (e.data.size > 0) {
          chunksRef.current.push(e.data);
        }
      };

      mediaRecorder.onstop = () => {
        stream.getTracks().forEach((track) => track.stop());
        cancelAnimationFrame(animFrameRef.current);
        audioContext.close();
        setRecordingLevel(0);

        const blob = new Blob(chunksRef.current, { type: 'audio/webm' });
        const url = URL.createObjectURL(blob);

        const audio = new window.Audio();
        audio.src = url;
        audio.onloadedmetadata = () => {
          const duration = audio.duration === Infinity ? recordingDuration : audio.duration;
          const newAudio: AudioClip = {
            id: generateId(),
            url,
            blob,
            name: `Voiceover ${new Date().toLocaleTimeString()}`,
            duration: Math.round(duration * 10) / 10,
            startTime: 0,
            volume: 1,
            type: 'voiceover',
          };
          onAddAudio(currentSceneIndex, newAudio);
        };
      };

      mediaRecorder.start(100);
      setIsRecording(true);
      setRecordingDuration(0);

      timerRef.current = setInterval(() => {
        setRecordingDuration((prev) => prev + 0.1);
      }, 100);
    } catch (err) {
      console.error('Failed to start recording:', err);
      alert('Could not access microphone. Please allow microphone permission.');
    }
  }, [currentSceneIndex, onAddAudio, recordingDuration]);

  const stopRecording = useCallback(() => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop();
      setIsRecording(false);
      if (timerRef.current) {
        clearInterval(timerRef.current);
        timerRef.current = null;
      }
    }
  }, [isRecording]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const url = URL.createObjectURL(file);
    const audio = new window.Audio();
    audio.src = url;
    audio.onloadedmetadata = () => {
      const newAudio: AudioClip = {
        id: generateId(),
        url,
        blob: file,
        name: file.name,
        duration: Math.round(audio.duration * 10) / 10,
        startTime: 0,
        volume: 1,
        type: file.name.toLowerCase().includes('bgm') || file.name.toLowerCase().includes('music')
          ? 'bgm'
          : 'voiceover',
      };
      onAddAudio(currentSceneIndex, newAudio);
    };
    e.target.value = '';
  };

  const playAudio = (audioClip: AudioClip) => {
    if (playingAudioId === audioClip.id) {
      audioPlayerRef.current?.pause();
      setPlayingAudioId(null);
      return;
    }

    if (audioPlayerRef.current) {
      audioPlayerRef.current.pause();
    }

    const audio = new window.Audio(audioClip.url);
    audio.volume = audioClip.volume;
    audio.onended = () => setPlayingAudioId(null);
    audio.play();
    audioPlayerRef.current = audio;
    setPlayingAudioId(audioClip.id);
  };

  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      cancelAnimationFrame(animFrameRef.current);
      audioPlayerRef.current?.pause();
    };
  }, []);

  const currentScene = scenes[currentSceneIndex];
  const audioClips = currentScene?.audioClips || [];

  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
        Voice & Audio — Scene {currentSceneIndex + 1}
      </Typography>

      {/* Recording controls */}
      <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 2 }}>
        {!isRecording ? (
          <Button
            variant="contained"
            startIcon={<Mic />}
            onClick={startRecording}
            sx={{ bgcolor: '#e53935', '&:hover': { bgcolor: '#c62828' }, fontSize: 12 }}
          >
            Record Voice
          </Button>
        ) : (
          <Button
            variant="contained"
            startIcon={<Stop />}
            onClick={stopRecording}
            sx={{ bgcolor: '#333', '&:hover': { bgcolor: '#444' }, fontSize: 12 }}
          >
            Stop ({recordingDuration.toFixed(1)}s)
          </Button>
        )}

        <Button
          variant="outlined"
          component="label"
          startIcon={<Upload />}
          sx={{ borderColor: '#4a90d9', color: '#4a90d9', fontSize: 12 }}
        >
          Upload
          <input type="file" accept="audio/*" hidden onChange={handleFileUpload} />
        </Button>
      </Box>

      {/* Recording level indicator */}
      {isRecording && (
        <Box sx={{ mb: 2 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mb: 0.5 }}>
            <FiberManualRecord sx={{ color: '#e53935', fontSize: 12, animation: 'pulse 1s infinite' }} />
            <Typography variant="caption" sx={{ color: '#e53935' }}>
              Recording...
            </Typography>
          </Box>
          <LinearProgress
            variant="determinate"
            value={recordingLevel * 100}
            sx={{
              bgcolor: '#2d2d2d',
              '& .MuiLinearProgress-bar': {
                bgcolor: recordingLevel > 0.7 ? '#e53935' : recordingLevel > 0.4 ? '#ff9800' : '#4caf50',
              },
            }}
          />
        </Box>
      )}

      {/* Audio clips list */}
      {audioClips.length > 0 ? (
        <List dense sx={{ bgcolor: '#252525', borderRadius: 1 }}>
          {audioClips.map((clip) => (
            <ListItem
              key={clip.id}
              sx={{ borderBottom: '1px solid #333', '&:last-child': { borderBottom: 'none' } }}
              secondaryAction={
                <Box sx={{ display: 'flex', gap: 0.5 }}>
                  <IconButton
                    size="small"
                    onClick={() => playAudio(clip)}
                    sx={{ color: playingAudioId === clip.id ? '#4a90d9' : '#888' }}
                  >
                    {playingAudioId === clip.id ? <Pause fontSize="small" /> : <PlayArrow fontSize="small" />}
                  </IconButton>
                  <IconButton
                    size="small"
                    onClick={() => onRemoveAudio(currentSceneIndex, clip.id)}
                    sx={{ color: '#ff4444' }}
                  >
                    <Delete fontSize="small" />
                  </IconButton>
                </Box>
              }
            >
              <ListItemText
                primary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                    <Typography variant="body2" sx={{ color: '#fff', fontSize: 12 }}>
                      {clip.name}
                    </Typography>
                    <Chip
                      label={clip.type}
                      size="small"
                      sx={{
                        height: 16,
                        fontSize: 9,
                        bgcolor: clip.type === 'voiceover' ? '#1b5e20' : '#1a237e',
                        color: '#fff',
                      }}
                    />
                  </Box>
                }
                secondary={
                  <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 0.5 }}>
                    <Typography variant="caption" sx={{ color: '#888', fontSize: 10 }}>
                      {clip.duration.toFixed(1)}s
                    </Typography>
                    <VolumeUp sx={{ color: '#888', fontSize: 12 }} />
                    <Slider
                      value={clip.volume}
                      min={0}
                      max={1}
                      step={0.1}
                      onChange={(_e, val) =>
                        onUpdateAudio(currentSceneIndex, clip.id, { volume: val as number })
                      }
                      size="small"
                      sx={{ width: 60, color: '#4a90d9', '& .MuiSlider-thumb': { width: 8, height: 8 } }}
                    />
                  </Box>
                }
              />
            </ListItem>
          ))}
        </List>
      ) : (
        <Typography variant="caption" sx={{ color: '#666' }}>
          No audio added to this scene yet.
        </Typography>
      )}
    </Box>
  );
}
