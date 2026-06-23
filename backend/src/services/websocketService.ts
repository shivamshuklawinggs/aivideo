// This file is deprecated - using SSE service instead
import logger from '../config/logger';

// Stub WebSocketService for backward compatibility
export class WebSocketService {
  private connectedClients: Map<string, any> = new Map();

  constructor(_server?: any) {
    logger.warn('WebSocketService is deprecated. Using SSE service instead.');
  }

  public broadcastDownloadStatus(_modelId: string, _status: any): void {
    logger.warn('WebSocketService.broadcastDownloadStatus is deprecated.');
  }

  public broadcastSystemInfo(_systemInfo: any): void {
    logger.warn('WebSocketService.broadcastSystemInfo is deprecated.');
  }

  public getConnectedClientsCount(): number {
    return this.connectedClients.size;
  }

  public broadcastNotification(_notification: any): void {
    logger.warn('WebSocketService.broadcastNotification is deprecated.');
  }

  public sendNotificationToClient(_socketId: string, _notification: any): void {
    logger.warn('WebSocketService.sendNotificationToClient is deprecated.');
  }
}

// Stub functions for backward compatibility
export const initializeWebSocket = (server: any): WebSocketService => {
  logger.warn('initializeWebSocket is deprecated. Use SSE service instead.');
  return new WebSocketService(server);
};

export const getWebSocketService = (): WebSocketService | null => {
  logger.warn('getWebSocketService is deprecated.');
  return null;
};

export default WebSocketService;
