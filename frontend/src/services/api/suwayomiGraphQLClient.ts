import axios, { AxiosInstance } from 'axios';

const SUKUYAMI_GRAPHQL_URL =
  process.env.NEXT_PUBLIC_SUKUYAMI_GRAPHQL_URL || 'http://localhost:4567/api/graphql';
const SUKUYAMI_SOURCE_ID = process.env.NEXT_PUBLIC_SUKUYAMI_SOURCE_ID || 'all';

const graphqlDomainHost = SUKUYAMI_GRAPHQL_URL.replace('/api/graphql', '');

// ─── GraphQL query strings (fragments inlined) ──────────────────────────────

const MANGA_BASE_FIELDS = `
  id
  title
  thumbnailUrl
  thumbnailUrlLastFetched
  inLibrary
  initialized
  sourceId
`;

const CHAPTER_BASE_FIELDS = `
  id
  name
  mangaId
  scanlator
  realUrl
  sourceOrder
  chapterNumber
`;

const CHAPTER_STATE_FIELDS = `
  isRead
  isDownloaded
  isBookmarked
`;

const CHAPTER_LIST_FIELDS = `
  ${CHAPTER_BASE_FIELDS}
  ${CHAPTER_STATE_FIELDS}
  fetchedAt
  uploadDate
  lastReadAt
`;

const CHAPTER_READER_FIELDS = `
  ${CHAPTER_BASE_FIELDS}
  ${CHAPTER_STATE_FIELDS}
  uploadDate
  lastPageRead
  pageCount
`;

const SOURCE_BASE_FIELDS = `
  id
  name
  displayName
  lang
  iconUrl
`;

const MANGA_SCREEN_FIELDS = `
  id
  title
  thumbnailUrl
  thumbnailUrlLastFetched
  inLibrary
  initialized
  sourceId
  genre
  lastFetchedAt
  inLibraryAt
  status
  artist
  author
  description
  realUrl
  unreadCount
  downloadCount
  bookmarkCount
  hasDuplicateChapters
  chapters { totalCount }
  source {
    ${SOURCE_BASE_FIELDS}
  }
`;

const MANGA_LIBRARY_FIELDS = `
  id
  title
  thumbnailUrl
  thumbnailUrlLastFetched
  inLibrary
  initialized
  sourceId
  genre
  lastFetchedAt
  inLibraryAt
  status
  artist
  author
  description
  unreadCount
  downloadCount
  bookmarkCount
  hasDuplicateChapters
  chapters { totalCount }
  source {
    ${SOURCE_BASE_FIELDS}
  }
`;

// ─── Queries ─────────────────────────────────────────────────────────────────

const SEARCH_MANGA = `
  mutation SEARCH_MANGA($input: FetchSourceMangaInput!) {
    fetchSourceManga(input: $input) {
      hasNextPage
      mangas {
        ${MANGA_BASE_FIELDS}
      }
    }
  }
`;

const GET_MANGA = `
  query GET_MANGA($id: Int!) {
    manga(id: $id) {
      ${MANGA_SCREEN_FIELDS}
    }
  }
`;

const GET_CHAPTERS = `
  query GET_CHAPTERS(
    $condition: ChapterConditionInput
    $first: Int
    $offset: Int
  ) {
    chapters(
      condition: $condition
      first: $first
      offset: $offset
    ) {
      nodes {
        ${CHAPTER_LIST_FIELDS}
      }
      totalCount
    }
  }
`;

const GET_CHAPTER_INFO = `
  query GET_CHAPTER_INFO(
    $condition: ChapterConditionInput
    $first: Int
  ) {
    chapters(
      condition: $condition
      first: $first
    ) {
      nodes {
        ${CHAPTER_READER_FIELDS}
      }
      totalCount
    }
  }
`;

const FETCH_CHAPTER_PAGES = `
  mutation FETCH_CHAPTER_PAGES($input: FetchChapterPagesInput!) {
    fetchChapterPages(input: $input) {
      chapter {
        id
        pageCount
        isDownloaded
      }
      pages
    }
  }
`;

const GET_MANGA_BY_URL = `
  query GET_MANGA_BY_URL(
    $filter: MangaFilterInput
    $first: Int
  ) {
    mangas(
      filter: $filter
      first: $first
    ) {
      nodes {
        ${MANGA_BASE_FIELDS}
      }
      totalCount
    }
  }
`;

const GET_LIBRARY_MANGAS = `
  query GET_LIBRARY_MANGAS(
    $condition: MangaConditionInput
    $filter: MangaFilterInput
    $first: Int
    $offset: Int
    $order: [MangaOrderInput!]
  ) {
    mangas(
      condition: $condition
      filter: $filter
      first: $first
      offset: $offset
      order: $order
    ) {
      nodes {
        ${MANGA_LIBRARY_FIELDS}
      }
      totalCount
      pageInfo {
        hasNextPage
      }
    }
  }
`;

