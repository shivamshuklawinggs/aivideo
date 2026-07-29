'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Paper,
  Grid,
  IconButton,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Mic,
  Pause,
  PlayArrow,
  Stop,
  Refresh,
  Delete,
  SkipNext,
  NavigateBefore,
  NavigateNext,
  DoneAll,
} from '@mui/icons-material';
import { useQuery } from '@tanstack/react-query';
import { sukuyamiApi } from '@/services/api/sukuyamiApi';

interface PanelInfo {
  panelId: string;
  panelOrder: number;
  imageUrl: string;
}

interface PanelRecording {
  panelId: string;
  panelOrder: number;
  status: 'not_started' | 'recording' | 'completed' | 'skipped' | 'failed';
  audioUrl?: string;
  duration?: number;
}

const STORAGE_KEY_PREFIX = 'recordings_';

function getStorageKey(chapterId: string) {
  return `${STORAGE_KEY_PREFIX}${chapterId}`;
}

function loadStoredRecordings(chapterId: string): Record<string, PanelRecording> {
  if (typeof window === 'undefined') return {};
  try {
    const stored = localStorage.getItem(getStorageKey(chapterId));
    if (stored) return JSON.parse(stored);
  } catch {}
  return {};
}

function saveStoredRecordings(chapterId: string, recordings: Record<string, PanelRecording>) {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(getStorageKey(chapterId), JSON.stringify(recordings));
  } catch {}
}

