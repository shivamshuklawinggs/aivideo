import { apiClient } from './apiClient';

export interface Webtoon {
  _id: string;
  title: string;
  description: string;
  author: string;
  coverImage: string;
  status: 'ongoing' | 'completed' | 'hiatus';
  totalChapters: number;
  genres: string[];
  sukuyamiData: {
    rating: number;
    popularity: number;
    sukuyamiId: string;
  };
  createdAt: string;
  updatedAt: string;
}

export interface Chapter {
  _id: string;
  webtoonId: string;
  chapterNumber: number;
  title: string;
  status: 'pending' | 'syncing' | 'processing' | 'completed' | 'failed';
  panelCount: number;
  scriptGenerated: boolean;
  videoGenerated: boolean;
  videoUrl?: string;
  createdAt: string;
  updatedAt: string;
}

export interface DashboardStats {
  totalWebtoons: number;
  totalChapters: number;
  totalScripts: number;
  totalVideos: number;
  processingStats: {
    pending: number;
    processing: number;
    completed: number;
    failed: number;
  };
  recentActivity: Array<{
    type: string;
    webtoonTitle: string;
    timestamp: string;
  }>;
}

export interface WebtoonSearchParams {
  page?: number;
  limit?: number;
  status?: string;
  genre?: string;
  search?: string;
  sortBy?: string;
  sortOrder?: string;
}

export const sukuyamiApi = {
  // Webtoons — backend: { success, data: { webtoons: [], pagination: {} } }
  getWebtoons: async (params?: WebtoonSearchParams) => {
    const response = await apiClient.get('/sukuyami/webtoons', { params });
    const d = response.data?.data;
    return { data: d?.webtoons ?? [], pagination: d?.pagination };
  },

  getWebtoon: async (webtoonId: string) => {
    const response = await apiClient.get(`/sukuyami/webtoons/${webtoonId}`);
    return response.data?.data;
  },

  addWebtoon: async (sukuyamiId: string) => {
    const response = await apiClient.post('/sukuyami/webtoons', { sukuyamiId });
    return response.data?.data;
  },

  syncWebtoons: async (options: { webtoonIds?: string[]; forceUpdate?: boolean; syncChapters?: boolean }) => {
    const response = await apiClient.post('/sukuyami/sync', options);
    return response.data;
  },

  searchWebtoons: async (params: { query: string; limit?: number }) => {
    const response = await apiClient.get('/sukuyami/search', { params });
    const d = response.data?.data;
    return d?.webtoons ?? d?.results ?? d ?? [];
  },

  // Chapters — backend: { success, data: { chapters: [], pagination: {} } }
  getChapters: async (webtoonId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const response = await apiClient.get(`/sukuyami/webtoons/${webtoonId}/chapters`, { params });
    const d = response.data?.data;
    return { data: d?.chapters ?? [], pagination: d?.pagination };
  },

  getChapter: async (chapterId: string) => {
    const response = await apiClient.get(`/sukuyami/chapters/${chapterId}`);
    return response.data?.data;
  },

  // Script generation
  generateScript: async (
    chapterId: string,
    options?: { style?: string; durationPerPanel?: number; model?: string }
  ) => {
    const response = await apiClient.post(`/sukuyami/chapters/${chapterId}/script`, options);
    return response.data?.data ?? response.data;
  },

  // Video generation
  generateVideo: async (
    chapterId: string,
    options?: { format?: string; quality?: string; fps?: number }
  ) => {
    const response = await apiClient.post(`/sukuyami/chapters/${chapterId}/video`, options);
    return response.data?.data ?? response.data;
  },

  // Dashboard — backend: { success, data: { stats: { webtoons, chapters, recentActivity } } }
  getDashboardStats: async (): Promise<DashboardStats> => {
    const response = await apiClient.get('/sukuyami/dashboard');
    const stats = response.data?.data?.stats ?? {};
    return {
      totalWebtoons: stats.webtoons?.total ?? 0,
      totalChapters: stats.chapters?.total ?? 0,
      totalScripts: stats.chapters?.completed ?? 0,
      totalVideos: stats.chapters?.withVideo ?? 0,
      processingStats: {
        pending: 0,
        processing: 0,
        completed: stats.chapters?.completed ?? 0,
        failed: 0,
      },
      recentActivity: (stats.recentActivity ?? []).map((a: any) => ({
        type: a.status || 'chapter_synced',
        webtoonTitle: a.title || `Chapter ${a.chapterNumber}`,
        timestamp: a.updatedAt || new Date().toISOString(),
      })),
    };
  },

  // Cron — backend: { success, data: { status } }
  getCronStatus: async () => {
    const response = await apiClient.get('/sukuyami/cron/status');
    return response.data?.data?.status ?? {};
  },

  runCronJob: async (jobName: string) => {
    const response = await apiClient.post(`/sukuyami/cron/${jobName}/run`);
    return response.data;
  },

  // Health
  healthCheck: async () => {
    const response = await apiClient.get('/sukuyami/health');
    return response.data?.data ?? response.data;
  },
};
