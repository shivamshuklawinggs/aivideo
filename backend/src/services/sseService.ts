import { Request, Response } from 'express';
import logger from '../config/logger';
import ModelDownloadManager, { ModelDownloadStatus } from '../config/modelDownload';

export class SSEService {
  private clients: Map<string, Response> = new Map();
  private intervals: Map<string, NodeJS.Timeout> = new Map();

  // Add SSE client
  public addClient(req: Request, res: Response): string {
    const clientId = this.generateClientId();
    
    // Set SSE headers
    res.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache',
      'Connection': 'keep-alive',
      'Access-Control-Allow-Origin': process.env.FRONTEND_URL || 'http://localhost:3000',
      'Access-Control-Allow-Headers': 'Cache-Control',
    });

    // Send initial connection event
    this.sendEvent(clientId, res, 'connected', { clientId, timestamp: new Date() });

    // Store client
    this.clients.set(clientId, res);

    // Set up periodic status updates
    const interval = setInterval(() => {
      this.sendPeriodicUpdate(clientId, res);
    }, 2000); // Update every 2 seconds

    this.intervals.set(clientId, interval);

    // Handle client disconnect
    req.on('close', () => {
      this.removeClient(clientId);
    });

    logger.info(`SSE client connected: ${clientId}`);
    return clientId;
  }

  // Remove SSE client
  public removeClient(clientId: string): void {
    const interval = this.intervals.get(clientId);
    if (interval) {
      clearInterval(interval);
      this.intervals.delete(clientId);
    }

    this.clients.delete(clientId);
    logger.info(`SSE client disconnected: ${clientId}`);
  }

  // Send event to specific client
  public sendEvent(clientId: string, res: Response, event: string, data: any): void {
    try {
      const eventData = JSON.stringify(data);
      res.write(`event: ${event}\n`);
      res.write(`data: ${eventData}\n\n`);
    } catch (error) {
      logger.error(`Failed to send SSE event to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  // Broadcast event to all clients
  public broadcastEvent(event: string, data: any): void {
    this.clients.forEach((res, clientId) => {
      this.sendEvent(clientId, res, event, data);
    });
  }

  // Send download status update
  public sendDownloadStatus(modelId: string, status: ModelDownloadStatus): void {
    this.broadcastEvent('model-download-status', {
      modelId,
      status,
      timestamp: new Date(),
    });
  }

  // Send download statistics update
  public sendDownloadStats(): void {
    const stats = ModelDownloadManager.getDownloadStats();
    this.broadcastEvent('download-stats', {
      stats,
      timestamp: new Date(),
    });
  }

  // Send periodic update to client
  private sendPeriodicUpdate(clientId: string, res: Response): void {
    try {
      const statuses = ModelDownloadManager.getAllDownloadStatuses();
      const stats = ModelDownloadManager.getDownloadStats();
      
      this.sendEvent(clientId, res, 'periodic-update', {
        statuses,
        stats,
        timestamp: new Date(),
      });
    } catch (error) {
      logger.error(`Failed to send periodic update to client ${clientId}:`, error);
      this.removeClient(clientId);
    }
  }

  // Generate unique client ID
  private generateClientId(): string {
    return `sse-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
  }

  // Get connected clients count
  public getConnectedClientsCount(): number {
    return this.clients.size;
  }

  // Send notification to all clients
  public sendNotification(notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }): void {
    this.broadcastEvent('notification', {
      ...notification,
      timestamp: new Date(),
    });
  }

  // Send notification to specific client
  public sendNotificationToClient(clientId: string, notification: {
    type: 'info' | 'success' | 'warning' | 'error';
    title: string;
    message: string;
  }): void {
    const res = this.clients.get(clientId);
    if (res) {
      this.sendEvent(clientId, res, 'notification', {
        ...notification,
        timestamp: new Date(),
      });
    }
  }
}

// Singleton instance
export default new SSEService();
