import api from './authAPI';

export const voiceAPI = {
  getVoiceProfiles: async (params: { page?: number; limit?: number }) => {
    const response = await api.get('/voice-profiles', { params });
    return response.data;
  },

  getVoiceProfileById: async (id: string) => {
    const response = await api.get(`/voice-profiles/${id}`);
    return response.data;
  },

  uploadVoiceSample: async (formData: FormData) => {
    const response = await api.post('/voice-profiles/upload-sample', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  createVoiceProfile: async (data: { name: string; description?: string; sampleAudioFile: File; characteristics?: any }) => {
    const formData = new FormData();
    formData.append('name', data.name);
    if (data.description) formData.append('description', data.description);
    formData.append('sampleAudio', data.sampleAudioFile);
    if (data.characteristics) {
      formData.append('characteristics', JSON.stringify(data.characteristics));
    }

    const response = await api.post('/voice-profiles', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateVoiceProfile: async (id: string, data: any) => {
    const response = await api.put(`/voice-profiles/${id}`, data);
    return response.data;
  },

  deleteVoiceProfile: async (id: string) => {
    const response = await api.delete(`/voice-profiles/${id}`);
    return response.data;
  },

  setDefaultVoiceProfile: async (id: string) => {
    const response = await api.put(`/voice-profiles/${id}/set-default`);
    return response.data;
  },

  testVoiceProfile: async (id: string, text: string) => {
    const response = await api.post(`/voice-profiles/${id}/test`, { text });
    return response.data;
  },

  getVoiceProfileStats: async (id: string) => {
    const response = await api.get(`/voice-profiles/${id}/stats`);
    return response.data;
  },

  cloneVoiceFromSample: async (sampleFile: File, profileName: string) => {
    const formData = new FormData();
    formData.append('sample', sampleFile);
    formData.append('name', profileName);

    const response = await api.post('/voice-profiles/clone', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  getVoicePresets: async () => {
    const response = await api.get('/voice-profiles/presets');
    return response.data;
  },

  analyzeVoiceSample: async (sampleFile: File) => {
    const formData = new FormData();
    formData.append('sample', sampleFile);

    const response = await api.post('/voice-profiles/analyze', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },
};
