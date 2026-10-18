import { Request, Response, NextFunction } from 'express';
import { sarvamService } from '../services/sarvam.service';
import { BadRequestError } from '../utils/errors';

export class VoiceController {
  /**
   * POST /api/voice/process
   * Handles audio file upload and triggers Sarvam transcription & translation
   */
  async processVoice(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError('Audio file is required for speech processing');
      }

      const languageCode = (req.body?.languageCode as string) || 'unknown';

      const result = await sarvamService.processVoiceReport(
        req.file.buffer,
        req.file.originalname,
        languageCode
      );

      res.status(200).json({
        success: true,
        message: 'Speech processed successfully',
        data: {
          nativeTranscript: result.nativeTranscript,
          englishTranslation: result.englishTranslation,
          detectedLanguage: result.languageCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/voice/translate-text
   * Translates typed Indian language text into standardized English
   */
  async translateText(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { text, sourceLanguageCode } = req.body;
      if (!text || typeof text !== 'string' || text.trim().length === 0) {
        throw new BadRequestError('Text string is required for translation');
      }

      const result = await sarvamService.translateText(text.trim(), sourceLanguageCode || 'auto');

      res.status(200).json({
        success: true,
        data: {
          translatedText: result.translatedText,
          sourceLanguageCode: result.sourceLanguageCode,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const voiceController = new VoiceController();
