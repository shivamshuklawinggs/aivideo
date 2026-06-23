import axios from 'axios';
import logger from '../config/logger';
import ModelDownloadManager from '../config/modelDownload';

// AI Service Types - Local Only
export type AIProvider = 'ollama' | 'openai' | 'cohere' | 'huggingface' | 'local';

export interface AIServiceConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  options?: Record<string, any>;
}

// Local Docker Service URLs
const LOCAL_SERVICE_URLS = {
  ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
  openai: process.env.OPENAI_BASE_URL || 'http://localhost:8000/v1',
  cohere: process.env.COHERE_BASE_URL || 'http://localhost:15001/v1',
  huggingface: process.env.HUGGINGFACE_BASE_URL || 'http://localhost:8080',
  embedding: process.env.EMBEDDING_BASE_URL || 'http://localhost:15002',
  xtts: process.env.XTTS_BASE_URL || 'http://localhost:8002',
};

export interface AIRequest {
  prompt: string;
  type: 'text' | 'vision' | 'embedding' | 'voice';
  options?: {
    temperature?: number;
    maxTokens?: number;
    topP?: number;
    topK?: number;
    frequencyPenalty?: number;
    presencePenalty?: number;
    model?: string;
  };
}

export interface AIResponse {
  text: string;
  model: string;
  provider: AIProvider;
  usage?: {
    promptTokens?: number;
    completionTokens?: number;
    totalTokens?: number;
  };
  metadata?: Record<string, any>;
}

// AI Service Manager Class - Local Only
export class AIServiceManager {
  private services: Map<AIProvider, any> = new Map();

  constructor() {
    this.initializeLocalServices();
  }

  private initializeLocalServices(): void {
    // Ollama - Local AI Model Server
    this.services.set('ollama', {
      type: 'ollama',
      baseUrl: LOCAL_SERVICE_URLS.ollama,
      healthy: false,
      lastCheck: new Date(0),
    });
    logger.info('Ollama service configured for local Docker');

    // OpenAI Compatible - Local LLM Server
    this.services.set('openai', {
      type: 'openai',
      baseUrl: LOCAL_SERVICE_URLS.openai,
      healthy: false,
      lastCheck: new Date(0),
    });
    logger.info('OpenAI compatible service configured for local Docker');

    // Cohere Compatible - Local API Server
    this.services.set('cohere', {
      type: 'cohere',
      baseUrl: LOCAL_SERVICE_URLS.cohere,
      healthy: false,
      lastCheck: new Date(0),
    });
    logger.info('Cohere compatible service configured for local Docker');

    // HuggingFace Inference - Local Server
    this.services.set('huggingface', {
      type: 'huggingface',
      baseUrl: LOCAL_SERVICE_URLS.huggingface,
      healthy: false,
      lastCheck: new Date(0),
    });
    logger.info('HuggingFace service configured for local Docker');

    // Local Embedding Service
    this.services.set('local', {
      type: 'local',
      baseUrl: LOCAL_SERVICE_URLS.embedding,
      healthy: false,
      lastCheck: new Date(0),
    });
    logger.info('Local embedding service configured');
  }

  // Get the best provider for a specific task
  private getBestProviderForTask(task: string, preferredModel?: string): { provider: AIProvider; model: string } {
    // Priority order for local services
    const providerPriority: AIProvider[] = ['ollama', 'openai', 'cohere', 'huggingface', 'local'];
    
    for (const provider of providerPriority) {
      const service = this.services.get(provider);
      if (service && service.healthy) {
        const model = preferredModel || this.getDefaultModelForProvider(provider, task);
        return { provider, model };
      }
    }

    // Fallback to first available service
    const firstProvider = providerPriority.find(p => this.services.get(p));
    if (firstProvider) {
      const model = preferredModel || this.getDefaultModelForProvider(firstProvider, task);
      return { provider: firstProvider, model };
    }

    // Default to ollama
    return { provider: 'ollama', model: preferredModel || 'phi3:mini' };
  }

  private getDefaultModelForProvider(provider: AIProvider, task: string): string {
    const defaults: Record<AIProvider, Record<string, string>> = {
      ollama: {
        text: 'phi3:mini',
        vision: 'bakllava:1b',
        embedding: 'all-minilm:l6-v2',
        voice: 'phi3:mini'
      },
      openai: {
        text: 'gpt-3.5-turbo',
        vision: 'gpt-4-vision-preview',
        embedding: 'text-embedding-ada-002',
        voice: 'tts-1'
      },
      cohere: {
        text: 'command-light',
        vision: 'command-vision',
        embedding: 'embed-english-v3.0',
        voice: 'command'
      },
      huggingface: {
        text: 'microsoft/DialoGPT-medium',
        vision: 'nlpconnect/vit-gpt2-image-captioning',
        embedding: 'sentence-transformers/all-MiniLM-L6-v2',
        voice: 'facebook/musicgen-small'
      },
      local: {
        text: 'local-model',
        vision: 'local-vision',
        embedding: 'local-embedding',
        voice: 'local-tts'
      }
    };

    return defaults[provider]?.[task] || 'phi3:mini';
  }

