import axios, { AxiosInstance } from 'axios';
import logger from '../config/logger';

export interface OllamaGenerateOptions {
  model?: string;
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
  private baseUrl: string;
  private textModel: string;
  private visionModel: string;

  constructor() {
    this.baseUrl = process.env.OLLAMA_BASE_URL || 'http://localhost:11434';
    this.textModel = process.env.OLLAMA_MODEL || 'llama3.2:latest';
    this.visionModel = process.env.OLLAMA_VISION_MODEL || 'llava';

    this.client = axios.create({
      baseURL: this.baseUrl,
      timeout: 300000, // 5 min for AI ops
      headers: { 'Content-Type': 'application/json' },
    });

    logger.info(`AI Service initialized: text=${this.textModel}, vision=${this.visionModel}, url=${this.baseUrl}`);
  }

  /**
   * Generate text response from Ollama
   */
  async generate(options: OllamaGenerateOptions): Promise<string> {
    const { model, prompt, system, images, temperature = 0.7, format } = options;

    try {
      const response = await this.client.post('/api/generate', {
        model: model || (images?.length ? this.visionModel : this.textModel),
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

      return response.data.response;
    } catch (error: any) {
      logger.error('Ollama generate failed:', error.message);
      throw new Error(`AI generation failed: ${error.message}`);
    }
  }

  /**
   * Analyze a panel image for visual content
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

    try {
      const response = await this.generate({
        model: this.visionModel,
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

      return parsed;
    } catch (error: any) {
      logger.error(`Vision analysis failed for panel ${panelIndex}:`, error.message);
      return {
        characters: [],
        actions: [],
        emotions: [],
        scene: 'Analysis failed',
        objects: [],
        importantEvents: [],
        description: `Failed to analyze panel ${panelIndex + 1}: ${error.message}`,
      };
    }
  }

  /**
   * Extract text (OCR) from a panel image
   */
  async extractText(imageBase64: string, panelIndex: number): Promise<OCRResult> {
    const prompt = `You are performing OCR on panel ${panelIndex + 1} of a manga/webtoon.

Extract ALL text visible in this image and categorize it into JSON format:
{
  "speech": ["dialogue text in speech bubbles"],
  "narration": ["narration boxes or thought bubbles"],
  "captions": ["captions, labels, or signs"],
  "soundEffects": ["onomatopoeia and sound effects like BOOM, CRASH, etc"],
  "rawText": "all text concatenated in reading order"
}

Rules:
- Include ALL visible text, even if partially obscured
- Maintain reading order (top-to-bottom, right-to-left for manga, left-to-right for webtoon)
- Clean up any OCR artifacts
- If no text is visible in a category, return an empty array
Return ONLY valid JSON, no markdown formatting.`;

    try {
      const response = await this.generate({
        model: this.visionModel,
        prompt,
        images: [imageBase64],
        temperature: 0.2,
        format: 'json',
      });

      const parsed = this.parseJSON<OCRResult>(response, {
        speech: [],
        narration: [],
        captions: [],
        soundEffects: [],
        rawText: '',
      });

      return parsed;
    } catch (error: any) {
      logger.error(`OCR extraction failed for panel ${panelIndex}:`, error.message);
      return {
        speech: [],
        narration: [],
        captions: [],
        soundEffects: [],
        rawText: '',
      };
    }
  }

  /**
   * Generate a coherent story from panel analyses
   */
  async generateStory(panels: Array<{ ocr: OCRResult; vision: VisionAnalysisResult; panelIndex: number }>): Promise<{
    title: string;
    narrative: string;
    summary: string;
    narrationScript: string;
  }> {
    const panelSummaries = panels.map((p, i) => {
      const textContent = [
        ...p.ocr.speech.map(s => `"${s}"`),
        ...p.ocr.narration,
      ].join(' ');
      return `Panel ${i + 1}: ${p.vision.description}${textContent ? ` | Text: ${textContent}` : ''}`;
    }).join('\n');

const prompt = `आप एक अनुभवी हिंदी कहानीकार (Story Writer) और नैरेटर हैं।

नीचे दिए गए Manga/Webtoon Panels के विश्लेषण के आधार पर पूरी कहानी हिंदी में लिखें।

PANEL ANALYSES:
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
