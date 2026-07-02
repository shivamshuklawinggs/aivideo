import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';

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

  constructor(graphqlUrl?: string) {
    this.graphqlUrl = graphqlUrl || process.env.SUKUYAMI_GRAPHQL_URL || 'http://localhost:4000/graphql';
    
    this.client = axios.create({
      baseURL: this.graphqlUrl,
      headers: {
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    });

    logger.info(`Sukuyami GraphQL service initialized with URL: ${this.graphqlUrl}`);
  }

  private async executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    try {
      const response = await this.client.post<GraphQLResponse<T>>('', {
        query,
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

  async searchManga(query: string, limit: number = 20): Promise<MangaInfo[]> {
    const searchQuery = `
      query SearchManga($query: String!, $limit: Int) {
        searchManga(query: $query, limit: $limit) {
          id
          title
          description
          author
          genres
          coverImage
          url
          status
          totalChapters
          lastUpdated
        }
      }
    `;

    try {
      const result = await this.executeQuery<SearchMangaResponse>(searchQuery, { query, limit });
      logger.info(`Found ${result.searchManga.length} manga for query: ${query}`);
      return result.searchManga;
    } catch (error: any) {
      logger.error('Failed to search manga:', error);
      throw new Error(`Failed to search manga: ${error.message}`);
    }
  }

  async getManga(mangaId: string): Promise<MangaInfo | null> {
    const getMangaQuery = `
      query GetManga($mangaId: ID!) {
        getManga(id: $mangaId) {
          id
          title
          description
          author
          genres
          coverImage
          url
          status
          totalChapters
          lastUpdated
        }
      }
    `;

    try {
      const result = await this.executeQuery<GetMangaResponse>(getMangaQuery, { mangaId });
      if (!result.getManga) {
        logger.warn(`Manga not found with ID: ${mangaId}`);
        return null;
      }
      logger.info(`Retrieved manga: ${result.getManga.title}`);
      return result.getManga;
    } catch (error: any) {
      logger.error('Failed to get manga:', error);
      throw new Error(`Failed to get manga: ${error.message}`);
    }
  }

  async getChapters(mangaId: string, page: number = 1, limit: number = 100): Promise<ChapterInfo[]> {
    const getChaptersQuery = `
      query GetChapters($mangaId: ID!, $page: Int, $limit: Int) {
        getChapters(mangaId: $mangaId, page: $page, limit: $limit) {
          id
          number
          title
          url
          releaseDate
          pages
          mangaId
        }
      }
    `;

    try {
      const result = await this.executeQuery<GetChaptersResponse>(getChaptersQuery, { 
        mangaId, 
        page, 
        limit 
      });
      logger.info(`Retrieved ${result.getChapters.length} chapters for manga: ${mangaId}`);
      return result.getChapters;
    } catch (error: any) {
      logger.error('Failed to get chapters:', error);
      throw new Error(`Failed to get chapters: ${error.message}`);
    }
  }

  async getChapterPages(chapterId: string): Promise<PageInfo[]> {
    const getChapterPagesQuery = `
      query GetChapterPages($chapterId: ID!) {
        getChapterPages(chapterId: $chapterId) {
          id
          number
          imageUrl
          chapterId
        }
      }
    `;

    try {
      const result = await this.executeQuery<GetChapterPagesResponse>(getChapterPagesQuery, { chapterId });
      logger.info(`Retrieved ${result.getChapterPages.length} pages for chapter: ${chapterId}`);
      return result.getChapterPages;
    } catch (error: any) {
      logger.error('Failed to get chapter pages:', error);
      throw new Error(`Failed to get chapter pages: ${error.message}`);
    }
  }

  async getMangaByUrl(url: string): Promise<MangaInfo | null> {
    // First try to search by URL pattern
    const searchQuery = `
      query SearchMangaByUrl($url: String!) {
        searchManga(query: $url, limit: 1) {
          id
          title
          description
          author
          genres
          coverImage
          url
          status
          totalChapters
          lastUpdated
        }
      }
    `;

    try {
      const result = await this.executeQuery<SearchMangaResponse>(searchQuery, { url });
      const manga = result.searchManga.find(m => m.url === url);
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

  async healthCheck(): Promise<boolean> {
    try {
      const healthQuery = `
        query {
          __schema {
            types {
              name
            }
          }
        }
      `;

      await this.executeQuery(healthQuery);
      logger.info('Sukuyami GraphQL service health check passed');
      return true;
    } catch (error: any) {
      logger.error('Sukuyami GraphQL service health check failed:', error);
      return false;
    }
  }
}

export default SukuyamiGraphQLService;
