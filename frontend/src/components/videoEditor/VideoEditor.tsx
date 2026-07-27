'use client';

import React, { useCallback, useEffect, useState } from 'react';
import {
  Box,
  Card,
  CardContent,
  Grid,
  Tab,
  Tabs,
  Typography,
} from '@mui/material';
import Timeline from './Timeline';
import SceneList from './SceneList';
import RemotionPlayer from './RemotionPlayer';
import SubtitleEditor from './SubtitleEditor';
import VoiceRecorder from './VoiceRecorder';
import ExportPanel from './ExportPanel';
import { Scene, AudioClip, Subtitle, TransitionEffect, FPS } from './types';

interface VideoEditorProps {
  pages: string[];
  title?: string;
  chapterNumber?: number | string;
}

export default function VideoEditor({
  pages,
  title,
  chapterNumber,
}: VideoEditorProps) {
  const [scenes, setScenes] = useState<Scene[]>([]);
  const [selectedSceneIndex, setSelectedSceneIndex] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [activeTab, setActiveTab] = useState(0);

  const generateId = () => `scene_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  useEffect(() => {
    if (pages.length) {
      const initialScenes: Scene[] = pages.map((url, i) => ({
        id: generateId(),
        imageUrl: url,
        duration: 3,
        effect: 'none' as TransitionEffect,
        subtitles: [],
        audioClips: [],
      }));
      setScenes(initialScenes);
      setSelectedSceneIndex(0);
      setCurrentTime(0);
      setActiveTab(0);
    }
  }, [pages]);

  const totalDuration = scenes.reduce((sum, s) => sum + s.duration, 0);

  const getSceneIndexAtTime = useCallback(
    (time: number) => {
      let t = 0;
      for (let i = 0; i < scenes.length; i++) {
        t += scenes[i].duration;
        if (time < t) return i;
      }
      return Math.max(0, scenes.length - 1);
    },
    [scenes]
  );

  const handleTimeUpdate = useCallback(
    (frame: number) => {
      const time = frame / FPS;
      setCurrentTime(time);
      const idx = getSceneIndexAtTime(time);
      if (idx !== selectedSceneIndex) {
        setSelectedSceneIndex(idx);
      }
    },
    [getSceneIndexAtTime, selectedSceneIndex]
  );

  const handleTimeChange = (time: number) => {
    setCurrentTime(time);
    setSelectedSceneIndex(getSceneIndexAtTime(time));
  };

  const updateScene = (index: number, patch: Partial<Scene>) => {
    setScenes((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const moveScene = (index: number, dir: -1 | 1) => {
    setScenes((prev) => {
      const next = [...prev];
      const newIndex = index + dir;
      if (newIndex < 0 || newIndex >= next.length) return prev;
      [next[index], next[newIndex]] = [next[newIndex], next[index]];
      return next;
    });
  };

  const removeScene = (index: number) => {
    setScenes((prev) => prev.filter((_, i) => i !== index));
    if (selectedSceneIndex >= scenes.length - 1) {
      setSelectedSceneIndex(Math.max(0, scenes.length - 2));
    }
  };

  const addScene = () => {
    const newScene: Scene = {
      id: generateId(),
      imageUrl: '',
      duration: 3,
      effect: 'none',
      subtitles: [],
      audioClips: [],
    };
    setScenes((prev) => [...prev, newScene]);
  };

  const handleUpdateSubtitles = (sceneIndex: number, subtitles: Subtitle[]) => {
    updateScene(sceneIndex, { subtitles });
  };

  const handleAddAudio = (sceneIndex: number, audio: AudioClip) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    updateScene(sceneIndex, { audioClips: [...scene.audioClips, audio] });
  };

  const handleRemoveAudio = (sceneIndex: number, audioId: string) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    updateScene(sceneIndex, { audioClips: scene.audioClips.filter((a) => a.id !== audioId) });
  };

  const handleUpdateAudio = (sceneIndex: number, audioId: string, patch: Partial<AudioClip>) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const updated = scene.audioClips.map((a) => (a.id === audioId ? { ...a, ...patch } : a));
    updateScene(sceneIndex, { audioClips: updated });
  };

  return (
    <Card
      sx={{
        backgroundColor: '#121212',
        color: '#fff',
        mt: 3,
        border: '1px solid #333',
      }}
    >
      <CardContent sx={{ p: 0, '&:last-child': { pb: 0 } }}>
        <Box
          sx={{
            backgroundColor: '#1a1a1a',
            color: '#fff',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            p: 1.5,
            borderBottom: '1px solid #333',
          }}
        >
          {chapterNumber !== undefined && (
            <Typography variant="h6" sx={{ fontSize: 16, fontWeight: 600 }}>
              Chapter {chapterNumber}
            </Typography>
          )}
        </Box>

        <Box sx={{ p: 0, overflow: 'hidden' }}>
          <Grid container>
            {/* Main area: Preview + Timeline */}
            <Grid item xs={12} lg={8} sx={{ p: 2 }}>
              <RemotionPlayer scenes={scenes} onTimeUpdate={handleTimeUpdate} />

              <Box sx={{ mt: 2 }}>
                <Timeline
                  scenes={scenes}
                  totalDuration={totalDuration}
                  currentTime={currentTime}
                  onTimeChange={handleTimeChange}
                  onSelectScene={setSelectedSceneIndex}
                  selectedSceneIndex={selectedSceneIndex}
                />
              </Box>
            </Grid>

            {/* Right panel: Tabs for Scenes / Subtitles / Audio / Export */}
            <Grid
              item
              xs={12}
              lg={4}
              sx={{
                borderLeft: '1px solid #333',
                display: 'flex',
                flexDirection: 'column',
                minHeight: 500,
                maxHeight: { xs: 'auto', lg: 700 },
                overflow: 'hidden',
              }}
            >
              <Tabs
                value={activeTab}
                onChange={(_e, val) => setActiveTab(val)}
                variant="fullWidth"
                sx={{
                  bgcolor: '#1a1a1a',
                  borderBottom: '1px solid #333',
                  minHeight: 36,
                  '& .MuiTab-root': { color: '#888', minHeight: 36, fontSize: 11, py: 0.5 },
                  '& .Mui-selected': { color: '#4a90d9' },
                  '& .MuiTabs-indicator': { bgcolor: '#4a90d9' },
                }}
              >
                <Tab label="Scenes" />
                <Tab label="Subtitles" />
                <Tab label="Audio" />
                <Tab label="Export" />
              </Tabs>

              <Box sx={{ flex: 1, overflow: 'auto', p: 2 }}>
                {activeTab === 0 && (
                  <SceneList
                    scenes={scenes}
                    selectedIndex={selectedSceneIndex}
                    onSelectScene={setSelectedSceneIndex}
                    onUpdateScene={updateScene}
                    onMoveScene={moveScene}
                    onRemoveScene={removeScene}
                    onAddScene={addScene}
                  />
                )}

                {activeTab === 1 && (
                  <SubtitleEditor
                    scenes={scenes}
                    onUpdateSubtitles={handleUpdateSubtitles}
                    currentTime={currentTime}
                    currentSceneIndex={selectedSceneIndex}
                  />
                )}

                {activeTab === 2 && (
                  <VoiceRecorder
                    scenes={scenes}
                    currentSceneIndex={selectedSceneIndex}
                    onAddAudio={handleAddAudio}
                    onRemoveAudio={handleRemoveAudio}
                    onUpdateAudio={handleUpdateAudio}
                  />
                )}

                {activeTab === 3 && (
                  <ExportPanel scenes={scenes} title={title} />
                )}
              </Box>
            </Grid>
          </Grid>
        </Box>
      </CardContent>
    </Card>
  );
}
