export type TransitionEffect = 'none' | 'fade' | 'zoom' | 'slide' | 'kenburns' | 'crossfade' | 'wipe';

export interface Subtitle {
  id: string;
  text: string;
  startTime: number;
  endTime: number;
  style: SubtitleStyle;
}

export interface SubtitleStyle {
  fontSize: number;
  fontFamily: string;
  color: string;
  backgroundColor: string;
  position: 'top' | 'center' | 'bottom';
  bold: boolean;
  italic: boolean;
  outline: boolean;
}

export interface AudioClip {
  id: string;
  url: string;
  blob?: Blob;
  name: string;
  duration: number;
  startTime: number;
  volume: number;
  type: 'voiceover' | 'bgm' | 'sfx';
}

export interface Scene {
  id: string;
  imageUrl: string;
  duration: number;
  effect: TransitionEffect;
  subtitles: Subtitle[];
  audioClips: AudioClip[];
}

export interface VideoProject {
  scenes: Scene[];
  fps: number;
  width: number;
  height: number;
  totalDuration: number;
}

export const DEFAULT_SUBTITLE_STYLE: SubtitleStyle = {
  fontSize: 32,
  fontFamily: 'Arial',
  color: '#FFFFFF',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  position: 'bottom',
  bold: false,
  italic: false,
  outline: true,
};

export const FPS = 30;
export const WIDTH = 1920;
export const HEIGHT = 1080;
