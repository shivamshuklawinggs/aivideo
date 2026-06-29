export const QUEUE_NAMES = {
    
    // AI Video Processing Queues
    UPLOAD_ARCHIVE: 'upload-archive',
    EXTRACT_COMIC: 'extract-comic',
    PROCESS_PANELS: 'process-panels',
    GENERATE_SCRIPT: 'generate-script',
    GENERATE_VOICE: 'generate-voice',
    GENERATE_SUBTITLES: 'generate-subtitles',
    GENERATE_VIDEO: 'generate-video',
    RENDER_VIDEO: 'render-video',
    // AI Worker Queues
    AI_TEXT_GENERATION: 'ai-text-generation',
    AI_IMAGE_ANALYSIS: 'ai-image-analysis',
    AI_SCRIPT_GENERATION: 'ai-script-generation',
    AI_VOICE_SYNTHESIS: 'ai-voice-synthesis',
    AI_PANEL_ANALYSIS: 'ai-panel-analysis',
    AI_BATCH_PROCESSING: 'ai-batch-processing'
};

export const EXCHANGE_NAMES = {
    Email: 'email-exchange',
    // AI Video Processing Exchanges
    AI_VIDEO: 'ai-video-exchange',
    AI_WORKER: 'ai-worker-exchange'
};

export const ROUTING_KEYS = {
    Email: {
        SEND: 'email.send'
    },
    // AI Video Processing Routing Keys
    AI_VIDEO: {
        UPLOAD_ARCHIVE: 'ai-video.upload-archive',
        EXTRACT_COMIC: 'ai-video.extract-comic',
        PROCESS_PANELS: 'ai-video.process-panels',
        GENERATE_SCRIPT: 'ai-video.generate-script',
        GENERATE_VOICE: 'ai-video.generate-voice',
        GENERATE_SUBTITLES: 'ai-video.generate-subtitles',
        GENERATE_VIDEO: 'ai-video.generate-video',
        RENDER_VIDEO: 'ai-video.render-video',
    },
    AI_WORKER: {
        TEXT_GENERATION: 'ai-worker.text-generation',
        IMAGE_ANALYSIS: 'ai-worker.image-analysis',
        SCRIPT_GENERATION: 'ai-worker.script-generation',
        VOICE_SYNTHESIS: 'ai-worker.voice-synthesis',
        PANEL_ANALYSIS: 'ai-worker.panel-analysis',
        BATCH_PROCESSING: 'ai-worker.batch-processing',
    },
};