import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { AI_MODELS, DEFAULT_MODELS, RAM_TIERS } from '../config/aiModels';

interface ModelDownloadProgress {
  modelName: string;
  status: 'pending' | 'downloading' | 'completed' | 'failed';
  progress: number;
  error?: string;
  downloadedSize?: number;
  totalSize?: number;
}

class ModelDownloader {
  private ollamaBaseUrl: string;
  private downloadProgress: Map<string, ModelDownloadProgress> = new Map();
  private modelsDir: string;

  constructor() {
    this.ollamaBaseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.modelsDir = path.join(process.cwd(), '.ollama', 'models');
    this.ensureOllamaDirectory();
  }

  private ensureOllamaDirectory() {
    if (!fs.existsSync(this.modelsDir)) {
      fs.mkdirSync(this.modelsDir, { recursive: true });
    }
  }

  async downloadDefaultModels(): Promise<void> {
    console.log('🚀 Starting AI model download for Webtoon Explainer...\n');

    try {
      // Check if Ollama is running
      await this.checkOllamaStatus();

      // Get system RAM tier
      const ramTier = this.detectRamTier();
      console.log(`📊 Detected RAM Tier: ${ramTier.name}`);

      // Get models to download based on RAM tier
      const modelsToDownload = this.getModelsForTier(ramTier);
      console.log(`📋 Models to download: ${modelsToDownload.length}\n`);

      // Download models sequentially to avoid overwhelming the system
      for (const modelKey of modelsToDownload) {
        const model = AI_MODELS[modelKey];
        if (!model) {
          console.log(`⚠️  Model ${modelKey} not found in configuration`);
          continue;
        }

        await this.downloadModel(modelKey, model);
      }

      // Display download summary
      this.displayDownloadSummary();

    } catch (error) {
      console.error('❌ Model download failed:', error);
      throw error;
    }
  }

