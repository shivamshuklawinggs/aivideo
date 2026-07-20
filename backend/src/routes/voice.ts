import express from 'express';
import { authenticate } from '../middlewares/auth';
import voiceController from '../controllers/voiceController';

const router = express.Router();

/**
 * @swagger
 * /api/voice/samples:
 *   get:
 *     summary: Get available voice samples
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: List of voice samples
 *       401:
 *         description: Unauthorized
 */
router.get('/samples', authenticate, voiceController.getSamples);

/**
 * @swagger
 * /api/voice/clone:
 *   post:
 *     summary: Clone a voice from a sample
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               sampleId:
 *                 type: string
 *     responses:
 *       200:
 *         description: Voice cloned successfully
 *       400:
 *         description: Bad request
 *       404:
 *         description: Sample not found
 */
router.post('/clone', authenticate, voiceController.cloneVoice);

/**
 * @swagger
 * /api/voice/narrate:
 *   post:
 *     summary: Generate narration audio for text segments
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               voiceProfileId:
 *                 type: string
 *               segments:
 *                 type: array
 *                 items:
 *                   type: object
 *                   properties:
 *                     text:
 *                       type: string
 *               language:
 *                 type: string
 *                 default: en
 *     responses:
 *       200:
 *         description: Audio generated successfully
 *       400:
 *         description: Bad request
 */
router.post('/narrate', authenticate, voiceController.narrate);

export default router;
