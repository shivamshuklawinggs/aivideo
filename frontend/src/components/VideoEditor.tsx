'use client';

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Box,
  Button,
  Dialog,
  DialogContent,
  DialogTitle,
  Grid,
  IconButton,
  List,
  ListItem,
  ListItemAvatar,
  Avatar,
  TextField,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Typography,
  LinearProgress,
} from '@mui/material';
import {
  PlayArrow,
  Stop,
  ArrowUpward,
  ArrowDownward,
  Delete,
  Download,
  Videocam,
  TextSnippet,
  Refresh,
  Translate,
} from '@mui/icons-material';
import type * as Tesseract from 'tesseract.js';

type Effect = 'none' | 'fade' | 'zoom' | 'slide' | 'kenburns';

interface Clip {
  url: string;
  duration: number;
  effect: Effect;
}

interface Scene {
  index: number;
  text: string;
  wordCount: number;
  duration: number;
  hindi?: string;
}

interface VideoEditorProps {
  open: boolean;
  onClose: () => void;
  pages: string[];
  title?: string;
  chapterNumber?: number | string;
}

const FPS = 30;
const WIDTH = 1280;
const HEIGHT = 720;
const MIN_SCENE_DURATION = 1;
const MAX_SCENE_DURATION = 8;
const SCENE_BASE_DURATION = 0.5;
const DEFAULT_WORDS_PER_SECOND = 2.5;

