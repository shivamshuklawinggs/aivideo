import suwayomiGraphQLClient from './suwayomiGraphQLClient';

export interface Webtoon {
  id: string;
  title: string;
  description?: string;
  author?: string;
  artist?: string;
  thumbnailUrl?: string;
  status: string;
  genre: string[];
  realUrl?: string;
  inLibrary: boolean;
  sourceId: string;
  chapters?: { totalCount: number };
  unreadCount?: number;
  downloadCount?: number;
  bookmarkCount?: number;
}

export interface Chapter {
  id: string;
  name: string;
  mangaId: string;
  chapterNumber: number;
  scanlator?: string;
  realUrl?: string;
  uploadDate?: string;
  fetchedAt?: string;
  isRead: boolean;
  isDownloaded: boolean;
  isBookmarked: boolean;
  pageCount?: number;
  lastPageRead?: number;
  lastReadAt?: string;
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
  // Library mangas (with filters, search, sort)
  getWebtoons: async (params?: WebtoonSearchParams) => {
    const result = await suwayomiGraphQLClient.getLibraryMangas(
      params?.page ?? 1,
      params?.limit ?? 20,
      params?.status,
      params?.genre,
      params?.search,
      params?.sortBy,
      params?.sortOrder,
    );
    return {
      data: result.mangas,
      pagination: {
        total: result.totalCount,
        page: params?.page ?? 1,
        limit: params?.limit ?? 20,
        hasNextPage: result.hasNextPage,
      },
    };
  },

  // Popular webtoons (library sorted by last fetched)
  getPopularWebtoons: async (params?: { limit?: number }) => {
    const result = await suwayomiGraphQLClient.getLibraryMangas(
      1,
      params?.limit ?? 10,
      undefined,
      undefined,
      undefined,
      'updatedAt',
      'desc',
    );
    return result.mangas;
  },

  // Single manga details
  getWebtoon: async (webtoonId: string) => {
    return suwayomiGraphQLClient.getManga(webtoonId);
  },

  // Search manga in source
  searchWebtoons: async (params: { query: string; limit?: number }) => {
    return suwayomiGraphQLClient.searchManga(params.query);
  },

  // Chapters for a manga
  getChapters: async (webtoonId: string, params?: { page?: number; limit?: number; status?: string }) => {
    const result = await suwayomiGraphQLClient.getChaptersWithTotal(
      webtoonId,
      params?.page ?? 1,
      params?.limit ?? 50,
      params?.status,
    );
    return {
      data: result.chapters,
      pagination: {
        total: result.totalCount,
        page: params?.page ?? 1,
        limit: params?.limit ?? 50,
        hasNextPage: result.hasNextPage,
      },
    };
  },

  // Single chapter info
  getChapter: async (chapterId: string) => {
    return suwayomiGraphQLClient.getChapterInfo(chapterId);
  },

  // Chapter pages (panel image URLs)
  getChapterPages: async (chapterId: string) => {
    const pages = await suwayomiGraphQLClient.getChapterPages(chapterId);
    return { pages };
  },

  // Mark single chapter as read
  markChapterAsRead: async (chapterId: string) => {
    return suwayomiGraphQLClient.markChapterAsRead(chapterId);
  },

  // Mark all chapters of a manga as read
  markAllChaptersAsRead: async (webtoonId: string) => {
    return suwayomiGraphQLClient.markAllChaptersAsRead(webtoonId);
  },

  // Get available sources
  getSources: async () => {
    return suwayomiGraphQLClient.getSources();
  },

  // Add manga to library
  addToLibrary: async (mangaId: string) => {
    return suwayomiGraphQLClient.addToLibrary(mangaId);
  },

  // Sync webtoons (alias for addToLibrary for single, no-op for bulk)
  syncWebtoons: async (options: { webtoonIds?: string[] }) => {
    if (options.webtoonIds && options.webtoonIds.length > 0) {
      const results = await Promise.all(
        options.webtoonIds.map((id) => suwayomiGraphQLClient.addToLibrary(id)),
      );
      return results;
    }
    return [];
  },

  // Health check
  healthCheck: async () => {
    return suwayomiGraphQLClient.healthCheck();
  },

  // Dashboard stats (computed from library)
  getDashboardStats: async (): Promise<DashboardStats> => {
    const libraryResult = await suwayomiGraphQLClient.getLibraryMangas(1, 10000);
    const totalWebtoons = libraryResult.totalCount;
    let totalChapters = 0;
    let totalRead = 0;
    const recentActivity: Array<{ type: string; webtoonTitle: string; timestamp: string }> = [];

    for (const manga of libraryResult.mangas) {
      const chapterCount = manga.chapters?.totalCount ?? 0;
      totalChapters += chapterCount;
      totalRead += chapterCount - (manga.unreadCount ?? 0);
      if (manga.lastFetchedAt) {
        recentActivity.push({
          type: 'chapter_synced',
          webtoonTitle: manga.title,
          timestamp: manga.lastFetchedAt,
        });
      }
    }

    recentActivity.sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());

    return {
      totalWebtoons,
      totalChapters,
      totalScripts: totalRead,
      totalVideos: 0,
      processingStats: {
        pending: 0,
        processing: 0,
        completed: totalRead,
        failed: 0,
      },
      recentActivity: recentActivity.slice(0, 10),
    };
  },
};
