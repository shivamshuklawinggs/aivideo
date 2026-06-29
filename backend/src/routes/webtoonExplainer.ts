import express from 'express';
import { authenticate } from '../middlewares/auth';
import { uploadArchive } from '../middlewares/upload';
import {
  uploadWebtoonForExplanation,
  updateWebtoonWithNewChapters,
  getExplanationStatus,
  getExplanation,
  generateVoiceExplanation,
  getVoiceSamples,
  getRecommendedVoiceSample,
  generateNarrationScript
} from '../controllers/webtoonExplainerController';

const router = express.Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     WebtoonExplanation:
 *       type: object
 *       properties:
 *         webtoonId:
 *           type: string
 *           description: Webtoon ID
 *         title:
 *           type: string
 *           description: Webtoon title
 *         processingStatus:
 *           type: string
 *           enum: [pending, uploading, extracting, processing, completed, failed]
 *           description: Current processing status
 *         processingProgress:
 *           type: number
 *           description: Processing progress percentage (0-100)
 *         totalChapters:
 *           type: number
 *           description: Total number of chapters
 *         totalPanels:
 *           type: number
 *           description: Total number of panels
 *         errorMessage:
 *           type: string
 *           description: Error message if processing failed
 *     
 *     VoiceSample:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Voice sample ID
 *         name:
 *           type: string
 *           description: Voice sample name
 *         description:
 *           type: string
 *           description: Voice sample description
 *         gender:
 *           type: string
 *           enum: [male, female]
 *           description: Voice gender
 *         ageRange:
 *           type: string
 *           enum: [young, adult, senior]
 *           description: Voice age range
 *         language:
 *           type: string
 *           description: Voice language
 *         isDefault:
 *           type: boolean
 *           description: Whether this is the default voice
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Voice tags
 */

/**
 * @swagger
 * /api/webtoon-explainer/upload:
 *   post:
 *     summary: Upload webtoon for AI explanation
 *     tags: [Webtoon Explainer]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - comicFile
 *               - title
 *             properties:
 *               comicFile:
 *                 type: string
 *                 format: binary
 *                 description: Comic archive file (ZIP, RAR, etc.)
 *               title:
 *                 type: string
 *                 description: Webtoon title
 *               description:
 *                 type: string
 *                 description: Webtoon description (optional)
 *               author:
 *                 type: string
 *                 description: Webtoon author (optional)
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Webtoon genres (optional)
 *     responses:
 *       201:
 *         description: Webtoon uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/WebtoonExplanation'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 */
router.post('/upload', authenticate, uploadArchive, uploadWebtoonForExplanation);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/update:
 *   put:
 *     summary: Update webtoon with new chapters
 *     tags: [Webtoon Explainer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - archive
 *             properties:
 *               archive:
 *                 type: string
 *                 format: binary
 *                 description: Comic archive file with new chapters
 *               title:
 *                 type: string
 *                 description: Updated webtoon title (optional)
 *               description:
 *                 type: string
 *                 description: Updated webtoon description (optional)
 *               author:
 *                 type: string
 *                 description: Updated webtoon author (optional)
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Updated webtoon genres (optional)
 *     responses:
 *       200:
 *         description: Webtoon update started successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   $ref: '#/components/schemas/WebtoonExplanation'
 *       400:
 *         description: Bad request
 *       401:
 *         description: Unauthorized
 *       404:
 *         description: Webtoon not found
 */
router.put('/:webtoonId/update', authenticate, uploadArchive, updateWebtoonWithNewChapters);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/status:
 *   get:
 *     summary: Get webtoon explanation status
 *     tags: [Webtoon Explainer]
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
 *         description: Status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/WebtoonExplanation'
 *       404:
 *         description: Webtoon not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webtoonId/status', authenticate, getExplanationStatus);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/explanation:
 *   get:
 *     summary: Get generated webtoon explanation
 *     tags: [Webtoon Explainer]
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
 *         description: Explanation retrieved successfully
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
 *                     webtoon:
 *                       type: object
 *                       description: Webtoon information
 *                     explanation:
 *                       type: string
 *                       description: Generated explanation script
 *                     metadata:
 *                       type: object
 *                       description: Explanation metadata
 *                     chapters:
 *                       type: array
 *                       description: Chapters list
 *                     panels:
 *                       type: array
 *                       description: Panels list
 *       400:
 *         description: Explanation not ready yet
 *       404:
 *         description: Webtoon or explanation not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webtoonId/explanation', authenticate, getExplanation);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/voice:
 *   post:
 *     summary: Generate voice explanation
 *     tags: [Webtoon Explainer]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voiceSampleId:
 *                 type: string
 *                 description: Voice sample ID (optional, will use default if not provided)
 *     responses:
 *       200:
 *         description: Voice explanation generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     audioData:
 *                       type: string
 *                       description: Base64 encoded audio data
 *                     voiceSample:
 *                       $ref: '#/components/schemas/VoiceSample'
 *                     duration:
 *                       type: number
 *                       description: Audio duration in seconds
 *       400:
 *         description: Explanation not ready yet
 *       404:
 *         description: Webtoon or explanation not found
 *       401:
 *         description: Unauthorized
 */
router.post('/:webtoonId/voice', authenticate, generateVoiceExplanation);

/**
 * @swagger
 * /api/webtoon-explainer/voice-samples:
 *   get:
 *     summary: Get available voice samples
 *     tags: [Webtoon Explainer]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Voice samples retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   type: array
 *                   items:
 *                     $ref: '#/components/schemas/VoiceSample'
 *       401:
 *         description: Unauthorized
 */
router.get('/voice-samples', authenticate, getVoiceSamples);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/recommended-voice:
 *   get:
 *     summary: Get recommended voice sample for webtoon
 *     tags: [Webtoon Explainer]
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
 *         description: Recommended voice sample retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/VoiceSample'
 *       404:
 *         description: Webtoon not found or no voice sample available
 *       401:
 *         description: Unauthorized
 */
router.get('/:webtoonId/recommended-voice', authenticate, getRecommendedVoiceSample);

/**
 * @swagger
 * /api/webtoon-explainer/{webtoonId}/narration:
 *   get:
 *     summary: Generate narration script for webtoon
 *     tags: [Webtoon Explainer]
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
 *         description: Narration script generated successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *                 data:
 *                   type: object
 *                   properties:
 *                     narrationScript:
 *                       type: string
 *                       description: Generated narration script
 *                     webtoonInfo:
 *                       type: object
 *                       description: Webtoon information
 *       400:
 *         description: Explanation not ready yet
 *       404:
 *         description: Webtoon not found
 *       401:
 *         description: Unauthorized
 */
router.get('/:webtoonId/narration', authenticate, generateNarrationScript);

export default router;
