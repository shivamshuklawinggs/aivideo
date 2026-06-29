import { rabbitMQService } from './rabbitmq.service';
import { QUEUE_NAMES, ROUTING_KEYS } from './constants';
import logger from '../../config/logger';
import Webtoon from '../../models/Webtoon';
import Chapter from '../../models/Chapter';
import Panel from '../../models/Panel';
import ArchiveService from '../../services/ArchiveService';
import MinIOClient from '../../config/minio';
import OllamaService from '../../services/OllamaService';
import { DEFAULT_MODELS } from '../../config/aiModels';
import path from 'path';
import fs from 'fs';
import sharp from 'sharp';
import GeneratedScript from '../../models/GeneratedScript';

const handleDataViaROutingKey = async (data: any, routingKey: string) => {
    try {
        console.log("routingKey", routingKey);
        
        switch (routingKey) {
        
            // AI Video Processing - Upload Archive
            case ROUTING_KEYS.AI_VIDEO.UPLOAD_ARCHIVE:
                await handleUploadArchiveJob(data);
                break;
                
            // AI Video Processing - Extract Comic
            case ROUTING_KEYS.AI_VIDEO.EXTRACT_COMIC:
                await handleExtractComicJob(data);
                break;
                
            // AI Video Processing - Process Panels
            case ROUTING_KEYS.AI_VIDEO.PROCESS_PANELS:
                await handleProcessPanelsJob(data);
                break;
                
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

// AI Video Processing Handlers with real implementations

// Handle upload archive job
const handleUploadArchiveJob = async (data: any) => {
    try {
        const { webtoonId, archivePath, userId } = data;
        
        if (!webtoonId || !archivePath) {
            throw new Error('Missing webtoonId or archivePath for upload archive job');
        }

        logger.info(`Processing upload archive for webtoon: ${webtoonId}`);

        const webtoon = await Webtoon.findById(webtoonId);
        if (!webtoon) {
            throw new Error('Webtoon not found');
        }

        // Update webtoon status
        webtoon.processingStatus = 'processing';
        webtoon.archiveFilePath = archivePath;
        await webtoon.save();

        // Validate archive file exists
        if (!fs.existsSync(archivePath)) {
            throw new Error(`Archive file not found: ${archivePath}`);
        }

        // Get file stats
        const stats = fs.statSync(archivePath);
        webtoon.archiveFileSize = stats.size;
        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 100;
        await webtoon.save();

        logger.info(`Upload archive completed for webtoon: ${webtoonId}`);
        
        // Trigger simplified workflow: extract comic → process panels → generate script
        await rabbitMQService.produceMessage(
            'ai-video-exchange',
            ROUTING_KEYS.AI_VIDEO.EXTRACT_COMIC,
            { webtoonId, userId }
        );

    } catch (error: any) {
        logger.error(`Upload archive failed for webtoon ${data.webtoonId}:`, error);
        
        if (data.webtoonId) {
            await Webtoon.findByIdAndUpdate(data.webtoonId, {
                processingStatus: 'failed',
                errorMessage: error.message,
            });
        }
        
        throw error;
    }
};

// Handle process panels job
const handleProcessPanelsJob = async (data: any) => {
    try {
        const { webtoonId, isUpdate } = data;
        
        if (!webtoonId) {
            throw new Error('Missing webtoonId for process panels job');
        }

        logger.info(`Processing panels for webtoon: ${webtoonId} ${isUpdate ? '(Update)' : '(New)'}`);

        const webtoon = await Webtoon.findById(webtoonId);
        if (!webtoon) {
            throw new Error('Webtoon not found');
        }

        // Get all chapters for the webtoon
        const chapters = await Chapter.find({ webtoonId });
        
        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 0;
        await webtoon.save();

        let totalPanels = 0;
        for (let i = 0; i < chapters.length; i++) {
            const chapter = chapters[i];
            
            // Get panels for this chapter
            const panels = await Panel.find({ chapterId: chapter._id });
            
            // Process each panel with AI analysis
            for (let j = 0; j < panels.length; j++) {
                const panel = panels[j];
                
                // Read image and convert to base64 for AI analysis
                const imageBuffer = fs.readFileSync(panel.imagePath);
                const imageBase64 = imageBuffer.toString('base64');
                
                // Analyze panel with AI
                await OllamaService.analyzeImage(
                    imageBase64,
                    'Analyze this comic panel and describe the scene, characters, actions, and dialogue.',
                    { task: 'vision', model: DEFAULT_MODELS.visionAnalysis }
                );
                
                totalPanels++;
            }
            
            // Update progress
            const progress = ((i + 1) / chapters.length) * 100;
            webtoon.processingProgress = Math.round(progress);
            await webtoon.save();
        }

        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 100;
        webtoon.metadata.totalPanels = totalPanels;
        await webtoon.save();

        logger.info(`Panel processing completed for webtoon: ${webtoonId}`);
        
        // Trigger script generation
        await rabbitMQService.produceMessage(
            'ai-video-exchange',
            ROUTING_KEYS.AI_VIDEO.GENERATE_SCRIPT,
            { webtoonId, isUpdate }
        );

    } catch (error: any) {
        logger.error(`Process panels failed for webtoon ${data.webtoonId}:`, error);
        
        if (data.webtoonId) {
            await Webtoon.findByIdAndUpdate(data.webtoonId, {
                processingStatus: 'failed',
                errorMessage: error.message,
            });
        }
        
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


// Handle extract comic job with actual worker logic
const handleExtractComicJob = async (data: any) => {
    const { webtoonId, jobId, isUpdate } = data;

    try {
        logger.info(`Starting comic extraction for webtoon: ${webtoonId} ${isUpdate ? '(Update)' : '(New)'}`);

        const webtoon = await Webtoon.findById(webtoonId);
        if (!webtoon) {
            throw new Error('Webtoon not found');
        }

        webtoon.processingStatus = 'extracting';
        await webtoon.save();

        const extractPath = path.join(
            process.cwd(),
            'storage',
            'extracted',
            webtoonId.toString()
        );

        await ArchiveService.extractArchive(webtoon.archiveFilePath, extractPath);

        webtoon.extractedPath = extractPath;
        webtoon.processingStatus = 'processing';
        webtoon.processingProgress = 30;
        await webtoon.save();

        const chapters = await ArchiveService.detectChapters(extractPath);

        webtoon.processingProgress = 50;
        await webtoon.save();

        let totalPanels = 0;
        let newChaptersAdded = 0;

        // Get existing chapters to avoid duplicates during updates
        const existingChapters = isUpdate ? 
            await Chapter.find({ webtoonId: webtoon._id }).select('chapterNumber').lean() : 
            [];

        const existingChapterNumbers = new Set(existingChapters.map(ch => ch.chapterNumber));

        for (let i = 0; i < chapters.length; i++) {
            const chapterData = chapters[i];

            // Skip if chapter already exists (for updates)
            if (isUpdate && existingChapterNumbers.has(chapterData.chapterNumber)) {
                logger.info(`Skipping existing chapter ${chapterData.chapterNumber} during update`);
                continue;
            }

            const chapter = await Chapter.create({
                webtoonId: webtoon._id,
                userId: webtoon.userId,
                chapterNumber: chapterData.chapterNumber,
                title: chapterData.title,
                panelCount: chapterData.panelCount,
                sequence: chapterData.sequence,
                folderPath: chapterData.folderPath,
                processingStatus: 'processing',
            });

            newChaptersAdded++;

            for (let j = 0; j < chapterData.panels.length; j++) {
                const panelData = chapterData.panels[j];

                const thumbnailPath = await generateThumbnail(
                    panelData.imagePath,
                    extractPath
                );

                const imageUrl = await uploadToMinIO(
                    panelData.imagePath,
                    `webtoons/${webtoonId}/chapters/${chapter._id}/panels/${panelData.fileName}`
                );

                const thumbnailUrl = thumbnailPath
                    ? await uploadToMinIO(
                        thumbnailPath,
                        `webtoons/${webtoonId}/chapters/${chapter._id}/thumbnails/${panelData.fileName}`
                      )
                    : undefined;

                const imageMetadata = await getImageMetadata(panelData.imagePath);

                await Panel.create({
                    chapterId: chapter._id,
                    webtoonId: webtoon._id,
                    userId: webtoon.userId,
                    panelNumber: panelData.panelNumber,
                    sequence: panelData.sequence,
                    imageUrl,
                    imagePath: panelData.imagePath,
                    thumbnailUrl,
                    metadata: imageMetadata,
                    isProcessed: true,
                });

                totalPanels++;
            }

            chapter.isProcessed = true;
            chapter.processingStatus = 'completed';
            await chapter.save();

            const progress = 50 + ((i + 1) / chapters.length) * 40;
            webtoon.processingProgress = progress;
            await webtoon.save();
        }

        // Update webtoon with new chapter count
        if (isUpdate) {
            const currentChapters = await Chapter.countDocuments({ webtoonId });
            webtoon.totalChapters = currentChapters;
        } else {
            webtoon.totalChapters = chapters.length;
        }
        
        webtoon.metadata.totalPanels = totalPanels;
        webtoon.metadata.averagePanelsPerChapter = totalPanels / webtoon.totalChapters;
        webtoon.isProcessed = true;
        webtoon.processingStatus = 'completed';
        webtoon.processingProgress = 100;
        await webtoon.save();

        logger.info(`Comic extraction completed for webtoon: ${webtoonId} (${isUpdate ? 'Update' : 'New'}) - ${newChaptersAdded} new chapters added`);
        
        // Trigger panel processing (only for new chapters)
        await rabbitMQService.produceMessage(
            'ai-video-exchange',
            ROUTING_KEYS.AI_VIDEO.PROCESS_PANELS,
            { webtoonId, isUpdate }
        );
        
        // Optionally publish completion message
        await publishCompletionMessage({
            success: true,
            webtoonId,
            totalChapters: chapters.length,
            totalPanels,
            jobId
        });

    } catch (error: any) {
        logger.error(`Comic extraction failed for webtoon ${webtoonId}:`, error);

        await Webtoon.findByIdAndUpdate(webtoonId, {
            processingStatus: 'failed',
            errorMessage: error.message,
        });

        // Optionally publish failure message
        await publishCompletionMessage({
            success: false,
            webtoonId,
            error: error.message,
            jobId
        });
        
        throw error;
    }
};

// Utility functions from ExtractComicWorker
const generateThumbnail = async (imagePath: string, outputDir: string): Promise<string> => {
    try {
        const thumbnailPath = path.join(
            outputDir,
            'thumbnails',
            `thumb_${path.basename(imagePath)}`
        );

        const thumbnailDir = path.dirname(thumbnailPath);
        if (!fs.existsSync(thumbnailDir)) {
            fs.mkdirSync(thumbnailDir, { recursive: true });
        }

        await sharp(imagePath).resize(300, 400, { fit: 'inside' }).toFile(thumbnailPath);

        return thumbnailPath;
    } catch (error) {
        logger.error('Thumbnail generation error:', error);
        return '';
    }
};

const uploadToMinIO = async (filePath: string, objectName: string): Promise<string> => {
    try {
        await MinIOClient.uploadFile(objectName, filePath);
        return await MinIOClient.getPresignedUrl(objectName, 7 * 24 * 3600);
    } catch (error) {
        logger.error('MinIO upload error:', error);
        throw error;
    }
};

const getImageMetadata = async (imagePath: string): Promise<any> => {
    try {
        const metadata = await sharp(imagePath).metadata();
        const stats = fs.statSync(imagePath);

        return {
            width: metadata.width,
            height: metadata.height,
            format: metadata.format,
            fileSize: stats.size,
            aspectRatio: metadata.width && metadata.height ? metadata.width / metadata.height : 1,
        };
    } catch (error) {
        logger.error('Image metadata extraction error:', error);
        return {};
    }
};

const publishCompletionMessage = async (result: any): Promise<void> => {
    try {
        await rabbitMQService.produceMessage(
            'ai-video-exchange',
            'ai-video.extract-comic.completed',
            result
        );
    } catch (error) {
        logger.error('Failed to publish completion message:', error);
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