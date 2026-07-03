import mongoose from 'mongoose';
import Chapter, { IChapter } from '../models/Chapter';
import logger from '../config/logger';

export interface ScriptGenerationOptions {
  model?: string;
  style?: 'narrative' | 'dramatic' | 'educational' | 'casual';
  durationPerPanel?: number; // seconds
  includeDescriptions?: boolean;
  language?: string;
}

export interface GeneratedScript {
  title: string;
  content: string;
  totalDuration: number;
  scenes: Array<{
    sceneNumber: number;
    panels: number[];
    narration: string;
    duration: number;
    startTime: number;
    endTime: number;
  }>;
  generatedAt: Date;
  modelUsed?: string;
}

export class ScriptGenerationService {
  private readonly DEFAULT_MODEL = 'gpt-4';
  private readonly DEFAULT_DURATION_PER_PANEL = 3; // seconds
  private readonly DEFAULT_STYLE = 'narrative';

  async generateScriptForChapter(
    chapterId: mongoose.Types.ObjectId,
    options: ScriptGenerationOptions = {}
  ): Promise<GeneratedScript> {
    try {
      logger.info(`Generating script for chapter: ${chapterId}`);

      // Get chapter with panels
      const chapter = await Chapter.findById(chapterId).populate('webtoonId');
      if (!chapter) {
        throw new Error(`Chapter not found: ${chapterId}`);
      }

      if (!chapter.panels || chapter.panels.length === 0) {
        throw new Error(`Chapter has no panels: ${chapterId}`);
      }

      // Update chapter status
      chapter.status = 'processing';
      chapter.processingProgress = 60;
      await chapter.save();

      // Generate script using AI
      const script = await this.generateScriptWithAI(chapter, options);

      // Save script to chapter
      chapter.generatedScript = script;
      chapter.processingProgress = 75;
      chapter.isProcessed = true;
      chapter.processingStatus = 'completed';
      await chapter.save();

      logger.info(`Script generated successfully for chapter: ${chapterId}`);
      return script;

    } catch (error) {
      logger.error(`Failed to generate script for chapter ${chapterId}:`, error);
      
      // Update chapter with error
      const chapter = await Chapter.findById(chapterId);
      if (chapter) {
        chapter.status = 'failed';
        chapter.errorMessage = error instanceof Error ? error.message : 'Unknown error';
        await chapter.save();
      }
      
      throw error;
    }
  }

  private async generateScriptWithAI(
    chapter: IChapter,
    options: ScriptGenerationOptions
  ): Promise<GeneratedScript> {
    const model = options.model || this.DEFAULT_MODEL;
    const style = options.style || this.DEFAULT_STYLE;
    const durationPerPanel = options.durationPerPanel || this.DEFAULT_DURATION_PER_PANEL;
    const includeDescriptions = options.includeDescriptions ?? true;
    const language = options.language || 'en';

    // Create prompt for AI
    const prompt = this.createScriptPrompt(chapter, style, includeDescriptions, language);
    
    try {
      // For now, we'll create a mock script generation
      // In production, this would call an actual AI service like OpenAI, Claude, or local LLM
      const script = await this.mockAIGeneration(prompt, chapter, durationPerPanel);
      
      return {
        ...script,
        generatedAt: new Date(),
        modelUsed: model
      };

    } catch (error) {
      logger.error('AI script generation failed:', error);
      throw new Error(`Failed to generate script with AI: ${error}`);
    }
  }

  private createScriptPrompt(
    chapter: IChapter,
    style: string,
    includeDescriptions: boolean,
    language: string
  ): string {
    const webtoonTitle = (chapter.webtoonId as any)?.title || 'Unknown Webtoon';
    const panelDescriptions = chapter.panels.map((panel, index) => 
      `Panel ${index + 1}: ${panel.description || 'No description'} (Image: ${panel.imageUrl})`
    ).join('\n');

    const styleInstructions = {
      narrative: 'Create a engaging narrative that tells a story with the panels',
      dramatic: 'Create a dramatic and emotional narration with high impact',
      educational: 'Create an educational narration that explains what\'s happening',
      casual: 'Create a casual, conversational narration that\'s easy to follow'
    };

    return `
You are a professional script writer for webtoon video adaptations. Create a narration script for the following chapter.

Webtoon: ${webtoonTitle}
Chapter: ${chapter.title}
Chapter Number: ${chapter.chapterNumber}
Style: ${style}
Language: ${language}

Panels:
${panelDescriptions}

Instructions:
- ${styleInstructions[style as keyof typeof styleInstructions]}
- Each panel should be narrated for approximately ${this.DEFAULT_DURATION_PER_PANEL} seconds
- Create smooth transitions between panels
- Include emotional cues and pacing directions
- ${includeDescriptions ? 'Reference visual elements in the panels' : 'Focus on narrative only'}
- Generate 2-4 scenes that group related panels together
- Each scene should have a clear narrative purpose

Please generate the script in the following JSON format:
{
  "title": "Chapter Title - Narration Script",
  "content": "Full narration text",
  "scenes": [
    {
      "sceneNumber": 1,
      "panels": [1, 2, 3],
      "narration": "Scene narration text",
      "duration": 9,
      "startTime": 0,
      "endTime": 9
    }
  ]
}
`;
  }

