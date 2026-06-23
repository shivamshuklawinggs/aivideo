// Model Download Configuration and Status Tracking

export interface ModelDownloadStatus {
  modelId: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed' | 'retrying';
  progress: {
    downloaded: number; // bytes
    total: number; // bytes
    percentage: number; // 0-100
    speed: number; // bytes per second
    eta: number; // estimated time remaining in seconds
  };
  error?: {
    message: string;
    code?: string;
    retryCount: number;
    lastRetry: Date;
  };
  startTime: Date;
  endTime?: Date;
  retryCount: number;
  maxRetries: number;
}

export interface ModelDownloadQueue {
  [modelId: string]: ModelDownloadStatus;
}

export class ModelDownloadManager {
  private downloadQueue: ModelDownloadQueue = {};
  private activeDownloads: Map<string, AbortController> = new Map();
  private downloadCallbacks: Map<string, (status: ModelDownloadStatus) => void> = new Map();
  private retryDelay: number = 5000; // 5 seconds

  // Add model to download queue
  public addToDownloadQueue(modelId: string, maxRetries: number = 3): void {
    if (this.downloadQueue[modelId]) {
      console.log(`Model ${modelId} is already in download queue`);
      return;
    }

    this.downloadQueue[modelId] = {
      modelId,
      status: 'pending',
      progress: {
        downloaded: 0,
        total: 0,
        percentage: 0,
        speed: 0,
        eta: 0,
      },
      startTime: new Date(),
      retryCount: 0,
      maxRetries,
    };

    console.log(`Added model ${modelId} to download queue`);
    this.processDownloadQueue();
  }

  // Get download status for a model
  public getDownloadStatus(modelId: string): ModelDownloadStatus | null {
    return this.downloadQueue[modelId] || null;
  }

  // Get all download statuses
  public getAllDownloadStatuses(): ModelDownloadQueue {
    return { ...this.downloadQueue };
  }

  // Subscribe to download status updates
  public subscribeToDownloadStatus(modelId: string, callback: (status: ModelDownloadStatus) => void): void {
    this.downloadCallbacks.set(modelId, callback);
  }

  // Unsubscribe from download status updates
  public unsubscribeFromDownloadStatus(modelId: string): void {
    this.downloadCallbacks.delete(modelId);
  }

  // Process download queue
  private async processDownloadQueue(): Promise<void> {
    const pendingDownloads = Object.entries(this.downloadQueue)
      .filter(([_, status]) => status.status === 'pending');

    for (const [modelId, _status] of pendingDownloads) {
      this.downloadModel(modelId);
    }
  }

  // Download a specific model
  private async downloadModel(modelId: string): Promise<void> {
    const status = this.downloadQueue[modelId];
    if (!status) return;

    status.status = 'downloading';
    status.startTime = new Date();
    this.notifyStatusUpdate(modelId, status);

    const abortController = new AbortController();
    this.activeDownloads.set(modelId, abortController);

    try {
      await this.performModelDownload(modelId, abortController.signal);
      
      status.status = 'completed';
      status.endTime = new Date();
      status.progress.percentage = 100;
      this.notifyStatusUpdate(modelId, status);
      
      console.log(`Successfully downloaded model ${modelId}`);
    } catch (error: any) {
      status.status = 'failed';
      status.error = {
        message: error.message || 'Unknown error',
        code: error.code,
        retryCount: status.retryCount,
        lastRetry: new Date(),
      };
      status.endTime = new Date();
      this.notifyStatusUpdate(modelId, status);

      console.error(`Failed to download model ${modelId}:`, error);

      // Retry logic
      if (status.retryCount < status.maxRetries) {
        setTimeout(() => {
          this.retryDownload(modelId);
        }, this.retryDelay);
      }
    } finally {
      this.activeDownloads.delete(modelId);
    }
  }

  // Perform the actual model download
  private async performModelDownload(modelId: string, signal: AbortSignal): Promise<void> {
    const status = this.downloadQueue[modelId];
    if (!status) throw new Error(`Model ${modelId} not found in queue`);

    // Get model size information (this would typically come from Ollama API)
    const modelInfo = await this.getModelInfo(modelId);
    status.progress.total = modelInfo.size;

    // Start the download process
    const response = await fetch(`${process.env.OLLAMA_BASE_URL || 'http://localhost:11434'}/api/pull`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        name: modelId,
      }),
      signal,
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    // Process the download stream
    const reader = response.body?.getReader();
    if (!reader) {
      throw new Error('No response body');
    }

    const decoder = new TextDecoder();
    let lastProgressUpdate = Date.now();

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      const chunk = decoder.decode(value);
      const lines = chunk.split('\n').filter(line => line.trim());