const UPDATE_CHAPTER = `
  mutation UPDATE_CHAPTER(
    $input: UpdateChapterInput!
    $getBookmarked: Boolean!
    $getRead: Boolean!
    $getLastPageRead: Boolean!
    $chapterIdToDelete: Int!
    $deleteChapter: Boolean!
    $mangaId: Int!
    $trackProgress: Boolean!
  ) {
    updateChapter(input: $input) {
      chapter {
        id
        isRead @include(if: $getRead)
      }
    }
  }
`;

const UPDATE_CHAPTERS = `
  mutation UPDATE_CHAPTERS(
    $input: UpdateChaptersInput!
    $getBookmarked: Boolean!
    $getRead: Boolean!
    $getLastPageRead: Boolean!
    $chapterIdsToDelete: [Int!]!
    $deleteChapters: Boolean!
    $mangaId: Int!
    $trackProgress: Boolean!
  ) {
    updateChapters(input: $input) {
      chapters {
        id
        isRead @include(if: $getRead)
      }
    }
  }
`;

const GET_SOURCES_LIST = `
  query GET_SOURCES_LIST {
    sources {
      nodes {
        ${SOURCE_BASE_FIELDS}
        isNsfw
        isLocal
      }
    }
  }
`;

const UPDATE_MANGA = `
  mutation UPDATE_MANGA($input: UpdateMangaInput!) {
    updateManga(input: $input) {
      manga {
        id
        inLibrary
      }
    }
  }
`;

const GET_ABOUT = `
  query GET_ABOUT {
    aboutServer {
      buildTime
      buildType
      discord
      github
      name
      version
    }
  }
`;

// ─── Types ───────────────────────────────────────────────────────────────────

interface GraphQLResponse<T> {
  data?: T;
  errors?: Array<{ message: string }>;
}

// ─── Client ──────────────────────────────────────────────────────────────────

class SuwayomiGraphQLClient {
  private client: AxiosInstance;

  constructor() {
    this.client = axios.create({
      baseURL: SUKUYAMI_GRAPHQL_URL,
      headers: { 'Content-Type': 'application/json' },
      timeout: 30000,
    });
  }

  private async executeQuery<T>(query: string, variables: Record<string, any> = {}): Promise<T> {
    const response = await this.client.post<GraphQLResponse<T>>('', { query, variables });
    if (response.data.errors) {
      throw new Error(`GraphQL errors: ${response.data.errors.map(e => e.message).join(', ')}`);
    }
    if (!response.data.data) {
      throw new Error('No data returned from GraphQL query');
    }
    return response.data.data;
  }

  async searchManga(query: string, page: number = 1): Promise<any[]> {
    const result = await this.executeQuery<{
      fetchSourceManga: {
        hasNextPage: boolean;
        mangas: Array<{ id: string; title: string; thumbnailUrl: string; inLibrary: boolean; initialized: boolean; sourceId: string }>;
      };
    }>(SEARCH_MANGA, {
      input: {
        type: 'SEARCH',
        source: SUKUYAMI_SOURCE_ID,
        query,
        filters: [],
        page,
      },
    });
    return result.fetchSourceManga.mangas;
  }

  async getManga(mangaId: string): Promise<any | null> {
    const result = await this.executeQuery<{ manga: any | null }>(GET_MANGA, {
      id: parseInt(mangaId, 10),
    });
    return result.manga;
  }

  async getChapters(mangaId: string, page: number = 1, limit: number = 100): Promise<any[]> {
    const result = await this.executeQuery<{
      chapters: { nodes: any[]; totalCount: number };
    }>(GET_CHAPTERS, {
      condition: { mangaId: parseInt(mangaId, 10) },
      first: limit,
      offset: (page - 1) * limit,
    });
    return result.chapters.nodes;
  }

  async getChaptersWithTotal(
    mangaId: string,
    page: number = 1,
    limit: number = 50,
    status?: string,
  ): Promise<{ chapters: any[]; totalCount: number; hasNextPage: boolean }> {
    const condition: Record<string, any> = { mangaId: parseInt(mangaId, 10) };
    if (status === 'completed' || status === 'read') {
      condition.isRead = true;
    } else if (status === 'pending' || status === 'unread') {
      condition.isRead = false;
    }
    const result = await this.executeQuery<{
      chapters: { nodes: any[]; totalCount: number };
    }>(GET_CHAPTERS, {
      condition,
      first: limit,
      offset: (page - 1) * limit,
    });
    return {
      chapters: result.chapters.nodes,
      totalCount: result.chapters.totalCount,
      hasNextPage: false,
    };
  }

  async getChapterInfo(chapterId: string): Promise<any | null> {
    const result = await this.executeQuery<{
      chapters: { nodes: any[]; totalCount: number };
    }>(GET_CHAPTER_INFO, {
      condition: { id: parseInt(chapterId, 10) },
      first: 1,
    });
    return result.chapters.nodes[0] ?? null;
  }

