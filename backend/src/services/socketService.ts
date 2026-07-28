import { Server as HttpServer } from 'http';
import { Server as SocketIOServer, Socket } from 'socket.io';
import logger from '../config/logger';

export type PipelineEvent =
  | 'pipeline:chapter:started'
  | 'pipeline:chapter:step:started'
  | 'pipeline:chapter:step:completed'
  | 'pipeline:chapter:progress'
  | 'pipeline:chapter:completed'
  | 'pipeline:chapter:failed'
  | 'pipeline:panel:progress'
  | 'pipeline:panel:analyzed'
  | 'pipeline:panel:retry'
  | 'pipeline:panel:error'
  | 'ai:request:started'
  | 'ai:request:completed'
  | 'ai:request:retry'
  | 'ai:request:error'
  | 'socket:connected'
  | 'socket:joined';

class SocketIOService {
  private io: SocketIOServer | null = null;
  private isReady = false;

  initialize(server: HttpServer): void {
    if (this.isReady) return;

    const frontendUrl = process.env.FRONTEND_URL || 'http://localhost:3000';

    this.io = new SocketIOServer(server, {
      path: '/socket.io',
      cors: {
        origin: frontendUrl,
        credentials: true,
        methods: ['GET', 'POST'],
      },
      transports: ['websocket', 'polling'],
    });

    this.io.on('connection', (socket: Socket) => {
      logger.info(`Socket.IO client connected: ${socket.id}`);
      socket.emit('socket:connected', { clientId: socket.id, timestamp: new Date().toISOString() });

      socket.on('subscribe', (data: { chapterId?: string; jobId?: string }) => {
        if (data.chapterId) {
          socket.join(`chapter:${data.chapterId}`);
          logger.info(`Socket ${socket.id} joined room chapter:${data.chapterId}`);
        }
        if (data.jobId) {
          socket.join(`job:${data.jobId}`);
          logger.info(`Socket ${socket.id} joined room job:${data.jobId}`);
        }
        socket.emit('socket:joined', { rooms: Array.from(socket.rooms), timestamp: new Date().toISOString() });
      });

      socket.on('unsubscribe', (data: { chapterId?: string; jobId?: string }) => {
        if (data.chapterId) socket.leave(`chapter:${data.chapterId}`);
        if (data.jobId) socket.leave(`job:${data.jobId}`);
      });

      socket.on('disconnect', (reason: string) => {
        logger.info(`Socket.IO client disconnected: ${socket.id} (${reason})`);
      });
    });

    this.isReady = true;
    logger.info('Socket.IO server initialized');
  }

  emit(event: PipelineEvent | string, data: any, room?: string): void {
    if (!this.isReady || !this.io) return;
    if (room) {
      this.io.to(room).emit(event, data);
    } else {
      this.io.emit(event, data);
    }
  }

  emitToChapter(chapterId: string, event: PipelineEvent | string, data: any): void {
    this.emit(event, { ...data, chapterId }, `chapter:${chapterId}`);
  }

  emitToJob(jobId: string, event: PipelineEvent | string, data: any): void {
    if (!jobId) return;
    this.emit(event, { ...data, jobId }, `job:${jobId}`);
  }

  emitToContext(
    context: { jobId?: string; chapterId?: string },
    event: PipelineEvent | string,
    data: any
  ): void {
    let emitted = false;
    if (context.jobId) {
      this.emitToJob(context.jobId, event, data);
      emitted = true;
    }
    if (context.chapterId) {
      this.emitToChapter(context.chapterId, event, data);
      emitted = true;
    }
    if (!emitted) {
      this.emitToAll(event, data);
    }
  }

  emitToAll(event: PipelineEvent | string, data: any): void {
    this.emit(event, data);
  }

  getConnectedClientsCount(): number {
    if (!this.io) return 0;
    return this.io.engine.clientsCount;
  }
}

export default new SocketIOService();