  private async mockAIGeneration(
    _prompt: string,
    chapter: IChapter,
    durationPerPanel: number
  ): Promise<Omit<GeneratedScript, 'generatedAt' | 'modelUsed'>> {
    // This is a mock implementation
    // In production, replace with actual AI service call
    
    const totalPanels = chapter.panels.length;
    const totalDuration = totalPanels * durationPerPanel;
    
    // Create scenes (group panels into logical scenes)
    const scenesPerChapter = Math.min(4, Math.ceil(totalPanels / 3));
    const panelsPerScene = Math.ceil(totalPanels / scenesPerChapter);
    
    const scenes = [];
    let currentTime = 0;
    
    for (let sceneNum = 1; sceneNum <= scenesPerChapter; sceneNum++) {
      const startPanel = (sceneNum - 1) * panelsPerScene;
      const endPanel = Math.min(startPanel + panelsPerScene, totalPanels);
      const scenePanels = Array.from({ length: endPanel - startPanel }, (_, i) => startPanel + i + 1);
      const sceneDuration = scenePanels.length * durationPerPanel;
      
      scenes.push({
        sceneNumber: sceneNum,
        panels: scenePanels,
        narration: `Scene ${sceneNum}: This scene covers panels ${startPanel + 1} to ${endPanel}. The story progresses through these visual panels, creating an engaging narrative for the viewers.`,
        duration: sceneDuration,
        startTime: currentTime,
        endTime: currentTime + sceneDuration
      });
      
      currentTime += sceneDuration;
    }
    
    const content = scenes.map(scene => 
      `Scene ${scene.sceneNumber}: ${scene.narration}`
    ).join('\n\n');

    return {
      title: `${chapter.title} - Narration Script`,
      content,
      totalDuration,
      scenes
    };
  }

  async regenerateScript(
    chapterId: mongoose.Types.ObjectId,
    options: ScriptGenerationOptions = {}
  ): Promise<GeneratedScript> {
    logger.info(`Regenerating script for chapter: ${chapterId}`);
    
    // Clear existing script
    await Chapter.findByIdAndUpdate(chapterId, {
      $unset: { generatedScript: 1 },
      status: 'processing',
      processingProgress: 50
    });

    // Generate new script
    return await this.generateScriptForChapter(chapterId, options);
  }

  async generateScriptsForWebtoon(
    webtoonId: mongoose.Types.ObjectId,
    options: ScriptGenerationOptions = {}
  ): Promise<{
    total: number;
    successful: number;
    failed: number;
    errors: string[];
  }> {
    const result = {
      total: 0,
      successful: 0,
      failed: 0,
      errors: [] as string[]
    };

    try {
      logger.info(`Generating scripts for webtoon: ${webtoonId}`);

      // Get all chapters for the webtoon
      const chapters = await Chapter.find({
        webtoonId,
        status: 'completed',
        'panels.0': { $exists: true } // Has at least one panel
      });

      result.total = chapters.length;

      for (const chapter of chapters) {
        try {
          // Skip if already has script
          if (chapter.generatedScript) {
            result.successful++;
            continue;
          }

          await this.generateScriptForChapter(chapter._id, options);
          result.successful++;

        } catch (error) {
          logger.error(`Failed to generate script for chapter ${chapter._id}:`, error);
          result.errors.push(`Chapter ${chapter.chapterNumber}: ${error}`);
          result.failed++;
        }
      }

      logger.info(`Script generation completed for webtoon ${webtoonId}:`, result);
      return result;

    } catch (error) {
      logger.error(`Failed to generate scripts for webtoon ${webtoonId}:`, error);
      result.errors.push(`Webtoon processing failed: ${error}`);
      return result;
    }
  }

  async getScript(chapterId: mongoose.Types.ObjectId): Promise<GeneratedScript | null> {
    const chapter = await Chapter.findById(chapterId);
    return chapter?.generatedScript || null;
  }

  async deleteScript(chapterId: mongoose.Types.ObjectId): Promise<void> {
    await Chapter.findByIdAndUpdate(chapterId, {
      $unset: { generatedScript: 1 },
      processingProgress: 50
    });
    
    logger.info(`Script deleted for chapter: ${chapterId}`);
  }
}

export default ScriptGenerationService;
