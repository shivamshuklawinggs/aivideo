import { Channel } from "amqplib";
import { EXCHANGE_NAMES, QUEUE_NAMES } from "./constants";
/**
 * ✅ Auto setup everything dynamically
 */
export default class RabbitQueuesExchangesSetup {

  /**
   * ✅ Setup all exchanges
   */
 static async setupExchanges(channel: Channel): Promise<void> {
     if (!channel) return;
    for (const exchange of Object.values(EXCHANGE_NAMES)) {
      await channel.assertExchange(exchange, 'topic', { durable: true });
    }
  }
  /**
   * ✅ Setup all queues + bindings
   */
 static async setupQueues(channel: Channel): Promise<void> {
    if (!channel) return;
      
       // AI Video Processing Queues
       await channel.assertQueue(QUEUE_NAMES.UPLOAD_ARCHIVE, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.UPLOAD_ARCHIVE, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.upload-archive');
       
       await channel.assertQueue(QUEUE_NAMES.EXTRACT_COMIC, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.EXTRACT_COMIC, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.extract-comic');
       
       await channel.assertQueue(QUEUE_NAMES.PROCESS_PANELS, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.PROCESS_PANELS, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.process-panels');
       
       await channel.assertQueue(QUEUE_NAMES.GENERATE_SCRIPT, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.GENERATE_SCRIPT, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.generate-script');
       
       await channel.assertQueue(QUEUE_NAMES.GENERATE_VOICE, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.GENERATE_VOICE, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.generate-voice');
       
       await channel.assertQueue(QUEUE_NAMES.GENERATE_SUBTITLES, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.GENERATE_SUBTITLES, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.generate-subtitles');
       
       await channel.assertQueue(QUEUE_NAMES.GENERATE_VIDEO, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.GENERATE_VIDEO, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.generate-video');
       
       await channel.assertQueue(QUEUE_NAMES.RENDER_VIDEO, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.RENDER_VIDEO, EXCHANGE_NAMES.AI_VIDEO, 'ai-video.render-video');

       // AI Worker Queues
       await channel.assertQueue(QUEUE_NAMES.AI_TEXT_GENERATION, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_TEXT_GENERATION, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.text-generation');
       
       await channel.assertQueue(QUEUE_NAMES.AI_IMAGE_ANALYSIS, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_IMAGE_ANALYSIS, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.image-analysis');
       
       await channel.assertQueue(QUEUE_NAMES.AI_SCRIPT_GENERATION, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_SCRIPT_GENERATION, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.script-generation');
       
       await channel.assertQueue(QUEUE_NAMES.AI_VOICE_SYNTHESIS, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_VOICE_SYNTHESIS, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.voice-synthesis');
       
       await channel.assertQueue(QUEUE_NAMES.AI_PANEL_ANALYSIS, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_PANEL_ANALYSIS, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.panel-analysis');
       
       await channel.assertQueue(QUEUE_NAMES.AI_BATCH_PROCESSING, { durable: true });
       await channel.bindQueue(QUEUE_NAMES.AI_BATCH_PROCESSING, EXCHANGE_NAMES.AI_WORKER, 'ai-worker.batch-processing');
  }
}