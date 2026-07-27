import logger from '../config/logger';
import aiService from './aiService';
import ChapterAnalysis, { IPanelAnalysis } from '../models/ChapterAnalysis';

export interface StoryResult {
  title: string;
  narrative: string;
  summary: string;
  narrationScript: string;
}

class StoryService {
  /**
   * Generate story from analyzed panels
   */
  async generateStory(chapterId: string): Promise<StoryResult> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || analysis.panels.length === 0) {
      throw new Error(`No panel analysis found for chapter ${chapterId}. Run analysis first.`);
    }

    logger.info(`Generating story for chapter ${chapterId} from ${analysis.panels.length} panels`);

    const panelData = analysis.panels.map((p: IPanelAnalysis) => ({
      panelIndex: p.panelIndex,
      ocr: p.ocr,
      vision: p.vision,
    }));

    const story = await aiService.generateStory(panelData);

    // Save to database
    analysis.story = story;
    analysis.status = 'analyzed';
    await analysis.save();

    logger.info(`Story generated for chapter ${chapterId}: "${story.title}"`);
    return story;
  }

  /**
   * Get narration script split by panel for timeline calculation
   */
  async getNarrationSegments(chapterId: string): Promise<string[]> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis || !analysis.story.narrationScript) {
      throw new Error(`No narration script found for chapter ${chapterId}`);
    }

    const script = analysis.story.narrationScript;
    const panelCount = analysis.panelCount;

    // Split script into segments per panel
    // Strategy: split by sentences and distribute evenly
    const sentences = script.match(/[^.!?]+[.!?]+/g) || [script];
    const segments: string[] = [];
    const sentencesPerPanel = Math.max(1, Math.ceil(sentences.length / panelCount));

    for (let i = 0; i < panelCount; i++) {
      const start = i * sentencesPerPanel;
      const end = Math.min(start + sentencesPerPanel, sentences.length);
      const segment = sentences.slice(start, end).join(' ').trim();
      segments.push(segment || `Panel ${i + 1}.`);
    }

    return segments;
  }

  /**
   * Export story as JSON file content
   */
  async exportStoryJSON(chapterId: string): Promise<string> {
    const analysis = await ChapterAnalysis.findOne({ chapterId });
    if (!analysis) {
      throw new Error(`No analysis found for chapter ${chapterId}`);
    }

    const exportData = {
      chapterId,
      mangaId: analysis.mangaId,
      title: analysis.story.title || analysis.chapterTitle,
      panelCount: analysis.panelCount,
      story: analysis.story,
      panels: analysis.panels.map((p: IPanelAnalysis) => ({
        index: p.panelIndex,
        description: p.vision.description,
        text: p.ocr.rawText,
        characters: p.vision.characters,
        events: p.vision.importantEvents,
      })),
      generatedAt: new Date().toISOString(),
    };

    return JSON.stringify(exportData, null, 2);
  }
}

export default new StoryService();
