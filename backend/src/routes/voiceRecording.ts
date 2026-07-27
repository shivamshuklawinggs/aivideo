import express from 'express';
import { authenticate } from '../middlewares/auth';
import voiceRecordingController from '../controllers/voiceRecordingController';

const router = express.Router();

/**
 * @swagger
 * /api/voice-recordings:
 *   post:
 *     summary: Save a voice recording for a specific chapter page
 *     tags: [VoiceRecording]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               chapterId:
 *                 type: string
 *               pageId:
 *                 type: integer
 *               audioFile:
 *                 type: string
 *               duration:
 *                 type: number
 *     responses:
 *       200:
 *         description: Recording saved successfully
 *       400:
 *         description: Bad request
 */
router.post('/', authenticate, voiceRecordingController.saveRecording);

/**
 * @swagger
 * /api/voice-recordings/{chapterId}:
 *   get:
 *     summary: Get all voice recordings for a chapter
 *     tags: [VoiceRecording]
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
 *         description: Recordings retrieved successfully
 *       404:
 *         description: Not found
 */
router.get('/:chapterId', authenticate, voiceRecordingController.getChapterRecordings);

/**
 * @swagger
 * /api/voice-recordings/{chapterId}/{pageId}:
 *   get:
 *     summary: Get voice recording for a specific page
 *     tags: [VoiceRecording]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recording retrieved successfully
 *       404:
 *         description: Not found
 */
router.get('/:chapterId/:pageId', authenticate, voiceRecordingController.getPageRecording);

/**
 * @swagger
 * /api/voice-recordings/{chapterId}/{pageId}:
 *   delete:
 *     summary: Delete voice recording for a specific page
 *     tags: [VoiceRecording]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *       - in: path
 *         name: pageId
 *         required: true
 *         schema:
 *           type: integer
 *     responses:
 *       200:
 *         description: Recording deleted successfully
 *       404:
 *         description: Not found
 */
router.delete('/:chapterId/:pageId', authenticate, voiceRecordingController.deleteRecording);

export default router;
