import logger from '../config/logger';
import aiService from './aiService';
import ChapterAnalysis, { IPanelAnalysis } from '../models/ChapterAnalysis';
import MangaStoryMemory from '../models/MangaStoryMemory';

export interface StoryResult {
  title: string;
  narrative: string;
  summary: string;
  narrationScript: string;
}

class StoryService {
  /**
   * Generate story from analyzed panels, optionally using previous chapter context.
   */
  async generateStory(chapterId: number, mangaId?: number): Promise<StoryResult> {
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

    const combinedText =
      analysis.combinedText ||
      analysis.panels.map((p: IPanelAnalysis) => p.ocr.rawText).filter(Boolean).join('\n\n');

    // Load previous manga context so the story can continue coherently
    let previousContext = '';
    if (mangaId) {
      const memory = await MangaStoryMemory.findOne({ mangaId });
      if (memory) {
        previousContext = `Previous chapters context:\n${memory.overallSummary || ''}\n\nKey characters: ${memory.mainCharacters?.join(', ') || 'unknown'}.`;
      }
    }

    const story = await aiService.generateStory(panelData, combinedText, previousContext);

    // Upsert story into chapter analysis
    await ChapterAnalysis.findOneAndUpdate(
      { chapterId },
      {
        $set: {
          story,
          status: 'analyzed',
        },
      }
    );

    // Update manga memory for the next chapter
    if (mangaId) {
      const keyEvents = analysis.panels.flatMap((p) => p.vision.importantEvents || []);
      const characters = this.extractCharacters(analysis.panels);
      await MangaStoryMemory.findOneAndUpdate(
        { mangaId },
        {
          $setOnInsert: { mangaId },
          $set: {
            overallSummary: story.summary,
            mainCharacters: characters,
          },
          $push: {
            recentChapters: {
              $each: [{
                chapterId,
                chapterTitle: story.title,
                summary: story.summary,
                keyEvents: keyEvents.slice(0, 20),
                characters: characters.slice(0, 20),
                createdAt: new Date(),
              }],
              $slice: -20,
            },
          },
        },
        { new: true, upsert: true }
      );
    }

    logger.info(`Story generated for chapter ${chapterId}: "${story.title}"`);
    return story;
  }

  private extractCharacters(panels: IPanelAnalysis[]): string[] {
    const all = panels.flatMap((p) => p.vision.characters || []);
    return Array.from(new Set(all.map((c) => c.toLowerCase()))).slice(0, 20);
  }

  /**
   * Get narration script split by panel for timeline calculation
   */
  async getNarrationSegments(chapterId: number): Promise<string[]> {
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
  async exportStoryJSON(chapterId: number): Promise<string> {
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
