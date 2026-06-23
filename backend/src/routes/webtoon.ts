import { Router } from 'express';
import {
  fetchWebtoons,
  fetchWebtoonById,
  uploadWebtoon,
  updateWebtoon,
  deleteWebtoon,
  fetchChapters,
  fetchChapterById,
  updateChapter,
  deleteChapter,
  fetchPanels,
  generateScript,
  updateMetadata,
  togglePublic,
  incrementViews,
} from '../controllers/webtoonController';
import { validate, validateMultiple } from '../middlewares/validation';
import { authenticate } from '../middlewares/auth';
import { upload } from '../middlewares/upload';
import {
  fetchWebtoonsSchema,
  webtoonIdSchema,
  uploadWebtoonSchema,
  updateWebtoonSchema,
  chapterIdSchema,
  updateChapterSchema,
  generateScriptSchema,
  updateMetadataSchema,
  webtoonParamsSchema,
} from '../schemas/webtoon';

const router = Router();

/**
 * @swagger
 * components:
 *   schemas:
 *     Webtoon:
 *       type: object
 *       properties:
 *         id:
 *           type: string
 *           description: Webtoon ID
 *         title:
 *           type: string
 *           description: Webtoon title
 *         description:
 *           type: string
 *           description: Webtoon description
 *         author:
 *           type: string
 *           description: Webtoon author
 *         genres:
 *           type: array
 *           items:
 *             type: string
 *           description: Webtoon genres
 *         tags:
 *           type: array
 *           items:
 *             type: string
 *           description: Webtoon tags
 *         isPublic:
 *           type: boolean
 *           description: Whether webtoon is public
 *         views:
 *           type: number
 *           description: Number of views
 *         userId:
 *           type: string
 *           description: User ID who owns the webtoon
 *         createdAt:
 *           type: string
 *           format: date-time
 *           description: Creation date
 */

/**
 * @swagger
 * /api/webtoons:
 *   get:
 *     summary: Get webtoons with pagination and search
 *     tags: [Webtoons]
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
 *         name: search
 *         schema:
 *           type: string
 *         description: Search term for title, description, author, or tags
 *     responses:
 *       200:
 *         description: Webtoons retrieved successfully
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
 *                     webtoons:
 *                       type: array
 *                       items:
 *                         $ref: '#/components/schemas/Webtoon'
 *                     pagination:
 *                       $ref: '#/components/schemas/Pagination'
 */
router.get('/', validate(fetchWebtoonsSchema, 'query'), fetchWebtoons);

/**
 * @swagger
 * /api/webtoons/{id}:
 *   get:
 *     summary: Get webtoon by ID
 *     tags: [Webtoons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Webtoon retrieved successfully
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
 *                       $ref: '#/components/schemas/Webtoon'
 *       404:
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:id', validate(webtoonIdSchema, 'params'), fetchWebtoonById);

/**
 * @swagger
 * /api/webtoons:
 *   post:
 *     summary: Upload a new webtoon
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required:
 *               - title
 *               - archive
 *             properties:
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Webtoon tags (optional)
 *               archive:
 *                 type: string
 *                 format: binary
 *                 description: Webtoon archive file
 *     responses:
 *       201:
 *         description: Webtoon uploaded successfully
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Success'
 *       400:
 *         description: Bad request - validation error
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
router.post('/', authenticate, upload.single('archive'), validate(uploadWebtoonSchema), uploadWebtoon);

/**
 * @swagger
 * /api/webtoons/{id}:
 *   put:
 *     summary: Update webtoon
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *                 description: Webtoon title (optional)
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Webtoon tags (optional)
 *     responses:
 *       200:
 *         description: Webtoon updated successfully
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
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:id', authenticate, validateMultiple({
  params: webtoonIdSchema,
  body: updateWebtoonSchema,
}), updateWebtoon);

/**
 * @swagger
 * /api/webtoons/{id}:
 *   delete:
 *     summary: Delete webtoon
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Webtoon deleted successfully
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
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:id', authenticate, validate(webtoonIdSchema, 'params'), deleteWebtoon);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/chapters:
 *   get:
 *     summary: Get chapters for a webtoon
 *     tags: [Webtoons]
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Chapters retrieved successfully
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
 *                     chapters:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           title:
 *                             type: string
 *                           chapterNumber:
 *                             type: number
 *                           description:
 *                             type: string
 */
