import { Request, Response, NextFunction } from 'express';
import logger from '../config/logger';
import ModelDownloadManager, { ModelDownloadStatus } from '../config/modelDownload';
import ollamaService from '../services/OllamaService';
import sseService from '../services/sseService';
import { autoDetectAndConfigure } from '../config/aiModels';

// Get all available models
export const getAvailableModels = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const systemConfig = autoDetectAndConfigure();
    const availableModels = systemConfig.recommendations;
    
    res.json({
      success: true,
      data: {
        systemRAM: systemConfig.availableRAM,
        tier: systemConfig.tier,
        availableModels,
        defaultModels: systemConfig.config.defaults,
        resourceLimits: systemConfig.config.resourceLimits,
      },
    });
  } catch (error) {
    logger.error('Failed to get available models:', error);
    next(error);
  }
};

// Get download status for all models
export const getDownloadStatuses = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const statuses = ModelDownloadManager.getAllDownloadStatuses();
    const stats = ModelDownloadManager.getDownloadStats();
    
    res.json({
      success: true,
      data: {
        statuses,
        stats,
      },
    });
  } catch (error) {
    logger.error('Failed to get download statuses:', error);
    next(error);
  }
};

// Get download status for a specific model
export const getModelDownloadStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { modelId } = req.params;
    const status = ModelDownloadManager.getDownloadStatus(modelId);
    
    if (!status) {
      res.status(404).json({
        success: false,
        message: 'Model download status not found',
      });
      return;
    }
    
    res.json({
      success: true,
      data: status,
    });
  } catch (error) {
    logger.error('Failed to get model download status:', error);
    next(error);
  }
};

// Download a model
export const downloadModel = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { modelId } = req.params;
    const { maxRetries = 3 } = req.body;
    
    // Check if model is already downloaded
    const existingStatus = ModelDownloadManager.getDownloadStatus(modelId);
    if (existingStatus && (existingStatus.status === 'downloading' || existingStatus.status === 'completed')) {
      res.json({
        success: true,
        message: 'Model is already downloaded or downloading',
        data: existingStatus,
      });
      return;
    }
    
    // Add to download queue
    ModelDownloadManager.addToDownloadQueue(modelId, maxRetries);
    
    // Subscribe to status updates for this request
    ModelDownloadManager.subscribeToDownloadStatus(modelId, (status: ModelDownloadStatus) => {
      // In a real implementation, you might use WebSocket or SSE for real-time updates
      // For now, we'll just log the progress
      logger.info(`Download progress for ${modelId}: ${status.progress.percentage.toFixed(1)}%`);
    });
    
    res.json({
      success: true,
      message: 'Model download started',
      data: {
        modelId,
        status: 'pending',
        maxRetries,
      },
    });
  } catch (error) {
    logger.error('Failed to start model download:', error);
    next(error);
  }
};

// Cancel model download
export const cancelModelDownload = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelId } = req.params;
    
    ModelDownloadManager.cancelDownload(modelId);
    
    res.json({
      success: true,
      message: 'Model download cancelled',
    });
  } catch (error) {
    logger.error('Failed to cancel model download:', error);
    next(error);
  }
};

// Clear completed downloads
export const clearCompletedDownloads = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    ModelDownloadManager.clearCompletedDownloads();
    
    res.json({
      success: true,
      message: 'Completed downloads cleared',
    });
  } catch (error) {
    logger.error('Failed to clear completed downloads:', error);
    next(error);
  }
};

// Get system information
export const getSystemInfo = async (_req: Request, res: Response, next: NextFunction) => {
  try {
    const systemConfig = autoDetectAndConfigure();
    const ollamaHealthy = await ollamaService.checkHealth();
    
    // Get currently loaded models (this would need to be implemented in OllamaService)
    const loadedModels = await getCurrentlyLoadedModels();
    
    res.json({
      success: true,
      data: {
        system: {
          ramGB: systemConfig.availableRAM,
          tier: systemConfig.tier,
          config: systemConfig.config,
        },
        services: {
          ollama: {
            healthy: ollamaHealthy,
            url: process.env.OLLAMA_BASE_URL || 'http://localhost:11434',
          },
        },
        models: {
          available: systemConfig.recommendations,
          loaded: loadedModels,
          downloading: Object.values(ModelDownloadManager.getAllDownloadStatuses())
            .filter(status => status.status === 'downloading')
            .map(status => status.modelId),
        },
        downloadStats: ModelDownloadManager.getDownloadStats(),
      },
    });
  } catch (error) {
    logger.error('Failed to get system info:', error);
    next(error);
  }
};

// Get currently loaded models (placeholder implementation)
async function getCurrentlyLoadedModels(): Promise<string[]> {
  try {
    // This would typically call Ollama API to get loaded models
    // For now, return empty array
    return [];
  } catch (error) {
    logger.error('Failed to get currently loaded models:', error);
    return [];
  }
}

// Test a model
export const testModel = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const { modelId } = req.params;
    const { prompt = "Hello, how are you?" } = req.body;
    
    // Test the model
    const response = await ollamaService.generateText(prompt, {
      model: modelId,
      task: 'text',
    });
    
    res.json({
      success: true,
      data: {
        modelId,
        prompt,
        response,
        testedAt: new Date(),
      },
    });
  } catch (error) {
    logger.error('Failed to test model:', error);
    next(error);
  }
};

// Subscribe to download updates via SSE
export const subscribeToDownloadUpdates = async (req: Request, res: Response, next: NextFunction) => {
  try {
    const clientId = sseService.addClient(req, res);
    
    // Subscribe to model download status updates
    ModelDownloadManager.subscribeToDownloadStatus('*', (status: ModelDownloadStatus) => {
      sseService.sendDownloadStatus(status.modelId, status);
    });
    
    logger.info(`Client ${clientId} subscribed to download updates`);
    
    // Keep the connection open
    req.on('close', () => {
      logger.info(`Client ${clientId} disconnected from download updates`);
    });
    
  } catch (error) {
    logger.error('Failed to subscribe to download updates:', error);
    next(error);
  }
};
