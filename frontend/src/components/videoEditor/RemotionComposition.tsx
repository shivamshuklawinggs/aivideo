import { AbsoluteFill, Audio, Img, Sequence, useCurrentFrame, useVideoConfig, interpolate } from 'remotion';
import React from 'react';
import { Scene, Subtitle } from './types';

export interface RemotionCompositionProps extends Record<string, unknown> {
  scenes: Scene[];
}

export const RemotionComposition: React.FC<RemotionCompositionProps> = ({ scenes }) => {
  const { fps } = useVideoConfig();
  const safeScenes = scenes || [];

  return (
    <AbsoluteFill style={{ backgroundColor: 'black' }}>
      {safeScenes.map((scene, index) => {
        const durationInFrames = Math.max(1, Math.round(scene.duration * fps));
        const startInFrames = safeScenes
          .slice(0, index)
          .reduce((sum, s) => sum + Math.max(1, Math.round(s.duration * fps)), 0);

        return (
          <Sequence key={scene.id} from={startInFrames} durationInFrames={durationInFrames}>
            <SceneRenderer scene={scene} />
            <SubtitleRenderer subtitles={scene.subtitles} sceneDuration={scene.duration} />
            <AudioRenderer scene={scene} />
          </Sequence>
        );
      })}
    </AbsoluteFill>
  );
};

const SceneRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const getEffectStyle = (): React.CSSProperties => {
    switch (scene.effect) {
      case 'fade':
        return {
          opacity: interpolate(frame, [0, fps * 0.5], [0, 1], { extrapolateRight: 'clamp' }),
        };
      case 'zoom': {
        const scale = interpolate(frame, [0, scene.duration * fps], [1, 1.2], { extrapolateRight: 'clamp' });
        return { transform: `scale(${scale})` };
      }
      case 'slide': {
        const translateX = interpolate(frame, [0, fps * 0.5], [-100, 0], { extrapolateRight: 'clamp' });
        return { transform: `translateX(${translateX}%)` };
      }
      case 'kenburns': {
        const kbScale = interpolate(frame, [0, scene.duration * fps], [1, 1.15], { extrapolateRight: 'clamp' });
        const kbX = interpolate(frame, [0, scene.duration * fps], [0, -5], { extrapolateRight: 'clamp' });
        const kbY = interpolate(frame, [0, scene.duration * fps], [0, -3], { extrapolateRight: 'clamp' });
        return { transform: `scale(${kbScale}) translate(${kbX}%, ${kbY}%)` };
      }
      case 'crossfade': {
        const opacity = interpolate(frame, [0, fps * 0.8], [0, 1], { extrapolateRight: 'clamp' });
        return { opacity };
      }
      case 'wipe': {
        const clipPercent = interpolate(frame, [0, fps * 0.6], [0, 100], { extrapolateRight: 'clamp' });
        return { clipPath: `inset(0 ${100 - clipPercent}% 0 0)` };
      }
      default:
        return {};
    }
  };

  return (
    <AbsoluteFill>
      <Img
        src={scene.imageUrl}
        style={{
          width: '100%',
          height: '100%',
          objectFit: 'cover',
          ...getEffectStyle(),
        }}
      />
    </AbsoluteFill>
  );
};

const SubtitleRenderer: React.FC<{ subtitles: Subtitle[]; sceneDuration: number }> = ({
  subtitles,
  sceneDuration,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const currentTimeInScene = frame / fps;

  const activeSubtitles = subtitles.filter(
    (sub) => currentTimeInScene >= sub.startTime && currentTimeInScene <= sub.endTime
  );

  if (activeSubtitles.length === 0) return null;

  return (
    <AbsoluteFill>
      {activeSubtitles.map((sub) => {
        const fadeIn = interpolate(
          currentTimeInScene,
          [sub.startTime, sub.startTime + 0.2],
          [0, 1],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const fadeOut = interpolate(
          currentTimeInScene,
          [sub.endTime - 0.2, sub.endTime],
          [1, 0],
          { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }
        );
        const opacity = Math.min(fadeIn, fadeOut);

        return (
          <div
            key={sub.id}
            style={{
              position: 'absolute',
              left: 0,
              right: 0,
              ...getPositionStyle(sub.style.position),
              display: 'flex',
              justifyContent: 'center',
              padding: '20px 40px',
              opacity,
            }}
          >
            <span
              style={{
                fontSize: sub.style.fontSize,
                fontFamily: sub.style.fontFamily,
                color: sub.style.color,
                backgroundColor: sub.style.backgroundColor,
                fontWeight: sub.style.bold ? 'bold' : 'normal',
                fontStyle: sub.style.italic ? 'italic' : 'normal',
                padding: '8px 16px',
                borderRadius: 6,
                textAlign: 'center',
                maxWidth: '80%',
                lineHeight: 1.4,
                ...(sub.style.outline
                  ? { textShadow: '2px 2px 4px rgba(0,0,0,0.8), -1px -1px 2px rgba(0,0,0,0.6)' }
                  : {}),
              }}
            >
              {sub.text}
            </span>
          </div>
        );
      })}
    </AbsoluteFill>
  );
};

const AudioRenderer: React.FC<{ scene: Scene }> = ({ scene }) => {
  return (
    <>
      {scene.audioClips.map((audio) => (
        <Sequence
          key={audio.id}
          from={Math.round(audio.startTime * 30)}
          durationInFrames={Math.max(1, Math.round(audio.duration * 30))}
        >
          <Audio src={audio.url} volume={audio.volume} />
        </Sequence>
      ))}
    </>
  );
};

function getPositionStyle(position: 'top' | 'center' | 'bottom'): React.CSSProperties {
  switch (position) {
    case 'top':
      return { top: 40 };
    case 'center':
      return { top: '50%', transform: 'translateY(-50%)' };
    case 'bottom':
    default:
      return { bottom: 60 };
  }
}
