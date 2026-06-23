import { z } from 'zod';

export const fetchVoiceProfilesSchema = z.object({
  page: z.coerce.number().int().min(1).optional(),
  limit: z.coerce.number().int().min(1).max(50).optional(),
});

export const voiceIdSchema = z.object({
  id: z.string().min(1, 'Voice profile ID is required'),
});

export const createVoiceProfileSchema = z.object({
  name: z.string().min(1, 'Name is required'),
  description: z.string().optional(),
  voiceSamplePath: z.string().min(1, 'Voice sample path is required'),
});

export const updateVoiceProfileSchema = z.object({
  name: z.string().min(1, 'Name cannot be empty').optional(),
  description: z.string().optional(),
  isDefault: z.boolean().optional(),
});

export const cloneVoiceProfileSchema = z.object({
  name: z.string().min(1, 'Name is required for cloned profile'),
});

export const testVoiceProfileSchema = z.object({
  text: z.string().min(1, 'Test text is required'),
});

export const voicePresetsSchema = z.object({
  // No params needed for getting presets
});

export type FetchVoiceProfilesInput = z.infer<typeof fetchVoiceProfilesSchema>;
export type VoiceIdInput = z.infer<typeof voiceIdSchema>;
export type CreateVoiceProfileInput = z.infer<typeof createVoiceProfileSchema>;
export type UpdateVoiceProfileInput = z.infer<typeof updateVoiceProfileSchema>;
export type CloneVoiceProfileInput = z.infer<typeof cloneVoiceProfileSchema>;
export type TestVoiceProfileInput = z.infer<typeof testVoiceProfileSchema>;