  async getChapterPages(chapterId: string): Promise<string[]> {
    const result = await this.executeQuery<{
      fetchChapterPages: {
        chapter: { id: string; pageCount: number; isDownloaded: boolean };
        pages: string[];
      };
    }>(FETCH_CHAPTER_PAGES, {
      input: { chapterId: parseInt(chapterId, 10) || 0 },
    });
    const pages = result.fetchChapterPages.pages || [];
    return pages.map((page: string) => `${graphqlDomainHost}${page}?sourceId=${SUKUYAMI_SOURCE_ID}`);
  }

  async getMangaByUrl(url: string): Promise<any | null> {
    const result = await this.executeQuery<{
      mangas: { nodes: any[]; totalCount: number };
    }>(GET_MANGA_BY_URL, {
      filter: { realUrl: { equalTo: url } },
      first: 1,
    });
    return result.mangas.nodes[0] ?? null;
  }

  async getLibraryMangas(
    page: number = 1,
    limit: number = 20,
    status?: string,
    genre?: string,
    search?: string,
    sortBy?: string,
    sortOrder?: string,
  ): Promise<{ mangas: any[]; totalCount: number; hasNextPage: boolean }> {
    const filter: Record<string, any> = {};
    if (status && status !== 'all') {
      const statusMap: Record<string, string> = {
        ongoing: 'ONGOING',
        completed: 'COMPLETED',
        hiatus: 'ON_HIATUS',
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
        { description: { includesInsensitive: search } },
      ];
    }
    let orderBy: string;
    switch (sortBy) {
      case 'title': orderBy = 'TITLE'; break;
      case 'createdAt': orderBy = 'IN_LIBRARY_AT'; break;
      case 'updatedAt':
      default: orderBy = 'LAST_FETCHED_AT'; break;
    }
    const order = [{ by: orderBy, byType: sortOrder === 'asc' ? 'ASC' : 'DESC' }];

    const result = await this.executeQuery<{
      mangas: { nodes: any[]; totalCount: number; pageInfo: { hasNextPage: boolean } };
    }>(GET_LIBRARY_MANGAS, {
      condition: { inLibrary: true },
      filter,
      first: limit,
      offset: (page - 1) * limit,
      order,
    });
    return {
      mangas: result.mangas.nodes,
      totalCount: result.mangas.totalCount,
      hasNextPage: result.mangas.pageInfo.hasNextPage,
    };
  }

  async markChapterAsRead(chapterId: string): Promise<any> {
    const chapter = await this.getChapterInfo(chapterId);
    const mangaId = chapter?.mangaId ?? 0;
    const result = await this.executeQuery<{
      updateChapter: { chapter: any } | null;
    }>(UPDATE_CHAPTER, {
      input: { id: parseInt(chapterId, 10), patch: { isRead: true } },
      getBookmarked: false,
      getRead: true,
      getLastPageRead: false,
      chapterIdToDelete: -1,
      deleteChapter: false,
      mangaId: parseInt(String(mangaId), 10) || 0,
      trackProgress: false,
    });
    return result.updateChapter?.chapter ?? { id: parseInt(chapterId, 10), isRead: true };
  }

  async markAllChaptersAsRead(mangaId: string): Promise<any[]> {
    const allChapters = await this.getChaptersWithTotal(mangaId, 1, 10000);
    const ids = allChapters.chapters
      .filter((ch: any) => ch.id !== undefined && ch.id !== null)
      .map((ch: any) => parseInt(String(ch.id), 10))
      .filter((id: number) => !isNaN(id));
    if (ids.length === 0) return [];
    const result = await this.executeQuery<{
      updateChapters: { chapters: any[] } | null;
    }>(UPDATE_CHAPTERS, {
      input: { ids, patch: { isRead: true } },
      getBookmarked: false,
      getRead: true,
      getLastPageRead: false,
      chapterIdsToDelete: [],
      deleteChapters: false,
      mangaId: parseInt(mangaId, 10),
      trackProgress: false,
    });
    return result.updateChapters?.chapters ?? [];
  }

  async getSources(): Promise<any[]> {
    const result = await this.executeQuery<{
      sources: { nodes: any[] };
    }>(GET_SOURCES_LIST);
    return result.sources.nodes;
  }

  async addToLibrary(mangaId: string): Promise<any> {
    const result = await this.executeQuery<{
      updateManga: { manga: any } | null;
    }>(UPDATE_MANGA, {
      input: { id: parseInt(mangaId, 10), patch: { inLibrary: true } },
    });
    return result.updateManga?.manga ?? { id: parseInt(mangaId, 10), inLibrary: true };
  }

  async healthCheck(): Promise<boolean> {
    try {
      await this.executeQuery(GET_ABOUT);
      return true;
    } catch {
      return false;
    }
  }
}

const suwayomiGraphQLClient = new SuwayomiGraphQLClient();
export default suwayomiGraphQLClient;
