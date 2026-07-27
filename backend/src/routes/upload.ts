import express from 'express';
import multer from 'multer';
import path from 'path';
import uploadController from '../controllers/uploadController';

const router = express.Router();

// Configure multer for audio file uploads
const storage = multer.diskStorage({
  destination: 'uploads',
  filename: (_req: any, file: any, cb: any) => {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, 'audio-' + uniqueSuffix + path.extname(file.originalname));
  },
});

const upload = multer({
  storage,
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
  fileFilter: (_req: any, file: any, cb: any) => {
    const allowedTypes = ['audio/wav', 'audio/mpeg', 'audio/mp3', 'audio/webm'];
    if (allowedTypes.includes(file.mimetype)) {
      cb(null, true);
    } else {
      cb(new Error('Invalid file type. Only audio files are allowed.'));
    }
  },
} as any);

/**
 * @swagger
 * /api/upload-audio:
 *   post:
 *     summary: Upload an audio file
 *     tags: [Upload]
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
 *     responses:
 *       200:
 *         description: Audio uploaded successfully
 *       400:
 *         description: Bad request
 */
router.post('/upload-audio', upload.single('audio'), uploadController.uploadAudio);

export default router;
