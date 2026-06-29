import { rabbitMQService } from './rabbitmq.service';
import { QUEUE_NAMES, ROUTING_KEYS } from './constants';

const handleDataViaROutingKey = async (data: any, routingKey: string) => {
    try {
        console.log("routingKey", routingKey);
        
        switch (routingKey) {
        
            // AI Video Processing - Upload Archive
            case ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE:
                console.log('Processing upload archive:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Extract Comic
            case ROUTING_KEYS.AI_VIDEO.EXTRACT_COMIC:
                console.log('Processing extract comic:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Process Panels
            case ROUTING_KEYS.AI_VIDEO.PROCESS_PANELS:
                console.log('Processing panels:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Generate Script
            case ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT:
                console.log('Processing script generation:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Generate Voice
            case ROUTING_KEYS.AI_VIDEO.GENERATE_VOICE:
                console.log('Processing voice generation:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Generate Subtitles
            case ROUTING_KEYS.AI_VIDEO.GENERATE_SUBTITLES:
                console.log('Processing subtitle generation:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Generate Video
            case ROUTING_KEYS.AI_VIDEO.GENERATE_VIDEO:
                console.log('Processing video generation:', data.webtoonId);
                // Process immediately - no job tracking
                break;
                
            // AI Video Processing - Render Video
            case ROUTING_KEYS.AI_VIDEO.RENDER_VIDEO:
                console.log('Processing video rendering:', data.videoId);
                // Process immediately - no job tracking
                break;
                
            // AI Worker - Text Generation
            case ROUTING_KEYS.AI_WORKER.TEXT_GENERATION:
                console.log('Processing AI text generation:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            // AI Worker - Image Analysis
            case ROUTING_KEYS.AI_WORKER.IMAGE_ANALYSIS:
                console.log('Processing AI image analysis:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            // AI Worker - Script Generation
            case ROUTING_KEYS.AI_WORKER.SCRIPT_GENERATION:
                console.log('Processing AI script generation:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            // AI Worker - Voice Synthesis
            case ROUTING_KEYS.AI_WORKER.VOICE_SYNTHESIS:
                console.log('Processing AI voice synthesis:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            // AI Worker - Panel Analysis
            case ROUTING_KEYS.AI_WORKER.PANEL_ANALYSIS:
                console.log('Processing AI panel analysis:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            // AI Worker - Batch Processing
            case ROUTING_KEYS.AI_WORKER.BATCH_PROCESSING:
                console.log('Processing AI batch processing:', data.taskId);
                // Handled by RabbitMQAIWorker directly
                break;
                
            default:
                console.warn(`Unknown routing key: ${routingKey}`);
                break;
        }
    } catch (error) {
        console.error('Error processing message:', error);
        throw error;
    }
};

// Initialize message consumers
export const initializeConsumers = async () => {
    try {

       
        // Initialize AI Video Processing consumers
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.UPLOAD_ARCHIVE,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.PROCESS_PANELS,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_SCRIPT,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_VOICE,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_SUBTITLES,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.GENERATE_VIDEO,
            handleDataViaROutingKey
        );
        
        await rabbitMQService.consumeMessages(
            QUEUE_NAMES.RENDER_VIDEO,
            handleDataViaROutingKey
        );

        // Initialize AI Worker consumers (these are handled by RabbitMQAIWorker directly)
        // Note: These consumers are set up by RabbitMQAIWorker constructor
        // We don't need to duplicate them here since the AI worker handles its own queues

        console.log('✅ Message consumers initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing message consumers:', error);
        throw error;
    }
};