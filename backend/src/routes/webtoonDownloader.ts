import express from 'express';
import { authenticate } from '../middlewares/auth';
import webtoonDownloaderController from '../controllers/webtoonDownloaderController';

const router = express.Router();

/**
 * @swagger
 * /api/webtoon-downloader/info:
 *   get:
 *     summary: Get webtoon information from MangaFire URL
 *     tags: [Webtoon Downloader]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         required: true
 *         schema:
 *           type: string
 *         description: MangaFire webtoon URL
 *     responses:
 *       200:
 *         description: Webtoon information retrieved successfully
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
 *                       $ref: '#/components/schemas/WebtoonInfo'
 *                     chapters:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/ChapterInfo'
 *       400:
 *         description: Bad request
 *       503:
 *         description: Downloader service unavailable
 */
router.get('/info', authenticate, webtoonDownloaderController.getWebtoonInfo);

/**
 * @swagger
 * /api/webtoon-downloader/download:
 *   post:
 *     summary: Download webtoon from MangaFire and start processing
 *     tags: [Webtoon Downloader]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required:
 *               - url
 *             properties:
 *               url:
 *                 type: string
 *                 description: MangaFire webtoon URL
 *               chapters:
 *                 type: array
 *                 items:
 *                   type: number
 *                 description: Specific chapter numbers to download (optional)
 *               format:
 *                 type: string
 *                 enum: [zip, cbz]
 *                 default: zip
 *                 description: Archive format
 *               quality:
 *                 type: string
 *                 enum: [low, medium, high]
 *                 default: high
 *                 description: Image quality
 *               title:
 *                 type: string
 *                 description: Custom title (optional)
 *               description:
 *                 type: string
 *                 description: Custom description (optional)
 *               author:
 *                 type: string
 *                 description: Custom author (optional)
 *               genres:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Custom genres (optional)
 *     responses:
 *       201:
 *         description: Webtoon downloaded and processing started
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
 *                     webtoonId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     status:
 *                       type: string
 *                     chapters:
 *                       type: object
 *                       properties:
 *                         total:
 *                           type: number
 *                         downloaded:
 *                           type: number
 *                     archive:
 *                       type: object
 *                       properties:
 *                         name:
 *                           type: string
 *                         size:
 *                           type: number
 *       400:
 *         description: Bad request
 *       503:
 *         description: Downloader service unavailable
 */
router.post('/download', authenticate, webtoonDownloaderController.downloadAndProcessWebtoon);

/**
 * @swagger
 * /api/webtoon-downloader/{webtoonId}/status:
 *   get:
 *     summary: Get download status for a webtoon
 *     tags: [Webtoon Downloader]
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
 *         description: Download status retrieved successfully
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
 *                     webtoonId:
 *                       type: string
 *                     title:
 *                       type: string
 *                     processingStatus:
 *                       type: string
 *                     processingProgress:
 *                       type: number
 *                     sourceType:
 *                       type: string
 *                     sourceUrl:
 *                       type: string
 *                     archiveDownloaded:
 *                       type: boolean
 *                     metadata:
 *                       type: object
 *       404:
 *         description: Webtoon not found
 */
router.get('/:webtoonId/status', authenticate, webtoonDownloaderController.getDownloadStatus);

/**
 * @swagger
 * /api/webtoon-downloader/{webtoonId}/retry:
 *   post:
 *     summary: Retry failed download for a webtoon
 *     tags: [Webtoon Downloader]
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
 *         description: Download retry started successfully
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
 *                     webtoonId:
 *                       type: string
 *                     status:
 *                       type: string
 *       400:
 *         description: Bad request - webtoon not downloadable
 *       404:
 *         description: Webtoon not found
 */
router.post('/:webtoonId/retry', authenticate, webtoonDownloaderController.retryDownload);

/**
 * @swagger
 * /api/webtoon-downloader/search:
 *   get:
 *     summary: Search manga using GraphQL API
 *     tags: [Webtoon Downloader]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: query
 *         required: true
 *         schema:
 *           type: string
 *         description: Search query for manga
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *       - in: query
 *         name: source
 *         schema:
 *           type: string
 *           enum: [graphql]
 *         description: Data source (only GraphQL supported for search)
 *     responses:
 *       200:
 *         description: Search results retrieved successfully
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
 *                     query:
 *                       type: string
 *                     results:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/WebtoonInfo'
 *                     total:
 *                       type: number
 *                     source:
 *                       type: string
 *       400:
 *         description: Bad request - query required or invalid source
 *       503:
 *         description: GraphQL service unavailable
 */
router.get('/search', authenticate, webtoonDownloaderController.searchManga);

/**
 * @swagger
 * /api/webtoon-downloader/health:
 *   get:
 *     summary: Health check for all downloader services
 *     tags: [Webtoon Downloader]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Health check completed
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
 *                     mangafire:
 *                       type: boolean
 *                     tachiyomi:
 *                       type: boolean
 *                     graphql:
 *                       type: boolean
 *                     overall:
 *                       type: boolean
 *       503:
 *         description: All services unavailable
 */
router.get('/health', authenticate, webtoonDownloaderController.healthCheck);

export default router;
