'use client';

import { useEffect, useState } from 'react';
import { useSocket } from '@/context/SocketContext';

export interface PipelineSocketEvent {
  event: string;
  data: any;
  time: Date;
}

export interface PipelineSocketState {
  status: 'idle' | 'processing' | 'completed' | 'error';
  step: string;
  progress: number;
  steps: Record<string, { status: string; progress: number }>;
  events: PipelineSocketEvent[];
  connected: boolean;
}

export function usePipelineSocket(chapterId?: string, jobId?: string | null): PipelineSocketState {
  const { socket, connected, subscribe, unsubscribe } = useSocket();
  const [state, setState] = useState<PipelineSocketState>({
    status: 'idle',
    step: '',
    progress: 0,
    steps: {},
    events: [],
    connected: false,
  });

  useEffect(() => {
    setState(prev => ({ ...prev, connected }));
  }, [connected]);

  useEffect(() => {
    if (!socket || !chapterId) return;

    subscribe({ chapterId, jobId: jobId || undefined });

    const handleEvent = (event: string, data: any) => {
      setState((prev) => {
        const events = [...prev.events, { event, data, time: new Date() }].slice(-50);
        let { status, step, progress } = prev;
        const steps = { ...prev.steps };

        if (event === 'pipeline:chapter:started' || event === 'pipeline:chapter:step:started') {
          status = 'processing';
          step = data.step || step;
          progress = data.progress || progress;
          if (data.step) {
            steps[data.step] = { status: 'processing', progress: data.progress || 0 };
          }
        } else if (event === 'pipeline:chapter:progress') {
          status = 'processing';
          step = data.step || step;
          progress = data.percentage !== undefined ? data.percentage : data.progress !== undefined ? data.progress : progress;
          if (data.step) {
            steps[data.step] = { status: 'processing', progress };
          }
        } else if (event === 'pipeline:panel:progress') {
          status = 'processing';
          step = 'vision_analysis';
          progress = data.percentage !== undefined ? data.percentage : progress;
          steps['vision_analysis'] = { status: 'processing', progress };
        } else if (event === 'pipeline:chapter:step:completed') {
          step = data.step || step;
          progress = data.progress !== undefined ? data.progress : progress;
          if (data.step) {
            steps[data.step] = { status: 'completed', progress: data.progress || 100 };
          }
          if (data.step === 'video_render') status = 'completed';
        } else if (event === 'pipeline:chapter:completed') {
          status = 'completed';
          progress = 100;
        } else if (event === 'pipeline:chapter:failed' || event === 'pipeline:panel:error' || event === 'ai:request:error') {
          status = 'error';
          if (data.step) {
            steps[data.step] = { status: 'error', progress: data.progress || 0 };
          }
        }

        return { ...prev, status, step, progress, steps, events };
      });
    };

    const listeners = [
      'pipeline:chapter:started',
      'pipeline:chapter:step:started',
      'pipeline:chapter:step:completed',
      'pipeline:chapter:progress',
      'pipeline:chapter:completed',
      'pipeline:chapter:failed',
      'pipeline:panel:progress',
      'pipeline:panel:analyzed',
      'pipeline:panel:retry',
      'pipeline:panel:error',
      'ai:request:started',
      'ai:request:completed',
      'ai:request:retry',
      'ai:request:error',
    ];

    listeners.forEach((ev) => {
      socket.on(ev, (data: any) => handleEvent(ev, data));
    });

    return () => {
      unsubscribe({ chapterId, jobId: jobId || undefined });
      listeners.forEach((ev) => {
        socket.off(ev);
      });
    };
  }, [socket, chapterId, jobId, subscribe, unsubscribe]);

  return state;
}