function formatTime(seconds: number) {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m}:${s.toString().padStart(2, '0')}`;
}

function clamp(min: number, value: number, max: number) {
  return Math.max(min, Math.min(max, value));
}

export default function VideoEditor({
  open,
  onClose,
  pages,
  title,
  chapterNumber,
}: VideoEditorProps) {
  const [clips, setClips] = useState<Clip[]>([]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isPreviewing, setIsPreviewing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [resultUrl, setResultUrl] = useState<string | null>(null);
  const [resultBlob, setResultBlob] = useState<Blob | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranslating, setIsTranslating] = useState(false);
  const [wordsPerSecond, setWordsPerSecond] = useState(DEFAULT_WORDS_PER_SECOND);
  const [lang, setLang] = useState('eng');

  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const chunksRef = useRef<Blob[]>([]);

  useEffect(() => {
    if (open && pages.length) {
      setClips(
        pages.map((url) => ({
          url,
          duration: 3,
          effect: 'none',
        }))
      );
      setResultUrl(null);
      setResultBlob(null);
      setProgress(0);
      setError(null);
      setScenes([]);
    }
  }, [open, pages]);

  useEffect(() => {
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, []);

  const totalDuration = clips.reduce((sum, c) => sum + c.duration, 0);

  const loadImages = useCallback(async () => {
    const images: HTMLImageElement[] = [];
    for (const clip of clips) {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.src = clip.url;
      await new Promise<void>((resolve, reject) => {
        img.onload = () => resolve();
        img.onerror = () => reject(new Error(`Failed to load image: ${clip.url}`));
      });
      images.push(img);
    }
    return images;
  }, [clips]);

  const getClipIndexAtTime = useCallback(
    (time: number) => {
      let t = 0;
      for (let i = 0; i < clips.length; i++) {
        t += clips[i].duration;
        if (time < t) return i;
      }
      return clips.length - 1;
    },
    [clips]
  );

  const getClipTime = useCallback(
    (time: number, index: number) => {
      let t = 0;
      for (let i = 0; i < index; i++) t += clips[i].duration;
      return time - t;
    },
    [clips]
  );

  const drawImageCover = (
    ctx: CanvasRenderingContext2D,
    img: HTMLImageElement,
    alpha: number,
    scale: number
  ) => {
    const canvasAspect = WIDTH / HEIGHT;
    const imgAspect = img.width / img.height;
    let drawW: number;
    let drawH: number;
    if (imgAspect > canvasAspect) {
      drawH = HEIGHT * scale;
      drawW = drawH * imgAspect;
    } else {
      drawW = WIDTH * scale;
      drawH = drawW / imgAspect;
    }
    const drawX = (WIDTH - drawW) / 2;
    const drawY = (HEIGHT - drawH) / 2;
    ctx.globalAlpha = alpha;
    ctx.drawImage(img, drawX, drawY, drawW, drawH);
    ctx.globalAlpha = 1;
  };

  const drawFrame = useCallback(
    (ctx: CanvasRenderingContext2D, time: number, images: HTMLImageElement[]) => {
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, WIDTH, HEIGHT);

      if (!clips.length || !images.length) return;

      const index = getClipIndexAtTime(time);
      if (index < 0 || index >= clips.length) return;

      const clip = clips[index];
      const clipTime = Math.min(getClipTime(time, index), clip.duration);
      const img = images[index];

      ctx.save();
      ctx.beginPath();
      ctx.rect(0, 0, WIDTH, HEIGHT);
      ctx.clip();

      let alpha = 1;
      let scale = 1;
      let x = 0;
      let y = 0;

      const effectDuration = Math.min(clip.duration, 1);

      switch (clip.effect) {
        case 'fade':
          alpha = Math.min(1, clipTime / effectDuration);
          break;
        case 'zoom':
          scale = 1 + 0.2 * (clipTime / clip.duration);
          break;
        case 'slide':
          if (clipTime < effectDuration) {
            const t = clipTime / effectDuration;
            x = (1 - t) * -WIDTH * 0.3;
          }
          break;
        case 'kenburns':
          scale = 1 + 0.15 * (clipTime / clip.duration);
          x = -WIDTH * 0.05 * (clipTime / clip.duration);
          y = -HEIGHT * 0.05 * (clipTime / clip.duration);
          break;
        default:
          break;
      }

      ctx.translate(x, y);
      drawImageCover(ctx, img, alpha, scale);
      ctx.restore();

      if (totalDuration > 0) {
        ctx.fillStyle = 'rgba(255,255,255,0.25)';
        ctx.fillRect(0, HEIGHT - 6, WIDTH, 6);
        ctx.fillStyle = '#f44336';
        ctx.fillRect(0, HEIGHT - 6, WIDTH * (time / totalDuration), 6);
      }
    },
    [clips, getClipIndexAtTime, getClipTime, totalDuration]
  );

  const stopPreview = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    setIsPreviewing(false);
  };

  const preview = async () => {
    if (!clips.length || !canvasRef.current) return;
    stopPreview();
    setError(null);
    const ctx = canvasRef.current.getContext('2d');
    if (!ctx) return;
    try {
      var images = await loadImages();
    } catch (e: any) {
      setError(e.message || 'Failed to load panel images');
      return;
    }
    const start = performance.now();
    const loop = () => {
      const elapsed = (performance.now() - start) / 1000;
      const time = elapsed % totalDuration;
      drawFrame(ctx, time, images);
      rafRef.current = requestAnimationFrame(loop);
    };
    rafRef.current = requestAnimationFrame(loop);
    setIsPreviewing(true);
  };

  const generateVideo = async () => {
    if (!clips.length || !canvasRef.current) return;
    stopPreview();
    setIsGenerating(true);
    setProgress(0);
    setResultUrl(null);
    setResultBlob(null);
    setError(null);
    chunksRef.current = [];

    try {
      const canvas = canvasRef.current;
      const ctx = canvas.getContext('2d');
      if (!ctx) throw new Error('Canvas not supported');

      const images = await loadImages();

      const stream = canvas.captureStream(FPS);
      const mimeType = MediaRecorder.isTypeSupported('video/webm; codecs=vp9')
        ? 'video/webm; codecs=vp9'
        : MediaRecorder.isTypeSupported('video/webm')
        ? 'video/webm'
        : '';
      if (!mimeType) {
        throw new Error('Browser does not support webm recording');
      }

      const recorder = new MediaRecorder(stream, { mimeType });
      chunksRef.current = [];
      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) chunksRef.current.push(e.data);
      };
      recorder.onstop = () => {
        const blob = new Blob(chunksRef.current, { type: mimeType });
        setResultBlob(blob);
        setResultUrl(URL.createObjectURL(blob));
        setIsGenerating(false);
        setProgress(1);
      };
      recorder.onerror = () => {
        setIsGenerating(false);
      };

      recorder.start();

      const totalFrames = Math.ceil(totalDuration * FPS);
      let frame = 0;

      intervalRef.current = setInterval(() => {
        if (frame >= totalFrames) {
          if (intervalRef.current) clearInterval(intervalRef.current);
          recorder.stop();
          return;
        }
        const time = frame / FPS;
        drawFrame(ctx, time, images);
        setProgress(time / totalDuration);
        frame++;
      }, 1000 / FPS);
    } catch (error: any) {
      console.error(error);
      setError(error.message || 'Video generation failed');
      setIsGenerating(false);
    }
  };

  const updateClip = (index: number, patch: Partial<Clip>) => {
    setClips((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const moveClip = (index: number, dir: -1 | 1) => {
    setClips((prev) => {
      const next = [...prev];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const removeClip = (index: number) => {
    setClips((prev) => prev.filter((_, i) => i !== index));
  };

  const downloadVideo = () => {
    if (!resultUrl || !resultBlob) return;
    const a = document.createElement('a');
    a.href = resultUrl;
    const titleSafe = (title || 'chapter').replace(/[^a-z0-9]/gi, '_');
    a.download = `${titleSafe}_${chapterNumber || '0'}.webm`;
    a.click();
  };

  const applySceneDurations = () => {
    setClips((prev) =>
      prev.map((clip, i) => ({
        ...clip,
        duration: clamp(
          MIN_SCENE_DURATION,
          SCENE_BASE_DURATION + (scenes[i]?.wordCount || 0) / wordsPerSecond,
          MAX_SCENE_DURATION
        ),
      }))
    );
  };

  const sourceLangMap: Record<string, string> = {
    eng: 'en',
    jpn: 'ja',
    'eng+jpn': 'en',
  };

  const translateToHindi = async () => {
    if (!scenes.length) return;
    setIsTranslating(true);
    setError(null);
    const source = sourceLangMap[lang] || 'en';
    const next: Scene[] = [];
    try {
      for (let i = 0; i < scenes.length; i++) {
        setProgress((i + 1) / scenes.length);
        const scene = scenes[i];
        if (!scene.text.trim()) {
          next.push({ ...scene });
          continue;
        }
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(scene.text)}&langpair=${source}|hi`;
        const res = await fetch(url);
        const data = await res.json();
        const translated = data?.responseData?.translatedText;
        if (typeof translated !== 'string') {
          throw new Error(`Translation failed for scene ${i + 1}`);
        }
        next.push({ ...scene, hindi: translated.trim() });
        await new Promise((r) => setTimeout(r, 300));
      }
      setScenes(next);
    } catch (e: any) {
      setError(e.message || 'Failed to translate to Hindi');
    } finally {
      setIsTranslating(false);
      setProgress(0);
    }
  };

  const extractScenes = async () => {
    if (!clips.length) return;
    setIsExtracting(true);
    setError(null);
    try {
      const images = await loadImages();
      const tesseract = await import('tesseract.js');
      const worker = await tesseract.createWorker(lang);
      const newScenes: Scene[] = [];
      for (let i = 0; i < images.length; i++) {
        setProgress((i + 1) / images.length);
        const img = images[i];
        const ret = await worker.recognize(img, undefined, { blocks: true });
        const blocks = ret.data.blocks ?? [];
        const allWords: Tesseract.Word[] = [];
        blocks.forEach((block) => allWords.push(...(block.words ?? [])));
        allWords.sort((a, b) => a.bbox.y0 - b.bbox.y0 || a.bbox.x0 - b.bbox.x0);
        const text = allWords.map((w) => w.text).join(' ').trim();
        const wordCount = text ? text.split(/\s+/).length : 0;
        const duration = clamp(
          MIN_SCENE_DURATION,
          SCENE_BASE_DURATION + wordCount / wordsPerSecond,
          MAX_SCENE_DURATION
        );
        newScenes.push({ index: i, text, wordCount, duration });
      }
      await worker.terminate();
      setScenes(newScenes);
      setClips((prev) =>
        prev.map((clip, i) => ({
          ...clip,
          duration: newScenes[i]?.duration ?? clip.duration,
        }))
      );
    } catch (e: any) {
      setError(e.message || 'Failed to extract text from panels');
    } finally {
      setIsExtracting(false);
      setProgress(0);
    }
  };

  return (
    <Dialog open={open} onClose={!isGenerating ? onClose : undefined} maxWidth="xl" fullWidth>
      <DialogTitle>Generate Video from Panels</DialogTitle>
      <DialogContent>
        <Grid container spacing={2} sx={{ mt: 0.5 }}>
          <Grid item xs={12} md={8}>
            <Box display="flex" justifyContent="center" bgcolor="#000" borderRadius={1} overflow="hidden">
              <canvas ref={canvasRef} width={WIDTH} height={HEIGHT} style={{ maxWidth: '100%', height: 'auto' }} />
            </Box>
            <Box display="flex" gap={2} mt={2} alignItems="center" flexWrap="wrap">
              <Button
                variant="outlined"
                startIcon={isPreviewing ? <Stop /> : <PlayArrow />}
                onClick={isPreviewing ? stopPreview : preview}
                disabled={!clips.length || isGenerating}
              >
                {isPreviewing ? 'Stop' : 'Preview'}
              </Button>
              <Button
                variant="contained"
                startIcon={<Videocam />}
                onClick={generateVideo}
                disabled={!clips.length || isGenerating || isPreviewing}
              >
                {isGenerating ? 'Recording...' : 'Export Video'}
              </Button>
              {resultUrl && (
                <Button variant="outlined" startIcon={<Download />} onClick={downloadVideo}>
                  Download
                </Button>
              )}
            </Box>
            {isGenerating && (
              <Box mt={2}>
                <LinearProgress variant="determinate" value={progress * 100} />
                <Typography variant="caption">
                  {formatTime(progress * totalDuration)} / {formatTime(totalDuration)}
                </Typography>
              </Box>
            )}
            {error && (
              <Box mt={2}>
                <Typography variant="body2" color="error">{error}</Typography>
              </Box>
            )}
            {resultUrl && (
              <Box mt={2}>
                <Typography variant="subtitle2">Result</Typography>
                <video src={resultUrl} controls width="100%" style={{ borderRadius: 8, marginTop: 8 }} />
              </Box>
            )}
          </Grid>
          <Grid item xs={12} md={4}>
            <Typography variant="h6" gutterBottom>
              Clips ({clips.length}) · {formatTime(totalDuration)}
            </Typography>
            <Box display="flex" gap={1} flexWrap="wrap" mb={2}>
              <Button
                variant="outlined"
                size="small"
                startIcon={<TextSnippet />}
                onClick={extractScenes}
                disabled={!clips.length || isExtracting || isTranslating || isGenerating || isPreviewing}
              >
                {isExtracting ? 'Extracting...' : 'Extract Scenes'}
              </Button>
              <FormControl size="small" sx={{ minWidth: 100 }}>
                <InputLabel>Lang</InputLabel>
                <Select
                  value={lang}
                  label="Lang"
                  onChange={(e) => setLang(e.target.value as string)}
                  disabled={isExtracting || isTranslating}
                >
                  <MenuItem value="eng">English</MenuItem>
                  <MenuItem value="jpn">Japanese</MenuItem>
                  <MenuItem value="eng+jpn">Eng + Jpn</MenuItem>
                </Select>
              </FormControl>
              <TextField
                label="Words/sec"
                type="number"
                size="small"
                value={wordsPerSecond}
                onChange={(e) => setWordsPerSecond(Math.max(0.5, parseFloat(e.target.value) || 0))}
                inputProps={{ step: 0.1, min: 0.5 }}
                disabled={isExtracting || isTranslating}
                sx={{ width: 100 }}
              />
              <Button
                variant="outlined"
                size="small"
                startIcon={<Refresh />}
                onClick={applySceneDurations}
                disabled={!scenes.length || isExtracting || isTranslating}
              >
                Apply
              </Button>
              <Button
                variant="outlined"
                size="small"
                startIcon={<Translate />}
                onClick={translateToHindi}
                disabled={!scenes.length || isExtracting || isTranslating}
              >
                {isTranslating ? 'Translating...' : 'To Hindi'}
              </Button>
            </Box>
            {(isExtracting || isTranslating) && (
              <Box mb={2}>
                <LinearProgress variant="determinate" value={progress * 100} />
                <Typography variant="caption">
                  {isExtracting ? `OCR progress ${Math.round(progress * 100)}%` : `Translating ${Math.round(progress * 100)}%`}
                </Typography>
              </Box>
            )}
            {scenes.length > 0 && (
              <Box mb={2}>
                <TextField
                  label="Scenes JSON"
                  multiline
                  fullWidth
                  minRows={6}
                  maxRows={10}
                  value={JSON.stringify(scenes, null, 2)}
                  InputProps={{ readOnly: true }}
                />
              </Box>
            )}
            <List dense>
              {clips.map((clip, idx) => (
                <ListItem
                  key={`${idx}-${clip.url}`}
                  sx={{ pr: 12 }}
                  secondaryAction={
                    <Box display="flex" gap={0.5}>
                      <IconButton edge="end" size="small" disabled={idx === 0} onClick={() => moveClip(idx, -1)}>
                        <ArrowUpward fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" size="small" disabled={idx === clips.length - 1} onClick={() => moveClip(idx, 1)}>
                        <ArrowDownward fontSize="small" />
                      </IconButton>
                      <IconButton edge="end" size="small" onClick={() => removeClip(idx)}>
                        <Delete fontSize="small" />
                      </IconButton>
                    </Box>
                  }
                >
                  <ListItemAvatar>
                    <Avatar src={clip.url} variant="rounded" sx={{ width: 56, height: 56, mr: 1 }} />
                  </ListItemAvatar>
                  <Box flex={1}>
                    <Typography variant="body2" fontWeight={500}>
                      Page {idx + 1}
                    </Typography>
                    <Box display="flex" gap={1} mt={0.5} alignItems="center" flexWrap="wrap">
                      <TextField
                        type="number"
                        size="small"
                        label="Sec"
                        value={clip.duration}
                        onChange={(e) =>
                          updateClip(idx, { duration: Math.max(0.5, parseFloat(e.target.value) || 0) })
                        }
                        inputProps={{ step: 0.5, min: 0.5 }}
                        sx={{ width: 80 }}
                      />
                      <FormControl size="small" sx={{ width: 110 }}>
                        <InputLabel>Effect</InputLabel>
                        <Select
                          value={clip.effect}
                          label="Effect"
                          onChange={(e) => updateClip(idx, { effect: e.target.value as Effect })}
                        >
                          <MenuItem value="none">None</MenuItem>
                          <MenuItem value="fade">Fade In</MenuItem>
                          <MenuItem value="zoom">Zoom</MenuItem>
                          <MenuItem value="slide">Slide</MenuItem>
                          <MenuItem value="kenburns">Ken Burns</MenuItem>
                        </Select>
                      </FormControl>
                    </Box>
                    {scenes[idx]?.hindi && (
                      <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
                        {scenes[idx].hindi}
                      </Typography>
                    )}
                  </Box>
                </ListItem>
              ))}
            </List>
          </Grid>
        </Grid>
      </DialogContent>
    </Dialog>
  );
}
