import { Client } from 'minio';
import logger from './logger';

/**
 * MinIO (S3-compatible) Storage Configuration
 * Handles object storage for media files
 */
class MinIOClient {
  private static instance: MinIOClient;
  private client: Client;
  private bucketName: string;

  private constructor() {
    this.client = new Client({
      endPoint: process.env.MINIO_ENDPOINT || 'localhost',
      port: parseInt(process.env.MINIO_PORT || '9000'),
      useSSL: process.env.MINIO_USE_SSL === 'true',
      accessKey: process.env.MINIO_ACCESS_KEY || 'minioadmin',
      secretKey: process.env.MINIO_SECRET_KEY || 'minioadmin123',
    });

    this.bucketName = process.env.MINIO_BUCKET_NAME || 'webtoon-storage';
    this.initializeBucket();
  }

  public static getInstance(): MinIOClient {
    if (!MinIOClient.instance) {
      MinIOClient.instance = new MinIOClient();
    }
    return MinIOClient.instance;
  }

  /**
   * Initialize bucket if it doesn't exist
   */
  private async initializeBucket(): Promise<void> {
    try {
      const exists = await this.client.bucketExists(this.bucketName);
      if (!exists) {
        await this.client.makeBucket(this.bucketName, 'us-east-1');
        logger.info(`MinIO bucket '${this.bucketName}' created`);
      } else {
        logger.info(`MinIO bucket '${this.bucketName}' already exists`);
      }
    } catch (error) {
      logger.error('Error initializing MinIO bucket:', error);
    }
  }

  /**
   * Get MinIO client
   */
  public getClient(): Client {
    return this.client;
  }

  /**
   * Get bucket name
   */
  public getBucketName(): string {
    return this.bucketName;
  }

  /**
   * Upload file to MinIO
   */
  public async uploadFile(
    objectName: string,
    filePath: string,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      await this.client.fPutObject(this.bucketName, objectName, filePath, metadata);
      logger.info(`File uploaded to MinIO: ${objectName}`);
      return objectName;
    } catch (error) {
      logger.error('Error uploading file to MinIO:', error);
      throw error;
    }
  }

  /**
   * Upload buffer to MinIO
   */
  public async uploadBuffer(
    objectName: string,
    buffer: Buffer,
    metadata?: Record<string, string>
  ): Promise<string> {
    try {
      await this.client.putObject(this.bucketName, objectName, buffer, buffer.length, metadata);
      logger.info(`Buffer uploaded to MinIO: ${objectName}`);
      return objectName;
    } catch (error) {
      logger.error('Error uploading buffer to MinIO:', error);
      throw error;
    }
  }

  /**
   * Download file from MinIO
   */
  public async downloadFile(objectName: string, filePath: string): Promise<void> {
    try {
      await this.client.fGetObject(this.bucketName, objectName, filePath);
      logger.info(`File downloaded from MinIO: ${objectName}`);
    } catch (error) {
      logger.error('Error downloading file from MinIO:', error);
      throw error;
    }
  }

  /**
   * Get file stream
   */
  public async getFileStream(objectName: string): Promise<any> {
    try {
      return await this.client.getObject(this.bucketName, objectName);
    } catch (error) {
      logger.error('Error getting file stream from MinIO:', error);
      throw error;
    }
  }

  /**
   * Delete file from MinIO
   */
  public async deleteFile(objectName: string): Promise<void> {
    try {
      await this.client.removeObject(this.bucketName, objectName);
      logger.info(`File deleted from MinIO: ${objectName}`);
    } catch (error) {
      logger.error('Error deleting file from MinIO:', error);
      throw error;
    }
  }

  /**
   * Get presigned URL for file access
   */
  public async getPresignedUrl(objectName: string, expirySeconds: number = 3600): Promise<string> {
    try {
      return await this.client.presignedGetObject(this.bucketName, objectName, expirySeconds);
    } catch (error) {
      logger.error('Error generating presigned URL:', error);
      throw error;
    }
  }

  /**
   * List objects with prefix
   */
  public async listObjects(prefix: string): Promise<any[]> {
    return new Promise((resolve, reject) => {
      const objects: any[] = [];
      const stream = this.client.listObjects(this.bucketName, prefix, true);

      stream.on('data', (obj) => objects.push(obj));
      stream.on('error', reject);
      stream.on('end', () => resolve(objects));
    });
  }

  /**
   * Check if object exists
   */
  public async objectExists(objectName: string): Promise<boolean> {
    try {
      await this.client.statObject(this.bucketName, objectName);
      return true;
    } catch (error) {
      return false;
    }
  }
}

export default MinIOClient.getInstance();
