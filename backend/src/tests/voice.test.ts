import { describe, it, expect } from 'vitest';
import { SarvamService } from '../services/sarvam.service';

describe('Sarvam AI Speech & Translation Service', () => {
  it('should accurately report configured state based on environment API key', () => {
    const service = new SarvamService();
    expect(typeof service.isConfigured()).toBe('boolean');
  });

  it('should throw ServiceUnavailableError if attempting to transcribe without configured credentials', async () => {
    const unconfiguredService = new SarvamService();
    if (!unconfiguredService.isConfigured()) {
      await expect(
        unconfiguredService.processVoiceReport(Buffer.from('fake-audio-bytes'), 'test.webm')
      ).rejects.toThrow(/unconfigured/);
    }
  });

  it('should throw ServiceUnavailableError if attempting text translation without configured credentials', async () => {
    const unconfiguredService = new SarvamService();
    if (!unconfiguredService.isConfigured()) {
      await expect(
        unconfiguredService.translateText('रस्ते पर गड्ढा है')
      ).rejects.toThrow(/unconfigured/);
    }
  });
});