      for (const line of lines) {
        try {
          const data = JSON.parse(line);
          
          // Update progress based on Ollama's pull response format
          if (data.status === 'pulling' && data.digest) {
            // This is a simplified progress calculation
            // In reality, Ollama provides more detailed progress information
            const progress = this.calculateProgress(data, modelInfo);
            
            status.progress.downloaded = progress.downloaded;
            status.progress.percentage = progress.percentage;
            status.progress.speed = progress.speed;
            status.progress.eta = progress.eta;

            // Notify status updates every 1 second
            const now = Date.now();
            if (now - lastProgressUpdate > 1000) {
              this.notifyStatusUpdate(modelId, status);
              lastProgressUpdate = now;
            }
          }
        } catch (e) {
          // Ignore JSON parsing errors for non-JSON lines
        }
      }
    }
  }

  // Calculate download progress
  private calculateProgress(data: any, modelInfo: any): {
    downloaded: number;
    percentage: number;
    speed: number;
    eta: number;
  } {
    // This is a simplified calculation
    // In reality, you'd parse Ollama's actual progress data
    const downloaded = data.completed || 0;
    const total = modelInfo.size;
    const percentage = Math.min(100, (downloaded / total) * 100);
    
    const now = Date.now();
    const timeElapsed = (now - (data.startTime || now)) / 1000; // seconds
    const speed = timeElapsed > 0 ? downloaded / timeElapsed : 0;
    const remaining = total - downloaded;
    const eta = speed > 0 ? remaining / speed : 0;

    return {
      downloaded,
      percentage,
      speed,
      eta,
    };
  }

  // Get model information (size, etc.)
  private async getModelInfo(modelId: string): Promise<{ size: number; name: string }> {
    // This would typically call Ollama API to get model information
    // For now, we'll use estimated sizes based on model names
    const modelSizes: Record<string, number> = {
      'phi3:mini': 2.2 * 1024 * 1024 * 1024, // 2.2GB
      'bakllava:1b': 1.2 * 1024 * 1024 * 1024, // 1.2GB
      'mistral:7b': 4.1 * 1024 * 1024 * 1024, // 4.1GB
      'qwen2:7b': 4.1 * 1024 * 1024 * 1024, // 4.1GB
      'llava:7b': 4.5 * 1024 * 1024 * 1024, // 4.5GB
      'llama3:8b': 4.7 * 1024 * 1024 * 1024, // 4.7GB
    };

    return {
      size: modelSizes[modelId] || 4 * 1024 * 1024 * 1024, // Default 4GB
      name: modelId,
    };
  }

  // Retry failed download
  private async retryDownload(modelId: string): Promise<void> {
    const status = this.downloadQueue[modelId];
    if (!status || status.retryCount >= status.maxRetries) {
      return;
    }

    status.status = 'retrying';
    status.retryCount++;
    status.error = {
      message: status.error?.message || 'Unknown error',
      retryCount: status.retryCount,
      lastRetry: new Date(),
    };
    
    this.notifyStatusUpdate(modelId, status);
    console.log(`Retrying download for model ${modelId} (attempt ${status.retryCount}/${status.maxRetries})`);

    // Reset progress for retry
    status.progress = {
      downloaded: 0,
      total: status.progress.total,
      percentage: 0,
      speed: 0,
      eta: 0,
    };

    await this.downloadModel(modelId);
  }

  // Cancel download
  public cancelDownload(modelId: string): void {
    const abortController = this.activeDownloads.get(modelId);
    if (abortController) {
      abortController.abort();
      this.activeDownloads.delete(modelId);
    }

    const status = this.downloadQueue[modelId];
    if (status) {
      status.status = 'failed';
      status.endTime = new Date();
      status.error = {
        message: 'Download cancelled by user',
        retryCount: status.retryCount,
        lastRetry: new Date(),
      };
      this.notifyStatusUpdate(modelId, status);
    }
  }

  // Clear completed downloads
  public clearCompletedDownloads(): void {
    Object.keys(this.downloadQueue).forEach(modelId => {
      const status = this.downloadQueue[modelId];
      if (status && (status.status === 'completed' || status.status === 'failed')) {
        delete this.downloadQueue[modelId];
        this.downloadCallbacks.delete(modelId);
      }
    });
  }

  // Notify status updates
  private notifyStatusUpdate(modelId: string, status: ModelDownloadStatus): void {
    const callback = this.downloadCallbacks.get(modelId);
    if (callback) {
      callback(status);
    }
  }

  // Get download statistics
  public getDownloadStats(): {
    total: number;
    pending: number;
    downloading: number;
    completed: number;
    failed: number;
    retrying: number;
  } {
    const stats = {
      total: Object.keys(this.downloadQueue).length,
      pending: 0,
      downloading: 0,
      completed: 0,
      failed: 0,
      retrying: 0,
    };

    Object.values(this.downloadQueue).forEach(status => {
      stats[status.status]++;
    });

    return stats;
  }
}

// Export singleton instance
export default new ModelDownloadManager();
