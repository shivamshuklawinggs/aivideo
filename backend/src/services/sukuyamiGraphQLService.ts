import axios, { AxiosInstance } from 'axios';
import { print } from 'graphql';
import type { DocumentNode } from 'graphql';
import logger from '../config/logger';
import dotenv from "dotenv"
dotenv.config()

import { GET_SOURCE_MANGAS_FETCH } from '@/graphql/source/SourceMutation';
import { GET_SOURCES_LIST } from '@/graphql/source/SourceQuery';
import { GET_MANGA_SCREEN, GET_MANGAS_BASE, GET_MANGAS_LIBRARY } from '@/graphql/manga/MangaQuery';
import { GET_CHAPTERS_MANGA, GET_CHAPTERS_READER } from '@/graphql/chapter/ChapterQuery';
import { GET_CHAPTER_PAGES_FETCH, UPDATE_CHAPTER, UPDATE_CHAPTERS } from '@/graphql/chapter/ChapterMutation';
import { GET_ABOUT } from '@/graphql/server/ServerInfoQuery';
export interface MangaInfo {
  id: string;
  title: string;
  description?: string;
  author?: string;
  genres: string[];
  coverImage?: string;
  url: string;
  status: string;
  totalChapters: number;
  lastUpdated?: string;
}

export interface ChapterInfo {
  id: string;
  number: number;
  title: string;
  url: string;
  releaseDate?: string;
  pages: number;
  mangaId: string;
}

export interface PageInfo {
  id: string;
  number: number;
  imageUrl: string;
  chapterId: string;
}

export interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{
    message: string;
    locations?: Array<{ line: number; column: number }>;
    path?: Array<string | number>;
  }>;
}

export interface SearchMangaResponse {
  searchManga: MangaInfo[];
}

export interface GetMangaResponse {
  getManga: MangaInfo | null;
}

export interface GetChaptersResponse {
  getChapters: ChapterInfo[];
}

export interface GetChapterPagesResponse {
  getChapterPages: PageInfo[];
}

export class SukuyamiGraphQLService {
  private client: AxiosInstance;
  private graphqlUrl: string;
  private graphqlDomainHost: string;

