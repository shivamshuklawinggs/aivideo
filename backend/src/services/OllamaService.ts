import axios from 'axios';
import logger from '../config/logger';
import { 
  AI_MODELS,
  DEFAULT_MODELS,
  getDefaultModelsForTier,
  autoDetectAndConfigure
} from '../config/aiModels';
import ModelDownloadManager, { ModelDownloadStatus } from '../config/modelDownload';
import AIServiceManager, { AIRequest } from './aiServiceManager';

interface OllamaVisionRequest {
  model: string;
  prompt: string;
  images: string[];
  stream?: boolean;
}

class OllamaService {
  private baseUrl: string;
  private loadedModels: Map<string, any> = new Map();
  private currentModels: Map<string, string> = new Map();
  private modelUsageTimeout: Map<string, NodeJS.Timeout> = new Map();
  private systemConfig: any;
  private currentRAMTier: string = '';
  private resourceLimits: any;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.initializeSystemConfiguration();
    this.initializeModels();
  }

  private initializeSystemConfiguration(): void {
    // Auto-detect system configuration
    this.systemConfig = autoDetectAndConfigure();
    this.currentRAMTier = this.systemConfig.tier;
    this.resourceLimits = this.systemConfig.config.resourceLimits;
    
    logger.info(`System configured for ${this.currentRAMTier} with ${this.systemConfig.availableRAM}GB RAM`);
    logger.info(`Available models: ${this.systemConfig.recommendations.join(', ')}`);
  }

  private initializeModels(): void {
    // Set default models based on system RAM tier
    const tierDefaults = getDefaultModelsForTier(this.systemConfig.availableRAM);
    this.currentModels.set('text', tierDefaults.textGeneration);
    this.currentModels.set('vision', tierDefaults.visionAnalysis);
    this.currentModels.set('quick', tierDefaults.quickText);
    this.currentModels.set('script', tierDefaults.scriptGeneration);
    this.currentModels.set('dialogue', tierDefaults.dialogue);
  }

  private getModelForTask(task: string): string {
    const modelKey = this.currentModels.get(task);
    if (modelKey && AI_MODELS[modelKey]) {
      return AI_MODELS[modelKey].modelId;
    }
    
    // Fallback to default models
    const fallbacks: Record<string, string> = {
      'text': DEFAULT_MODELS.textGeneration,
      'vision': DEFAULT_MODELS.visionAnalysis,
      'quick': DEFAULT_MODELS.quickText,
      'script': DEFAULT_MODELS.scriptGeneration,
      'dialogue': DEFAULT_MODELS.dialogue
    };
    
    const fallbackKey = fallbacks[task] || 'text';
    return AI_MODELS[fallbackKey]?.modelId || DEFAULT_MODELS.textGeneration;
  }

  private async loadModel(modelId: string): Promise<void> {
    if (this.loadedModels.has(modelId)) {
      this.resetModelTimeout(modelId);
      return;
    }

    try {
      // Check if model is available
      const response = await axios.get(`${this.baseUrl}/api/tags`);
      const models = response.data.models || [];
      const modelExists = models.some((model: any) => model.name === modelId);
      
      if (!modelExists) {
        logger.warn(`Model ${modelId} not found, starting download...`);
        await this.downloadModelWithProgress(modelId);
      }

      this.loadedModels.set(modelId, Date.now());
      this.resetModelTimeout(modelId);
      logger.info(`Model ${modelId} loaded successfully`);
    } catch (error) {
      logger.error(`Failed to load model ${modelId}:`, error);
      throw error;
    }
  }

  // Download model with progress tracking and retry logic
  private async downloadModelWithProgress(modelId: string): Promise<void> {
    return new Promise((resolve, reject) => {
      // Subscribe to download status updates
      ModelDownloadManager.subscribeToDownloadStatus(modelId, (status: ModelDownloadStatus) => {
        logger.info(`Model ${modelId} download progress: ${status.progress.percentage.toFixed(1)}% (${status.progress.downloaded}/${status.progress.total} bytes)`);
        
        if (status.status === 'completed') {
          logger.info(`Model ${modelId} download completed successfully`);
          ModelDownloadManager.unsubscribeFromDownloadStatus(modelId);
          resolve();
        } else if (status.status === 'failed' && status.retryCount >= status.maxRetries) {
          logger.error(`Model ${modelId} download failed after ${status.maxRetries} retries`);
          ModelDownloadManager.unsubscribeFromDownloadStatus(modelId);
          reject(new Error(`Failed to download model ${modelId}: ${status.error?.message}`));
        }
      });

      // Start the download
      ModelDownloadManager.addToDownloadQueue(modelId, 3);
    });
  }

  
  private resetModelTimeout(modelId: string): void {
    // Clear existing timeout
    const existingTimeout = this.modelUsageTimeout.get(modelId);
    if (existingTimeout) {
      clearTimeout(existingTimeout);
    }

    // Set new timeout for auto-unload based on tier configuration
    const timeout = setTimeout(() => {
      this.unloadModel(modelId);
    }, this.resourceLimits.modelUnloadTimeout);

    this.modelUsageTimeout.set(modelId, timeout);
  }

  private unloadModel(modelId: string): void {
    if (this.loadedModels.has(modelId)) {
      this.loadedModels.delete(modelId);
      const timeout = this.modelUsageTimeout.get(modelId);
      if (timeout) {
        clearTimeout(timeout);
        this.modelUsageTimeout.delete(modelId);
      }
      logger.info(`Model ${modelId} unloaded due to inactivity`);
    }
  }

  private async checkResourceLimits(): Promise<void> {
    const loadedCount = this.loadedModels.size;
    const maxConcurrent = this.resourceLimits.maxConcurrentModels;
    
    if (loadedCount >= maxConcurrent) {
      // Unload least recently used model
      const oldestModel = Array.from(this.loadedModels.entries())
        .sort(([,a], [,b]) => a - b)[0][0];
      this.unloadModel(oldestModel);
      logger.info(`Unloaded model ${oldestModel} due to concurrent limit (${loadedCount}/${maxConcurrent})`);
    }
  }

  async generateText(prompt: string, options?: any): Promise<string> {
    try {
      await this.checkResourceLimits();
      const task = options?.task || 'text';
      const modelId = this.getModelForTask(task);
      await this.loadModel(modelId);

      // Use AI Service Manager with npm packages and automatic model management
      const aiRequest: AIRequest = {
        prompt,
        type: 'text',
        options: {
          temperature: options?.temperature || 0.7,
          maxTokens: options?.maxTokens || 2048,
          topP: options?.topP || 0.9,
          topK: options?.topK || 40,
          model: modelId,
        },
      };

      const response = await AIServiceManager.generateText(aiRequest);
      logger.info(`Generated text using ${response.provider} with model ${response.model}`);
      return response.text;
    } catch (error: any) {
      logger.error('AI text generation error:', error);
      
      // If Ollama fails, try fallback providers
      if (error.message?.includes('Failed to generate text with AI service')) {
        logger.info('Attempting fallback to alternative AI providers...');
        try {
          const fallbackRequest: AIRequest = {
            prompt,
            type: 'text',
            options: {
              temperature: options?.temperature || 0.7,
              maxTokens: options?.maxTokens || 2048,
              topP: options?.topP || 0.9,
              topK: options?.topK || 40,
              // Don't specify model for fallback - let AI Service Manager choose
            },
          };
          
          const response = await AIServiceManager.generateText(fallbackRequest);
          logger.info(`Fallback successful using ${response.provider} with model ${response.model}`);
          return response.text;
        } catch (fallbackError) {
          logger.error('All AI providers failed:', fallbackError);
          throw new Error('Failed to generate text with any AI provider');
        }
      }
      
      throw new Error('Failed to generate text with AI service');
    }
  }

  async analyzeImage(imageBase64: string, prompt: string, options?: any): Promise<string> {
    try {
      await this.checkResourceLimits();
      const modelId = this.getModelForTask('vision');
      await this.loadModel(modelId);

      // Use options for model configuration if provided
      const modelConfig = options?.model ? AI_MODELS[options.model] : null;
      
      const response = await axios.post(`${this.baseUrl}/api/generate`, {
        model: modelId,
        prompt,
        images: [imageBase64],
        stream: false,
        options: options ? {
          temperature: options.temperature || modelConfig?.parameters.temperature,
          top_p: options.top_p || modelConfig?.parameters.topP,
        } : undefined,
      } as OllamaVisionRequest);

      return response.data.response;
    } catch (error) {
      logger.error('Ollama image analysis error:', error);
      throw new Error('Failed to analyze image with Ollama');
    }
  }

  async analyzePanels(panelImages: string[], options?: any): Promise<any[]> {
    const analyses = [];
    const useQuickMode = options?.quickMode || panelImages.length > 10;

    for (let i = 0; i < panelImages.length; i++) {
      const prompt = useQuickMode 
        ? `Briefly describe this manga/webtoon panel: main characters, actions, and key visual elements.`
        : `Analyze this manga/webtoon panel in detail. Describe:
1. Characters present and their expressions
2. Actions happening in the scene
3. Dialogue or text visible
4. Scene setting and atmosphere
5. Emotional tone
6. Important visual elements

Provide a comprehensive analysis.`;

      try {
        const analysis = await this.analyzeImage(panelImages[i], prompt, { task: useQuickMode ? 'quick' : 'vision' });
        analyses.push({
          panelIndex: i,
          analysis,
          model: useQuickMode ? 'bakllava-1b' : 'llava-7b',
        });
      } catch (error) {
        logger.error(`Error analyzing panel ${i}:`, error);
        analyses.push({
          panelIndex: i,
          analysis: 'Analysis failed',
          error: true,
        });
      }
    }

    return analyses;
  }

  async generateStoryScript(panelAnalyses: any[], metadata: any): Promise<any> {
    const analysisText = panelAnalyses
      .map((p, i) => `Panel ${i + 1}: ${p.analysis}`)
      .join('\n\n');

    const prompt = `You are a professional YouTube manga/webtoon explanation narrator. Based on the following panel analyses, create an engaging video script.

${analysisText}

Webtoon metadata: ${JSON.stringify(metadata || {})}

Create a script with:
1. HOOK: An attention-grabbing opening (2-3 sentences)
2. SUMMARY: Brief overview of the story (3-4 sentences)
3. DETAILED_EXPLANATION: Scene-by-scene narration with suspense and emotion
4. KEY_CHARACTERS: List main characters with descriptions
5. KEY_EVENTS: Important plot points
6. EMOTIONS: Emotional beats throughout the story
7. ENDING: Engaging conclusion with call-to-action

Make it dramatic, engaging, and perfect for YouTube. Use storytelling techniques to maintain viewer retention.

Return ONLY valid JSON in this exact format:
{
  "hook": "string",
  "summary": "string",
  "detailedExplanation": "string",
  "ending": "string",
  "characters": [{"name": "string", "description": "string", "appearances": [1, 2, 3]}],
  "keyEvents": [{"event": "string", "panelNumbers": [1, 2], "importance": "high"}],
  "emotions": [{"emotion": "string", "intensity": 8, "panelNumbers": [1, 2]}],
  "scriptSegments": [{"panelNumber": 1, "narration": "string", "duration": 5.0}]
}`;

    try {
      const response = await this.generateText(prompt, { task: 'script' });
      
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        return JSON.parse(jsonMatch[0]);
      }
      
      throw new Error('Invalid JSON response from Ollama');
    } catch (error) {
      logger.error('Script generation error:', error);
      throw new Error('Failed to generate script');
    }
  }

  async checkHealth(): Promise<boolean> {
    try {
      const health = await AIServiceManager.checkHealth();
      return health.ollama || health.openai || health.cohere || health.huggingface || health.local;
    } catch (error) {
      logger.error('AI service health check failed:', error);
      return false;
    }
  }
}

export default new OllamaService();
