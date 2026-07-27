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
 * /api/pipeline/health:
 *   get:
 *     summary: Health check for pipeline services
 *     tags: [Pipeline]
 *     responses:
 *       200:
 *         description: Health status
 */
router.get('/health', pipelineController.healthCheck.bind(pipelineController));

export default router;
