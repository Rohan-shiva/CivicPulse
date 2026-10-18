import { Router } from 'express';
import { voiceController } from '../controllers/voice.controller';
import { upload } from '../middleware/upload';

const router = Router();

router.post('/process', upload.single('audio'), (req, res, next) =>
  voiceController.processVoice(req, res, next)
);

router.post('/translate-text', (req, res, next) =>
  voiceController.translateText(req, res, next)
);

export default router;
