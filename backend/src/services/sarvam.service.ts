import axios from 'axios';
import FormData from 'form-data';
import { env } from '../config/env';
import { ServiceUnavailableError, BadRequestError } from '../utils/errors';

export interface ISpeechResult {
  transcript: string;
  languageCode: string;
}

export interface IVoiceReportResult {
  nativeTranscript: string;
  englishTranslation: string;
  languageCode: string;
}

export class SarvamService {
  private apiKey: string;
  private model: string;

  constructor() {
    this.apiKey = env.SARVAM_API_KEY || '';
    this.model = env.SARVAM_STT_MODEL || 'saaras:v4';
    if (!this.apiKey) {
      console.warn('⚠️ Sarvam AI API key not configured in environment.');
    }
  }

  isConfigured(): boolean {
    return Boolean(this.apiKey && this.apiKey.trim().length > 0);
  }

  /**
   * Calls Sarvam STT endpoint with given mode ('transcribe' or 'translate')
   */
  private async callSpeechToText(
    audioBuffer: Buffer,
    filename: string,
    mode: 'transcribe' | 'translate',
    languageCode = 'unknown'
  ): Promise<ISpeechResult> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError(
        'Sarvam AI speech integration is unconfigured. Please configure SARVAM_API_KEY in your environment.'
      );
    }

    if (!audioBuffer || audioBuffer.length === 0) {
      throw new BadRequestError('Audio buffer cannot be empty');
    }

    const form = new FormData();
    form.append('file', audioBuffer, {
      filename: filename || 'recording.webm',
      contentType: 'audio/webm',
    });
    form.append('model', this.model);
    form.append('mode', mode);
    form.append('language_code', languageCode || 'unknown');

    try {
      const response = await axios.post('https://api.sarvam.ai/speech-to-text', form, {
        headers: {
          ...form.getHeaders(),
          'api-subscription-key': this.apiKey,
        },
        timeout: 25000,
      });

      return {
        transcript: response.data?.transcript || '',
        languageCode: response.data?.language_code || languageCode,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error(`❌ Sarvam STT error (${mode}):`, errorMsg);
      throw new Error(`Sarvam Speech-to-Text (${mode}) failed: ${errorMsg}`);
    }
  }

  /**
   * Processes speech recording into both native transcript and English translation
   */
  async processVoiceReport(
    audioBuffer: Buffer,
    filename: string,
    languageCode = 'unknown'
  ): Promise<IVoiceReportResult> {
    // 1. Transcribe in native language
    const transcribeResult = await this.callSpeechToText(
      audioBuffer,
      filename,
      'transcribe',
      languageCode
    );

    // 2. Translate into English
    const translateResult = await this.callSpeechToText(
      audioBuffer,
      filename,
      'translate',
      transcribeResult.languageCode || languageCode
    );

    return {
      nativeTranscript: transcribeResult.transcript,
      englishTranslation: translateResult.transcript || transcribeResult.transcript,
      languageCode: transcribeResult.languageCode,
    };
  }

  /**
   * Translates written text from an Indian language into English using Sarvam Translate API
   */
  async translateText(
    text: string,
    sourceLanguageCode = 'auto'
  ): Promise<{ translatedText: string; sourceLanguageCode: string }> {
    if (!this.isConfigured()) {
      throw new ServiceUnavailableError(
        'Sarvam AI translation is unconfigured. Please configure SARVAM_API_KEY.'
      );
    }

    if (!text || text.trim().length === 0) {
      throw new BadRequestError('Text to translate cannot be empty');
    }

    try {
      const response = await axios.post(
        'https://api.sarvam.ai/translate',
        {
          input: text,
          source_language_code: sourceLanguageCode === 'auto' ? undefined : sourceLanguageCode,
          target_language_code: 'en-IN',
          mode: 'formal',
        },
        {
          headers: {
            'Content-Type': 'application/json',
            'api-subscription-key': this.apiKey,
          },
          timeout: 15000,
        }
      );

      return {
        translatedText: response.data?.translated_text || text,
        sourceLanguageCode: response.data?.source_language_code || sourceLanguageCode,
      };
    } catch (error: any) {
      const errorMsg = error.response?.data?.message || error.message;
      console.error('❌ Sarvam Text Translation Error:', errorMsg);
      throw new Error(`Sarvam text translation failed: ${errorMsg}`);
    }
  }
}

export const sarvamService = new SarvamService();
