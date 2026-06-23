import { Router } from 'express';
import {
  fetchVoiceProfiles,
  fetchVoiceProfileById,
  uploadVoiceSample,
  createVoiceProfile,
  updateVoiceProfile,
  deleteVoiceProfile,
  cloneVoiceProfile,
  testVoiceProfile,
  analyzeVoiceSample,
  getVoicePresets,
} from '../controllers/voiceController';
import { validate, validateMultiple } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  fetchVoiceProfilesSchema,
  voiceIdSchema,
  createVoiceProfileSchema,
  updateVoiceProfileSchema,
  cloneVoiceProfileSchema,
  testVoiceProfileSchema,
} from '../schemas/voice';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     VoiceProfile:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Voice profile ID
 *         name:
 *           type: string
 *           description: Voice profile name
 *         description:
 *           type: string
 *           description: Voice profile description
 *         voiceSamplePath:
 *           type: string
 *           description: Path to voice sample file
 *         status:
 *           type: string
 *           enum: [processing, ready, failed]
 *           description: Voice profile status
 *         userId:
 *           type: string
 *           description: User ID who owns the voice profile
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 *     VoicePreset:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Preset ID
 *         name:
 *           type: string
 *           description: Preset name
 *         description:
 *           type: string
 *           description: Preset description
 */

/**
 * @swagger
 * /api/voice:
 *   get:
 *     summary: Get voice profiles for authenticated user
 *     tags: [Voice]
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
 *     responses:
 *       200:
 *         description: Voice profiles retrieved successfully
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
 *                     voiceProfiles:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VoiceProfile'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/', authenticate, validate(fetchVoiceProfilesSchema, 'query'), fetchVoiceProfiles);

/**
 * @swagger
 * /api/voice/{id}:
 *   get:
 *     summary: Get voice profile by ID
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice profile ID
 *     responses:
 *       200:
 *         description: Voice profile retrieved successfully
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
 *                     voiceProfile:
 *                       $ref: '#/components/schemas/VoiceProfile'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Voice profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', authenticate, validate(voiceIdSchema, 'params'), fetchVoiceProfileById);

/**
 * @swagger
 * /api/voice/upload:
 *   post:
 *     summary: Upload voice sample
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - voiceSample
 *             properties:
 *               voiceSample:
 *                 type: string
 *                 format: binary
 *                 description: Voice sample file
 *     responses:
 *       201:
 *         description: Voice sample uploaded successfully
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
router.post('/upload', authenticate, upload.single('voiceSample'), uploadVoiceSample);

/**
 * @swagger
 * /api/voice:
 *   post:
 *     summary: Create voice profile
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *               - voiceSamplePath
 *             properties:
 *               name:
 *                 type: string
 *                 description: Voice profile name
 *               description:
 *                 type: string
 *                 description: Voice profile description (optional)
 *               voiceSamplePath:
 *                 type: string
 *                 description: Path to voice sample file
 *     responses:
 *       201:
 *         description: Voice profile created successfully
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
router.post('/', authenticate, validate(createVoiceProfileSchema), createVoiceProfile);

/**
 * @swagger
 * /api/voice/{id}:
 *   put:
 *     summary: Update voice profile
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               name:
 *                 type: string
 *                 description: Voice profile name (optional)
 *               description:
 *                 type: string
 *                 description: Voice profile description (optional)
 *     responses:
 *       200:
 *         description: Voice profile updated successfully
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
 *         description: Voice profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticate, validateMultiple({
  params: voiceIdSchema,
  body: updateVoiceProfileSchema,
}), updateVoiceProfile);

/**
 * @swagger
 * /api/voice/{id}:
 *   delete:
 *     summary: Delete voice profile
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice profile ID
 *     responses:
 *       200:
 *         description: Voice profile deleted successfully
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
 *         description: Voice profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticate, validate(voiceIdSchema, 'params'), deleteVoiceProfile);

/**
 * @swagger
 * /api/voice/{id}/clone:
 *   post:
 *     summary: Clone voice profile
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice profile ID to clone
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - name
 *             properties:
 *               name:
 *                 type: string
 *                 description: New voice profile name
 *     responses:
 *       201:
 *         description: Voice profile cloned successfully
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
 *         description: Voice profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/clone', authenticate, validateMultiple({
  params: voiceIdSchema,
  body: cloneVoiceProfileSchema,
}), cloneVoiceProfile);

/**
 * @swagger
 * /api/voice/{id}/test:
 *   post:
 *     summary: Test voice profile
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Voice profile ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - text
 *             properties:
 *               text:
 *                 type: string
 *                 description: Text to synthesize
 *     responses:
 *       200:
 *         description: Voice test started
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
 *         description: Voice profile not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/test', authenticate, validateMultiple({
  params: voiceIdSchema,
  body: testVoiceProfileSchema,
}), testVoiceProfile);

/**
 * @swagger
 * /api/voice/analyze:
 *   post:
 *     summary: Analyze voice sample
 *     tags: [Voice]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - voiceSample
 *             properties:
 *               voiceSample:
 *                 type: string
 *                 format: binary
 *                 description: Voice sample file to analyze
 *     responses:
 *       200:
 *         description: Voice sample analyzed successfully
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
 *                     analysis:
 *                       type: object
 *                       description: Voice analysis results
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/analyze', authenticate, upload.single('voiceSample'), analyzeVoiceSample);

/**
 * @swagger
 * /api/voice/presets/all:
 *   get:
 *     summary: Get voice presets
 *     tags: [Voice]
 *     responses:
 *       200:
 *         description: Voice presets retrieved successfully
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
 *                     presets:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/VoicePreset'
 */
router.get('/presets/all', getVoicePresets);

export default router;
