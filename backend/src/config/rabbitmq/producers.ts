import { rabbitMQService } from './rabbitmq.service';
import { EXCHANGE_NAMES, ROUTING_KEYS } from './constants';
import { rabbitMQQueueManager } from '../../queues/RabbitMQQueueManager';

/**
 * ✅ Producer Service
 * Handles publishing messages to RabbitMQ for background tasks
 * such as invoice and bill PDF generation.
 */
export class Producer {
  
 
  /**
   * 🔹 Trigger Create User
   * @param id - The unique ID of the user
   * @returns A user-friendly message
   */
  public static async SendEmail({to,subject,html,attachments=[],cc,bcc}:{to: string, subject: string, html: string, attachments?: Array<{filename: string,content:Buffer}>, cc?: string[], bcc?: string[]}): Promise<string> {
    try {
      const message = { to, subject, html, attachments, cc, bcc };

      const published = await rabbitMQService.produceMessage(
        EXCHANGE_NAMES.Email,
        ROUTING_KEYS.Email.SEND,
        message
      );

      if (published) {
        return 'Email Send successfully.';
      } else {
        console.warn(`⚠️ Failed to queue Email Send message`);
        return 'We encountered an issue while processing your Email Send request. Please try again.';
      }
    } catch (error) {
      console.error('❌ Error while create user:', error);
      return 'An unexpected error occurred while creating user.';
    }
  }

 

  /**
   * 🔹 Trigger AI Video Processing - Upload Archive
   * @param webtoonId - The webtoon ID
   * @param archivePath - Path to the archive file
   * @param userId - User ID
   * @returns Success status
   */
  public static async uploadArchive(webtoonId: string, archivePath: string, userId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addUploadArchiveJob({
      webtoonId,
      archivePath,
      userId
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Extract Comic
   * @param webtoonId - The webtoon ID
   * @returns Success status
   */
  public static async extractComic(webtoonId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addExtractComicJob({
      webtoonId
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Process Panels
   * @param webtoonId - The webtoon ID
   * @param chapterId - Chapter ID
   * @returns Success status
   */
  public static async processPanels(webtoonId: string, chapterId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addProcessPanelsJob({
      webtoonId,
      chapterId
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Generate Script
   * @param webtoonId - The webtoon ID
   * @param chapterId - Chapter ID
   * @param voiceProfileId - Voice profile ID
   * @param options - Generation options
   * @param userId - User ID
   * @returns Success status
   */
  public static async generateScript(webtoonId: string, chapterId: string, voiceProfileId: string, options: any, userId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addGenerateScriptJob({
      webtoonId,
      chapterId,
      voiceProfileId,
      options,
      userId
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Generate Voice
   * @param voiceSamplePath - Path to voice sample
   * @param userId - User ID
   * @param filename - Original filename
   * @returns Success status
   */
  public static async generateVoice(voiceSamplePath: string, userId: string, filename: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addGenerateVoiceJob({
      voiceSamplePath,
      userId,
      filename
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Generate Subtitles
   * @param videoId - Video ID
   * @param options - Subtitle options
   * @returns Success status
   */
  public static async generateSubtitles(videoId: string, options: any): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addGenerateSubtitlesJob({
      videoId,
      options
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Generate Video
   * @param videoId - Video ID
   * @param webtoonId - Webtoon ID
   * @param chapterId - Chapter ID
   * @param voiceProfileId - Voice profile ID
   * @param config - Video configuration
   * @param userId - User ID
   * @returns Success status
   */
  public static async generateVideo(videoId: string, webtoonId: string, chapterId: string, voiceProfileId: string, config: any, userId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addGenerateVideoJob({
      videoId,
      webtoonId,
      chapterId,
      voiceProfileId,
      config,
      userId
    });
  }

  /**
   * 🔹 Trigger AI Video Processing - Render Video
   * @param videoId - Video ID
   * @param resolution - Video resolution
   * @param format - Video format
   * @param fps - Frames per second
   * @param userId - User ID
   * @returns Success status
   */
  public static async renderVideo(videoId: string, resolution: string, format: string, fps: number, userId: string): Promise<{ success: boolean }> {
    return await rabbitMQQueueManager.addRenderVideoJob({
      videoId,
      resolution,
      format,
      fps,
      userId
    });
  }

}
