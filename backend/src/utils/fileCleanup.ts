import fs from 'fs';
import path from 'path';
import logger from '../config/logger';

/**
 * File cleanup utility for handling uploaded files
 */

interface UploadedFile {
  path: string;
  filename?: string;
  originalname?: string;
}

export interface CleanupContext {
  uploadedFiles: UploadedFile[];
  createdFolders: string[];
}

/**
 * Ensure uploads directory exists
 */
export const ensureUploadsDir = (): string => {
  const uploadsDir = 'uploads';
  if (!fs.existsSync(uploadsDir)) {
    fs.mkdirSync(uploadsDir, { recursive: true });
    logger.info('Created uploads directory');
  }
  return uploadsDir;
};

/**
 * Get uploads folder path for a specific resource
 */
export const getUploadsPath = (...pathSegments: string[]): string => {
  ensureUploadsDir();
  return path.join('uploads', ...pathSegments);
};

/**
 * Create directory in uploads folder
 */
export const createUploadsDir = (...pathSegments: string[]): string => {
  const fullPath = getUploadsPath(...pathSegments);
  if (!fs.existsSync(fullPath)) {
    fs.mkdirSync(fullPath, { recursive: true });
    logger.info(`Created uploads directory: ${fullPath}`);
  }
  return fullPath;
};

/**
 * Store uploaded files in request context for cleanup on error
 */
export const addUploadedFile = (req: any, file: UploadedFile) => {
  if (!req.cleanupContext) {
    req.cleanupContext = {
      uploadedFiles: [],
      createdFolders: []
    };
  }
  req.cleanupContext.uploadedFiles.push(file);
};

/**
 * Store created folders in request context for cleanup on error
 */
export const addCreatedFolder = (req: any, folderPath: string) => {
  if (!req.cleanupContext) {
    req.cleanupContext = {
      uploadedFiles: [],
      createdFolders: []
    };
  }
  req.cleanupContext.createdFolders.push(folderPath);
};

/**
 * Clean up uploaded files and folders
 */
export const cleanupFiles = (context: CleanupContext) => {
  try {
    // Clean up uploaded files
    context.uploadedFiles.forEach(file => {
      try {
        if (file.path && fs.existsSync(file.path)) {
          fs.unlinkSync(file.path);
          logger.info(`Cleaned up uploaded file: ${file.path}`);
        }
      } catch (error) {
        logger.error(`Error cleaning up file ${file.path}:`, error);
      }
    });

    // Clean up created folders (only if empty)
    context.createdFolders.forEach(folder => {
      try {
        if (fs.existsSync(folder)) {
          // Check if folder is empty before removing
          const files = fs.readdirSync(folder);
          if (files.length === 0) {
            fs.rmSync(folder, { recursive: true });
            logger.info(`Cleaned up empty folder: ${folder}`);
          }
        }
      } catch (error) {
        logger.error(`Error cleaning up folder ${folder}:`, error);
      }
    });
  } catch (error) {
    logger.error('Error during file cleanup:', error);
  }
};

/**
 * Clean up files from request context
 */
export const cleanupRequestFiles = (req: any) => {
  if (req.cleanupContext) {
    cleanupFiles(req.cleanupContext);
    req.cleanupContext = null;
  }
};

/**
 * Check if file exists and is accessible
 */
export const fileExists = (filePath: string): boolean => {
  try {
    return fs.existsSync(filePath);
  } catch {
    return false;
  }
};

/**
 * Safe file deletion with error handling
 */
export const safeDeleteFile = (filePath: string): boolean => {
  try {
    if (fileExists(filePath)) {
      fs.unlinkSync(filePath);
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting file ${filePath}:`, error);
    return false;
  }
};

/**
 * Safe folder deletion with error handling
 */
export const safeDeleteFolder = (folderPath: string, recursive: boolean = false): boolean => {
  try {
    if (fileExists(folderPath)) {
      fs.rmSync(folderPath, { recursive, force: true });
      return true;
    }
    return false;
  } catch (error) {
    logger.error(`Error deleting folder ${folderPath}:`, error);
    return false;
  }
};
