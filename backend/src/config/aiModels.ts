// AI Models Configuration for 20GB RAM System
// Optimized models that can run efficiently on systems with 20GB RAM

export interface AIModelConfig {
  name: string;
  type: 'text' | 'vision' | 'embedding' | 'voice';
  provider: 'ollama' | 'local' | 'huggingface';
  modelId: string;
  parameters: {
    contextLength?: number;
    maxTokens?: number;
    temperature?: number;
    topP?: number;
    repetitionPenalty?: number;
  };
  memoryUsage: number; // Estimated RAM usage in GB
  diskUsage: number; // Estimated disk usage in GB
  description: string;
  capabilities: string[];
}

export const AI_MODELS: Record<string, AIModelConfig> = {
  // Text Generation Models (Suitable for 20GB RAM)
  'llama3-8b': {
    name: 'Llama 3 8B',
    type: 'text',
    provider: 'ollama',
    modelId: 'llama3:8b',
    parameters: {
      contextLength: 8192,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 8,
    diskUsage: 4.7,
    description: 'Meta\'s Llama 3 8B parameter model - excellent for general text generation',
    capabilities: ['text-generation', 'story-writing', 'dialogue', 'script-generation'],
  },
  
  'mistral-7b': {
    name: 'Mistral 7B',
    type: 'text',
    provider: 'ollama',
    modelId: 'mistral:7b',
    parameters: {
      contextLength: 32768,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 7,
    diskUsage: 4.1,
    description: 'Mistral AI 7B parameter model - fast and efficient for text tasks',
    capabilities: ['text-generation', 'story-writing', 'dialogue', 'summarization'],
  },
  
  'qwen2-7b': {
    name: 'Qwen2 7B',
    type: 'text',
    provider: 'ollama',
    modelId: 'qwen2:7b',
    parameters: {
      contextLength: 32768,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 7,
    diskUsage: 4.1,
    description: 'Alibaba Qwen2 7B parameter model - multilingual support',
    capabilities: ['text-generation', 'story-writing', 'multilingual', 'script-generation'],
  },
  
  'llama3.2-latest': {
    name: 'Llama 3.2 Latest',
    type: 'text',
    provider: 'ollama',
    modelId: 'llama3.2:latest',
    parameters: {
      contextLength: 131072,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 8,
    diskUsage: 4.9,
    description: 'Meta latest Llama 3.2 model with enhanced capabilities and larger context',
    capabilities: ['text-generation', 'story-writing', 'dialogue', 'script-generation', 'reasoning'],
  },
  
  'mistral-latest': {
    name: 'Mistral Latest',
    type: 'text',
    provider: 'ollama',
    modelId: 'mistral:latest',
    parameters: {
      contextLength: 32768,
      maxTokens: 4096,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 7,
    diskUsage: 4.2,
    description: 'Latest Mistral model with improved performance and capabilities',
    capabilities: ['text-generation', 'story-writing', 'dialogue', 'script-generation', 'summarization'],
  },
  
  'gemma3-latest': {
    name: 'Gemma 3 Latest',
    type: 'text',
    provider: 'ollama',
    modelId: 'gemma3:latest',
    parameters: {
      contextLength: 8192,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 6,
    diskUsage: 3.8,
    description: 'Google latest Gemma 3 model optimized for dialogue and instruction following',
    capabilities: ['text-generation', 'dialogue', 'instruction-following', 'creative-writing'],
  },
  
  'phi3-mini': {
    name: 'Phi-3 Mini',
    type: 'text',
    provider: 'ollama',
    modelId: 'phi3:mini',
    parameters: {
      contextLength: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 3.8,
    diskUsage: 2.2,
    description: 'Microsoft Phi-3 Mini - lightweight and efficient for quick tasks',
    capabilities: ['text-generation', 'dialogue', 'quick-generation', 'low-latency'],
  },
  
  // Vision Models (Suitable for 20GB RAM)
  'llava-7b': {
    name: 'LLaVA 7B',
    type: 'vision',
    provider: 'ollama',
    modelId: 'llava:7b',
    parameters: {
      contextLength: 4096,
      maxTokens: 2048,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 8,
    diskUsage: 4.5,
    description: 'LLaVA 7B parameter vision-language model for image understanding',
    capabilities: ['image-analysis', 'panel-description', 'scene-understanding', 'visual-storytelling'],
  },
  
  'bakllava-1b': {
    name: 'BakLLaVA 1B',
    type: 'vision',
    provider: 'ollama',
    modelId: 'bakllava:1b',
    parameters: {
      contextLength: 2048,
      maxTokens: 1024,
      temperature: 0.7,
      topP: 0.9,
      repetitionPenalty: 1.1,
    },
    memoryUsage: 2,
    diskUsage: 1.2,
    description: 'Lightweight vision model for quick image analysis',
    capabilities: ['image-analysis', 'panel-description', 'quick-vision-tasks'],
  },
  
  // Embedding Models (Memory Efficient)
  'all-minilm': {
    name: 'All-MiniLM',
    type: 'embedding',
    provider: 'local',
    modelId: 'sentence-transformers/all-MiniLM-L6-v2',
    parameters: {
      maxTokens: 512,
    },
    memoryUsage: 0.5,
    diskUsage: 0.4,
    description: 'Lightweight embedding model for text similarity',
    capabilities: ['text-embedding', 'similarity-search', 'semantic-search'],
  },
  
  'bge-small': {
    name: 'BGE Small',
    type: 'embedding',
    provider: 'local',
    modelId: 'BAAI/bge-small-en-v1.5',
    parameters: {
      maxTokens: 512,
    },
    memoryUsage: 0.4,
    diskUsage: 0.3,
    description: 'Efficient embedding model for semantic search',
    capabilities: ['text-embedding', 'similarity-search', 'semantic-search'],
  },
};

// Default model selections for different tasks
export const DEFAULT_MODELS = {
  textGeneration: 'llama3.2:latest', // Latest Llama 3.2 model
  quickText: 'phi3:mini', // Fast for quick tasks
  visionAnalysis: 'llava-7b', // Good for image understanding
  quickVision: 'bakllava-1b', // Lightweight vision tasks
  embedding: 'all-minilm', // Efficient embeddings
  scriptGeneration: 'mistral:latest', // Latest Mistral model
  dialogue: 'gemma3:latest', // Latest Gemma 3 model for dialogue
};

// RAM Tier Configuration
export const RAM_TIERS = {
  LOW: { min: 0, max: 4, name: 'Low RAM (≤4GB)' },
  MEDIUM: { min: 4, max: 8, name: 'Medium RAM (4-8GB)' },
  HIGH: { min: 8, max: 16, name: 'High RAM (8-16GB)' },
  ULTRA: { min: 16, max: Infinity, name: 'Ultra RAM (16GB+)' },
};

// Tier-specific model configurations
export const TIERED_MODEL_CONFIGS = {
  [RAM_TIERS.LOW.name]: {
    // 4GB RAM Systems - Ultra lightweight models
    available: ['phi3-mini', 'bakllava-1b', 'all-minilm'],
    defaults: {
      textGeneration: 'phi3-mini',
      quickText: 'phi3-mini',
      visionAnalysis: 'bakllava-1b',
      quickVision: 'bakllava-1b',
      embedding: 'all-minilm',
      scriptGeneration: 'phi3-mini',
      dialogue: 'phi3-mini',
    },
    resourceLimits: {
      maxConcurrentModels: 1,
      memoryThreshold: 0.8,
      modelUnloadTimeout: 180000, // 3 minutes
    },
    description: 'Optimized for systems with ≤4GB RAM',
  },
  [RAM_TIERS.MEDIUM.name]: {
    // 8GB RAM Systems - Balanced performance
    available: ['phi3-mini', 'mistral-latest', 'gemma3-latest', 'bakllava-1b', 'all-minilm'],
    defaults: {
      textGeneration: 'mistral-latest',
      quickText: 'phi3-mini',
      visionAnalysis: 'bakllava-1b',
      quickVision: 'bakllava-1b',
      embedding: 'all-minilm',
      scriptGeneration: 'mistral-latest',
      dialogue: 'gemma3-latest',
    },
    resourceLimits: {
      maxConcurrentModels: 2,
      memoryThreshold: 0.75,
      modelUnloadTimeout: 240000, // 4 minutes
    },
    description: 'Optimized for systems with 4-8GB RAM',
  },
  [RAM_TIERS.HIGH.name]: {
    // 16GB RAM Systems - Good performance
    available: ['phi3-mini', 'llama3.2-latest', 'mistral-latest', 'gemma3-latest', 'llava-7b', 'bakllava-1b', 'all-minilm'],
    defaults: {
      textGeneration: 'llama3.2-latest',
      quickText: 'phi3-mini',
      visionAnalysis: 'llava-7b',
      quickVision: 'bakllava-1b',
      embedding: 'all-minilm',
      scriptGeneration: 'mistral-latest',
      dialogue: 'gemma3-latest',
    },
    resourceLimits: {
      maxConcurrentModels: 2,
      memoryThreshold: 0.8,
      modelUnloadTimeout: 300000, // 5 minutes
    },
    description: 'Optimized for systems with 8-16GB RAM',
  },
  [RAM_TIERS.ULTRA.name]: {
    // 16GB+ RAM Systems - Maximum performance
    available: ['phi3-mini', 'llama3.2-latest', 'mistral-latest', 'gemma3-latest', 'llava-7b', 'bakllava-1b', 'all-minilm'],
    defaults: {
      textGeneration: 'llama3.2-latest',
      quickText: 'phi3-mini',
      visionAnalysis: 'llava-7b',
      quickVision: 'bakllava-1b',
      embedding: 'all-minilm',
      scriptGeneration: 'mistral-latest',
      dialogue: 'gemma3-latest',
    },
    resourceLimits: {
      maxConcurrentModels: 3,
      memoryThreshold: 0.85,
      modelUnloadTimeout: 600000, // 10 minutes
    },
    description: 'Optimized for systems with 16GB+ RAM',
  },
};

// Get current RAM tier
export const getCurrentRAMTier = (availableRAM: number): keyof typeof TIERED_MODEL_CONFIGS => {
  if (availableRAM <= RAM_TIERS.LOW.max) return RAM_TIERS.LOW.name;
  if (availableRAM <= RAM_TIERS.MEDIUM.max) return RAM_TIERS.MEDIUM.name;
  if (availableRAM <= RAM_TIERS.HIGH.max) return RAM_TIERS.HIGH.name;
  return RAM_TIERS.ULTRA.name;
};

// Get model recommendations for specific RAM tier
export const getModelRecommendations = (availableRAM: number) => {
  const tier = getCurrentRAMTier(availableRAM);
  return TIERED_MODEL_CONFIGS[tier].available;
};

// Get default models for specific RAM tier
export const getDefaultModelsForTier = (availableRAM: number) => {
  const tier = getCurrentRAMTier(availableRAM);
  return TIERED_MODEL_CONFIGS[tier].defaults;
};

// Get resource limits for specific RAM tier
export const getResourceLimitsForTier = (availableRAM: number) => {
  const tier = getCurrentRAMTier(availableRAM);
  return TIERED_MODEL_CONFIGS[tier].resourceLimits;
};

// Auto-detect system RAM and configure accordingly
export const autoDetectAndConfigure = () => {
  // This would typically use a system library to detect RAM
  // For now, we'll use environment variable or default to 16GB
  const detectedRAM = parseInt(process.env.SYSTEM_RAM_GB || '16');
  const tier = getCurrentRAMTier(detectedRAM);
  
  return {
    tier,
    availableRAM: detectedRAM,
    config: TIERED_MODEL_CONFIGS[tier],
    recommendations: getModelRecommendations(detectedRAM),
  };
};

// Model compatibility matrix
export const MODEL_COMPATIBILITY = {
  'phi3-mini': {
    minRAM: 2,
    recommendedRAM: 4,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.LOW.name, RAM_TIERS.MEDIUM.name, RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'bakllava-1b': {
    minRAM: 2,
    recommendedRAM: 4,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.LOW.name, RAM_TIERS.MEDIUM.name, RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'all-minilm': {
    minRAM: 1,
    recommendedRAM: 2,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.LOW.name, RAM_TIERS.MEDIUM.name, RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'mistral-7b': {
    minRAM: 6,
    recommendedRAM: 8,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.MEDIUM.name, RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'qwen2-7b': {
    minRAM: 6,
    recommendedRAM: 8,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.MEDIUM.name, RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'llava-7b': {
    minRAM: 8,
    recommendedRAM: 12,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
  'llama3-8b': {
    minRAM: 8,
    recommendedRAM: 12,
    maxRAM: Infinity,
    tiers: [RAM_TIERS.HIGH.name, RAM_TIERS.ULTRA.name],
  },
};

// Resource monitoring configuration
export const RESOURCE_LIMITS = {
  maxConcurrentModels: 2, // Maximum models to run simultaneously
  memoryThreshold: 0.8, // Stop loading models at 80% RAM usage
  diskThreshold: 0.9, // Stop loading models at 90% disk usage
  modelUnloadTimeout: 300000, // Unload models after 5 minutes of inactivity (ms)
};

// Model loading strategies
export const LOADING_STRATEGIES = {
  LAZY: 'lazy', // Load models only when needed
  EAGER: 'eager', // Load models on startup
  HYBRID: 'hybrid', // Load frequently used models eagerly, others lazily
};
