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
 * /api/sukuyami/webtoons/popular:
 *   get:
 *     summary: Get popular webtoons sorted by popularity
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: limit
 *         schema:
 *           type: integer
 *           default: 20
 *         description: Maximum number of results
 *     responses:
 *       200:
 *         description: Popular webtoons retrieved successfully
 *       401:
 *         description: Unauthorized
 */
router.get('/webtoons/popular', authenticate, sukuyamiController.getPopularWebtoons);

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
 * /api/sukuyami/chapters/{chapterId}/pages:
 *   get:
 *     summary: Get chapter page images
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
 *         description: Page URLs retrieved successfully
 *       404:
 *         description: Chapter not found
 *       401:
 *         description: Unauthorized
 */
router.get('/chapters/:chapterId/pages', authenticate, sukuyamiController.getChapterPages);

// Mark a chapter as read
router.post('/chapters/:chapterId/read', authenticate, sukuyamiController.markChapterAsRead);

// Mark all chapters of a manga as read
router.post('/webtoons/:webtoonId/read-all', authenticate, sukuyamiController.markAllChaptersAsRead);



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
router.get('/sources', sukuyamiController.getSources);

router.get('/search', sukuyamiController.searchWebtoons);


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
 * /api/sukuyami/proxy/file:
 *   get:
 *     summary: Proxy a remote file through the backend
 *     tags: [Sukuyami]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: url
 *         schema:
 *           type: string
 *         required: true
 *         description: URL of the remote file to proxy
 *     responses:
 *       200:
 *         description: Proxied file content
 *       400:
 *         description: URL is required
 *       401:
 *         description: Unauthorized
 */
router.get('/proxy/file', authenticate, sukuyamiController.proxyFile);

export default router;