  // Generate text using the best available provider
  async generateText(request: AIRequest): Promise<AIResponse> {
    const { provider, model } = this.getBestProviderForTask('text', request.options?.model);
    const service = this.services.get(provider);

    if (!service) {
      throw new Error(`Service ${provider} is not available`);
    }

    // For Ollama, check if model is available and download if needed
    if (provider === 'ollama') {
      await this.ensureModelAvailable(model);
    }

    try {
      let result: any;

      switch (provider) {
        case 'ollama':
          result = await this.generateTextWithOllama(service, model, request);
          break;
        case 'openai':
          result = await this.generateTextWithOpenAI(service, model, request);
          break;
        case 'cohere':
          result = await this.generateTextWithCohere(service, model, request);
          break;
        case 'huggingface':
          result = await this.generateTextWithHuggingFace(service, model, request);
          break;
        case 'local':
          result = await this.generateTextWithLocal(service, model, request);
          break;
        default:
          throw new Error(`Unsupported provider: ${provider}`);
      }

      return {
        text: result.text || result.content || result,
        model,
        provider,
        usage: result.usage,
        metadata: result.metadata,
      };
    } catch (error) {
      logger.error(`Failed to generate text with ${provider}:`, error);
      throw error;
    }
  }

  // Generate text with Ollama (local)
  private async generateTextWithOllama(service: any, model: string, request: AIRequest): Promise<any> {
    const response = await axios.post(`${service.baseUrl}/api/generate`, {
      model,
      prompt: request.prompt,
      stream: false,
      options: {
        temperature: request.options?.temperature || 0.7,
        top_p: request.options?.topP || 0.9,
        top_k: request.options?.topK || 40,
      },
    });
    return response.data;
  }

  // Generate text with OpenAI compatible (local)
  private async generateTextWithOpenAI(service: any, model: string, request: AIRequest): Promise<any> {
    const response = await axios.post(`${service.baseUrl}/chat/completions`, {
      model,
      messages: [{ role: 'user', content: request.prompt }],
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.maxTokens || 2048,
    });
    return response.data.choices[0].message;
  }

  // Generate text with Cohere compatible (local)
  private async generateTextWithCohere(service: any, model: string, request: AIRequest): Promise<any> {
    const response = await axios.post(`${service.baseUrl}/v1/generate`, {
      model,
      prompt: request.prompt,
      temperature: request.options?.temperature || 0.7,
      max_tokens: request.options?.maxTokens || 2048,
    });
    return response.data.generations[0];
  }

  // Generate text with HuggingFace (local)
  private async generateTextWithHuggingFace(service: any, model: string, request: AIRequest): Promise<any> {
    const response = await axios.post(`${service.baseUrl}/models/${model}`, {
      inputs: request.prompt,
      parameters: {
        temperature: request.options?.temperature || 0.7,
        max_new_tokens: request.options?.maxTokens || 2048,
      },
    });
    return response.data[0];
  }

  // Generate text with Local service
  private async generateTextWithLocal(service: any, model: string, request: AIRequest): Promise<any> {
    const response = await axios.post(`${service.baseUrl}/generate`, {
      model,
      prompt: request.prompt,
      options: request.options,
    });
    return response.data;
  }

  // Ensure model is available for Ollama (download if needed)
  private async ensureModelAvailable(modelId: string): Promise<void> {
    try {
      // Check if model is already available
      const availableModels = await this.getAvailableModels();
      const ollamaModels = availableModels.ollama || [];
      const modelExists = ollamaModels.some((model: any) => model.name === modelId);

      if (!modelExists) {
        logger.info(`Model ${modelId} not available, starting download...`);
        
        // Check if already downloading
        const downloadStatus = ModelDownloadManager.getDownloadStatus(modelId);
        if (downloadStatus && (downloadStatus.status === 'downloading' || downloadStatus.status === 'pending')) {
          logger.info(`Model ${modelId} is already downloading, waiting for completion...`);
          await this.waitForDownloadCompletion(modelId);
        } else {
          // Start download
          ModelDownloadManager.addToDownloadQueue(modelId, 3);
          await this.waitForDownloadCompletion(modelId);
        }
      }
    } catch (error) {
      logger.error(`Failed to ensure model availability for ${modelId}:`, error);
      throw error;
    }
  }

