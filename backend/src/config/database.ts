import mongoose from 'mongoose';
import logger from './logger';

/**
 * MongoDB Connection Configuration
 * Handles database connection with retry logic and event listeners
 */
class Database {
  private static instance: Database;
  private isConnected: boolean = false;

  private constructor() {}

  public static getInstance(): Database {
    if (!Database.instance) {
      Database.instance = new Database();
    }
    return Database.instance;
  }

  /**
   * Connect to MongoDB with retry logic
   */
  public async connect(): Promise<void> {
    if (this.isConnected) {
      logger.info('MongoDB already connected');
      return;
    }

    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/webtoon_explainer';
    
    const options: mongoose.ConnectOptions = {
      maxPoolSize: 10,
      minPoolSize: 5,
      socketTimeoutMS: 45000,
      serverSelectionTimeoutMS: 5000,
      family: 4,
    };

    try {
      await mongoose.connect(mongoUri, options);
      this.isConnected = true;
      logger.info('MongoDB connected successfully');
      this.setupEventListeners();
    } catch (error) {
      logger.error('MongoDB connection error:', error);
      setTimeout(() => this.connect(), 5000);
    }
  }

  /**
   * Setup MongoDB event listeners
   */
  private setupEventListeners(): void {
    mongoose.connection.on('connected', () => {
      logger.info('Mongoose connected to MongoDB');
      this.isConnected = true;
    });

    mongoose.connection.on('error', (err) => {
      logger.error('Mongoose connection error:', err);
      this.isConnected = false;
    });

    mongoose.connection.on('disconnected', () => {
      logger.warn('Mongoose disconnected from MongoDB');
      this.isConnected = false;
    });

    process.on('SIGINT', async () => {
      await this.disconnect();
      process.exit(0);
    });
  }

  /**
   * Disconnect from MongoDB
   */
  public async disconnect(): Promise<void> {
    if (!this.isConnected) {
      return;
    }

    try {
      await mongoose.connection.close();
      this.isConnected = false;
      logger.info('MongoDB disconnected successfully');
    } catch (error) {
      logger.error('Error disconnecting from MongoDB:', error);
    }
  }

  /**
   * Get connection status
   */
  public getConnectionStatus(): boolean {
    return this.isConnected;
  }
}

export default Database.getInstance();
