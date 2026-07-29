import express from 'express';
import multer from 'multer';
import path from 'path';
import fs from 'fs-extra';
import { authenticate } from '../middlewares/auth';
import recordingsController from '../controllers/recordingsController';

const router = express.Router();

const recordingsTempDir = path.join(process.cwd(), 'uploads', 'recordings-temp');
fs.ensureDirSync(recordingsTempDir);

const storage = multer.diskStorage({
  destination: (_req: any, _file: any, cb: any) => cb(null, recordingsTempDir),
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = `${Date.now()}-${Math.round(Math.random() * 1e9)}`;
    const ext = path.extname(file.originalname) || '.webm';
    cb(null, `recording-${uniqueSuffix}${ext}`);
  },
});

const upload = multer({
  storage,
  limits: { fileSize: 50 * 1024 * 1024 },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowed = [
      'audio/wav',
      'audio/mpeg',
      'audio/mp3',
      'audio/webm',
      'audio/ogg',
      'audio/mp4',
      'audio/aac',
      'audio/x-m4a',
    ];
    if (allowed.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error(`Invalid audio type: ${file.mimetype}`));
    }
  },
});

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/panels:
 *   get:
 *     summary: Get ordered panel images for a chapter
 *     tags: [Recordings]
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
 *         description: Panels list
 */
router.get('/chapters/:chapterId/panels', authenticate, recordingsController.getChapterPanels);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/session:
 *   get:
 *     summary: Get or create a recording session, resuming from the first unfinished panel
 *     tags: [Recordings]
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
 *         description: Session and next panel
 */
router.get('/chapters/:chapterId/session', authenticate, recordingsController.getSession);

/**
 * @swagger
 * /api/recordings:
 *   post:
 *     summary: Save a new panel recording
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               chapterId:
 *                 type: string
 *               panelId:
 *                 type: string
 *               panelOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Recording saved
 */
router.post('/', authenticate, upload.single('audio'), recordingsController.saveRecording);

/**
 * @swagger
 * /api/recordings/{panelId}:
 *   put:
 *     summary: Overwrite a panel recording (re-record)
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             properties:
 *               audio:
 *                 type: string
 *                 format: binary
 *               chapterId:
 *                 type: string
 *               panelOrder:
 *                 type: integer
 *     responses:
 *       200:
 *         description: Recording updated
 */
router.put('/:panelId', authenticate, upload.single('audio'), recordingsController.updateRecording);

/**
 * @swagger
 * /api/recordings/{panelId}:
 *   delete:
 *     summary: Delete a panel recording
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *     responses:
 *       200:
 *         description: Recording deleted
 */
router.delete('/:panelId', authenticate, recordingsController.deleteRecording);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/panels/{panelId}/skip:
 *   post:
 *     summary: Mark a panel as skipped
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Panel skipped
 */
router.post('/chapters/:chapterId/panels/:panelId/skip', authenticate, recordingsController.skipPanel);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/merge:
 *   post:
 *     summary: Queue a background merge of all panel recordings
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       202:
 *         description: Merge queued
 */
router.post('/chapters/:chapterId/merge', authenticate, recordingsController.mergeChapter);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/merge-status:
 *   get:
 *     summary: Get chapter audio merge progress
 *     tags: [Recordings]
 *     responses:
 *       200:
 *         description: Merge status
 */
router.get('/chapters/:chapterId/merge-status', authenticate, recordingsController.getMergeStatus);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/audio:
 *   get:
 *     summary: Download merged chapter audio
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: MP3 audio stream
 */
router.get('/chapters/:chapterId/audio', authenticate, recordingsController.getChapterAudio);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/timestamps:
 *   get:
 *     summary: Get panel audio timestamps
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Timestamps JSON
 */
router.get('/chapters/:chapterId/timestamps', authenticate, recordingsController.getTimestamps);

/**
 * @swagger
 * /api/recordings/chapters/{chapterId}/recordings:
 *   get:
 *     summary: List all recordings for a chapter
 *     tags: [Recordings]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Recordings list
 */
router.get('/chapters/:chapterId/recordings', authenticate, recordingsController.listRecordings);

export default router;