  private async checkOllamaStatus(): Promise<void> {
    console.log('🔍 Checking Ollama status...');
    
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      if (!response.ok) {
        throw new Error(`Ollama API responded with ${response.status}`);
      }
      console.log('✅ Ollama is running and accessible\n');
    } catch (error) {
      console.error('❌ Ollama is not running or not accessible');
      console.log('💡 Please make sure Ollama is installed and running:');
      console.log('   - Install: https://ollama.ai/');
      console.log('   - Start: ollama serve');
      throw error;
    }
  }

  private detectRamTier() {
    // For now, assume high RAM tier (8-16GB)
    // In a real implementation, you could detect actual system RAM
    return RAM_TIERS.HIGH;
  }

  private getModelsForTier(ramTier: any): string[] {
    // Essential models for webtoon explainer
    const essentialModels = [
      DEFAULT_MODELS.textGeneration,    // For script generation
      DEFAULT_MODELS.visionAnalysis,    // For panel analysis
      DEFAULT_MODELS.scriptGeneration,  // For creative writing
    ];

    // Add additional models based on RAM tier
    switch (ramTier.name) {
      case RAM_TIERS.ULTRA.name:
        return [...new Set([...essentialModels, DEFAULT_MODELS.dialogue, DEFAULT_MODELS.quickText])];
      case RAM_TIERS.HIGH.name:
        return essentialModels;
      case RAM_TIERS.MEDIUM.name:
        return [DEFAULT_MODELS.quickText, DEFAULT_MODELS.quickVision];
      case RAM_TIERS.LOW.name:
        return [DEFAULT_MODELS.quickText];
      default:
        return essentialModels;
    }
  }

  private async downloadModel(modelKey: string, model: any): Promise<void> {
    const progress: ModelDownloadProgress = {
      modelName: model.name,
      status: 'pending',
      progress: 0
    };
    
    this.downloadProgress.set(modelKey, progress);

    console.log(`📥 Processing ${model.name} (${model.diskUsage}GB)...`);
    
    try {
      // Check if model already exists and is complete
      const modelStatus = await this.checkModelStatus(model.modelId);
      
      if (modelStatus.exists && modelStatus.complete) {
        progress.status = 'completed';
        progress.progress = 100;
        console.log(`✅ ${model.name} already exists and is complete\n`);
        return;
      }
      
      if (modelStatus.exists && !modelStatus.complete) {
        console.log(`🔄 ${model.name} exists but incomplete, resuming download...`);
      } else {
        console.log(`📥 ${model.name} not found, starting fresh download...`);
      }
      
      progress.status = 'downloading';
      
      // Download model using Docker (Ollama automatically resumes interrupted downloads)
      await this.downloadWithOllama(model.modelId, modelKey);
      
      // Verify download completion
      const finalStatus = await this.checkModelStatus(model.modelId);
      if (finalStatus.complete) {
        progress.status = 'completed';
        progress.progress = 100;
        console.log(`✅ ${model.name} downloaded successfully\n`);
      } else {
        throw new Error('Download verification failed');
      }
      
    } catch (error) {
      progress.status = 'failed';
      progress.error = error instanceof Error ? error.message : 'Unknown error';
      
      // Check if it was an interruption that can be resumed
      const modelStatus = await this.checkModelStatus(model.modelId);
      if (modelStatus.exists && !modelStatus.complete) {
        console.log(`⚠️  ${model.name} download was interrupted and can be resumed`);
        console.log(`   💡 Re-run the downloader to resume: npm run download-models download`);
      } else {
        console.error(`❌ Failed to download ${model.name}:`, error);
      }
      console.log('');
    }
  }

  private async checkModelStatus(modelId: string): Promise<{ exists: boolean; complete: boolean; size?: number }> {
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      const data = await response.json() as { models?: { name: string; size: number; status: string }[] };
      
      const model = data.models?.find((m: any) => m.name === modelId);
      
      if (!model) {
        return { exists: false, complete: false };
      }
      
      // Check if model is complete (size > 0 and status indicates ready)
      const isComplete = model.size > 0 && (!model.status || model.status === 'ready');
      
      return { 
        exists: true, 
        complete: isComplete,
        size: model.size
      };
    } catch {
      return { exists: false, complete: false };
    }
  }

  
  private async downloadWithOllama(modelId: string, modelKey: string): Promise<void> {
    return new Promise((resolve, reject) => {
      console.log(`   🔄 Starting download of ${modelId} via Docker...`);
      
      // Use Docker to run ollama command inside the container
      const process = spawn('docker', ['exec', 'ollama', 'ollama', 'pull', modelId], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      let output = '';
      let errorOutput = '';
      let lastProgress = 0;

      process.stdout.on('data', (data) => {
        const chunk = data.toString();
        output += chunk;
        
        // Parse progress from ollama output
        const progressMatch = chunk.match(/(\d+)%/);
        if (progressMatch) {
          const progress = parseInt(progressMatch[1]);
          if (progress > lastProgress) {
            lastProgress = progress;
            this.updateProgress(modelKey, progress);
            console.log(`   📊 Download progress: ${progress}%`);
          }
        }

        // Show status messages
        if (chunk.includes('downloading')) {
          console.log(`   ⬇️  Downloading ${modelId}...`);
        }
        if (chunk.includes('verifying')) {
          console.log(`   ✅ Verifying ${modelId}...`);
        }
      });

      process.stderr.on('data', (data) => {
        errorOutput += data.toString();
        console.log(`   ⚠️  ${data.toString().trim()}`);
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`   ✅ Successfully downloaded ${modelId}`);
          resolve();
        } else {
          console.log(`   ❌ Failed to download ${modelId} (exit code: ${code})`);
          reject(new Error(`Ollama pull failed with code ${code}: ${errorOutput}`));
        }
      });

      process.on('error', (error) => {
        console.log(`   ❌ Docker error: ${error.message}`);
        console.log(`   💡 Make sure Docker is running and the ollama container is accessible`);
        console.log(`   🐳 Try: docker ps | grep ollama`);
        reject(new Error(`Failed to execute Docker command: ${error.message}`));
      });
    });
  }

  private updateProgress(modelKey: string, progressPercentage: number) {
    const progress = this.downloadProgress.get(modelKey);
    if (progress && progress.status === 'downloading') {
      progress.progress = Math.min(progressPercentage, 100);
    }
  }

  private displayDownloadSummary(): void {
    console.log('📊 Download Summary:');
    console.log('==================');
    
    let completed = 0;
    let failed = 0;
    let totalSize = 0;

    for (const [key, progress] of this.downloadProgress) {
      const model = AI_MODELS[key];
      const status = progress.status === 'completed' ? '✅' : 
                     progress.status === 'failed' ? '❌' : '⏳';
      
      console.log(`${status} ${progress.modelName} (${model?.diskUsage || 'Unknown'}GB)`);
      
      if (progress.status === 'completed') {
        completed++;
        totalSize += model?.diskUsage || 0;
      } else if (progress.status === 'failed') {
        failed++;
      }
    }

    console.log('\n📈 Summary:');
    console.log(`   Completed: ${completed}`);
    console.log(`   Failed: ${failed}`);
    console.log(`   Total Size: ${totalSize.toFixed(1)}GB`);
    console.log(`   Models Directory: ${this.modelsDir}`);
    
    if (completed > 0) {
      console.log('\n🎉 Model download completed! Your Webtoon Explainer is ready to use.');
      console.log('💡 You can now start the server with: npm run dev');
    } else {
      console.log('\n⚠️  No models were downloaded. Please check the errors above.');
    }
  }

  async listAvailableModels(): Promise<void> {
    console.log('🔍 Checking available models...\n');
    
    try {
      const response = await fetch(`${this.ollamaBaseUrl}/api/tags`);
      const data = await response.json() as { models?: { name: string; size: number; modified_at: string }[] };
      
      if (data.models && data.models.length > 0) {
        console.log('📋 Available Models:');
        console.log('====================');
        
        data.models.forEach((model: any) => {
          const sizeGB = (model.size / 1024 / 1024 / 1024).toFixed(1);
          console.log(`📦 ${model.name} (${sizeGB}GB)`);
          console.log(`   Modified: ${new Date(model.modified_at).toLocaleString()}`);
          console.log('');
        });
      } else {
        console.log('📭 No models found. Please run the model downloader first:');
        console.log('   npm run download-models');
      }
    } catch (error) {
      console.error('❌ Failed to list models:', error);
    }
  }

  async removeModel(modelName: string): Promise<void> {
    console.log(`🗑️  Removing model: ${modelName}`);
    
    return new Promise((resolve, reject) => {
      const process = spawn('ollama', ['rm', modelName], {
        stdio: ['pipe', 'pipe', 'pipe']
      });

      process.on('close', (code) => {
        if (code === 0) {
          console.log(`✅ Model ${modelName} removed successfully`);
          resolve();
        } else {
          reject(new Error(`Failed to remove model ${modelName}`));
        }
      });

      process.on('error', (error) => {
        reject(new Error(`Failed to remove model: ${error.message}`));
      });
    });
  }
}

// CLI interface
async function main() {
  const command = process.argv[2];
  const modelName = process.argv[3];

  const downloader = new ModelDownloader();

  try {
    switch (command) {
      case 'download':
        await downloader.downloadDefaultModels();
        break;
      case 'list':
        await downloader.listAvailableModels();
        break;
      case 'remove':
        if (!modelName) {
          console.error('❌ Please provide a model name to remove');
          console.log('Usage: npm run download-models remove <model-name>');
          process.exit(1);
        }
        await downloader.removeModel(modelName);
        break;
      default:
        console.log('🤖 AI Model Downloader for Webtoon Explainer');
        console.log('===========================================');
        console.log('');
        console.log('Usage:');
        console.log('  npm run download-models download    # Download default models');
        console.log('  npm run download-models list       # List available models');
        console.log('  npm run download-models remove <name>  # Remove a model');
        console.log('');
        console.log('Examples:');
        console.log('  npm run download-models download');
        console.log('  npm run download-models list');
        console.log('  npm run download-models remove llama3:8b');
        break;
    }
  } catch (error) {
    console.error('❌ Operation failed:', error);
    process.exit(1);
  }
}

// Run if called directly
if (require.main === module) {
  main();
}

export default ModelDownloader;