  // Wait for model download to complete
  private async waitForDownloadCompletion(modelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      const checkStatus = () => {
        const status = ModelDownloadManager.getDownloadStatus(modelId);
        
        if (!status) {
          reject(new Error(`Download status not found for model ${modelId}`));
          return;
        }

        if (status.status === 'completed') {
          logger.info(`Model ${modelId} download completed successfully`);
          resolve();
        } else if (status.status === 'failed') {
          reject(new Error(`Model ${modelId} download failed: ${status.error?.message}`));
        } else {
          // Still downloading, check again in 2 seconds
          setTimeout(checkStatus, 2000);
        }
      };

      checkStatus();
    });
  }

  // Get available models from all local services
  async getAvailableModels(): Promise<Record<string, any[]>> {
    const models: Record<string, any[]> = {
      ollama: [],
      openai: [],
      cohere: [],
      huggingface: [],
      local: [],
    };

    // Get Ollama models
    try {
      const ollamaService = this.services.get('ollama');
      if (ollamaService) {
        const response = await axios.get(`${ollamaService.baseUrl}/api/tags`);
        models.ollama = response.data.models || [];
      }
    } catch (error) {
      logger.warn('Failed to get Ollama models:', error);
    }

    // For other local services, we can provide mock models or static lists
    models.openai = [{ id: 'gpt-3.5-turbo', name: 'GPT-3.5 Turbo (Local)' }];
    models.cohere = [{ id: 'command-light', name: 'Command Light (Local)' }];
    models.huggingface = [{ id: 'microsoft/DialoGPT-medium', name: 'DialoGPT Medium (Local)' }];
    models.local = [{ id: 'local-model', name: 'Local Model' }];

    return models;
  }

  // Check service health
  async checkHealth(): Promise<Record<AIProvider, boolean>> {
    const health: Record<AIProvider, boolean> = {
      ollama: false,
      openai: false,
      cohere: false,
      huggingface: false,
      local: false,
    };

    // Check Ollama
    try {
      const ollamaService = this.services.get('ollama');
      if (ollamaService) {
        await axios.get(`${ollamaService.baseUrl}/api/tags`, { timeout: 5000 });
        health.ollama = true;
      }
    } catch (error) {
      health.ollama = false;
    }

    // Check OpenAI compatible
    try {
      const openaiService = this.services.get('openai');
      if (openaiService) {
        await axios.get(`${openaiService.baseUrl}/models`, { timeout: 5000 });
        health.openai = true;
      }
    } catch (error) {
      health.openai = false;
    }

    // Check Cohere compatible
    try {
      const cohereService = this.services.get('cohere');
      if (cohereService) {
        await axios.post(`${cohereService.baseUrl}/v1/embed`, { texts: ['test'] }, { timeout: 5000 });
        health.cohere = true;
      }
    } catch (error) {
      health.cohere = false;
    }

    // Check HuggingFace
    try {
      const hfService = this.services.get('huggingface');
      if (hfService) {
        await axios.get(`${hfService.baseUrl}/health`, { timeout: 5000 });
        health.huggingface = true;
      }
    } catch (error) {
      health.huggingface = false;
    }

    // Check Local embedding service
    try {
      const localService = this.services.get('local');
      if (localService) {
        await axios.post(`${localService.baseUrl}/embed`, { texts: ['test'] }, { timeout: 5000 });
        health.local = true;
      }
    } catch (error) {
      health.local = false;
    }

    return health;
  }

  // Generate embeddings
  async generateEmbedding(texts: string[]): Promise<number[][]> {
    const localService = this.services.get('local');
    if (!localService) {
      throw new Error('Local embedding service is not available');
    }

    try {
      const response = await axios.post(`${localService.baseUrl}/embed`, { texts });
      return response.data.embeddings;
    } catch (error) {
      logger.error('Failed to generate embeddings:', error);
      throw error;
    }
  }

  // Generate voice synthesis
  async generateVoice(text: string, voice?: string): Promise<any> {
    const xttsService = this.services.get('local');
    if (!xttsService) {
      throw new Error('Local TTS service is not available');
    }

    try {
      const response = await axios.post(`${LOCAL_SERVICE_URLS.xtts}/tts`, {
        text,
        voice: voice || 'default',
      });
      return response.data;
    } catch (error) {
      logger.error('Failed to generate voice:', error);
      throw error;
    }
  }
}

// Singleton instance
export const aiServiceManager = new AIServiceManager();
export default aiServiceManager;
