import api from './authAPI';

export const webtoonAPI = {
  getWebtoons: async (params: { page?: number; limit?: number; search?: string }) => {
    const response = await api.get('/webtoons', { params });
    return response.data;
  },

  getWebtoonById: async (id: string) => {
    const response = await api.get(`/webtoons/${id}`);
    return response.data;
  },

  uploadWebtoon: async (formData: FormData) => {
    const response = await api.post('/webtoons/upload', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  },

  updateWebtoon: async (id: string, data: any) => {
    const response = await api.put(`/webtoons/${id}`, data);
    return response.data;
  },

  deleteWebtoon: async (id: string) => {
    const response = await api.delete(`/webtoons/${id}`);
    return response.data;
  },

  getChapters: async (webtoonId: string) => {
    const response = await api.get(`/webtoons/${webtoonId}/chapters`);
    return response.data;
  },

  getChapterById: async (webtoonId: string, chapterId: string) => {
    const response = await api.get(`/webtoons/${webtoonId}/chapters/${chapterId}`);
    return response.data;
  },

  getPanels: async (chapterId: string) => {
    const response = await api.get(`/chapters/${chapterId}/panels`);
    return response.data;
  },

  getPanelById: async (panelId: string) => {
    const response = await api.get(`/panels/${panelId}`);
    return response.data;
  },

  generateScript: async (webtoonId: string, options?: any) => {
    const response = await api.post(`/webtoons/${webtoonId}/generate-script`, options);
    return response.data;
  },

  updateWebtoonMetadata: async (webtoonId: string, metadata: any) => {
    const response = await api.put(`/webtoons/${webtoonId}/metadata`, metadata);
    return response.data;
  },

  togglePublicStatus: async (webtoonId: string) => {
    const response = await api.put(`/webtoons/${webtoonId}/toggle-public`);
    return response.data;
  },

  incrementViews: async (webtoonId: string) => {
    const response = await api.post(`/webtoons/${webtoonId}/views`);
    return response.data;
  },
};
