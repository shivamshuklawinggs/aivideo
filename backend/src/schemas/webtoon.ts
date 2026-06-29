import { z } from 'zod';

export const fetchWebtoonsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  search: z.string().optional(),
});

export const webtoonIdSchema = z.object({
  id: z.string().min(1, 'Webtoon ID is required'),
});

export const uploadWebtoonSchema = z.object({
  title: z.string().min(1, 'Title is required'),
  description: z.string().optional(),
  author: z.string().optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const updateWebtoonSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const chapterIdSchema = z.object({
  webtoonId: z.string().min(1, 'Webtoon ID is required'),
  chapterId: z.string().min(1, 'Chapter ID is required'),
});

export const updateChapterSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  chapterNumber: z.coerce.number().int().min(1).optional(),
});

export const createChapterSchema = z.object({
  title: z.string().min(1, 'Title is required').optional(),
  description: z.string().optional(),
  chapterNumber: z.coerce.number().int().min(1).optional(),
});

export const generateScriptSchema = z.object({
  webtoonId: z.string().min(1, 'Webtoon ID is required'),
  chapterId: z.string().optional(),
  voiceProfileId: z.string().optional(),
  options: z.record(z.string(), z.any()).optional(),
});

export const updateMetadataSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  author: z.string().optional(),
  genres: z.array(z.string()).optional(),
  tags: z.array(z.string()).optional(),
});

export const webtoonParamsSchema = z.object({
  webtoonId: z.string().min(1, 'Webtoon ID is required'),
});

export const chapterParamsSchema = z.object({
  webtoonId: z.string().min(1, 'Webtoon ID is required'),
  chapterId: z.string().min(1, 'Chapter ID is required'),
});

export type FetchWebtoonsInput = z.infer<typeof fetchWebtoonsSchema>;
export type WebtoonIdInput = z.infer<typeof webtoonIdSchema>;
export type UploadWebtoonInput = z.infer<typeof uploadWebtoonSchema>;
export type UpdateWebtoonInput = z.infer<typeof updateWebtoonSchema>;
export type ChapterIdInput = z.infer<typeof chapterIdSchema>;
export type UpdateChapterInput = z.infer<typeof updateChapterSchema>;
export type GenerateScriptInput = z.infer<typeof generateScriptSchema>;
export type UpdateMetadataInput = z.infer<typeof updateMetadataSchema>;
