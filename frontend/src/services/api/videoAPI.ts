import api from './authAPI';

export const videoAPI = {
  getVideos: async (params: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/videos', { params });
    return response.data;
  },

  getVideoById: async (id: string) => {
    const response = await api.get(`/videos/${id}`);
    return response.data;
  },

  generateVideo: async (data: { scriptId: string; voiceProfileId?: string; title: string; config?: any }) => {
    const response = await api.post('/videos/generate', data);
    return response.data;
  },

  updateVideo: async (id: string, data: any) => {
    const response = await api.put(`/videos/${id}`, data);
    return response.data;
  },

  deleteVideo: async (id: string) => {
    const response = await api.delete(`/videos/${id}`);
    return response.data;
  },

  renderVideo: async (id: string) => {
    const response = await api.post(`/videos/${id}/render`);
    return response.data;
  },

  getRenderJobs: async (params: { page?: number; limit?: number; status?: string }) => {
    const response = await api.get('/render-jobs', { params });
    return response.data;
  },

  getRenderJobById: async (id: string) => {
    const response = await api.get(`/render-jobs/${id}`);
    return response.data;
  },

  cancelRenderJob: async (id: string) => {
    const response = await api.post(`/render-jobs/${id}/cancel`);
    return response.data;
  },

  retryRenderJob: async (id: string) => {
    const response = await api.post(`/render-jobs/${id}/retry`);
    return response.data;
  },

  updateVideoScenes: async (id: string, scenes: any[]) => {
    const response = await api.put(`/videos/${id}/scenes`, { scenes });
    return response.data;
  },

  updateVideoConfig: async (id: string, config: any) => {
    const response = await api.put(`/videos/${id}/config`, config);
    return response.data;
  },

  getVideoPresets: async () => {
    const response = await api.get('/videos/presets');
    return response.data;
  },

  previewVideo: async (id: string, options?: { quality?: string; format?: string }) => {
    const response = await api.get(`/videos/${id}/preview`, { params: options });
    return response.data;
  },

  exportVideo: async (id: string, options: { format: string; quality: string; resolution: string }) => {
    const response = await api.post(`/videos/${id}/export`, options);
    return response.data;
  },

  getVideoStats: async (id: string) => {
    const response = await api.get(`/videos/${id}/stats`);
    return response.data;
  },

  likeVideo: async (id: string) => {
    const response = await api.post(`/videos/${id}/like`);
    return response.data;
  },

  unlikeVideo: async (id: string) => {
    const response = await api.delete(`/videos/${id}/like`);
    return response.data;
  },

  shareVideo: async (id: string, options: { platform: string; message?: string }) => {
    const response = await api.post(`/videos/${id}/share`, options);
    return response.data;
  },

  duplicateVideo: async (id: string, title: string) => {
    const response = await api.post(`/videos/${id}/duplicate`, { title });
    return response.data;
  },
};
