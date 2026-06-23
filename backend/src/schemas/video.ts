import { z } from 'zod';

export const fetchVideosSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(['completed', 'processing', 'failed']).optional(),
});

export const videoIdSchema = z.object({
  id: z.string().min(1, 'Video ID is required'),
});

export const generateVideoSchema = z.object({
  webtoonId: z.string().min(1, 'Webtoon ID is required'),
  chapterId: z.string().optional(),
  voiceProfileId: z.string().min(1, 'Voice profile ID is required'),
  config: z.record(z.string(), z.any()).optional(),
});

export const updateVideoSchema = z.object({
  title: z.string().min(1, 'Title cannot be empty').optional(),
  description: z.string().optional(),
  config: z.record(z.string(), z.any()).optional(),
});

export const renderVideoSchema = z.object({
  resolution: z.enum(['720p', '1080p', '1440p', '4K']).optional(),
  format: z.enum(['mp4', 'mov', 'webm']).optional(),
  fps: z.number().optional(),
});

export const fetchRenderJobsSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']).optional(),
});

export const renderJobIdSchema = z.object({
  jobId: z.string().min(1, 'Render job ID is required'),
});

export const updateRenderJobSchema = z.object({
  status: z.enum(['queued', 'processing', 'completed', 'failed', 'cancelled']).optional(),
  progress: z.coerce.number().int().min(0).max(100).optional(),
});

export const updateScenesSchema = z.object({
  scenes: z.array(z.any()).min(1, 'Scenes array is required'),
});

export const updateVideoConfigSchema = z.object({
  config: z.record(z.string(), z.any()),
});

export const exportVideoSchema = z.object({
  resolution: z.enum(['720p', '1080p', '1440p', '4K']).optional(),
  format: z.enum(['mp4', 'mov', 'webm']).optional(),
});

export const shareVideoSchema = z.object({
  isPublic: z.boolean().optional(),
});

export const videoParamsSchema = z.object({
  id: z.string().min(1, 'Video ID is required'),
});

export const renderJobParamsSchema = z.object({
  jobId: z.string().min(1, 'Render job ID is required'),
});

export type FetchVideosInput = z.infer<typeof fetchVideosSchema>;
export type VideoIdInput = z.infer<typeof videoIdSchema>;
export type GenerateVideoInput = z.infer<typeof generateVideoSchema>;
export type UpdateVideoInput = z.infer<typeof updateVideoSchema>;
export type RenderVideoInput = z.infer<typeof renderVideoSchema>;
export type FetchRenderJobsInput = z.infer<typeof fetchRenderJobsSchema>;
export type RenderJobIdInput = z.infer<typeof renderJobIdSchema>;
export type UpdateRenderJobInput = z.infer<typeof updateRenderJobSchema>;
export type UpdateScenesInput = z.infer<typeof updateScenesSchema>;
export type UpdateVideoConfigInput = z.infer<typeof updateVideoConfigSchema>;
export type ExportVideoInput = z.infer<typeof exportVideoSchema>;
export type ShareVideoInput = z.infer<typeof shareVideoSchema>;
