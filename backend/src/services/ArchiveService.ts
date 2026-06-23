import fs from 'fs';
import path from 'path';
import unzipper from 'unzipper';
import { promisify } from 'util';
import { exec } from 'child_process';
import logger from '../config/logger';

const execAsync = promisify(exec);

class ArchiveService {
  private extractDir: string;

  constructor() {
    this.extractDir = path.join(process.cwd(), 'storage', 'extracted');
    this.ensureDirectoryExists(this.extractDir);
  }

  private ensureDirectoryExists(dir: string): void {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
    }
  }

  async extractArchive(archivePath: string, extractTo: string): Promise<string> {
    const ext = path.extname(archivePath).toLowerCase();

    try {
      this.ensureDirectoryExists(extractTo);

      if (ext === '.zip' || ext === '.cbz') {
        await this.extractZip(archivePath, extractTo);
      } else if (ext === '.cbr' || ext === '.rar') {
        await this.extractRar(archivePath, extractTo);
      } else {
        throw new Error(`Unsupported archive format: ${ext}`);
      }

      logger.info(`Archive extracted successfully to: ${extractTo}`);
      return extractTo;
    } catch (error) {
      logger.error('Archive extraction error:', error);
      throw new Error('Failed to extract archive');
    }
  }

  private async extractZip(archivePath: string, extractTo: string): Promise<void> {
    return new Promise((resolve, reject) => {
      fs.createReadStream(archivePath)
        .pipe(unzipper.Extract({ path: extractTo }))
        .on('close', () => resolve())
        .on('error', (err) => reject(err));
    });
  }

  private async extractRar(archivePath: string, extractTo: string): Promise<void> {
    try {
      await execAsync(`unrar x "${archivePath}" "${extractTo}"`);
    } catch (error) {
      throw new Error('Failed to extract RAR archive. Ensure unrar is installed.');
    }
  }

  async detectChapters(extractedPath: string): Promise<any[]> {
    const chapters: any[] = [];

    try {
      const items = fs.readdirSync(extractedPath, { withFileTypes: true });
      
      const chapterDirs = items
        .filter((item) => item.isDirectory())
        .sort((a, b) => {
          const numA = this.extractChapterNumber(a.name);
          const numB = this.extractChapterNumber(b.name);
          return numA - numB;
        });

      for (let i = 0; i < chapterDirs.length; i++) {
        const chapterDir = chapterDirs[i];
        const chapterPath = path.join(extractedPath, chapterDir.name);
        const panels = await this.detectPanels(chapterPath);

        chapters.push({
          chapterNumber: i + 1,
          title: chapterDir.name,
          folderPath: chapterPath,
          panelCount: panels.length,
          panels,
          sequence: i + 1,
        });
      }

      if (chapters.length === 0) {
        const panels = await this.detectPanels(extractedPath);
        if (panels.length > 0) {
          chapters.push({
            chapterNumber: 1,
            title: 'Chapter 1',
            folderPath: extractedPath,
            panelCount: panels.length,
            panels,
            sequence: 1,
          });
        }
      }

      logger.info(`Detected ${chapters.length} chapters`);
      return chapters;
    } catch (error) {
      logger.error('Chapter detection error:', error);
      throw new Error('Failed to detect chapters');
    }
  }

  private async detectPanels(chapterPath: string): Promise<any[]> {
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.webp', '.gif', '.bmp'];
    const panels: any[] = [];

    try {
      const files = fs.readdirSync(chapterPath);
      
      const imageFiles = files
        .filter((file) => {
          const ext = path.extname(file).toLowerCase();
          return imageExtensions.includes(ext);
        })
        .sort((a, b) => {
          const numA = this.extractPanelNumber(a);
          const numB = this.extractPanelNumber(b);
          return numA - numB;
        });

      for (let i = 0; i < imageFiles.length; i++) {
        const imagePath = path.join(chapterPath, imageFiles[i]);
        const stats = fs.statSync(imagePath);

        panels.push({
          panelNumber: i + 1,
          fileName: imageFiles[i],
          imagePath,
          fileSize: stats.size,
          sequence: i + 1,
        });
      }

      return panels;
    } catch (error) {
      logger.error('Panel detection error:', error);
      return [];
    }
  }

  private extractChapterNumber(name: string): number {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  private extractPanelNumber(name: string): number {
    const match = name.match(/\d+/);
    return match ? parseInt(match[0]) : 0;
  }

  async cleanupExtractedFiles(extractedPath: string): Promise<void> {
    try {
      if (fs.existsSync(extractedPath)) {
        fs.rmSync(extractedPath, { recursive: true, force: true });
        logger.info(`Cleaned up extracted files: ${extractedPath}`);
      }
    } catch (error) {
      logger.error('Cleanup error:', error);
    }
  }

  async getArchiveInfo(archivePath: string): Promise<any> {
    try {
      const stats = fs.statSync(archivePath);
      return {
        size: stats.size,
        created: stats.birthtime,
        modified: stats.mtime,
      };
    } catch (error) {
      logger.error('Archive info error:', error);
      throw new Error('Failed to get archive info');
    }
  }
}

export default new ArchiveService();
