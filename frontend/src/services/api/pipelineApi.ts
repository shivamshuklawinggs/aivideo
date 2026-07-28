import { apiClient } from './apiClient';

export interface JobStatus {
  jobId: string;
  chapterId: string;
  type: string;
  status: 'queued' | 'processing' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep?: string;
  steps: Array<{
    step: string;
    status: string;
    progress: number;
    startedAt?: string;
    completedAt?: string;
    error?: string;
  }>;
  result?: {
    storyFile?: string;
    narrationFile?: string;
    audioFile?: string;
    subtitleFile?: string;
    timelineFile?: string;
    videoFile?: string;
    thumbnailFile?: string;
  };
  error?: string;
  startedAt?: string;
  completedAt?: string;
  createdAt: string;
}

export interface ChapterResult {
  chapterId: string;
  status: string;
  panelCount: number;
  totalDuration: number;
  story: {
    title: string;
    narrative: string;
    summary: string;
    narrationScript: string;
  };
  timeline: Array<{
    panelIndex: number;
    startTime: number;
    endTime: number;
    duration: number;
    narrationSegment: string;
  }>;
  files: {
    audio?: string;
    subtitle?: string;
    video?: string;
    thumbnail?: string;
  };
  recentJobs: Array<{
    id: string;
    type: string;
    status: string;
    progress: number;
    createdAt: string;
  }>;
}

export interface VideoOptions {
  width?: number;
  height?: number;
  fps?: number;
  format?: 'mp4' | 'webm';
  quality?: 'low' | 'medium' | 'high';
  subtitles?: boolean;
  effects?: {
    zoom?: boolean;
    pan?: boolean;
    fade?: boolean;
  };
}

export interface PipelineHealth {
  ai: { healthy: boolean; models: string[] };
  tts: boolean;
  ffmpeg: boolean;
  overall: boolean;
}

export const pipelineApi = {
  // Analyze chapter panels (OCR + Vision)
  analyzeChapter: async (chapterId: string, mangaId: string) => {
    const response = await apiClient.post('/pipeline/chapter/analyze', { chapterId, mangaId });
    return response.data?.data as { jobId: string; status: string };
  },

  // Generate story from analyzed panels
  generateStory: async (chapterId: string, mangaId?: string) => {
    const response = await apiClient.post('/pipeline/chapter/story', { chapterId, mangaId });
    return response.data?.data as { jobId: string; status: string };
  },

  // Generate narration (voice + timeline + subtitles)
  generateNarration: async (chapterId: string, mangaId?: string) => {
    const response = await apiClient.post('/pipeline/chapter/narration', { chapterId, mangaId });
    return response.data?.data as { jobId: string; status: string };
  },

  // Generate video
  generateVideo: async (chapterId: string, mangaId?: string, options?: VideoOptions) => {
    const response = await apiClient.post('/pipeline/chapter/video', { chapterId, mangaId, options });
    return response.data?.data as { jobId: string; status: string };
  },

  // Run full pipeline (analyze → story → narration → video)
  runFullPipeline: async (chapterId: string, mangaId?: string, options?: VideoOptions, force?: boolean) => {
    const response = await apiClient.post('/pipeline/chapter/full', { chapterId, mangaId, options, force });
    return response.data?.data as { jobId: string; status: string };
  },

  // Get job status
  getJobStatus: async (jobId: string): Promise<JobStatus> => {
    const response = await apiClient.get(`/pipeline/job/${jobId}`);
    return response.data?.data as JobStatus;
  },

  // Get chapter results
  getChapterResult: async (chapterId: string): Promise<ChapterResult | null> => {
    try {
      const response = await apiClient.get(`/pipeline/result/${chapterId}`);
      return response.data?.data as ChapterResult;
    } catch {
      return null;
    }
  },

  // Health check
  healthCheck: async (): Promise<PipelineHealth> => {
    const response = await apiClient.get('/pipeline/health');
    return response.data?.data as PipelineHealth;
  },

  // Poll job until completion
  pollJob: async (jobId: string, onProgress?: (job: JobStatus) => void, intervalMs = 2000, maxAttempts = 300): Promise<JobStatus> => {
    let attempts = 0;
    while (attempts < maxAttempts) {
      const job = await pipelineApi.getJobStatus(jobId);
      if (onProgress) onProgress(job);

      if (job.status === 'completed' || job.status === 'failed' || job.status === 'cancelled') {
        return job;
      }

      await new Promise(resolve => setTimeout(resolve, intervalMs));
      attempts++;
    }
    throw new Error('Job polling timed out');
  },
};
