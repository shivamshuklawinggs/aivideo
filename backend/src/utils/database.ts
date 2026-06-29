import mongoose from 'mongoose';
import logger from '../config/logger';

/**
 * Database transaction utilities for MongoDB sessions
 */

/**
 * Execute operations within a transaction
 */
export async function withTransaction<T>(
  operations: (session: mongoose.ClientSession) => Promise<T>
): Promise<T> {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const result = await operations(session);
    
    await session.commitTransaction();
    logger.info('Transaction committed successfully');
    
    return result;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Transaction aborted:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Execute multiple operations in parallel within a transaction
 */
export async function withParallelTransaction<T>(
  operations: Array<(session: mongoose.ClientSession) => Promise<T>>
): Promise<T[]> {
  const session = await mongoose.startSession();
  
  try {
    session.startTransaction();
    
    const results = await Promise.all(
      operations.map(operation => operation(session))
    );
    
    await session.commitTransaction();
    logger.info('Parallel transaction committed successfully');
    
    return results;
  } catch (error) {
    await session.abortTransaction();
    logger.error('Parallel transaction aborted:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Create a transaction session for manual control
 */
export async function createTransactionSession(): Promise<mongoose.ClientSession> {
  const session = await mongoose.startSession();
  session.startTransaction();
  return session;
}

/**
 * Commit a transaction
 */
export async function commitTransaction(session: mongoose.ClientSession): Promise<void> {
  try {
    await session.commitTransaction();
    logger.info('Transaction committed successfully');
  } catch (error) {
    logger.error('Error committing transaction:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Abort a transaction
 */
export async function abortTransaction(session: mongoose.ClientSession): Promise<void> {
  try {
    await session.abortTransaction();
    logger.info('Transaction aborted successfully');
  } catch (error) {
    logger.error('Error aborting transaction:', error);
    throw error;
  } finally {
    await session.endSession();
  }
}

/**
 * Transaction wrapper with retry logic
 */
export async function withTransactionRetry<T>(
  operations: (session: mongoose.ClientSession) => Promise<T>,
  maxRetries: number = 3
): Promise<T> {
  let lastError: Error;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      return await withTransaction(operations);
    } catch (error: any) {
      lastError = error;
      
      // Retry on transient errors
      if (attempt < maxRetries && isTransientError(error)) {
        logger.warn(`Transaction attempt ${attempt} failed, retrying...`, error);
        await new Promise(resolve => setTimeout(resolve, 100 * attempt)); // Exponential backoff
        continue;
      }
      
      break;
    }
  }
  
  throw lastError!;
}

/**
 * Check if error is transient (can be retried)
 */
function isTransientError(error: any): boolean {
  // MongoDB transient errors
  if (error.code === 251) return true; // InterruptedAtShutdown
  if (error.code === 6) return true;   // HostUnreachable
  if (error.code === 89) return true;  // NetworkTimeout
  if (error.code === 91) return true;  // ShutdownInProgress
  
  // Network related errors
  if (error.message?.includes('network')) return true;
  if (error.message?.includes('timeout')) return true;
  if (error.message?.includes('connection')) return true;
  
  return false;
}

/**
 * Bulk operations within transaction
 */
export async function bulkInsertWithTransaction<T>(
  Model: mongoose.Model<T>,
  documents: any[],
  options: { session?: mongoose.ClientSession; ordered?: boolean } = {}
): Promise<any[]> {
  const { session, ordered = true } = options;
  
  try {
    const result = await Model.insertMany(documents, { 
      session, 
      ordered,
      lean: true 
    });
    
    logger.info(`Bulk inserted ${result.length} documents`);
    return result as any[];
  } catch (error) {
    logger.error('Bulk insert failed:', error);
    throw error;
  }
}

/**
 * Atomic update with transaction
 */
export async function atomicUpdateWithTransaction<T>(
  Model: mongoose.Model<T>,
  filter: any,
  update: any,
  options: { session?: mongoose.ClientSession; new?: boolean } = {}
): Promise<any> {
  const { session, new: returnNew = true } = options;
  
  try {
    const result = await Model.findOneAndUpdate(
      filter,
      update,
      { session, new: returnNew, lean: true }
    );
    
    logger.info(`Atomic update completed for filter: ${JSON.stringify(filter)}`);
    return result;
  } catch (error) {
    logger.error('Atomic update failed:', error);
    throw error;
  }
}
