import { apiClient } from './apiClient.js';

export interface Webtoon {
  _id: string;
  userId: string;
  sukuyamiId: string;
  title: string;
  description: string;
  author: string;
  genres: string[];
  coverImage: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  totalChapters: number;
  sourceType: 'sukuyami' | 'tachiyomi' | 'graphql';
  sukuyamiData: {
    totalSourceChapters: number;
    lastChapterNumber: number;
    popularity: number;
    rating: number;
  };
  lastUpdated: string;
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  _id: string;
  webtoonId: string;
  userId: string;
  sukuyamiChapterId: string;
  chapterNumber: number;
  title: string;
  totalPages: number;
  panels: Panel[];
  generatedScript?: GeneratedScript;
  videoUrl?: string;
  videoPath?: string;
  videoDuration?: number;
  videoFormat?: string;
  videoSize?: number;
  processingStatus: 'pending' | 'syncing' | 'processing' | 'completed' | 'failed';
  processingProgress: number;
  isProcessed: boolean;
  metadata: {
    totalPanels: number;
    averagePanelDuration: number;
    estimatedReadTime: number;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Panel {
  pageNumber: number;
  imageUrl: string;
  sequence: number;
  duration: number;
  position?: {
    x: number;
    y: number;
    width: number;
    height: number;
  };
}

export interface GeneratedScript {
  title: string;
  content: string;
  scenes: Array<{
    sceneNumber: number;
    startTime: number;
    endTime: number;
    narration: string;
    panels: number[];
    duration: number;
  }>;
  totalDuration: number;
  modelUsed: string;
  generatedAt: string;
}

export interface DashboardStats {
  totalWebtoons: number;
  totalChapters: number;
  totalVideos: number;
  totalScripts: number;
  recentActivity: Array<{
    type: 'webtoon_added' | 'chapter_synced' | 'script_generated' | 'video_generated';
    webtoonTitle: string;
    timestamp: string;
  }>;
  processingStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
}

export interface CronJobStatus {
  syncWebtoons: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    successCount: number;
    failureCount: number;
  };
  checkNewChapters: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    successCount: number;
    failureCount: number;
  };
  generateScripts: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    successCount: number;
    failureCount: number;
  };
  generateVideos: {
    isRunning: boolean;
    lastRun: string | null;
    nextRun: string | null;
    successCount: number;
    failureCount: number;
  };
}

export interface SukuyamiSearchParams {
  query: string;
  limit?: number;
}

export interface WebtoonSearchParams {
  page?: number;
  limit?: number;
  status?: 'ongoing' | 'completed' | 'hiatus' | 'all';
  genre?: string;
  search?: string;
  sortBy?: 'createdAt' | 'updatedAt' | 'title' | 'totalChapters';
  sortOrder?: 'asc' | 'desc';
}

export interface ChapterSearchParams {
  page?: number;
  limit?: number;
  status?: 'pending' | 'syncing' | 'processing' | 'completed' | 'failed' | 'all';
  search?: string;
}

export interface SyncOptions {
  webtoonIds?: string[];
  forceUpdate?: boolean;
  syncChapters?: boolean;
}

export interface ScriptGenerationOptions {
  style?: 'narrative' | 'dramatic' | 'educational' | 'casual';
  durationPerPanel?: number;
  model?: string;
}

export interface VideoGenerationOptions {
  format?: 'mp4' | 'webm' | 'avi';
  quality?: 'low' | 'medium' | 'high';
  fps?: number;
}

export interface PaginatedResponse<T> {
  data: T[];
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ApiResponse<T> {
  success: boolean;
  data: T;
  message?: string;
}

class SukuyamiApi {
  // Webtoon Management
  async getWebtoons(params: WebtoonSearchParams = {}): Promise<PaginatedResponse<Webtoon>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Webtoon>>>('/sukuyami/webtoons', { params });
    return response.data.data;
  }

  async getWebtoon(webtoonId: string): Promise<Webtoon> {
    const response = await apiClient.get<ApiResponse<Webtoon>>(`/sukuyami/webtoons/${webtoonId}`);
    return response.data.data;
  }

  async searchWebtoons(params: SukuyamiSearchParams): Promise<any[]> {
    const response = await apiClient.get<ApiResponse<any[]>>('/sukuyami/search', { params });
    return response.data.data;
  }

  async addWebtoon(sukuyamiId: string): Promise<Webtoon> {
    const response = await apiClient.post<ApiResponse<Webtoon>>('/sukuyami/webtoons', { sukuyamiId });
    return response.data.data;
  }

  async syncWebtoons(options: SyncOptions = {}): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>('/sukuyami/sync', options);
    return response.data.data;
  }

  // Chapter Management
  async getChapters(webtoonId: string, params: ChapterSearchParams = {}): Promise<PaginatedResponse<Chapter>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Chapter>>>(`/sukuyami/webtoons/${webtoonId}/chapters`, { params });
    return response.data.data;
  }

  async getChapter(chapterId: string): Promise<Chapter> {
    const response = await apiClient.get<ApiResponse<Chapter>>(`/sukuyami/chapters/${chapterId}`);
    return response.data.data;
  }

  // Script Generation
  async generateScript(chapterId: string, options: ScriptGenerationOptions = {}): Promise<Chapter> {
    const response = await apiClient.post<ApiResponse<Chapter>>(`/sukuyami/chapters/${chapterId}/script`, options);
    return response.data.data;
  }

  // Video Generation
  async generateVideo(chapterId: string, options: VideoGenerationOptions = {}): Promise<Chapter> {
    const response = await apiClient.post<ApiResponse<Chapter>>(`/sukuyami/chapters/${chapterId}/video`, options);
    return response.data.data;
  }

  // Dashboard and Statistics
  async getDashboardStats(): Promise<DashboardStats> {
    const response = await apiClient.get<ApiResponse<DashboardStats>>('/sukuyami/dashboard');
    return response.data.data;
  }

  // Cron Job Management
  async getCronStatus(): Promise<CronJobStatus> {
    const response = await apiClient.get<ApiResponse<CronJobStatus>>('/sukuyami/cron/status');
    return response.data.data;
  }

  async runCronJob(jobName: string): Promise<any> {
    const response = await apiClient.post<ApiResponse<any>>(`/sukuyami/cron/${jobName}/run`);
    return response.data.data;
  }

  // Health Check
  async healthCheck(): Promise<any> {
    const response = await apiClient.get<ApiResponse<any>>('/sukuyami/health');
    return response.data.data;
  }
}

export const sukuyamiApi = new SukuyamiApi();
export default sukuyamiApi;
