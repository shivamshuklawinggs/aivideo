import axios from 'axios';
import logger from '../config/logger';
import ModelDownloadManager from '../config/modelDownload';

// AI Service Types - Ollama Only
export type AIProvider = 'ollama';

export interface AIServiceConfig {
  provider: AIProvider;
  model: string;
  baseUrl?: string;
  options?: Record<string, any>;
}

// Local Docker Service URLs - Ollama Only
const LOCAL_SERVICE_URLS = {
  ollama: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
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
  }

  // Get the best provider for a specific task
  private getBestProviderForTask(task: string, preferredModel?: string): { provider: AIProvider; model: string } {
    // Only Ollama is available
    const providerPriority: AIProvider[] = ['ollama'];
    
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

  // Unused provider methods removed - only Ollama is supported

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

  // Get available models from Ollama only
  async getAvailableModels(): Promise<Record<string, any[]>> {
    const models: Record<string, any[]> = {
      ollama: [],
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

    return models;
  }

  // Check service health
  async checkHealth(): Promise<Record<AIProvider, boolean>> {
    const health: Record<AIProvider, boolean> = {
      ollama: false,
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

    // Only Ollama is supported - other service health checks removed

    return health;
  }

  // Generate embeddings using Ollama
  async generateEmbedding(texts: string[]): Promise<number[][]> {
    const ollamaService = this.services.get('ollama');
    if (!ollamaService) {
      throw new Error('Ollama service is not available');
    }

    try {
      const response = await axios.post(`${ollamaService.baseUrl}/api/embeddings`, {
        model: 'all-minilm:l6-v2',
        prompt: texts.join(' ')
      });
      return [response.data.embedding];
    } catch (error) {
      logger.error('Failed to generate embeddings with Ollama:', error);
      throw error;
    }
  }

  // Generate voice synthesis - Not supported with Ollama only
  async generateVoice(_text: string, _voice?: string): Promise<any> {
    throw new Error('Voice synthesis not supported with Ollama-only configuration. Please integrate a separate TTS service if needed.');
  }
}

// Singleton instance
export const aiServiceManager = new AIServiceManager();
export default aiServiceManager;