  constructor(graphqlUrl?: string) {
    this.graphqlUrl = graphqlUrl || process.env.SUKUYAMI_GRAPHQL_URL || 'http://localhost:4567/api/graphql';
    this.graphqlDomainHost = this.graphqlUrl.replace('/api/graphql', '');
    
    this.client = axios.create({
      baseURL: this.graphqlUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    logger.info(`Sukuyami GraphQL service initialized with URL: ${this.graphqlUrl}`);
  }

  private async executeQuery<T>(query: string | DocumentNode, variables: Record<string, any> = {}): Promise<T> {
    try {
      const queryString = typeof query === 'string' ? query : print(query);
      const response = await this.client.post<GraphQLResponse<T>>('', {
        query: queryString,
        variables,
      });
      if (response.data.errors) {
        const errorMessages = response.data.errors.map(err => err.message).join(', ');
        throw new Error(`GraphQL errors: ${errorMessages}`);
      }

      if (!response.data.data) {
        throw new Error('No data returned from GraphQL query');
      }
      
      return response.data.data;
    } catch (error: any) {
      logger.error('GraphQL query failed:', error);
      if (error.response) {
        logger.error('GraphQL response error:', error.response.data);
      }
      throw new Error(`GraphQL query failed: ${error.message}`);
    }
  }

  async searchManga(
    query: string,
    page: number = 1,
  ): Promise<any[]> {
    const variables = {
      input: {
        type: 'SEARCH',
        source: process.env.SUKUYAMI_SOURCE_ID || '1',
        query,
        filters: [],
        page,
      },
    };

    try {
      const result = await this.executeQuery<{
        fetchSourceManga: {
          hasNextPage: boolean;
          mangas: Array<{ id: string; title: string; thumbnailUrl: string; inLibrary: boolean; initialized: boolean; sourceId: string }>;
        };
      }>(GET_SOURCE_MANGAS_FETCH, variables);
      logger.info(
        `Found ${result.fetchSourceManga.mangas.length} manga for query: ${query}`
      );

      return result.fetchSourceManga.mangas;
    } catch (error: any) {
      logger.error('Failed to search manga:', error);
      throw new Error(`Failed to search manga: ${error.message}`);
    }
  }

  async getManga(mangaId: string): Promise<any | null> {
    try {
      const result = await this.executeQuery<{
        manga: {
          id: string;
          title: string;
          description: string;
          author: string;
          artist: string;
          genre: string[];
          status: string;
          realUrl: string;
          thumbnailUrl: string;
          inLibrary: boolean;
          sourceId: string;
          source: { id: string; name: string; displayName: string };
          chapters: { totalCount: number };
        } | null;
      }>(GET_MANGA_SCREEN, { id: parseInt(mangaId, 10) });

      if (!result.manga) {
        logger.warn(`Manga not found with ID: ${mangaId}`);
        return null;
      }
      logger.info(`Retrieved manga: ${result.manga.title}`);
      return result.manga;
    } catch (error: any) {
      logger.error('Failed to get manga:', error);
      throw new Error(`Failed to get manga: ${error.message}`);
    }
  }

  async getChapters(mangaId: string, page: number = 1, limit: number = 100): Promise<any[]> {
    try {
      const result = await this.executeQuery<{
        chapters: {
          nodes: Array<{ id: string; name: string; chapterNumber: number; scanlator: string; realUrl: string; uploadDate: string; pageCount: number; mangaId: string; isRead: boolean; isDownloaded: boolean; isBookmarked: boolean }>;
          totalCount: number;
        };
      }>(GET_CHAPTERS_MANGA, {
        condition: { mangaId: parseInt(mangaId, 10) },
        first: limit,
        offset: (page - 1) * limit,
      });

      logger.info(`Retrieved ${result.chapters.nodes.length} chapters for manga: ${mangaId}`);
      return result.chapters.nodes;
    } catch (error: any) {
      logger.error('Failed to get chapters:', error);
      throw new Error(`Failed to get chapters: ${error.message}`);
    }
  }

  async getChapterPages(chapterId: string): Promise<string[]> {
    try {
      const result = await this.executeQuery<{
        fetchChapterPages: {
          chapter: { id: string; pageCount: number; isDownloaded: boolean };
          pages: string[];
        };
      }>(GET_CHAPTER_PAGES_FETCH, { input: { chapterId: parseInt(chapterId, 10) } });

      logger.info(`Retrieved ${result.fetchChapterPages.pages.length} pages for chapter: ${chapterId}`);
      if (result?.fetchChapterPages?.pages  && Array.isArray(result.fetchChapterPages.pages)) {
        result.fetchChapterPages.pages = result.fetchChapterPages.pages.map((page: string) => `${this.graphqlDomainHost}${page}?sourceId=${process.env.SUKUYAMI_SOURCE_ID}`);
      }
      return result.fetchChapterPages.pages;
    } catch (error: any) {
      logger.error('Failed to get chapter pages:', error);
      throw new Error(`Failed to get chapter pages: ${error.message}`);
    }
  }

  async getMangaByUrl(url: string): Promise<any | null> {
    try {
      const result = await this.executeQuery<{
        mangas: {
          nodes: Array<{ id: string; title: string; thumbnailUrl: string; inLibrary: boolean; initialized: boolean; sourceId: string }>;
          totalCount: number;
        };
      }>(GET_MANGAS_BASE, {
        filter: { realUrl: { equalTo: url } },
        first: 1,
      });

      const manga = result.mangas.nodes[0];
      if (manga) {
        logger.info(`Found manga by URL: ${manga.title}`);
        return manga;
      }
      return null;
    } catch (error: any) {
      logger.error('Failed to get manga by URL:', error);
      throw new Error(`Failed to get manga by URL: ${error.message}`);
    }
  }

  async getLibraryMangas(
    page: number = 1,
    limit: number = 20,
    status?: string,
    genre?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: string
  ): Promise<{ mangas: any[]; totalCount: number; hasNextPage: boolean }> {
    try {
      const filter: Record<string, any> = {};

      if (status && status !== 'all') {
        const statusMap: Record<string, string> = {
          ongoing: 'ONGOING',
          completed: 'COMPLETED',
          hiatus: 'ON_HIATUS'
        };
        filter.status = { equalTo: statusMap[status.toLowerCase()] ?? status.toUpperCase() };
      }

      if (genre && genre !== 'all') {
        filter.genre = { includesInsensitive: genre };
      }

      if (search) {
        filter.or = [
          { title: { includesInsensitive: search } },
          { author: { includesInsensitive: search } },
          { description: { includesInsensitive: search } }
        ];
      }

      let orderBy: string;
      switch (sortBy) {
        case 'title':
          orderBy = 'TITLE';
          break;
        case 'createdAt':
          orderBy = 'IN_LIBRARY_AT';
          break;
        case 'updatedAt':
        default:
          orderBy = 'LAST_FETCHED_AT';
          break;
      }

      const order = [{
        by: orderBy,
        byType: sortOrder === 'asc' ? 'ASC' : 'DESC'
      }];

      const result = await this.executeQuery<{
        mangas: {
          nodes: any[];
          totalCount: number;
          pageInfo: { hasNextPage: boolean };
        };
      }>(GET_MANGAS_LIBRARY, {
        condition: { inLibrary: true },
        filter,
        first: limit,
        offset: (page - 1) * limit,
        order
      });

      return {
        mangas: result.mangas.nodes,
        totalCount: result.mangas.totalCount,
        hasNextPage: result.mangas.pageInfo.hasNextPage
      };
    } catch (error: any) {
      logger.error('Failed to get library mangas:', error);
      throw new Error(`Failed to get library mangas: ${error.message}`);
    }
  }

  async getChaptersWithTotal(
    mangaId: string,
    page: number = 1,
    limit: number = 50,
    status?: string
  ): Promise<{ chapters: any[]; totalCount: number; hasNextPage: boolean }> {
    try {
      const condition: Record<string, any> = { mangaId: parseInt(mangaId, 10) };

      if (status === 'completed' || status === 'read') {
        condition.isRead = true;
      } else if (status === 'pending' || status === 'unread') {
        condition.isRead = false;
      }

      const result = await this.executeQuery<{
        chapters: {
          nodes: any[];
          totalCount: number;
          pageInfo: { hasNextPage: boolean };
        };
      }>(GET_CHAPTERS_MANGA, {
        condition,
        first: limit,
        offset: (page - 1) * limit
      });

      return {
        chapters: result.chapters.nodes,
        totalCount: result.chapters.totalCount,
        hasNextPage: result.chapters.pageInfo.hasNextPage
      };
    } catch (error: any) {
      logger.error('Failed to get chapters with total:', error);
      throw new Error(`Failed to get chapters: ${error.message}`);
    }
  }

  async getChapterInfo(chapterId: string): Promise<any | null> {
    try {
      const result = await this.executeQuery<{
        chapters: {
          nodes: any[];
          totalCount: number;
        };
      }>(GET_CHAPTERS_READER, {
        condition: { id: parseInt(chapterId, 10) },
        first: 1
      });

      const chapter = result.chapters.nodes[0];
      if (chapter) {
        logger.info(`Retrieved chapter info: ${chapter.id}`);
        return chapter;
      }
      return null;
    } catch (error: any) {
      logger.error('Failed to get chapter info:', error);
      throw new Error(`Failed to get chapter info: ${error.message}`);
    }
  }

  async markChapterAsRead(chapterId: string): Promise<any> {
    try {
      const chapter = await this.getChapterInfo(chapterId);
      const mangaId = chapter?.mangaId ?? 0;

      const result = await this.executeQuery<{
        updateChapter: { chapter: any } | null;
      }>(UPDATE_CHAPTER, {
        input: {
          id: parseInt(chapterId, 10),
          patch: { isRead: true }
        },
        getBookmarked: false,
        getRead: true,
        getLastPageRead: false,
        chapterIdToDelete: -1,
        deleteChapter: false,
        mangaId: parseInt(String(mangaId), 10) || 0,
        trackProgress: false
      });

      logger.info(`Marked chapter ${chapterId} as read`);
      return result.updateChapter?.chapter ?? { id: parseInt(chapterId, 10), isRead: true };
    } catch (error: any) {
      logger.error('Failed to mark chapter as read:', error);
      throw new Error(`Failed to mark chapter as read: ${error.message}`);
    }
  }

  async markAllChaptersAsRead(mangaId: string): Promise<any[]> {
    try {
      const allChapters = await this.getChaptersWithTotal(mangaId, 1, 10000);
      const ids = allChapters.chapters
        .filter((ch: any) => ch.id !== undefined && ch.id !== null)
        .map((ch: any) => parseInt(String(ch.id), 10))
        .filter((id: number) => !isNaN(id));

      if (ids.length === 0) {
        return [];
      }

      const result = await this.executeQuery<{
        updateChapters: { chapters: any[] } | null;
      }>(UPDATE_CHAPTERS, {
        input: {
          ids,
          patch: { isRead: true }
        },
        getBookmarked: false,
        getRead: true,
        getLastPageRead: false,
        chapterIdsToDelete: [],
        deleteChapters: false,
        mangaId: parseInt(mangaId, 10),
        trackProgress: false
      });

      logger.info(`Marked ${ids.length} chapters as read for manga ${mangaId}`);
      return result.updateChapters?.chapters ?? [];
    } catch (error: any) {
      logger.error('Failed to mark all chapters as read:', error);
      throw new Error(`Failed to mark all chapters as read: ${error.message}`);
    }
  }

  async downloadPageImage(imageUrl: string): Promise<Buffer> {
    try {
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Referer': new URL(imageUrl).origin,
        },
      });

      return Buffer.from(response.data);
    } catch (error: any) {
      logger.error(`Failed to download page image: ${imageUrl}`, error);
      throw new Error(`Failed to download page image: ${error.message}`);
    }
  }

  async getSukumaiSources(): Promise<any[]> {
    try {
      const result = await this.executeQuery<{
        sources: {
          nodes: Array<{ id: string; name: string; displayName: string; lang: string; isNsfw: boolean; isLocal: boolean }>;
        };
      }>(GET_SOURCES_LIST);

      logger.info(`Retrieved ${result.sources.nodes.length} sources`);
      return result.sources.nodes;
    } catch (error: any) {
      logger.error('Failed to get sources:', error);
      throw new Error(`Failed to get sources: ${error.message}`);
    }
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.executeQuery(GET_ABOUT);
      logger.info('Sukuyami GraphQL service health check passed');
      return true;
    } catch (error: any) {
      logger.error('Sukuyami GraphQL service health check failed:', error);
      return false;
    }
  }
}

export default SukuyamiGraphQLService;
