import express from 'express';
import { authenticate } from '../middlewares/auth';
import sukuyamiController from '../controllers/sukuyamiController';

const router = express.Router();

/**
 * @swagger
 * /api/sukuyami/webtoons:
 *   get:
 *     summary: Get all webtoons from database
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [ongoing, completed, hiatus, all]
 *           default: all
 *         description: Filter by status
 *       - in: query
 *         name: genre
 *         schema:
 *           type: string
 *         description: Filter by genre
 *       - in: query
 *         name: search
 *         schema:
 *           type: string
 *         description: Search in title, description, author
 *       - in: query
 *         name: sortBy
 *         schema:
 *           type: string
 *           enum: [createdAt, updatedAt, title, totalChapters]
 *           default: createdAt
 *         description: Sort field
 *       - in: query
 *         name: sortOrder
 *         schema:
 *           type: string
 *           enum: [asc, desc]
 *           default: desc
 *         description: Sort order
 *     responses:
 *       200:
 *         description: Webtoons retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/webtoons', authenticate, sukuyamiController.getWebtoons);

/**
 * @swagger
 * /api/sukuyami/webtoons/{webtoonId}:
 *   get:
 *     summary: Get webtoon details by ID
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Webtoon details retrieved successfully
 *       404:
 *         description: Webtoon not found
 *       401:
 *         description: Unauthorized
 */
router.get('/webtoons/:webtoonId', authenticate, sukuyamiController.getWebtoon);

/**
 * @swagger
 * /api/sukuyami/webtoons/{webtoonId}/chapters:
 *   get:
 *     summary: Get chapters for a webtoon
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           default: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 50
 *         description: Items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, syncing, processing, completed, failed, all]
 *           default: all
 *         description: Filter by status
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
 *       404:
 *         description: Webtoon not found
 *       401:
 *         description: Unauthorized
 */
router.get('/webtoons/:webtoonId/chapters', authenticate, sukuyamiController.getChapters);

/**
 * @swagger
 * /api/sukuyami/chapters/{chapterId}:
 *   get:
 *     summary: Get chapter details with panels
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter details retrieved successfully
 *       404:
 *         description: Chapter not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
router.get('/chapters/:chapterId', authenticate, sukuyamiController.getChapter);

/**
 * @swagger
 * /api/sukuyami/sync:
 *   post:
 *     summary: Sync webtoons from SUKUYAMI
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               webtoonIds:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Specific webtoon IDs to sync
 *               forceUpdate:
 *                 type: boolean
 *                 default: false
 *                 description: Force update even if recently synced
 *               syncChapters:
 *                 type: boolean
 *                 default: true
 *                 description: Sync chapters as well
 *     responses:
 *       200:
 *         description: Webtoon sync completed
 *       401:
 *         description: Unauthorized
 */
router.post('/sync', authenticate, sukuyamiController.syncWebtoons);

/**
 * @swagger
 * /api/sukuyami/chapters/{chapterId}/script:
 *   post:
 *     summary: Generate script for a chapter
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               style:
 *                 type: string
 *                 enum: [narrative, dramatic, educational, casual]
 *                 default: narrative
 *                 description: Script style
 *               durationPerPanel:
 *                 type: number
 *                 default: 3
 *                 description: Duration per panel in seconds
 *               model:
 *                 type: string
 *                 default: gpt-4
 *                 description: AI model to use
 *     responses:
 *       200:
 *         description: Script generated successfully
 *       404:
 *         description: Chapter not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
router.post('/chapters/:chapterId/script', authenticate, sukuyamiController.generateScript);

/**
 * @swagger
 * /api/sukuyami/chapters/{chapterId}/video:
 *   post:
 *     summary: Generate video for a chapter
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               format:
 *                 type: string
 *                 enum: [mp4, webm, avi]
 *                 default: mp4
 *                 description: Video format
 *               quality:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: medium
 *                 description: Video quality
 *               fps:
 *                 type: number
 *                 default: 30
 *                 description: Frames per second
 *     responses:
 *       200:
 *         description: Video generated successfully
 *       404:
 *         description: Chapter not found
 *       403:
 *         description: Access denied
 *       401:
 *         description: Unauthorized
 */
router.post('/chapters/:chapterId/video', authenticate, sukuyamiController.generateVideo);

/**
 * @swagger
 * /api/sukuyami/search:
 *   get:
 *     summary: Search webtoons via SUKUYAMI API
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
 *       400:
 *         description: Search query is required
 *       401:
 *         description: Unauthorized
 */
router.get('/search', authenticate, sukuyamiController.searchWebtoons);

/**
 * @swagger
 * /api/sukuyami/webtoons:
 *   post:
 *     summary: Add webtoon to user's collection
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - sukuyamiId
 *             properties:
 *               sukuyamiId:
 *                 type: string
 *                 description: SUKUYAMI webtoon ID
 *     responses:
 *       201:
 *         description: Webtoon added successfully
 *       404:
 *         description: Webtoon not found in SUKUYAMI
 *       409:
 *         description: Webtoon already in collection
 *       401:
 *         description: Unauthorized
 */
router.post('/webtoons', authenticate, sukuyamiController.addWebtoon);

/**
 * @swagger
 * /api/sukuyami/cron/status:
 *   get:
 *     summary: Get cron job status
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Cron job status retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/cron/status', authenticate, sukuyamiController.getCronStatus);

/**
 * @swagger
 * /api/sukuyami/cron/{jobName}/run:
 *   post:
 *     summary: Run cron job manually
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: jobName
 *         required: true
 *         schema:
 *           type: string
 *           enum: [syncWebtoons, checkNewChapters, generateScripts, generateVideos]
 *         description: Job name to run
 *     responses:
 *       200:
 *         description: Job executed successfully
 *       401:
 *         description: Unauthorized
 */
router.post('/cron/:jobName/run', authenticate, sukuyamiController.runCronJob);

/**
 * @swagger
 * /api/sukuyami/dashboard:
 *   get:
 *     summary: Get dashboard statistics
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Dashboard stats retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/dashboard', authenticate, sukuyamiController.getDashboardStats);

/**
 * @swagger
 * /api/sukuyami/health:
 *   get:
 *     summary: Health check for SUKUYAMI services
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed
 *       401:
 *         description: Unauthorized
 */
router.get('/health', authenticate, sukuyamiController.healthCheck);

export default router;
