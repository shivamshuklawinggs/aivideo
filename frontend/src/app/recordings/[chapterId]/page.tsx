'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useParams, useRouter } from 'next/navigation';
import axios from 'axios';
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

interface PanelInfo {
  panelId: string;
  panelOrder: number;
  imageUrl: string;
}

interface PanelRecording {
  panelId: string;
  panelOrder: number;
  status: 'not_started' | 'recording' | 'completed' | 'skipped' | 'failed';
  audioFile?: string;
  duration?: number;
}

interface Session {
  currentPanelOrder: number;
  completedPanels: string[];
  skippedPanels: string[];
  status: string;
}

interface MergeStatus {
  status: 'pending' | 'merging' | 'completed' | 'failed';
  progress: number;
  audioFile?: string;
  error?: string;
}

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000/api';
const SOCKET_URL = process.env.NEXT_PUBLIC_SOCKET_URL || 'http://localhost:5000';

function getAuthHeaders() {
  if (typeof window === 'undefined') return {};
  const token = localStorage.getItem('token');
  return token ? { Authorization: `Bearer ${token}` } : {};
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
  const [uploading, setUploading] = useState(false);

  const [merge, setMerge] = useState<MergeStatus | null>(null);
  const [timestamps, setTimestamps] = useState<any[] | null>(null);

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

  useEffect(() => {
    if (!chapterId) return;
    loadSession();
  }, [chapterId]);

  useEffect(() => {
    // Clear in-memory recording and show saved audio for current panel when navigating
    setAudioBlob(null);
    setAudioUrl(null);
    if (currentPanel && recordings[currentPanel.panelId]?.audioFile) {
      const filePath = recordings[currentPanel.panelId].audioFile!.replace(/\\/g, '/');
      setAudioUrl(`${SOCKET_URL}/${filePath}`);
    }
  }, [currentIndex, recordings]);

  const loadSession = async () => {
    setLoading(true);
    setError('');
    try {
      const [panelsRes, sessionRes, recordingsRes] = await Promise.all([
        axios.get(`${API_URL}/recordings/chapters/${chapterId}/panels`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/recordings/chapters/${chapterId}/session`, { headers: getAuthHeaders() }),
        axios.get(`${API_URL}/recordings/chapters/${chapterId}/recordings`, { headers: getAuthHeaders() }),
      ]);

      const fetchedPanels: PanelInfo[] = panelsRes.data.data || [];
      const session: Session = sessionRes.data.data?.session || { currentPanelOrder: 0, completedPanels: [], skippedPanels: [], status: 'active' };
      const recs: PanelRecording[] = recordingsRes.data.data || [];

      setPanels(fetchedPanels);
      setRecordings(Object.fromEntries(recs.map((r) => [r.panelId, r])));

      const nextOrder = Math.min(session.currentPanelOrder, fetchedPanels.length - 1);
      const resumeIndex = Math.max(0, nextOrder);
      setCurrentIndex(resumeIndex);
    } catch (err: any) {
      setError(err.response?.data?.message || err.message || 'Failed to load session.');
    } finally {
      setLoading(false);
    }
  };

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
        setAudioBlob(blob);
        setAudioUrl(URL.createObjectURL(blob));
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

  const uploadRecording = async () => {
    if (!audioBlob || !currentPanel) return;
    setUploading(true);
    setError('');
    try {
      const formData = new FormData();
      formData.append('audio', audioBlob, `${currentPanel.panelId}.webm`);
      formData.append('chapterId', chapterId);
      formData.append('mangaId', '');
      formData.append('panelId', currentPanel.panelId);
      formData.append('panelOrder', String(currentPanel.panelOrder));

      const res = await axios.post(`${API_URL}/recordings`, formData, {
        headers: { ...getAuthHeaders(), 'Content-Type': 'multipart/form-data' },
      });

      const rec: PanelRecording = res.data.data;
      setRecordings((prev) => ({ ...prev, [rec.panelId]: rec }));
      setAudioBlob(null);
      setAudioUrl(null);

      // Move to next panel if possible
      if (currentIndex < panels.length - 1) {
        setCurrentIndex((i) => i + 1);
      }
    } catch (err: any) {
      setError(err.response?.data?.message || 'Upload failed.');
    } finally {
      setUploading(false);
    }
  };

  const deleteRecording = async () => {
    if (!currentPanel) return;
    try {
      await axios.delete(`${API_URL}/recordings/${currentPanel.panelId}?chapterId=${chapterId}`, {
        headers: getAuthHeaders(),
      });
      setRecordings((prev) => {
        const next = { ...prev };
        delete next[currentPanel.panelId];
        return next;
      });
      setAudioBlob(null);
      setAudioUrl(null);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Delete failed.');
    }
  };

  const skipPanel = async () => {
    if (!currentPanel) return;
    try {
      await axios.post(`${API_URL}/recordings/chapters/${chapterId}/panels/${currentPanel.panelId}/skip`, {}, { headers: getAuthHeaders() });
      setRecordings((prev) => ({ ...prev, [currentPanel.panelId]: { ...prev[currentPanel.panelId], status: 'skipped' } as any }));
      if (currentIndex < panels.length - 1) setCurrentIndex((i) => i + 1);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Skip failed.');
    }
  };

  const finishChapter = async () => {
    setError('');
    try {
      await axios.post(`${API_URL}/recordings/chapters/${chapterId}/merge`, {}, { headers: getAuthHeaders() });
      pollMergeStatus();
    } catch (err: any) {
      setError(err.response?.data?.message || 'Merge failed.');
    }
  };

  const downloadChapterAudio = async () => {
    try {
      const res = await axios.get(`${API_URL}/recordings/chapters/${chapterId}/audio`, {
        responseType: 'blob',
        headers: getAuthHeaders(),
      });
      const url = URL.createObjectURL(new Blob([res.data], { type: 'audio/mpeg' }));
      const a = document.createElement('a');
      a.href = url;
      a.download = `chapter-${chapterId}.mp3`;
      a.click();
      URL.revokeObjectURL(url);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Download failed.');
    }
  };

  const loadTimestamps = async () => {
    try {
      const res = await axios.get(`${API_URL}/recordings/chapters/${chapterId}/timestamps`, { headers: getAuthHeaders() });
      setTimestamps(res.data.data || []);
    } catch (err: any) {
      setError(err.response?.data?.message || 'Failed to load timestamps.');
    }
  };

  const pollMergeStatus = () => {
    const interval = setInterval(async () => {
      try {
        const res = await axios.get(`${API_URL}/recordings/chapters/${chapterId}/merge-status`, { headers: getAuthHeaders() });
        const status: MergeStatus = res.data.data;
        setMerge(status);
        if (status.status === 'completed' || status.status === 'failed') {
          clearInterval(interval);
        }
      } catch {
        clearInterval(interval);
      }
    }, 1500);
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

  if (loading) {
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
              <Button variant="contained" color="success" onClick={uploadRecording} disabled={uploading}>
                {uploading ? <CircularProgress size={20} /> : 'Save & Next'}
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

      {merge && (
        <Paper sx={{ p: 2, mt: 3 }}>
          <Typography variant="h6">Chapter Audio</Typography>
          <Typography>Status: {merge.status}</Typography>
          {merge.status === 'merging' && <LinearProgress variant="determinate" value={merge.progress} />}
          {merge.status === 'completed' && (
            <Box mt={1}>
              <Button variant="contained" onClick={downloadChapterAudio}>
                Download Chapter MP3
              </Button>
              <Button sx={{ ml: 1 }} variant="outlined" onClick={loadTimestamps}>
                View Timestamps
              </Button>
            </Box>
          )}
          {merge.status === 'failed' && <Alert severity="error" sx={{ mt: 1 }}>{merge.error || 'Merge failed'}</Alert>}
        </Paper>
      )}

      {timestamps && (
        <Paper sx={{ p: 2, mt: 2 }}>
          <Typography variant="h6" gutterBottom>
            Timestamps
          </Typography>
          <Box component="pre" sx={{ overflow: 'auto', maxHeight: 300, bgcolor: '#f5f5f5', p: 1, borderRadius: 1 }}>
            {JSON.stringify(timestamps, null, 2)}
          </Box>
        </Paper>
      )}
    </Box>
  );
}
