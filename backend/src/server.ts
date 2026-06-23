import express, { Application } from 'express';
import dotenv from 'dotenv';
import cors from 'cors';
import helmet from 'helmet';
import compression from 'compression';
import morgan from 'morgan';
import cookieParser from 'cookie-parser';
import database from './config/database';
import logger from './config/logger';
import errorHandler from './middlewares/errorHandler';
import { connectRedis } from './config/redisConnection';
import { swaggerUi, specs } from './config/swagger';
import AuthRoutes from './routes/auth';
import WebtoonRoutes from './routes/webtoon';
import VoiceRoutes from './routes/voice';
import VideoRoutes from './routes/video';
import ModelRoutes from './routes/models';

dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

app.use(helmet());
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:3000',
  credentials: true,
}));
app.use(compression());
app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ extended: true, limit: '50mb' }));
app.use(cookieParser());
app.use(morgan('combined', {
  stream: {
    write: (message: string) => logger.info(message.trim()),
  },
}));


app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'Server is healthy',
    timestamp: new Date().toISOString(),
  });
});

app.get('/', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'AI Webtoon Story Explainer API',
    version: '1.0.0',
    documentation: '/api/docs',
  });
});

// API Routes
app.use('/api/auth', AuthRoutes);
app.use('/api/webtoons', WebtoonRoutes);
app.use('/api/voice', VoiceRoutes);
app.use('/api/videos', VideoRoutes);
app.use('/api/models', ModelRoutes);

// Swagger Documentation
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(specs, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'AI Webtoon Story Explainer API Documentation',
}));

// 404 handler
app.use('*', (_req, res) => {
  res.status(404).json({
    success: false,
    message: 'Route not found',
  });
});

app.use(errorHandler);

const startServer = async () => {
  try {
    await database.connect();
    logger.info('Database connected successfully');

    // Connect to Redis
   await connectRedis();
    logger.info('Redis connected successfully');

    app.listen(PORT, () => {
      logger.info(`Server running on port ${PORT}`);
      logger.info(`Environment: ${process.env.NODE_ENV || 'development'}`);
    });

    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received: closing HTTP server');
      await database.disconnect();
   
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received: closing HTTP server');
      await database.disconnect();
    
      process.exit(0);
    });
  } catch (error) {
    logger.error('Failed to start server:', error);
    process.exit(1);
  }
};

startServer();

export default app;