export default function RecordingPage() {
  const { chapterId } = useParams<{ chapterId: string }>();
  const router = useRouter();

  const [panels, setPanels] = useState<PanelInfo[]>([]);
  const [recordings, setRecordings] = useState<Record<string, PanelRecording>>({});
  const [currentIndex, setCurrentIndex] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [recordingState, setRecordingState] = useState<'idle' | 'recording' | 'paused'>('idle');
  const [recordingTime, setRecordingTime] = useState(0);
  const [audioBlob, setAudioBlob] = useState<Blob | null>(null);
  const [audioUrl, setAudioUrl] = useState<string | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const streamRef = useRef<MediaStream | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const sourceRef = useRef<MediaStreamAudioSourceNode | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const timerRef = useRef<NodeJS.Timeout | null>(null);
  const animationRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);

  const currentPanel = panels[currentIndex];

  const { data: pagesData, isLoading: pagesLoading } = useQuery({
    queryKey: ['chapter-pages', chapterId],
    queryFn: () => sukuyamiApi.getChapterPages(chapterId),
    enabled: !!chapterId,
  });

  useEffect(() => {
    if (!chapterId) return;
    setLoading(true);
    setError('');
    setRecordings(loadStoredRecordings(chapterId));
    setLoading(false);
  }, [chapterId]);

  useEffect(() => {
    if (pagesData?.pages) {
      const fetchedPanels: PanelInfo[] = pagesData.pages.map((url: string, i: number) => ({
        panelId: `panel_${i}`,
        panelOrder: i,
        imageUrl: url,
      }));
      setPanels(fetchedPanels);
    }
  }, [pagesData]);

  useEffect(() => {
    setAudioBlob(null);
    setAudioUrl(null);
    if (currentPanel && recordings[currentPanel.panelId]?.audioUrl) {
      setAudioUrl(recordings[currentPanel.panelId].audioUrl!);
    }
  }, [currentIndex, recordings]);

  const startRecording = async () => {
    if (!currentPanel) return;
    try {
      audioChunksRef.current = [];
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      streamRef.current = stream;

      const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
        ? 'audio/webm;codecs=opus'
        : 'audio/webm';
      const mediaRecorder = new MediaRecorder(stream, { mimeType });
      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      mediaRecorder.onstop = () => {
        const blob = new Blob(audioChunksRef.current, { type: mimeType });
        const url = URL.createObjectURL(blob);
        setAudioBlob(blob);
        setAudioUrl(url);
      };

      const audioContext = new (window.AudioContext || (window as any).webkitAudioContext)();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      const source = audioContext.createMediaStreamSource(stream);
      source.connect(analyser);

      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      sourceRef.current = source;

      mediaRecorder.start(100);
      setRecordingState('recording');
      setRecordingTime(0);
      timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
      startWaveform();
    } catch (err: any) {
      setError('Microphone access denied or not available.');
    }
  };

  const pauseRecording = () => {
    mediaRecorderRef.current?.pause();
    setRecordingState('paused');
    if (timerRef.current) clearInterval(timerRef.current);
    stopWaveform();
  };

  const resumeRecording = () => {
    mediaRecorderRef.current?.resume();
    setRecordingState('recording');
    timerRef.current = setInterval(() => setRecordingTime((t) => t + 1), 1000);
    startWaveform();
  };

  const stopRecording = () => {
    mediaRecorderRef.current?.stop();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    if (timerRef.current) clearInterval(timerRef.current);
    setRecordingState('idle');
    stopWaveform();
  };

  const saveRecording = () => {
    if (!audioBlob || !audioUrl || !currentPanel) return;
    const rec: PanelRecording = {
      panelId: currentPanel.panelId,
      panelOrder: currentPanel.panelOrder,
      status: 'completed',
      audioUrl,
      duration: recordingTime,
    };
    const updated = { ...recordings, [rec.panelId]: rec };
    setRecordings(updated);
    saveStoredRecordings(chapterId, updated);
    setAudioBlob(null);
    setAudioUrl(null);
    if (currentIndex < panels.length - 1) {
      setCurrentIndex((i) => i + 1);
    }
  };

  const deleteRecording = () => {
    if (!currentPanel) return;
    const updated = { ...recordings };
    delete updated[currentPanel.panelId];
    setRecordings(updated);
    saveStoredRecordings(chapterId, updated);
    setAudioBlob(null);
    setAudioUrl(null);
  };

  const skipPanel = () => {
    if (!currentPanel) return;
    const updated = {
      ...recordings,
      [currentPanel.panelId]: {
        ...recordings[currentPanel.panelId],
        panelId: currentPanel.panelId,
        panelOrder: currentPanel.panelOrder,
        status: 'skipped' as const,
      },
    };
    setRecordings(updated);
    saveStoredRecordings(chapterId, updated);
    if (currentIndex < panels.length - 1) setCurrentIndex((i) => i + 1);
  };

  const finishChapter = () => {
    const completed = Object.values(recordings).filter((r) => r.status === 'completed').length;
    const skipped = Object.values(recordings).filter((r) => r.status === 'skipped').length;
    setError('');
    alert(`Chapter finished! ${completed} panels recorded, ${skipped} skipped.`);
  };

  const startWaveform = () => {
    const canvas = canvasRef.current;
    const analyser = analyserRef.current;
    if (!canvas || !analyser) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const bufferLength = analyser.frequencyBinCount;
    const dataArray = new Uint8Array(bufferLength);

    const draw = () => {
      if (!canvas || !ctx || !analyserRef.current) return;
      animationRef.current = requestAnimationFrame(draw);
      analyser.getByteFrequencyData(dataArray);

      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      const barWidth = (canvas.width / bufferLength) * 2.5;
      let x = 0;
      for (let i = 0; i < bufferLength; i++) {
        const barHeight = (dataArray[i] / 255) * canvas.height;
        ctx.fillStyle = `rgb(${50 + dataArray[i]}, 100, 200)`;
        ctx.fillRect(x, canvas.height - barHeight, barWidth, barHeight);
        x += barWidth + 1;
      }
    };
    draw();
  };

  const stopWaveform = () => {
    if (animationRef.current) cancelAnimationFrame(animationRef.current);
    const canvas = canvasRef.current;
    const ctx = canvas?.getContext('2d');
    if (canvas && ctx) {
      ctx.fillStyle = '#1e1e1e';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
  };

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const isCompleted = currentPanel ? recordings[currentPanel.panelId]?.status === 'completed' : false;
  const isSkipped = currentPanel ? recordings[currentPanel.panelId]?.status === 'skipped' : false;
  const completionRate = panels.length > 0 ? (Object.values(recordings).filter((r) => r.status === 'completed' || r.status === 'skipped').length / panels.length) * 100 : 0;

  if (loading || pagesLoading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="80vh">
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 4 }, maxWidth: 900, mx: 'auto' }}>
      <Typography variant="h4" gutterBottom>
        Voice Recording
      </Typography>

      {error && <Alert severity="error" sx={{ mb: 2 }}>{error}</Alert>}

      <Box sx={{ mb: 2 }}>
        <Typography variant="body1" fontWeight="bold">
          Panel {currentIndex + 1} / {panels.length}
        </Typography>
        <LinearProgress variant="determinate" value={completionRate} sx={{ mt: 1 }} />
      </Box>

      {currentPanel && (
        <Paper sx={{ p: 2, mb: 3, textAlign: 'center' }}>
          <Box
            component="img"
            src={currentPanel.imageUrl}
            alt={`Panel ${currentPanel.panelOrder + 1}`}
            sx={{ maxWidth: '100%', maxHeight: '60vh', borderRadius: 2 }}
          />
          <Typography variant="caption" display="block" mt={1}>
            {isCompleted ? '✅ Completed' : isSkipped ? '⏭️ Skipped' : '⏳ Not recorded'}
          </Typography>
        </Paper>
      )}

      <Paper sx={{ p: 3, mb: 3 }}>
        <Box display="flex" justifyContent="center" alignItems="center" gap={2} mb={2}>
          <IconButton onClick={() => setCurrentIndex((i) => Math.max(0, i - 1))} disabled={currentIndex === 0}>
            <NavigateBefore />
          </IconButton>

          {recordingState === 'idle' && !audioBlob && !isCompleted && (
            <Button variant="contained" color="primary" startIcon={<Mic />} onClick={startRecording}>
              Record
            </Button>
          )}

          {recordingState === 'recording' && (
            <>
              <IconButton color="warning" onClick={pauseRecording}>
                <Pause />
              </IconButton>
              <Button variant="contained" color="error" startIcon={<Stop />} onClick={stopRecording}>
                Stop
              </Button>
            </>
          )}

          {recordingState === 'paused' && (
            <>
              <Button variant="contained" startIcon={<PlayArrow />} onClick={resumeRecording}>
                Resume
              </Button>
              <Button variant="contained" color="error" startIcon={<Stop />} onClick={stopRecording}>
                Stop
              </Button>
            </>
          )}

          {audioBlob && (
            <>
              <Button variant="contained" startIcon={<Refresh />} onClick={() => { setAudioBlob(null); setAudioUrl(null); startRecording(); }}>
                Re-record
              </Button>
              <Button variant="contained" color="success" onClick={saveRecording}>
                Save &amp; Next
              </Button>
            </>
          )}

          {(isCompleted || isSkipped) && (
            <Button variant="outlined" startIcon={<Delete />} onClick={deleteRecording}>
              Delete
            </Button>
          )}

          <IconButton onClick={() => setCurrentIndex((i) => Math.min(panels.length - 1, i + 1))} disabled={currentIndex === panels.length - 1}>
            <NavigateNext />
          </IconButton>
        </Box>

        <Box textAlign="center" mb={2}>
          <Typography variant="h5" fontFamily="monospace">
            {formatTime(recordingTime)}
          </Typography>
        </Box>

        <canvas
          ref={canvasRef}
          width={600}
          height={100}
          style={{ width: '100%', height: 100, background: '#1e1e1e', borderRadius: 8 }}
        />

        {audioUrl && (
          <Box mt={2} textAlign="center">
            <audio ref={audioRef} src={audioUrl} controls style={{ width: '100%' }} />
          </Box>
        )}
      </Paper>

      <Grid container spacing={2} justifyContent="center">
        <Grid item>
          <Button variant="outlined" startIcon={<SkipNext />} onClick={skipPanel} disabled={isSkipped}>
            Skip
          </Button>
        </Grid>
        <Grid item>
          <Button variant="contained" startIcon={<DoneAll />} onClick={finishChapter}>
            Finish Chapter
          </Button>
        </Grid>
      </Grid>
    </Box>
  );
}
