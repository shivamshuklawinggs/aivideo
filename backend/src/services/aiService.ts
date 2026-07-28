import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';

export interface OllamaGenerateOptions {
  prompt: string;
  system?: string;
  images?: string[]; // base64 encoded images
  temperature?: number;
  maxTokens?: number;
  format?: 'json' | '';
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
    const { prompt, system, images, temperature = 0.7, format } = options;
    const maxRetries = this.visionMaxRetries;

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
          await this.sleep(delay);
          continue;
        }

        throw new Error(`AI generation failed: ${error.message} (code: ${error.code}, status: ${status})`);
      }
    }

    throw new Error('AI generation failed after all retries');
  }

  /**
   * Analyze a panel image for visual content.
   * Throws on failure so the caller can retry.
   */
  async analyzePanel(imageBase64: string, panelIndex: number): Promise<VisionAnalysisResult> {
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
Return ONLY valid JSON, no markdown formatting.`;

    const response = await this.generate({
      prompt,
      images: [imageBase64],
      temperature: 0.3,
      format: 'json',
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
  async extractText(imageBase64: string, panelIndex: number): Promise<OCRResult> {
    const maxRetries = parseInt(process.env.PADDLEOCR_RETRIES || '3', 10);

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

const prompt = `आप एक अनुभवी हिंदी कहानीकार (Story Writer) और नैरेटर हैं।

नीचे दिए गए Manga/Webtoon Panels के विश्लेषण के आधार पर पूरी कहानी हिंदी में लिखें।

${combinedSection}PANEL ANALYSES:
${panelSummaries}

नीचे दिए गए JSON Format में उत्तर दें:

{
  "title": "अध्याय का आकर्षक हिंदी शीर्षक",
  "narrative": "3-5 पैराग्राफ में पूरी कहानी। ऐसा लगे जैसे किसी उपन्यास या मैनहवा की कहानी सुनाई जा रही हो।",
  "summary": "2-3 वाक्यों में अध्याय का सारांश।",
  "narrationScript": "Voice-over के लिए प्राकृतिक हिंदी नैरेशन। हर Panel के अनुसार क्रमवार कहानी सुनाएँ।"
}

महत्वपूर्ण नियम:

1. पूरा उत्तर केवल हिंदी (देवनागरी) में होना चाहिए।
2. अंग्रेज़ी शब्दों का प्रयोग केवल तब करें जब OCR में वही नाम हो (जैसे Sung Jin-Woo, Tokyo आदि)।
3. OCR के टेक्स्ट को कॉपी-पेस्ट न करें, बल्कि उसका अर्थ समझकर कहानी बनाएं।
4. सभी Panels को सही क्रम में जोड़कर एक लगातार चलने वाली कहानी लिखें।
5. पात्रों की भावनाएँ, वातावरण, तनाव, एक्शन और संवादों का स्वाभाविक वर्णन करें।
6. यदि किसी Panel में संवाद नहीं है, तो दृश्य का वर्णन करें।
7. narrationScript ऐसा हो जैसे कोई YouTube Story Narrator कहानी सुना रहा हो।
8. narrationScript में उचित विराम (...) और भावनात्मक उतार-चढ़ाव रखें।
9. प्रत्येक Panel के लिए लगभग 1-2 वाक्य का नैरेशन लिखें।
10. यदि OCR गलत या अधूरा हो तो उपलब्ध चित्र के आधार पर सबसे उपयुक्त कहानी बनाएं।
11. JSON के बाहर कोई अतिरिक्त टेक्स्ट न लिखें।

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
