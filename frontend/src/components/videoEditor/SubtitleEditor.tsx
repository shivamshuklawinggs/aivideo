'use client';

import React, { useState } from 'react';
import {
  Box,
  Button,
  IconButton,
  TextField,
  Typography,
  Select,
  MenuItem,
  FormControl,
  InputLabel,
  Slider,
  Chip,
  Collapse,
} from '@mui/material';
import {
  Add,
  Delete,
  Edit,
  FormatBold,
  FormatItalic,
  FormatSize,
  ExpandMore,
  ExpandLess,
  ContentCopy,
} from '@mui/icons-material';
import { Subtitle, SubtitleStyle, DEFAULT_SUBTITLE_STYLE, Scene } from './types';

interface SubtitleEditorProps {
  scenes: Scene[];
  onUpdateSubtitles: (sceneIndex: number, subtitles: Subtitle[]) => void;
  currentTime: number;
  currentSceneIndex: number;
}

export default function SubtitleEditor({
  scenes,
  onUpdateSubtitles,
  currentTime,
  currentSceneIndex,
}: SubtitleEditorProps) {
  const [expandedScene, setExpandedScene] = useState<number | null>(currentSceneIndex);
  const [editingSubtitle, setEditingSubtitle] = useState<string | null>(null);
  const [bulkText, setBulkText] = useState('');
  const [showBulkImport, setShowBulkImport] = useState(false);

  const generateId = () => `sub_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;

  const addSubtitle = (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;

    const existingSubs = scene.subtitles;
    const lastEnd = existingSubs.length > 0 ? existingSubs[existingSubs.length - 1].endTime : 0;
    const startTime = Math.min(lastEnd, scene.duration - 0.5);
    const endTime = Math.min(startTime + 2, scene.duration);

    const newSub: Subtitle = {
      id: generateId(),
      text: 'New subtitle',
      startTime,
      endTime,
      style: { ...DEFAULT_SUBTITLE_STYLE },
    };

    onUpdateSubtitles(sceneIndex, [...existingSubs, newSub]);
    setEditingSubtitle(newSub.id);
  };

  const updateSubtitle = (sceneIndex: number, subId: string, patch: Partial<Subtitle>) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const updated = scene.subtitles.map((sub) =>
      sub.id === subId ? { ...sub, ...patch } : sub
    );
    onUpdateSubtitles(sceneIndex, updated);
  };

  const updateSubtitleStyle = (sceneIndex: number, subId: string, stylePatch: Partial<SubtitleStyle>) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const updated = scene.subtitles.map((sub) =>
      sub.id === subId ? { ...sub, style: { ...sub.style, ...stylePatch } } : sub
    );
    onUpdateSubtitles(sceneIndex, updated);
  };

  const deleteSubtitle = (sceneIndex: number, subId: string) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const updated = scene.subtitles.filter((sub) => sub.id !== subId);
    onUpdateSubtitles(sceneIndex, updated);
  };

  const duplicateSubtitle = (sceneIndex: number, subId: string) => {
    const scene = scenes[sceneIndex];
    if (!scene) return;
    const original = scene.subtitles.find((sub) => sub.id === subId);
    if (!original) return;

    const newSub: Subtitle = {
      ...original,
      id: generateId(),
      startTime: original.endTime,
      endTime: Math.min(original.endTime + (original.endTime - original.startTime), scene.duration),
    };
    onUpdateSubtitles(sceneIndex, [...scene.subtitles, newSub]);
  };

  const handleBulkImport = (sceneIndex: number) => {
    const scene = scenes[sceneIndex];
    if (!scene || !bulkText.trim()) return;

    const lines = bulkText.trim().split('\n').filter((l) => l.trim());
    const durationPerLine = scene.duration / lines.length;

    const newSubs: Subtitle[] = lines.map((text, i) => ({
      id: generateId(),
      text: text.trim(),
      startTime: i * durationPerLine,
      endTime: (i + 1) * durationPerLine,
      style: { ...DEFAULT_SUBTITLE_STYLE },
    }));

    onUpdateSubtitles(sceneIndex, newSubs);
    setBulkText('');
    setShowBulkImport(false);
  };

  const getSceneTimeOffset = (sceneIndex: number) => {
    return scenes.slice(0, sceneIndex).reduce((sum, s) => sum + s.duration, 0);
  };

  return (
    <Box sx={{ bgcolor: '#1e1e1e', borderRadius: 2, p: 2, maxHeight: 500, overflow: 'auto' }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="subtitle2" sx={{ color: '#fff' }}>
          Subtitles
        </Typography>
        <Button
          size="small"
          onClick={() => setShowBulkImport(!showBulkImport)}
          sx={{ color: '#4a90d9', fontSize: 11 }}
        >
          {showBulkImport ? 'Close Bulk' : 'Bulk Import'}
        </Button>
      </Box>

      {/* Bulk import section */}
      <Collapse in={showBulkImport}>
        <Box sx={{ mb: 2, p: 1, bgcolor: '#2d2d2d', borderRadius: 1 }}>
          <TextField
            multiline
            fullWidth
            rows={4}
            placeholder="Paste subtitles (one per line)..."
            value={bulkText}
            onChange={(e) => setBulkText(e.target.value)}
            variant="outlined"
            size="small"
            sx={{
              mb: 1,
              '& .MuiOutlinedInput-root': { color: '#fff', '& fieldset': { borderColor: '#444' } },
            }}
          />
          <Button
            size="small"
            variant="contained"
            onClick={() => handleBulkImport(currentSceneIndex)}
            disabled={!bulkText.trim()}
            sx={{ bgcolor: '#4a90d9', '&:hover': { bgcolor: '#3a80c9' } }}
          >
            Import to Scene {currentSceneIndex + 1}
          </Button>
        </Box>
      </Collapse>

      {/* Per-scene subtitle list */}
      {scenes.map((scene, sceneIdx) => (
        <Box key={scene.id} sx={{ mb: 1 }}>
          <Box
            onClick={() => setExpandedScene(expandedScene === sceneIdx ? null : sceneIdx)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              cursor: 'pointer',
              p: 1,
              bgcolor: sceneIdx === currentSceneIndex ? '#2a3a4d' : '#252525',
              borderRadius: 1,
              '&:hover': { bgcolor: '#333' },
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <Typography variant="caption" sx={{ color: '#aaa', fontSize: 11 }}>
                Scene {sceneIdx + 1}
              </Typography>
              <Chip
                label={`${scene.subtitles.length} subs`}
                size="small"
                sx={{ height: 18, fontSize: 10, bgcolor: '#3d3d3d', color: '#aaa' }}
              />
            </Box>
            {expandedScene === sceneIdx ? (
              <ExpandLess sx={{ color: '#666', fontSize: 18 }} />
            ) : (
              <ExpandMore sx={{ color: '#666', fontSize: 18 }} />
            )}
          </Box>

          <Collapse in={expandedScene === sceneIdx}>
            <Box sx={{ pl: 1, pt: 1 }}>
              {scene.subtitles.map((sub) => (
                <Box
                  key={sub.id}
                  sx={{
                    mb: 1,
                    p: 1,
                    bgcolor: editingSubtitle === sub.id ? '#2d3d4d' : '#2d2d2d',
                    borderRadius: 1,
                    border: editingSubtitle === sub.id ? '1px solid #4a90d9' : '1px solid transparent',
                  }}
                >
                  {/* Subtitle text */}
                  <TextField
                    fullWidth
                    size="small"
                    value={sub.text}
                    onChange={(e) => updateSubtitle(sceneIdx, sub.id, { text: e.target.value })}
                    onFocus={() => setEditingSubtitle(sub.id)}
                    variant="outlined"
                    sx={{
                      mb: 1,
                      '& .MuiOutlinedInput-root': {
                        color: '#fff',
                        fontSize: 13,
                        '& fieldset': { borderColor: '#444' },
                      },
                    }}
                  />

                  {/* Timing controls */}
                  <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', mb: 1 }}>
                    <TextField
                      type="number"
                      size="small"
                      label="Start"
                      value={sub.startTime.toFixed(1)}
                      onChange={(e) =>
                        updateSubtitle(sceneIdx, sub.id, {
                          startTime: Math.max(0, parseFloat(e.target.value) || 0),
                        })
                      }
                      inputProps={{ step: 0.1, min: 0, max: scene.duration }}
                      sx={{
                        width: 75,
                        '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 11, '& fieldset': { borderColor: '#444' } },
                        '& .MuiInputLabel-root': { color: '#888', fontSize: 11 },
                      }}
                    />
                    <TextField
                      type="number"
                      size="small"
                      label="End"
                      value={sub.endTime.toFixed(1)}
                      onChange={(e) =>
                        updateSubtitle(sceneIdx, sub.id, {
                          endTime: Math.min(scene.duration, parseFloat(e.target.value) || 0),
                        })
                      }
                      inputProps={{ step: 0.1, min: 0, max: scene.duration }}
                      sx={{
                        width: 75,
                        '& .MuiOutlinedInput-root': { color: '#fff', fontSize: 11, '& fieldset': { borderColor: '#444' } },
                        '& .MuiInputLabel-root': { color: '#888', fontSize: 11 },
                      }}
                    />

                    {/* Style toggles */}
                    <IconButton
                      size="small"
                      onClick={() => updateSubtitleStyle(sceneIdx, sub.id, { bold: !sub.style.bold })}
                      sx={{ color: sub.style.bold ? '#4a90d9' : '#666' }}
                    >
                      <FormatBold fontSize="small" />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => updateSubtitleStyle(sceneIdx, sub.id, { italic: !sub.style.italic })}
                      sx={{ color: sub.style.italic ? '#4a90d9' : '#666' }}
                    >
                      <FormatItalic fontSize="small" />
                    </IconButton>

                    {/* Position */}
                    <FormControl size="small" sx={{ minWidth: 70 }}>
                      <Select
                        value={sub.style.position}
                        onChange={(e) =>
                          updateSubtitleStyle(sceneIdx, sub.id, {
                            position: e.target.value as 'top' | 'center' | 'bottom',
                          })
                        }
                        sx={{ color: '#fff', fontSize: 10, '& .MuiSelect-icon': { color: '#888' }, '& fieldset': { borderColor: '#444' } }}
                      >
                        <MenuItem value="top" sx={{ fontSize: 11 }}>Top</MenuItem>
                        <MenuItem value="center" sx={{ fontSize: 11 }}>Center</MenuItem>
                        <MenuItem value="bottom" sx={{ fontSize: 11 }}>Bottom</MenuItem>
                      </Select>
                    </FormControl>

                    <Box sx={{ flex: 1 }} />

                    <IconButton
                      size="small"
                      onClick={() => duplicateSubtitle(sceneIdx, sub.id)}
                      sx={{ color: '#888' }}
                    >
                      <ContentCopy sx={{ fontSize: 14 }} />
                    </IconButton>
                    <IconButton
                      size="small"
                      onClick={() => deleteSubtitle(sceneIdx, sub.id)}
                      sx={{ color: '#ff4444' }}
                    >
                      <Delete sx={{ fontSize: 14 }} />
                    </IconButton>
                  </Box>

                  {/* Font size slider (when editing) */}
                  {editingSubtitle === sub.id && (
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, mt: 1 }}>
                      <FormatSize sx={{ color: '#888', fontSize: 14 }} />
                      <Slider
                        value={sub.style.fontSize}
                        min={16}
                        max={72}
                        onChange={(_e, val) =>
                          updateSubtitleStyle(sceneIdx, sub.id, { fontSize: val as number })
                        }
                        size="small"
                        sx={{ color: '#4a90d9', flex: 1 }}
                      />
                      <Typography variant="caption" sx={{ color: '#888', fontSize: 10, minWidth: 24 }}>
                        {sub.style.fontSize}px
                      </Typography>
                      <input
                        type="color"
                        value={sub.style.color}
                        onChange={(e) => updateSubtitleStyle(sceneIdx, sub.id, { color: e.target.value })}
                        style={{ width: 20, height: 20, border: 'none', cursor: 'pointer' }}
                      />
                    </Box>
                  )}
                </Box>
              ))}

              <Button
                size="small"
                startIcon={<Add />}
                onClick={() => addSubtitle(sceneIdx)}
                sx={{ color: '#4a90d9', fontSize: 11, mt: 0.5 }}
              >
                Add Subtitle
              </Button>
            </Box>
          </Collapse>
        </Box>
      ))}
    </Box>
  );
}
