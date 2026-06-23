import multer from 'multer';
import path from 'path';
import { Request } from 'express';
import { v4 as uuidv4 } from 'uuid';
import fs from 'fs';

const uploadDir = path.join(process.cwd(), 'uploads');
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (_req: Request, file: Express.Multer.File, cb) => {
    const subDir = file.fieldname === 'archive' ? 'archives' : 
                   file.fieldname === 'voice' ? 'voices' : 
                   file.fieldname === 'thumbnail' ? 'thumbnails' : 'misc';
    
    const destPath = path.join(uploadDir, subDir);
    
    if (!fs.existsSync(destPath)) {
      fs.mkdirSync(destPath, { recursive: true });
    }
    
    cb(null, destPath);
  },
  filename: (_req: Request, file: Express.Multer.File, cb) => {
    const uniqueName = `${uuidv4()}${path.extname(file.originalname)}`;
    cb(null, uniqueName);
  },
});

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const allowedArchiveTypes = ['.cbz', '.cbr', '.zip'];
  const allowedAudioTypes = ['.wav', '.mp3', '.flac', '.m4a'];
  const allowedImageTypes = ['.jpg', '.jpeg', '.png', '.webp'];
  
  const ext = path.extname(file.originalname).toLowerCase();
  
  if (file.fieldname === 'archive') {
    if (allowedArchiveTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedArchiveTypes.join(', ')} files are allowed for archives`));
    }
  } else if (file.fieldname === 'voice') {
    if (allowedAudioTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedAudioTypes.join(', ')} files are allowed for voice samples`));
    }
  } else if (file.fieldname === 'thumbnail') {
    if (allowedImageTypes.includes(ext)) {
      cb(null, true);
    } else {
      cb(new Error(`Only ${allowedImageTypes.join(', ')} files are allowed for thumbnails`));
    }
  } else {
    cb(null, true);
  }
};

const limits = {
  fileSize: parseInt(process.env.MAX_FILE_SIZE || '500000000'),
};

export const upload = multer({
  storage,
  fileFilter,
  limits,
});

export const uploadArchive = upload.single('archive');
export const uploadVoice = upload.single('voice');
export const uploadThumbnail = upload.single('thumbnail');
export const uploadMultiple = upload.fields([
  { name: 'archive', maxCount: 1 },
  { name: 'thumbnail', maxCount: 1 },
]);
