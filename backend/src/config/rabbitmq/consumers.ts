import { rabbitMQService } from './rabbitmq.service';
import { QUEUE_NAMES, ROUTING_KEYS } from './constants';
import logger from '../../config/logger';
import Webtoon from '../../models/Webtoon';
import Panel from '../../models/Panel';
import OllamaService from '../../services/OllamaService';
import { DEFAULT_MODELS } from '../../config/aiModels';
import GeneratedScript from '../../models/GeneratedScript';

const handleDataViaROutingKey = async (data: any, routingKey: string) => {
    try {
        console.log("routingKey", routingKey);
        
        switch (routingKey) {
        
          
            // AI Video Processing - Generate Script (Core Workflow)
            case ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT:
                await handleGenerateScriptJob(data);
                break;
                
            // AI Worker - Text Generation
            case ROUTING_KEYS.AI_WORKER.TEXT_GENERATION:
                console.log('Processing AI text generation:', data.taskId);
                await handleAITextGenerationJob(data);
                break;
                
            // AI Worker - Image Analysis
            case ROUTING_KEYS.AI_WORKER.IMAGE_ANALYSIS:
                console.log('Processing AI image analysis:', data.taskId);
                await handleAIImageAnalysisJob(data);
                break;
                
            // AI Worker - Script Generation
            case ROUTING_KEYS.AI_WORKER.SCRIPT_GENERATION:
                console.log('Processing AI script generation:', data.taskId);
                await handleAIScriptGenerationJob(data);
                break;
                
            // AI Worker - Voice Synthesis
            case ROUTING_KEYS.AI_WORKER.VOICE_SYNTHESIS:
                console.log('Processing AI voice synthesis:', data.taskId);
                await handleAIVoiceSynthesisJob(data);
                break;
                
            // AI Worker - Panel Analysis
            case ROUTING_KEYS.AI_WORKER.PANEL_ANALYSIS:
                console.log('Processing AI panel analysis:', data.taskId);
                await handleAIPanelAnalysisJob(data);
                break;
                
            // AI Worker - Batch Processing
            case ROUTING_KEYS.AI_WORKER.BATCH_PROCESSING:
                console.log('Processing AI batch processing:', data.taskId);
                await handleAIBatchProcessingJob(data);
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


// Handle generate script job
const handleGenerateScriptJob = async (data: any) => {
    try {
        const { webtoonId, isUpdate } = data;
        
        if (!webtoonId) {
            throw new Error('Missing webtoonId for generate script job');
        }

        logger.info(`Generating script for webtoon: ${webtoonId} ${isUpdate ? '(Update)' : '(New)'}`);

        const webtoon = await Webtoon.findById(webtoonId);
        if (!webtoon) {
            throw new Error('Webtoon not found');
        }

        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 0;
        await webtoon.save();

        // Get all panels with their analysis
        const panels = await Panel.find({ webtoonId }).sort({ sequence: 1 });
        
        // Prepare panel data for script generation
        const panelAnalyses = panels.map(panel => ({
            panelNumber: panel.panelNumber,
            sequence: panel.sequence,
            description: 'Panel description', // Use generic description since metadata doesn't have description field
            imageUrl: panel.imageUrl
        }));

        // Generate script using AI
        const script = await OllamaService.generateStoryScript(
            panelAnalyses,
            {
                title: webtoon.title,
                description: webtoon.description,
                author: webtoon.author,
                genres: webtoon.genres
            }
        );

        // Save or update generated script
        if (isUpdate) {
            // Update existing script
            await GeneratedScript.findOneAndUpdate(
                { webtoonId },
                {
                    script: script,
                    'metadata.totalPanels': panels.length,
                    'metadata.generatedAt': new Date(),
                    'metadata.lastUpdated': new Date(),
                    version: { $inc: 1 }
                },
                { upsert: true }
            );
            logger.info(`Script updated for webtoon: ${webtoonId}`);
        } else {
            // Create new script
            await GeneratedScript.create({
                webtoonId,
                script: script,
                metadata: {
                    totalPanels: panels.length,
                    generatedAt: new Date()
                }
            });
            logger.info(`Script created for webtoon: ${webtoonId}`);
        }

        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 100;
        await webtoon.save();

        logger.info(`Script generation completed for webtoon: ${webtoonId}`);

    } catch (error: any) {
        logger.error(`Generate script failed for webtoon ${data.webtoonId}:`, error);
        
        if (data.webtoonId) {
            await Webtoon.findByIdAndUpdate(data.webtoonId, {
                processingStatus: 'failed',
                errorMessage: error.message,
            });
        }
        
        throw error;
    }
};




// AI Worker Job Handlers with actual OllamaService calls
const handleAITextGenerationJob = async (data: any) => {
    try {
        const { data: jobData, options, taskId } = data;
        logger.info(`Processing AI text generation job: ${taskId}`);
        
        const model = options?.model || DEFAULT_MODELS.textGeneration;
        await OllamaService.generateText(jobData.prompt, {
            task: 'text',
            model,
            ...options,
        });

        logger.info(`AI text generation completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAITextGenerationJob:', error);
        throw error;
    }
};

const handleAIImageAnalysisJob = async (data: any) => {
    try {
        const { data: jobData, options, taskId } = data;
        logger.info(`Processing AI image analysis job: ${taskId}`);
        
        const model = options?.model || DEFAULT_MODELS.visionAnalysis;
        await OllamaService.analyzeImage(
            jobData.imageBase64,
            jobData.prompt,
            { task: 'vision', model, ...options }
        );

        logger.info(`AI image analysis completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAIImageAnalysisJob:', error);
        throw error;
    }
};

const handleAIScriptGenerationJob = async (data: any) => {
    try {
        const { data: jobData, taskId } = data;
        logger.info(`Processing AI script generation job: ${taskId}`);
        
        await OllamaService.generateStoryScript(
            jobData.panelAnalyses,
            jobData.metadata
        );

        logger.info(`AI script generation completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAIScriptGenerationJob:', error);
        throw error;
    }
};

const handleAIVoiceSynthesisJob = async (data: any) => {
    try {
        const { taskId } = data;
        logger.info(`Processing AI voice synthesis job: ${taskId}`);
        
        // TODO: Implement voice synthesis logic when available
        logger.info(`AI voice synthesis completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAIVoiceSynthesisJob:', error);
        throw error;
    }
};

const handleAIPanelAnalysisJob = async (data: any) => {
    try {
        const { data: jobData, options, taskId } = data;
        logger.info(`Processing AI panel analysis job: ${taskId}`);
        
        await OllamaService.analyzePanels(
            jobData.panelImages,
            options
        );

        logger.info(`AI panel analysis completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAIPanelAnalysisJob:', error);
        throw error;
    }
};

const handleAIBatchProcessingJob = async (data: any) => {
    try {
        const { data: jobData, options, taskId } = data;
        logger.info(`Processing AI batch processing job: ${taskId}`);
        
        // Process multiple tasks based on jobData.type
        const tasks = jobData.tasks || [];
        for (const task of tasks) {
            switch (task.type) {
                case 'text':
                    await OllamaService.generateText(task.prompt, options);
                    break;
                case 'vision':
                    await OllamaService.analyzeImage(task.imageBase64, task.prompt, options);
                    break;
                case 'panel':
                    await OllamaService.analyzePanels(task.panelImages, options);
                    break;
                default:
                    logger.warn(`Unknown batch task type: ${task.type}`);
            }
        }

        logger.info(`AI batch processing completed: ${taskId}`);
    } catch (error) {
        logger.error('Error in handleAIBatchProcessingJob:', error);
        throw error;
    }
};

// Initialize message consumers
export const initializeConsumers = async () => {
    try {
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

        console.log('✅ Message consumers initialized successfully');
    } catch (error) {
        console.error('❌ Error initializing message consumers:', error);
        throw error;
    }
};