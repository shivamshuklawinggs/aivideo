import express from 'express';
import { authenticate } from '../middlewares/auth';
import pipelineController from '../controllers/pipelineController';

const router = express.Router();

/**
 * @swagger
 * /api/pipeline/chapter/analyze:
 *   post:
 *     summary: Analyze chapter panels (OCR + Vision)
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *               - mangaId
 *             properties:
 *               chapterId:
 *                 type: string
 *               mangaId:
 *                 type: string
 *     responses:
 *       202:
 *         description: Analysis job queued
 *       400:
 *         description: Missing required fields
 */
router.post('/chapter/analyze', authenticate, pipelineController.analyzeChapter.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/chapter/story:
 *   post:
 *     summary: Generate story from analyzed panels
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *             properties:
 *               chapterId:
 *                 type: string
 *               mangaId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Story generated successfully
 *       400:
 *         description: Chapter not analyzed yet
 */
router.post('/chapter/story', authenticate, pipelineController.generateStory.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/chapter/narration:
 *   post:
 *     summary: Generate voice narration + timeline + subtitles
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *             properties:
 *               chapterId:
 *                 type: string
 *               mangaId:
 *                 type: string
 *     responses:
 *       202:
 *         description: Narration job queued
 *       400:
 *         description: Story not generated yet
 */
router.post('/chapter/narration', authenticate, pipelineController.generateNarration.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/chapter/video:
 *   post:
 *     summary: Generate final video with effects
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *             properties:
 *               chapterId:
 *                 type: string
 *               mangaId:
 *                 type: string
 *               options:
 *                 type: object
 *                 properties:
 *                   width:
 *                     type: number
 *                     default: 1920
 *                   height:
 *                     type: number
 *                     default: 1080
 *                   fps:
 *                     type: number
 *                     default: 30
 *                   format:
 *                     type: string
 *                     enum: [mp4, webm]
 *                     default: mp4
 *                   quality:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     default: medium
 *                   subtitles:
 *                     type: boolean
 *                     default: true
 *                   effects:
 *                     type: object
 *                     properties:
 *                       zoom:
 *                         type: boolean
 *                       pan:
 *                         type: boolean
 *                       fade:
 *                         type: boolean
 *     responses:
 *       202:
 *         description: Video generation job queued
 *       400:
 *         description: Timeline not generated yet
 */
router.post('/chapter/video', authenticate, pipelineController.generateVideo.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/job/{jobId}:
 *   get:
 *     summary: Get job status and progress
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Job status retrieved
 *       404:
 *         description: Job not found
 */
router.get('/job/:jobId', authenticate, pipelineController.getJobStatus.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/result/{chapterId}:
 *   get:
 *     summary: Get all pipeline results for a chapter
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Results retrieved
 *       404:
 *         description: No results found
 */
router.get('/result/:chapterId', authenticate, pipelineController.getResult.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/chapter/full:
 *   post:
 *     summary: Run the full pipeline (analyze → story → narration → video) for a single chapter
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - chapterId
 *               - mangaId
 *             properties:
 *               chapterId:
 *                 type: string
 *                 description: Chapter ID
 *               mangaId:
 *                 type: string
 *                 description: Manga / webtoon ID
 *               force:
 *                 type: boolean
 *                 description: Force re-run from the beginning even if already completed
 *                 default: false
 *               options:
 *                 type: object
 *                 description: Video rendering options
 *                 properties:
 *                   width:
 *                     type: number
 *                     default: 1920
 *                   height:
 *                     type: number
 *                     default: 1080
 *                   fps:
 *                     type: number
 *                     default: 30
 *                   format:
 *                     type: string
 *                     enum: [mp4, webm]
 *                     default: mp4
 *                   quality:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     default: medium
 *                   subtitles:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Pipeline completed for the chapter
 *       400:
 *         description: chapterId and mangaId are required
 */
router.post('/chapter/full', authenticate, pipelineController.runFullPipelineForChapterByIds.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/webtoon/full:
 *   post:
 *     summary: Run the full pipeline (analyze → story → narration → video) for a webtoon
 *     tags: [Pipeline]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - webtoonId
 *             properties:
 *               webtoonId:
 *                 type: string
 *                 description: Webtoon / manga ID
 *               chapterLimit:
 *                 type: integer
 *                 description: Maximum number of chapters to process (default 1, max all chapters)
 *                 default: 1
 *               force:
 *                 type: boolean
 *                 description: Force re-run from the beginning even if already completed
 *                 default: false
 *               options:
 *                 type: object
 *                 description: Video rendering options
 *                 properties:
 *                   width:
 *                     type: number
 *                     default: 1920
 *                   height:
 *                     type: number
 *                     default: 1080
 *                   fps:
 *                     type: number
 *                     default: 30
 *                   format:
 *                     type: string
 *                     enum: [mp4, webm]
 *                     default: mp4
 *                   quality:
 *                     type: string
 *                     enum: [low, medium, high]
 *                     default: medium
 *                   subtitles:
 *                     type: boolean
 *                     default: true
 *     responses:
 *       200:
 *         description: Pipeline completed for all requested chapters
 *       400:
 *         description: webtoonId is required
 *       404:
 *         description: No chapters found for this webtoon
 */
router.post('/webtoon/full', authenticate, pipelineController.runFullPipelineForWebtoon.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/health:
 *   get:
 *     summary: Health check for pipeline services
 *     tags: [Pipeline]
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', pipelineController.healthCheck.bind(pipelineController));

/**
 * @swagger
 * /api/pipeline/socket/events:
 *   get:
 *     summary: Socket.IO real-time event schema
 *     description: |
 *       Returns all Socket.IO event names, payloads, and usage instructions.
 *       Clients should connect to the API origin via Socket.IO (path /socket.io),
 *       then emit `subscribe` with `{ chapterId, jobId }` to join the relevant rooms.
 *     tags: [Pipeline]
 *     responses:
 *       200:
 *         description: Socket.IO event schema
 */
router.get('/socket/events', (_req, res) => {
  res.status(200).json({
    success: true,
    data: {
      connection: {
        url: process.env.API_URL || 'http://localhost:5000',
        path: '/socket.io',
        transports: ['websocket', 'polling'],
      },
      clientActions: [
        { name: 'subscribe', payload: { chapterId: 'string (optional)', jobId: 'string (optional)' }, description: 'Join chapter or job rooms' },
        { name: 'unsubscribe', payload: { chapterId: 'string (optional)', jobId: 'string (optional)' }, description: 'Leave chapter or job rooms' },
      ],
      serverEvents: [
        { name: 'socket:connected', payload: { clientId: 'string', timestamp: 'string' }, description: 'Client has connected to the server' },
        { name: 'socket:joined', payload: { rooms: 'string[]', timestamp: 'string' }, description: 'Acknowledgement of room subscription' },
        { name: 'pipeline:chapter:started', payload: { chapterId: 'string', jobId: 'string', title: 'string', step: 'string', progress: 'number' }, description: 'Full pipeline started for a chapter' },
        { name: 'pipeline:chapter:step:started', payload: { chapterId: 'string', jobId: 'string', step: 'string', progress: 'number' }, description: 'A pipeline step has started' },
        { name: 'pipeline:chapter:step:completed', payload: { chapterId: 'string', jobId: 'string', step: 'string', progress: 'number' }, description: 'A pipeline step has completed' },
        { name: 'pipeline:chapter:progress', payload: { chapterId: 'string', jobId: 'string', step: 'string', total: 'number', completed: 'number', percentage: 'number' }, description: 'Progress update for a running step' },
        { name: 'pipeline:chapter:completed', payload: { chapterId: 'string', jobId: 'string', progress: 'number', files: 'object' }, description: 'Full pipeline completed' },
        { name: 'pipeline:chapter:failed', payload: { chapterId: 'string', jobId: 'string', step: 'string', error: 'string', progress: 'number' }, description: 'Pipeline failed' },
        { name: 'pipeline:panel:progress', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', total: 'number', completed: 'number', percentage: 'number', status: 'string' }, description: 'Panel analysis progress' },
        { name: 'pipeline:panel:analyzed', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', imageUrl: 'string', ocrLines: 'number', descriptionPreview: 'string' }, description: 'Single panel analyzed successfully' },
        { name: 'pipeline:panel:retry', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', attempt: 'number', maxRetries: 'number', error: 'string' }, description: 'Panel analysis retry' },
        { name: 'pipeline:panel:error', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', imageUrl: 'string', error: 'string' }, description: 'Panel analysis failed' },
        { name: 'ai:request:started', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', step: 'string', model: 'string' }, description: 'AI / OCR request started' },
        { name: 'ai:request:completed', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', step: 'string', duration: 'number', lines: 'number' }, description: 'AI / OCR request completed' },
        { name: 'ai:request:retry', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', step: 'string', attempt: 'number', maxRetries: 'number', delay: 'number', error: 'object' }, description: 'AI / OCR request retry' },
        { name: 'ai:request:error', payload: { chapterId: 'string', jobId: 'string', panelIndex: 'number', step: 'string', error: 'string', code: 'string' }, description: 'AI / OCR request failed' },
      ],
    },
  });
});

export default router;
