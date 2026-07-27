import { rabbitMQService } from './rabbitmq.service';
import { QUEUE_NAMES } from './constants';
import logger from '../logger';

const handleDataViaRoutingKey = async (data: any, routingKey: string) => {
    try {
        logger.info(`[Consumer] Processing message with routing key: ${routingKey}`);

        // Lazy-import to avoid circular dependencies at startup
        const pipelineController = (await import('../../controllers/pipelineController')).default;

        switch (routingKey) {
            case 'ai-worker.panel-analysis':
                // Process chapter analysis (OCR + Vision)
                await pipelineController.processAnalysis(data.jobId, data.chapterId, data.mangaId);
                break;

            case 'ai-video.generate-voice':
                // Process narration (TTS + timeline + subtitles)
                await pipelineController.processNarration(data.jobId, data.chapterId);
                break;

            case 'ai-video.generate-video':
                // Process video rendering
                await pipelineController.processVideo(data.jobId, data.chapterId, data.options);
                break;

            case 'ai-video.generate-script':
                // Process story generation
                const storyService = (await import('../../services/storyService')).default;
                await storyService.generateStory(data.chapterId);
                break;

            case 'ai-video.generate-subtitles':
                // Process subtitle generation
                const timelineService = (await import('../../services/timelineService')).default;
                await timelineService.generateSRT(data.chapterId);
                await timelineService.generateVTT(data.chapterId);
                break;

            default:
                logger.warn(`Unknown routing key: ${routingKey}`);
                break;
        }
    } catch (error) {
        logger.error(`Error processing message (${routingKey}):`, error);
        throw error;
    }
};

// Initialize message consumers
export const initializeConsumers = async () => {
    try {
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_SCRIPT,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_VOICE,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_SUBTITLES,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_VIDEO,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.RENDER_VIDEO,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.AI_PANEL_ANALYSIS,
            handleDataViaRoutingKey
        );

        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.AI_BATCH_PROCESSING,
            handleDataViaRoutingKey
        );

        logger.info('✅ Message consumers initialized successfully');
    } catch (error) {
        logger.error('❌ Error initializing message consumers:', error);
        throw error;
    }
};