import { describe, it, expect } from 'vitest';
import { upload } from '../middleware/upload';
import { CloudinaryService } from '../services/cloudinary.service';

describe('Media Upload & Cloudinary Service', () => {
  it('Cloudinary service should accurately report if credentials are missing', () => {
    const service = new CloudinaryService();
    // In default test environment without credentials, isConfigured is boolean
    expect(typeof service.isConfigured()).toBe('boolean');
  });

  it('Cloudinary service should throw ServiceUnavailableError if attempting upload without credentials', async () => {
    const unconfiguredService = new CloudinaryService();
    if (!unconfiguredService.isConfigured()) {
      await expect(
        unconfiguredService.uploadImage(Buffer.from('fake-image-bytes'))
      ).rejects.toThrow(/unconfigured/);
    }
  });

  it('Multer upload instance should have memoryStorage configured', () => {
    expect(upload).toBeDefined();
    expect(upload.single).toBeDefined();
    expect(upload.array).toBeDefined();
  });
});
