import multer from 'multer';
import { Request } from 'express';
import { env } from '../config/env';
import { BadRequestError } from '../utils/errors';

// Memory storage keeps the original buffer intact for EXIF extraction
const storage = multer.memoryStorage();

const allowedImageMimeTypes = [
  'image/jpeg',
  'image/jpg',
  'image/png',
  'image/webp',
];

const allowedAudioMimeTypes = [
  'audio/webm',
  'audio/wav',
  'audio/mp3',
  'audio/mpeg',
  'audio/ogg',
  'audio/m4a',
  'audio/mp4',
];

const fileFilter = (
  _req: Request,
  file: Express.Multer.File,
  cb: multer.FileFilterCallback
) => {
  const isImage = allowedImageMimeTypes.includes(file.mimetype.toLowerCase());
  const isAudio = allowedAudioMimeTypes.includes(file.mimetype.toLowerCase());

  if (isImage || isAudio) {
    cb(null, true);
  } else {
    cb(
      new BadRequestError(
        `Unsupported file type '${file.mimetype}'. Allowed: JPEG, PNG, WebP, WebM, WAV, MP3, OGG`
      )
    );
  }
};

export const upload = multer({
  storage,
  limits: {
    fileSize: env.MAX_IMAGE_SIZE_MB * 1024 * 1024, // e.g. 10MB
  },
  fileFilter,
});
