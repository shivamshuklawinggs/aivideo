import { Router } from 'express';
import {
  getAvailableModels,
  getDownloadStatuses,
  getModelDownloadStatus,
  downloadModel,
  cancelModelDownload,
  clearCompletedDownloads,
  getSystemInfo,
  testModel,
  subscribeToDownloadUpdates,
} from '../controllers/modelController';
import { authenticate } from '../middlewares/auth';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     ModelDownloadStatus:
 *       type: object
 *       properties:
 *         modelId:
 *           type: string
 *           description: Model identifier
 *         status:
 *           type: string
 *           enum: [pending, downloading, completed, failed, retrying]
 *           description: Download status
 *         progress:
 *           type: object
 *           properties:
 *             downloaded:
 *               type: number
 *               description: Bytes downloaded
 *             total:
 *               type: number
 *               description: Total bytes to download
 *             percentage:
 *               type: number
 *               description: Download percentage (0-100)
 *             speed:
 *               type: number
 *               description: Download speed in bytes per second
 *             eta:
 *               type: number
 *               description: Estimated time remaining in seconds
 *         error:
 *           type: object
 *           properties:
 *             message:
 *               type: string
 *             retryCount:
 *               type: number
 *             lastRetry:
 *               type: string
 *               format: date-time
 *         startTime:
 *           type: string
 *           format: date-time
 *         endTime:
 *           type: string
 *           format: date-time
 *         retryCount:
 *           type: number
 *           description: Number of retry attempts
 *         maxRetries:
 *           type: number
 *           description: Maximum retry attempts
 */

/**
 * @swagger
 * /api/models/available:
 *   get:
 *     summary: Get available models for current system
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: Available models retrieved successfully
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
 *                     systemRAM:
 *                       type: number
 *                       description: System RAM in GB
 *                     tier:
 *                       type: string
 *                       description: System RAM tier
 *                     availableModels:
 *                       type: array
 *                       items:
 *                         type: string
 *                       description: Available model names
 *                     defaultModels:
 *                       type: object
 *                       description: Default models for each task
 *                     resourceLimits:
 *                       type: object
 *                       description: Resource limits for current tier
 */
router.get('/available', getAvailableModels);

/**
 * @swagger
 * /api/models/system:
 *   get:
 *     summary: Get system information and model status
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: System information retrieved successfully
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
 *                     system:
 *                       type: object
 *                       description: System configuration
 *                     services:
 *                       type: object
 *                       description: Service status
 *                     models:
 *                       type: object
 *                       description: Model information
 *                     downloadStats:
 *                       type: object
 *                       description: Download statistics
 */
router.get('/system', getSystemInfo);

/**
 * @swagger
 * /api/models/downloads:
 *   get:
 *     summary: Get download status for all models
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: Download statuses retrieved successfully
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
 *                     statuses:
 *                       type: object
 *                       additionalProperties:
 *                         $ref: '#/components/schemas/ModelDownloadStatus'
 *                     stats:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         pending:
 *                           type: number
 *                         downloading:
 *                           type: number
 *                         completed:
 *                           type: number
 *                         failed:
 *                           type: number
 *                         retrying:
 *                           type: number
 */
router.get('/downloads', getDownloadStatuses);

/**
 * @swagger
 * /api/models/downloads/{modelId}:
 *   get:
 *     summary: Get download status for a specific model
 *     tags: [Models]
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Model identifier
 *     responses:
 *       200:
 *         description: Download status retrieved successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 data:
 *                   $ref: '#/components/schemas/ModelDownloadStatus'
 *       404:
 *         description: Model download status not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/downloads/:modelId', getModelDownloadStatus);

/**
 * @swagger
 * /api/models/download/{modelId}:
 *   post:
 *     summary: Download a model
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Model identifier
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               maxRetries:
 *                 type: integer
 *                 minimum: 0
 *                 maximum: 10
 *                 default: 3
 *                 description: Maximum retry attempts
 *     responses:
 *       200:
 *         description: Model download started
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
 *                     modelId:
 *                       type: string
 *                     status:
 *                       type: string
 *                     maxRetries:
 *                       type: integer
 *       400:
 *         description: Bad request
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/download/:modelId', authenticate, downloadModel);

/**
 * @swagger
 * /api/models/download/{modelId}/cancel:
 *   delete:
 *     summary: Cancel model download
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Model identifier
 *     responses:
 *       200:
 *         description: Model download cancelled
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/download/:modelId/cancel', authenticate, cancelModelDownload);

/**
 * @swagger
 * /api/models/downloads/clear:
 *   delete:
 *     summary: Clear completed downloads
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Completed downloads cleared
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                 message:
 *                   type: string
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/downloads/clear', authenticate, clearCompletedDownloads);

/**
 * @swagger
 * /api/models/test/{modelId}:
 *   post:
 *     summary: Test a model
 *     tags: [Models]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: modelId
 *         required: true
 *         schema:
 *           type: string
 *         description: Model identifier
 *     requestBody:
 *       required: false
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               prompt:
 *                 type: string
 *                 default: "Hello, how are you?"
 *                 description: Test prompt
 *     responses:
 *       200:
 *         description: Model test completed
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
 *                     modelId:
 *                       type: string
 *                     prompt:
 *                       type: string
 *                     response:
 *                       type: string
 *                     testedAt:
 *                       type: string
 *                       format: date-time
 *       401:
 *         description: Unauthorized
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 *       404:
 *         description: Model not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/test/:modelId', authenticate, testModel);

/**
 * @swagger
 * /api/models/subscribe:
 *   get:
 *     summary: Subscribe to real-time download updates via SSE
 *     tags: [Models]
 *     responses:
 *       200:
 *         description: SSE connection established
 *         content:
 *           text/event-stream:
 *             schema:
 *               type: string
 *               description: Server-Sent Events stream
 *       500:
 *         description: Failed to establish SSE connection
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/subscribe', subscribeToDownloadUpdates);

export default router;
