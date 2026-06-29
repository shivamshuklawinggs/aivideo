import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

export interface VoiceSample {
  id: string;
  name: string;
  description: string;
  gender: 'male' | 'female';
  ageRange: 'young' | 'adult' | 'senior';
  language: string;
  filePath: string;
  sampleRate: number;
  bitrate: number;
  duration: number;
  fileSize: number;
  isDefault: boolean;
  tags: string[];
}

class VoiceSampleService {
  private voiceSamples: VoiceSample[] = [];
  private samplesConfigPath: string;

  constructor() {
    this.samplesConfigPath = path.join(process.cwd(), 'public', 'voice-samples', 'voice-samples.json');
    this.loadVoiceSamples();
  }

  private loadVoiceSamples(): void {
    try {
      if (fs.existsSync(this.samplesConfigPath)) {
        const configData = fs.readFileSync(this.samplesConfigPath, 'utf-8');
        const config = JSON.parse(configData);
        this.voiceSamples = config.voiceSamples || [];
        logger.info(`Loaded ${this.voiceSamples.length} voice samples`);
      } else {
        logger.warn('Voice samples config file not found, using empty list');
        this.voiceSamples = [];
      }
    } catch (error) {
      logger.error('Error loading voice samples:', error);
      this.voiceSamples = [];
    }
  }

  // Get all available voice samples
  getAllVoiceSamples(): VoiceSample[] {
    return this.voiceSamples;
  }

  // Get voice sample by ID
  getVoiceSampleById(id: string): VoiceSample | null {
    return this.voiceSamples.find(sample => sample.id === id) || null;
  }

  // Get default voice sample
  getDefaultVoiceSample(): VoiceSample | null {
    return this.voiceSamples.find(sample => sample.isDefault) || 
           this.voiceSamples[0] || 
           null;
  }

  // Get voice samples by gender
  getVoiceSamplesByGender(gender: 'male' | 'female'): VoiceSample[] {
    return this.voiceSamples.filter(sample => sample.gender === gender);
  }

  // Get voice samples by tags
  getVoiceSamplesByTags(tags: string[]): VoiceSample[] {
    return this.voiceSamples.filter(sample => 
      tags.some(tag => sample.tags.includes(tag))
    );
  }

  // Get voice samples suitable for narration
  getNarratorVoiceSamples(): VoiceSample[] {
    return this.getVoiceSamplesByTags(['narrator']);
  }

  // Get voice samples suitable for characters
  getCharacterVoiceSamples(): VoiceSample[] {
    return this.getVoiceSamplesByTags(['character']);
  }

  // Get the full file path for a voice sample
  getVoiceSampleFilePath(sample: VoiceSample): string {
    return path.join(process.cwd(), 'public', sample.filePath);
  }

  // Check if voice sample file exists
  voiceSampleFileExists(sample: VoiceSample): boolean {
    const fullPath = this.getVoiceSampleFilePath(sample);
    return fs.existsSync(fullPath);
  }

  // Get voice sample for AI processing
  getVoiceSampleForAI(sampleId?: string): VoiceSample | null {
    if (sampleId) {
      const sample = this.getVoiceSampleById(sampleId);
      if (sample && this.voiceSampleFileExists(sample)) {
        return sample;
      }
    }
    
    // Fall back to default
    const defaultSample = this.getDefaultVoiceSample();
    if (defaultSample && this.voiceSampleFileExists(defaultSample)) {
      return defaultSample;
    }
    
    return null;
  }

  // Get voice sample data as base64 for AI processing
  getVoiceSampleAsBase64(sampleId?: string): { data: string; sample: VoiceSample } | null {
    const sample = this.getVoiceSampleForAI(sampleId);
    if (!sample) {
      return null;
    }

    try {
      const filePath = this.getVoiceSampleFilePath(sample);
      const audioBuffer = fs.readFileSync(filePath);
      const base64Data = audioBuffer.toString('base64');
      
      return {
        data: base64Data,
        sample
      };
    } catch (error) {
      logger.error(`Error reading voice sample file for ${sample.id}:`, error);
      return null;
    }
  }

  // Get recommended voice sample based on context
  getRecommendedVoiceSample(context: {
    type?: 'narration' | 'character' | 'explanation';
    gender?: 'male' | 'female';
    ageRange?: 'young' | 'adult' | 'senior';
  }): VoiceSample | null {
    let candidates = this.voiceSamples;

    // Filter by type
    if (context.type === 'narration' || context.type === 'explanation') {
      candidates = this.getNarratorVoiceSamples();
    } else if (context.type === 'character') {
      candidates = this.getCharacterVoiceSamples();
    }

    // Filter by gender
    if (context.gender) {
      candidates = candidates.filter(sample => sample.gender === context.gender);
    }

    // Filter by age range
    if (context.ageRange) {
      candidates = candidates.filter(sample => sample.ageRange === context.ageRange);
    }

    // Return first match or default
    return candidates[0] || this.getDefaultVoiceSample();
  }
}

// Export singleton instance
export default new VoiceSampleService();