router.get('/:webtoonId/chapters', validate(webtoonParamsSchema, 'params'), fetchChapters);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/chapters/{chapterId}:
 *   get:
 *     summary: Get chapter by ID
 *     tags: [Webtoons]
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter retrieved successfully
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
 *                     chapter:
 *                       type: object
 *                       properties:
 *                         id:
 *                           type: string
 *                         title:
 *                           type: string
 *                         chapterNumber:
 *                           type: number
 *                         description:
 *                           type: string
 *                         panels:
 *                           type: array
 *                           items:
 *                             type: object
 *       404:
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.get('/:webtoonId/chapters/:chapterId', validate(chapterIdSchema, 'params'), fetchChapterById);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/chapters/{chapterId}:
 *   put:
 *     summary: Update chapter
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               title:
 *                 type: string
 *                 description: Chapter title (optional)
 *               description:
 *                 type: string
 *                 description: Chapter description (optional)
 *               chapterNumber:
 *                 type: integer
 *                 minimum: 1
 *                 description: Chapter number (optional)
 *     responses:
 *       200:
 *         description: Chapter updated successfully
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
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.put('/:webtoonId/chapters/:chapterId', authenticate, validateMultiple({
  params: chapterIdSchema,
  body: updateChapterSchema,
}), updateChapter);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/chapters/{chapterId}:
 *   delete:
 *     summary: Delete chapter
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Chapter deleted successfully
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
 *         description: Chapter not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.delete('/:webtoonId/chapters/:chapterId', authenticate, validate(chapterIdSchema, 'params'), deleteChapter);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/chapters/{chapterId}/panels:
 *   get:
 *     summary: Get panels for a chapter
 *     tags: [Webtoons]
 *     parameters:
 *       - in: path
 *         name: webtoonId
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *       - in: path
 *         name: chapterId
 *         required: true
 *         schema:
 *           type: string
 *         description: Chapter ID
 *     responses:
 *       200:
 *         description: Panels retrieved successfully
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
 *                     panels:
 *                       type: array
 *                       items:
 *                         type: object
 *                         properties:
 *                           id:
 *                             type: string
 *                           panelNumber:
 *                             type: number
 *                           imageUrl:
 *                             type: string
 *                           description:
 *                             type: string
 */
router.get('/:webtoonId/chapters/:chapterId/panels', validate(chapterIdSchema, 'params'), fetchPanels);

/**
 * @swagger
 * /api/webtoons/{webtoonId}/generate-script:
 *   post:
 *     summary: Generate script for webtoon/chapter
 *     tags: [Webtoons]
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
 *               chapterId:
 *                 type: string
 *                 description: Chapter ID (optional)
 *               voiceProfileId:
 *                 type: string
 *                 description: Voice profile ID (optional)
 *               options:
 *                 type: object
 *                 description: Script generation options (optional)
 *     responses:
 *       200:
 *         description: Script generation started
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
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:webtoonId/generate-script', authenticate, validateMultiple({
  params: webtoonParamsSchema,
  body: generateScriptSchema,
}), generateScript);

/**
 * @swagger
 * /api/webtoons/{id}/metadata:
 *   patch:
 *     summary: Update webtoon metadata
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
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
 *               title:
 *                 type: string
 *                 description: Webtoon title (optional)
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
 *               tags:
 *                 type: array
 *                 items:
 *                   type: string
 *                 description: Webtoon tags (optional)
 *     responses:
 *       200:
 *         description: Metadata updated successfully
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
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/metadata', authenticate, validateMultiple({
  params: webtoonIdSchema,
  body: updateMetadataSchema,
}), updateMetadata);

/**
 * @swagger
 * /api/webtoons/{id}/public:
 *   patch:
 *     summary: Toggle webtoon public status
 *     tags: [Webtoons]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Public status toggled successfully
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
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.patch('/:id/public', authenticate, validate(webtoonIdSchema, 'params'), togglePublic);

/**
 * @swagger
 * /api/webtoons/{id}/views:
 *   post:
 *     summary: Increment webtoon views
 *     tags: [Webtoons]
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema:
 *           type: string
 *         description: Webtoon ID
 *     responses:
 *       200:
 *         description: Views incremented successfully
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
 *                     views:
 *                       type: number
 *       404:
 *         description: Webtoon not found
 *         content:
 *           application/json:
 *             schema:
 *               $ref: '#/components/schemas/Error'
 */
router.post('/:id/views', validate(webtoonIdSchema, 'params'), incrementViews);

export default router;
