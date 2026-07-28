import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';
import socketService from './socketService';

export interface AIGenerateContext {
  jobId?: string;
  chapterId?: string;
  panelIndex?: number;
  step?: string;
}

export interface OllamaGenerateOptions {
  prompt: string;
  system?: string;
  images?: string[]; // base64 encoded images
  temperature?: number;
  maxTokens?: number;
  format?: 'json' | '';
  context?: AIGenerateContext;
}

export interface OllamaResponse {
  model: string;
  response: string;
  done: boolean;
  total_duration?: number;
  eval_count?: number;
}

export interface VisionAnalysisResult {
  characters: string[];
  actions: string[];
  emotions: string[];
  scene: string;
  objects: string[];
  importantEvents: string[];
  description: string;
}

export interface OCRResult {
  speech: string[];
  narration: string[];
  captions: string[];
  soundEffects: string[];
  rawText: string;
}

class AIService {
  private client: AxiosInstance;
  private paddleClient: AxiosInstance;
  private baseUrl: string;
  private visionModel: string;
  private ollamaTimeout: number;
  private visionMaxRetries: number;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'llava';
    this.ollamaTimeout = parseInt(process.env.OLLAMA_TIMEOUT || '600000', 10); // default 10 min
    this.visionMaxRetries = parseInt(process.env.OLLAMA_VISION_RETRIES || '3', 10);

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: this.ollamaTimeout,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: { 'Content-Type': 'application/json' },
    });

    const paddleBaseUrl = process.env.PADDLEOCR_API_URL || 'http://localhost:8000';
    const paddleTimeout = parseInt(process.env.PADDLEOCR_TIMEOUT || '120000', 10);
    const paddleRetries = parseInt(process.env.PADDLEOCR_RETRIES || '3', 10);
    this.paddleClient = axios.create({
      baseURL: paddleBaseUrl,
      timeout: paddleTimeout,
      maxBodyLength: Infinity,
      maxContentLength: Infinity,
      headers: { 'Content-Type': 'application/json' },
    });

    logger.info(`AI service initialized: Ollama ${this.baseUrl} (timeout ${this.ollamaTimeout}ms, retries ${this.visionMaxRetries}), PaddleOCR ${paddleBaseUrl} (timeout ${paddleTimeout}ms, retries ${paddleRetries})`);
  }

  /**
   * Generate text response from Ollama with retry logic
   */
  async generate(options: OllamaGenerateOptions): Promise<string> {
    const { prompt, system, images, temperature = 0.7, format, context } = options;
    const maxRetries = this.visionMaxRetries;
    const { jobId, chapterId, panelIndex, step } = context || {};

    socketService.emitToContext({ jobId, chapterId }, 'ai:request:started', {
      chapterId,
      panelIndex,
      step: step || 'vision',
      model: this.visionModel,
      timestamp: new Date().toISOString(),
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      const startTime = Date.now();
      logger.info(
        `[Ollama] Request attempt ${attempt + 1}/${maxRetries + 1} to ${this.baseUrl}/api/generate ` +
        `(model: ${this.visionModel}, timeout: ${this.ollamaTimeout}ms, images: ${images?.length || 0}, ` +
        `promptLength: ${prompt.length}, maxTokens: ${options.maxTokens || 4096})`
      );

      try {
        const response = await this.client.post('/api/generate', {
          model: this.visionModel,
          prompt,
          system,
          images,
          stream: false,
          options: {
            temperature,
            num_predict: options.maxTokens || 4096,
          },
          ...(format ? { format } : {}),
        });

        const duration = Date.now() - startTime;
        logger.info(
          `[Ollama] Response received in ${duration}ms ` +
          `(model: ${this.visionModel}, evalCount: ${response.data?.eval_count}, responseLength: ${response.data?.response?.length || 0})`
        );

        socketService.emitToContext({ jobId, chapterId }, 'ai:request:completed', {
          chapterId,
          panelIndex,
          step: step || 'vision',
          model: this.visionModel,
          duration,
          evalCount: response.data?.eval_count,
          timestamp: new Date().toISOString(),
        });

        return response.data.response;
      } catch (error: any) {
        const duration = Date.now() - startTime;
        const isTimeout = error.code === 'ECONNABORTED' || error.message?.toLowerCase().includes('timeout');
        const isNetwork = ['ECONNREFUSED', 'ENOTFOUND', 'ECONNRESET', 'EPIPE'].includes(error.code);
        const status = error.response?.status;

        logger.error(`[Ollama] Attempt ${attempt + 1} failed after ${duration}ms`, {
          code: error.code,
          message: error.message,
          status,
          configTimeout: error.config?.timeout,
          baseURL: error.config?.baseURL,
          url: error.config?.url,
          isTimeout,
          isNetwork,
        });

        if (attempt < maxRetries && (isTimeout || isNetwork || status >= 500)) {
          const delay = Math.min(1000 * Math.pow(2, attempt), 30000); // 1s, 2s, 4s... max 30s
          logger.warn(`[Ollama] Retrying in ${delay}ms... (attempt ${attempt + 1}/${maxRetries})`);

          socketService.emitToContext({ jobId, chapterId }, 'ai:request:retry', {
            chapterId,
            panelIndex,
            step: step || 'vision',
            attempt: attempt + 1,
            maxRetries: maxRetries + 1,
            delay,
            error: {
              code: error.code,
              message: error.message,
              isTimeout,
              isNetwork,
              status,
            },
            timestamp: new Date().toISOString(),
          });

          await this.sleep(delay);
          continue;
        }

        socketService.emitToContext({ jobId, chapterId }, 'ai:request:error', {
          chapterId,
          panelIndex,
          step: step || 'vision',
          error: error.message,
          code: error.code,
          status,
          timestamp: new Date().toISOString(),
        });

        throw new Error(`AI generation failed: ${error.message} (code: ${error.code}, status: ${status})`);
      }
    }

    throw new Error('AI generation failed after all retries');
  }

  /**
   * Analyze a panel image for visual content.
   * Throws on failure so the caller can retry.
   */
  async analyzePanel(
    imageBase64: string,
    panelIndex: number,
    context?: AIGenerateContext
  ): Promise<VisionAnalysisResult> {
    const prompt = `You are analyzing panel ${panelIndex + 1} of a manga/webtoon chapter.

Analyze this image and extract the following in JSON format:
{
  "characters": ["list of character names or descriptions visible"],
  "actions": ["list of actions happening"],
  "emotions": ["list of emotions expressed"],
  "scene": "brief description of the scene/setting",
  "objects": ["notable objects in the panel"],
  "importantEvents": ["key story events happening"],
  "description": "A detailed 2-3 sentence description of what's happening in this panel"
}

Be specific and detailed. If you can't identify a character by name, describe them (e.g., "blonde girl", "tall man in black coat").
Return ONLY valid JSON, no markdown formatting. All text fields must be in English (use English transliterations for names when needed).`;

    const response = await this.generate({
      prompt,
      images: [imageBase64],
      temperature: 0.3,
      format: 'json',
      context: { ...context, panelIndex, step: 'vision' },
    });

    const parsed = this.parseJSON<VisionAnalysisResult>(response, {
      characters: [],
      actions: [],
      emotions: [],
      scene: '',
      objects: [],
      importantEvents: [],
      description: '',
    });

    logger.info(`Vision analysis parsed for panel ${panelIndex + 1}: ${parsed.description?.slice(0, 80) || '(empty)'}...`);
    return parsed;
  }

  /**
   * Extract text (OCR) from a panel image using the PaddleOCR Python API.
   * Retries on transient errors, but returns an empty fallback if OCR is unavailable.
   */
  async extractText(
    imageBase64: string,
    panelIndex: number,
    context?: AIGenerateContext
  ): Promise<OCRResult> {
    const maxRetries = parseInt(process.env.PADDLEOCR_RETRIES || '3', 10);

    const { jobId, chapterId } = context || {};

    socketService.emitToContext({ jobId, chapterId }, 'ai:request:started', {
      chapterId,
      panelIndex,
      step: 'ocr',
      timestamp: new Date().toISOString(),
    });

    for (let attempt = 0; attempt <= maxRetries; attempt++) {
      try {
        logger.info(`[OCR] Request attempt ${attempt + 1}/${maxRetries + 1} for panel ${panelIndex + 1}`);
        const response = await this.paddleClient.post('/ocr/base64', { image: imageBase64 });
        const data = response.data;
        const rawText = data?.text || '';
        const lines: string[] = (data?.lines || [])
          .map((line: any) => line.text?.trim())
          .filter(Boolean);

        logger.info(`[OCR] Panel ${panelIndex + 1} extracted ${lines.length} lines`);
        socketService.emitToContext({ jobId, chapterId }, 'ai:request:completed', {
          chapterId,
          panelIndex,
          step: 'ocr',
          lines: lines.length,
          timestamp: new Date().toISOString(),
        });
        return {
          speech: lines,
          narration: [],
          captions: [],
          soundEffects: [],
          rawText,
        };
      } catch (error: any) {
        logger.error(`[OCR] Attempt ${attempt + 1} failed for panel ${panelIndex + 1}:`, error.message);
        if (attempt < maxRetries) {
          const delay = 1000 * Math.pow(2, attempt);
          logger.warn(`[OCR] Retrying in ${delay}ms...`);
          await this.sleep(delay);
        }
      }
    }

    logger.warn(`[OCR] All attempts failed for panel ${panelIndex + 1}, returning empty OCR result`);
    socketService.emitToContext({ jobId, chapterId }, 'ai:request:error', {
      chapterId,
      panelIndex,
      step: 'ocr',
      fallback: 'empty',
      timestamp: new Date().toISOString(),
    });
    return {
      speech: [],
      narration: [],
      captions: [],
      soundEffects: [],
      rawText: '',
    };
  }

  /**
   * Generate a coherent story from panel analyses
   */
  async generateStory(
    panels: Array<{ ocr: OCRResult; vision: VisionAnalysisResult; panelIndex: number }>,
    combinedOcrText?: string
  ): Promise<{
    title: string;
    narrative: string;
    summary: string;
    narrationScript: string;
  }> {
    const panelSummaries = panels.map((p, i) => {
      const textContent = [
        ...p.ocr.speech.map(s => `"${s}"`),
        ...p.ocr.narration,
        p.ocr.rawText,
      ].filter(Boolean).join(' ');
      return `Panel ${i + 1}: ${p.vision.description}${textContent ? ` | Text: ${textContent}` : ''}`;
    }).join('\n');

    const combinedSection = combinedOcrText
      ? `Combined OCR text from all panels:\n${combinedOcrText}\n\n`
      : '';

const prompt = `You are an experienced English story writer and narrator.

Write the full story of the Manga/Webtoon chapter in English using the panel analyses below.

${combinedSection}PANEL ANALYSES:
${panelSummaries}

Return ONLY valid JSON with this structure:

{
  "title": "A compelling English chapter title",
  "narrative": "The complete story in 3-5 paragraphs, written like a novel or webtoon recap.",
  "summary": "A 2-3 sentence summary of the chapter.",
  "narrationScript": "A natural English voice-over script. Narrate the story panel by panel in order."
}

Important rules:

1. ALL output must be in English.
2. Use English transliterations for names when OCR contains them (e.g., "Sung Jin-Woo", "Tokyo").
3. Do not copy-paste OCR text; understand it and craft the story.
4. Connect all panels in the correct order into one continuous narrative.
5. Describe characters' emotions, the environment, tension, action, and dialogues naturally.
6. If a panel has no dialogue, describe the scene.
7. The narrationScript should sound like a YouTube Story Narrator.
8. Include proper pacing (...) and emotional variation in narrationScript.
9. Write roughly 1-2 sentences of narration per panel.
10. If OCR is wrong or incomplete, build the best story from the available image description.
11. Do not write any text outside the JSON.

Return ONLY valid JSON.`;
    try {
      const response = await this.generate({
        prompt,
        temperature: 0.7,
        maxTokens: 8192,
        format: 'json',
      });

      return this.parseJSON(response, {
        title: 'Untitled Chapter',
        narrative: '',
        summary: '',
        narrationScript: '',
      });
    } catch (error: any) {
      logger.error('Story generation failed:', error.message);
      throw new Error(`Story generation failed: ${error.message}`);
    }
  }

  /**
   * Check if Ollama is reachable and models are available
   */
  async healthCheck(): Promise<{ healthy: boolean; models: string[] }> {
    try {
      const response = await this.client.get('/api/tags');
      const models = (response.data.models || []).map((m: any) => m.name);
      return { healthy: true, models };
    } catch (error: any) {
      logger.error('AI health check failed:', error.message);
      return { healthy: false, models: [] };
    }
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  /**
   * Parse JSON from LLM response with fallback
   */
  private parseJSON<T>(response: string, fallback: T): T {
    try {
      // Try direct parse first
      return JSON.parse(response);
    } catch {
      // Try to extract JSON from markdown code blocks
      const jsonMatch = response.match(/```(?:json)?\s*([\s\S]*?)```/);
      if (jsonMatch) {
        try {
          return JSON.parse(jsonMatch[1].trim());
        } catch {
          // fall through
        }
      }

      // Try to find JSON object in the response
      const objMatch = response.match(/\{[\s\S]*\}/);
      if (objMatch) {
        try {
          return JSON.parse(objMatch[0]);
        } catch {
          // fall through
        }
      }

      logger.warn('Failed to parse AI response as JSON, using fallback');
      return fallback;
    }
  }
}

export default new AIService();
