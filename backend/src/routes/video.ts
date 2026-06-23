import { Router } from 'express';
import {
  fetchVideos,
  fetchVideoById,
  generateVideo,
  updateVideo,
  deleteVideo,
  renderVideo,
  fetchRenderJobs,
  fetchRenderJobById,
  updateRenderJob,
  deleteRenderJob,
  fetchScenes,
  updateScenes,
  updateVideoConfig,
  generatePreview,
  exportVideo,
  getVideoStats,
  likeVideo,
  shareVideo,
  duplicateVideo,
} from '../controllers/videoController';
import { validate, validateMultiple } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';
import {
  fetchVideosSchema,
  videoIdSchema,
  generateVideoSchema,
  updateVideoSchema,
  renderVideoSchema,
  fetchRenderJobsSchema,
  renderJobIdSchema,
  updateRenderJobSchema,
  updateScenesSchema,
  updateVideoConfigSchema,
  exportVideoSchema,
  shareVideoSchema,
} from '../schemas/video';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Video:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Video ID
 *         title:
 *           type: string
 *           description: Video title
 *         webtoonId:
 *           type: string
 *           description: Webtoon ID
 *         chapterId:
 *           type: string
 *           description: Chapter ID
 *         scriptId:
 *           type: string
 *           description: Script ID
 *         voiceProfileId:
 *           type: string
 *           description: Voice profile ID
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           description: Video status
 *         videoConfig:
 *           type: object
 *           description: Video configuration
 *         scenes:
 *           type: array
 *           items:
 *             type: object
 *           description: Video scenes
 *         likes:
 *           type: number
 *           description: Number of likes
 *         userId:
 *           type: string
 *           description: User ID who owns the video
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *     RenderJob:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Render job ID
 *         videoId:
 *           type: string
 *           description: Video ID
 *         status:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *           description: Render job status
 *         resolution:
 *           type: string
 *           description: Video resolution
 *         format:
 *           type: string
 *           description: Video format
 *         fps:
 *           type: number
 *           description: Frames per second
 *         progress:
 *           type: number
 *           description: Render progress (0-100)
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 */

/**
 * @swagger
 * /api/videos:
 *   get:
 *     summary: Get videos for authenticated user
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema:
 *           type: integer
 *           minimum: 1
 *         description: Page number
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           minimum: 1
 *           maximum: 50
 *         description: Number of items per page
 *       - in: query
 *         name: status
 *         schema:
 *           type: string
 *           enum: [pending, processing, completed, failed]
 *         description: Filter by video status
 *     responses:
 *       200:
 *         description: Videos retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     videos:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Video'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, validate(fetchVideosSchema, 'query'), fetchVideos);

/**
 * @swagger
 * /api/videos/{id}:
 *   get:
 *     summary: Get video by ID
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: object
 *                   properties:
 *                     video:
 *                       $ref: '#/components/schemas/Video'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, validate(videoIdSchema, 'params'), fetchVideoById);

/**
 * @swagger
 * /api/videos:
 *   post:
 *     summary: Generate a new video
 *     tags: [Videos]
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
 *               - chapterId
 *             properties:
 *               webtoonId:
 *                 type: string
 *                 description: Webtoon ID
 *               chapterId:
 *                 type: string
 *                 description: Chapter ID
 *               voiceProfileId:
 *                 type: string
 *                 description: Voice profile ID (optional)
 *               config:
 *                 type: object
 *                 description: Video generation configuration (optional)
 *     responses:
 *       201:
 *         description: Video generation started
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/', authenticate, validate(generateVideoSchema), generateVideo);

/**
 * @swagger
 * /api/videos/{id}:
 *   put:
 *     summary: Update video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Video title (optional)
 *               config:
 *                 type: object
 *                 description: Video configuration (optional)
 *     responses:
 *       200:
 *         description: Video updated successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticate, validateMultiple({
  params: videoIdSchema,
  body: updateVideoSchema,
}), updateVideo);

/**
 * @swagger
 * /api/videos/{id}:
 *   delete:
 *     summary: Delete video
 *     tags: [Videos]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Video ID
 *     responses:
 *       200:
 *         description: Video deleted successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Video not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticate, validate(videoIdSchema, 'params'), deleteVideo);

// Render video
router.post('/:id/render', authenticate, validateMultiple({
  params: videoIdSchema,
  body: renderVideoSchema,
}), renderVideo);

// Get render jobs for user
router.get('/render/jobs', authenticate, validate(fetchRenderJobsSchema, 'query'), fetchRenderJobs);

// Get render job by ID
router.get('/render/jobs/:jobId', authenticate, validate(renderJobIdSchema, 'params'), fetchRenderJobById);

// Update render job
router.put('/render/jobs/:jobId', authenticate, validateMultiple({
  params: renderJobIdSchema,
  body: updateRenderJobSchema,
}), updateRenderJob);

// Delete render job
router.delete('/render/jobs/:jobId', authenticate, validate(renderJobIdSchema, 'params'), deleteRenderJob);

// Get scenes for video
router.get('/:id/scenes', authenticate, validate(videoIdSchema, 'params'), fetchScenes);

// Update scenes
router.put('/:id/scenes', authenticate, validateMultiple({
  params: videoIdSchema,
  body: updateScenesSchema,
}), updateScenes);

// Update video config
router.put('/:id/config', authenticate, validateMultiple({
  params: videoIdSchema,
  body: updateVideoConfigSchema,
}), updateVideoConfig);

// Generate preview
router.post('/:id/preview', authenticate, validate(videoIdSchema, 'params'), generatePreview);

// Export video
router.post('/:id/export', authenticate, validateMultiple({
  params: videoIdSchema,
  body: exportVideoSchema,
}), exportVideo);

// Get video stats
router.get('/:id/stats', authenticate, validate(videoIdSchema, 'params'), getVideoStats);

// Like video
router.post('/:id/like', authenticate, validate(videoIdSchema, 'params'), likeVideo);

// Share video
router.post('/:id/share', authenticate, validateMultiple({
  params: videoIdSchema,
  body: shareVideoSchema,
}), shareVideo);

// Duplicate video
router.post('/:id/duplicate', authenticate, validate(videoIdSchema, 'params'), duplicateVideo);

export default router;
