import { apiClient } from './apiClient';

export interface VoiceSample {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  ageRange: 'young' | 'adult' | 'senior';
  language: string;
  filePath: string;
  fileExists: boolean;
  isDefault: boolean;
  tags: string[];
}

export interface CloneVoiceResponse {
  voiceProfileId: string;
  embeddingPath: string;
  sample: VoiceSample;
}

export interface NarrateResponse {
  audioFiles: { segmentIndex: number; url: string }[];
  voiceProfileId: string;
  language: string;
}

export const voiceApi = {
  getVoiceSamples: async (): Promise<VoiceSample[]> => {
    const response = await apiClient.get('/voice/samples');
    return response.data?.data?.samples ?? [];
  },

  cloneVoice: async (sampleId: string): Promise<CloneVoiceResponse> => {
    const response = await apiClient.post('/voice/clone', { sampleId });
    return response.data?.data ?? response.data;
  },

  narrate: async (payload: {
    voiceProfileId: string;
    segments: Array<{ text: string } | string>;
    language?: string;
  }): Promise<NarrateResponse> => {
    const response = await apiClient.post('/voice/narrate', payload);
    return response.data?.data ?? response.data;
  },
};
