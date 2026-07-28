'use client';

import React, { useRef, useState } from 'react';
import {
  Box,
  Button,
  Typography,
  LinearProgress,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Chip,
} from '@mui/material';
import {
  Download,
  Videocam,
  Subtitles,
} from '@mui/icons-material';
import { FFmpeg } from '@ffmpeg/ffmpeg';
import { Scene, FPS, WIDTH, HEIGHT } from './types';

interface ExportPanelProps {
  scenes: Scene[];
  title?: string;
  audioUrl?: string;
  subtitleUrl?: string;
  videoUrl?: string;
}

type ExportFormat = 'mp4' | 'webm';
type Resolution = '1080p' | '720p' | '480p';

const RESOLUTIONS: Record<Resolution, { width: number; height: number }> = {
  '1080p': { width: 1920, height: 1080 },
  '720p': { width: 1280, height: 720 },
  '480p': { width: 854, height: 480 },
};

export default function ExportPanel({ scenes, title, audioUrl, subtitleUrl, videoUrl }: ExportPanelProps) {
  const [isExporting, setIsExporting] = useState(false);
  const [progress, setProgress] = useState(0);
  const [progressMessage, setProgressMessage] = useState('');
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [format, setFormat] = useState<ExportFormat>('mp4');
  const [resolution, setResolution] = useState<Resolution>('1080p');
  const [error, setError] = useState<string | null>(null);

  const ffmpegRef = useRef<FFmpeg | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const loadFFmpeg = async () => {
    if (ffmpegRef.current) return ffmpegRef.current;
    const ffmpeg = new FFmpeg();
    ffmpeg.on('log', ({ message }) => console.log('[FFmpeg]', message));
    ffmpeg.on('progress', ({ progress: p }) => {
      setProgress(Math.min(0.95, p));
    });
    await ffmpeg.load({ coreURL: '/ffmpeg/ffmpeg-core.js' });
    ffmpegRef.current = ffmpeg;
    return ffmpeg;
  };

  const drawPlaceholder = (ctx: CanvasRenderingContext2D, width: number, height: number, label: string) => {
    ctx.fillStyle = '#111827';
    ctx.fillRect(0, 0, width, height);

    const gradient = ctx.createLinearGradient(0, 0, width, height);
    gradient.addColorStop(0, '#1f2937');
    gradient.addColorStop(1, '#111827');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, width, height);

    ctx.fillStyle = '#d1d5db';
    ctx.font = `bold ${Math.max(24, width / 20)}px Arial`;
    ctx.textAlign = 'center';
    ctx.fillText(label, width / 2, height / 2 - 8);

    ctx.font = `${Math.max(14, width / 40)}px Arial`;
    ctx.fillStyle = '#9ca3af';
    ctx.fillText('Using fallback background', width / 2, height / 2 + 24);
  };

  const loadSceneImage = async (imageUrl: string): Promise<HTMLImageElement | null> => {
    if (!imageUrl?.trim()) return null;

    const createImage = (src: string) =>
      new Promise<HTMLImageElement>((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => resolve(img);
        img.onerror = () => reject(new Error(`Unable to load image: ${src}`));
        img.src = src;
      });

    try {
      return await createImage(imageUrl);
    } catch {
      try {
        const response = await fetch(imageUrl, { mode: 'cors', credentials: 'same-origin' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const blob = await response.blob();
        const blobUrl = URL.createObjectURL(blob);
        try {
          return await createImage(blobUrl);
        } finally {
          URL.revokeObjectURL(blobUrl);
        }
      } catch {
        return null;
      }
    }
  };

  const exportVideo = async () => {
    if (!scenes.length) return;
    setIsExporting(true);
    setProgress(0);
    setError(null);
    setResultUrl(null);
    setProgressMessage('Loading FFmpeg...');

    try {
      const ffmpeg = await loadFFmpeg();
      const res = RESOLUTIONS[resolution];

      const canvas = document.createElement('canvas');
      canvas.width = res.width;
      canvas.height = res.height;
      const ctx = canvas.getContext('2d')!;
      canvasRef.current = canvas;

      setProgressMessage('Rendering frames...');

      let totalFrames = 0;
      for (const scene of scenes) {
        totalFrames += Math.ceil(scene.duration * FPS);
      }

      let frameCount = 0;
      for (let si = 0; si < scenes.length; si++) {
        const scene = scenes[si];
        const sceneFrames = Math.ceil(scene.duration * FPS);
        const img = await loadSceneImage(scene.imageUrl);

        for (let f = 0; f < sceneFrames; f++) {
          ctx.fillStyle = '#000';
          ctx.fillRect(0, 0, res.width, res.height);

          if (img) {
            const imgAspect = img.width / img.height;
            const canvasAspect = res.width / res.height;
            let drawW: number, drawH: number;
            if (imgAspect > canvasAspect) {
              drawH = res.height;
              drawW = drawH * imgAspect;
            } else {
              drawW = res.width;
              drawH = drawW / imgAspect;
            }
            const drawX = (res.width - drawW) / 2;
            const drawY = (res.height - drawH) / 2;
            ctx.drawImage(img, drawX, drawY, drawW, drawH);
          } else {
            drawPlaceholder(ctx, res.width, res.height, `Scene ${si + 1}`);
          }

          const timeInScene = f / FPS;
          const activeSubs = scene.subtitles.filter(
            (sub) => timeInScene >= sub.startTime && timeInScene <= sub.endTime
          );
          for (const sub of activeSubs) {
            ctx.save();
            ctx.font = `${sub.style.bold ? 'bold ' : ''}${sub.style.italic ? 'italic ' : ''}${sub.style.fontSize}px ${sub.style.fontFamily}`;
            ctx.textAlign = 'center';
            ctx.fillStyle = sub.style.backgroundColor;

            const textWidth = ctx.measureText(sub.text).width;
            const padding = 12;
            let y: number;
            if (sub.style.position === 'top') y = 60;
            else if (sub.style.position === 'center') y = res.height / 2;
            else y = res.height - 80;

            ctx.fillRect(
              res.width / 2 - textWidth / 2 - padding,
              y - sub.style.fontSize - padding / 2,
              textWidth + padding * 2,
              sub.style.fontSize + padding
            );

            ctx.fillStyle = sub.style.color;
            if (sub.style.outline) {
              ctx.strokeStyle = 'rgba(0,0,0,0.8)';
              ctx.lineWidth = 3;
              ctx.strokeText(sub.text, res.width / 2, y);
            }
            ctx.fillText(sub.text, res.width / 2, y);
            ctx.restore();
          }

          const blob = await new Promise<Blob>((resolve) =>
            canvas.toBlob((b) => resolve(b!), 'image/png')
          );
          const data = new Uint8Array(await blob.arrayBuffer());
          const frameFileName = `frame_${String(frameCount).padStart(6, '0')}.png`;
          await ffmpeg.writeFile(frameFileName, data);

          frameCount++;
          setProgress(frameCount / totalFrames * 0.8);
          if (frameCount % 30 === 0) {
            setProgressMessage(`Rendering frame ${frameCount}/${totalFrames}...`);
          }
        }
      }

      setProgressMessage('Encoding video...');
      const outputFile = `output.${format}`;

      if (format === 'mp4') {
        await ffmpeg.exec([
          '-framerate', String(FPS),
          '-i', 'frame_%06d.png',
          '-c:v', 'libx264',
          '-pix_fmt', 'yuv420p',
          '-preset', 'ultrafast',
          '-crf', '23',
          outputFile,
        ]);
      } else {
        await ffmpeg.exec([
          '-framerate', String(FPS),
          '-i', 'frame_%06d.png',
          '-c:v', 'libvpx-vp9',
          '-pix_fmt', 'yuv420p',
          '-crf', '30',
          '-b:v', '0',
          outputFile,
        ]);
      }

      setProgressMessage('Finalizing...');
      const outputData = (await ffmpeg.readFile(outputFile)) as Uint8Array;
      const videoBlob = new Blob([outputData.buffer as ArrayBuffer], {
        type: format === 'mp4' ? 'video/mp4' : 'video/webm',
      });
      const url = URL.createObjectURL(videoBlob);
      setResultUrl(url);
      setProgress(1);
      setProgressMessage('Export complete!');

      for (let i = 0; i < frameCount; i++) {
        await ffmpeg.deleteFile(`frame_${String(i).padStart(6, '0')}.png`);
      }
      await ffmpeg.deleteFile(outputFile);
    } catch (err: any) {
      console.error('Export failed:', err);
      setError(err.message || 'Export failed');
    } finally {
      setIsExporting(false);
    }
  };

  const downloadVideo = () => {
    if (!resultUrl) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    const titleSafe = (title || 'video').replace(/[^a-z0-9]/gi, '_');
    a.download = `${titleSafe}.${format}`;
    a.click();
  };

  const generateSRT = () => {
    let time = 0;
    const lines: string[] = [];
    let count = 1;
    scenes.forEach((scene) => {
      scene.subtitles.forEach((sub) => {
        const start = time + sub.startTime;
        const end = time + sub.endTime;
        lines.push(`${count}`);
        lines.push(`${formatSrtTime(start)} --> ${formatSrtTime(end)}`);
        lines.push(sub.text);
        lines.push('');
        count++;
      });
      time += scene.duration;
    });
    return lines.join('\n').trim();
  };

  const downloadSRT = () => {
    const content = generateSRT();
    const blob = new Blob([content], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    const titleSafe = (title || 'video').replace(/[^a-z0-9]/gi, '_');
    a.download = `${titleSafe}.srt`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2 }}>
      <Typography variant="subtitle2" sx={{ color: '#fff', mb: 2 }}>
        Export
      </Typography>

      {/* Settings */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel sx={{ color: '#888', fontSize: 11 }}>Format</InputLabel>
          <Select
            value={format}
            label="Format"
            onChange={(e) => setFormat(e.target.value as ExportFormat)}
            disabled={isExporting}
            sx={{ color: '#fff', fontSize: 11, '& .MuiSelect-icon': { color: '#888' }, '& fieldset': { borderColor: '#444' } }}
          >
            <MenuItem value="mp4" sx={{ fontSize: 11 }}>MP4</MenuItem>
            <MenuItem value="webm" sx={{ fontSize: 11 }}>WebM</MenuItem>
          </Select>
        </FormControl>

        <FormControl size="small" sx={{ minWidth: 80 }}>
          <InputLabel sx={{ color: '#888', fontSize: 11 }}>Resolution</InputLabel>
          <Select
            value={resolution}
            label="Resolution"
            onChange={(e) => setResolution(e.target.value as Resolution)}
            disabled={isExporting}
            sx={{ color: '#fff', fontSize: 11, '& .MuiSelect-icon': { color: '#888' }, '& fieldset': { borderColor: '#444' } }}
          >
            <MenuItem value="1080p" sx={{ fontSize: 11 }}>1080p</MenuItem>
            <MenuItem value="720p" sx={{ fontSize: 11 }}>720p</MenuItem>
            <MenuItem value="480p" sx={{ fontSize: 11 }}>480p</MenuItem>
          </Select>
        </FormControl>
      </Box>

      {/* Export buttons */}
      <Box sx={{ display: 'flex', gap: 1, mb: 2, flexWrap: 'wrap' }}>
        <Button
          variant="contained"
          startIcon={<Videocam />}
          onClick={exportVideo}
          disabled={isExporting || !scenes.length}
          sx={{ bgcolor: '#28a745', '&:hover': { bgcolor: '#218838' }, fontSize: 12 }}
        >
          {isExporting ? 'Exporting...' : 'Export Video'}
        </Button>

        <Button
          variant="outlined"
          startIcon={<Subtitles />}
          onClick={downloadSRT}
          disabled={!scenes.some((s) => s.subtitles.length > 0)}
          sx={{ borderColor: '#9c27b0', color: '#9c27b0', fontSize: 12 }}
        >
          Export SRT
        </Button>

        {resultUrl && (
          <Button
            variant="contained"
            startIcon={<Download />}
            onClick={downloadVideo}
            sx={{ bgcolor: '#4a90d9', '&:hover': { bgcolor: '#3a80c9' }, fontSize: 12 }}
          >
            Download
          </Button>
        )}
      </Box>

      {/* Progress */}
      {isExporting && (
        <Box sx={{ mb: 2 }}>
          <LinearProgress
            variant="determinate"
            value={progress * 100}
            sx={{ bgcolor: '#2d2d2d', mb: 0.5, '& .MuiLinearProgress-bar': { bgcolor: '#4a90d9' } }}
          />
          <Typography variant="caption" sx={{ color: '#888' }}>
            {progressMessage} ({Math.round(progress * 100)}%)
          </Typography>
        </Box>
      )}

      {/* Error */}
      {error && (
        <Typography variant="caption" sx={{ color: '#ff4444' }}>
          {error}
        </Typography>
      )}

      {/* Generated files from pipeline */}
      {(videoUrl || audioUrl || subtitleUrl) && (
        <Box sx={{ mt: 2, mb: 2 }}>
          <Typography variant="subtitle2" sx={{ color: '#fff', mb: 1 }}>
            Generated Assets
          </Typography>
          {videoUrl && (
            <Box sx={{ mb: 2 }}>
              <video
                src={videoUrl}
                controls
                style={{ width: '100%', borderRadius: 8, backgroundColor: '#000' }}
              />
            </Box>
          )}
          <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
            {audioUrl && (
              <Button
                variant="outlined"
                size="small"
                href={audioUrl}
                target="_blank"
                sx={{ borderColor: '#4a90d9', color: '#4a90d9', fontSize: 12 }}
              >
                Download Audio
              </Button>
            )}
            {subtitleUrl && (
              <Button
                variant="outlined"
                size="small"
                href={subtitleUrl}
                target="_blank"
                sx={{ borderColor: '#9c27b0', color: '#9c27b0', fontSize: 12 }}
              >
                Download Subtitles
              </Button>
            )}
          </Box>
        </Box>
      )}

      {/* Result preview */}
      {resultUrl && (
        <Box sx={{ mt: 2 }}>
          <video
            src={resultUrl}
            controls
            style={{ width: '100%', borderRadius: 8, backgroundColor: '#000' }}
          />
        </Box>
      )}
    </Box>
  );
}

function formatSrtTime(seconds: number) {
  const hrs = Math.floor(seconds / 3600);
  const mins = Math.floor((seconds % 3600) / 60);
  const secs = Math.floor(seconds % 60);
  const ms = Math.round((seconds % 1) * 1000);
  return `${hrs.toString().padStart(2, '0')}:${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')},${ms.toString().padStart(3, '0')}`;
}
