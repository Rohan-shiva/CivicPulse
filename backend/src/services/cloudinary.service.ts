import { v2 as cloudinary, UploadApiResponse } from 'cloudinary';
import { env } from '../config/env';
import { ServiceUnavailableError } from '../utils/errors';

export interface ICloudinaryUploadResult {
  publicId: string;
  secureUrl: string;
  format: string;
  bytes: number;
  width?: number;
  height?: number;
}

export class CloudinaryService {
  private configured: boolean = false;

  constructor() {
    if (
      env.CLOUDINARY_CLOUD_NAME &&
      env.CLOUDINARY_API_KEY &&
      env.CLOUDINARY_API_SECRET
    ) {
      cloudinary.config({
        cloud_name: env.CLOUDINARY_CLOUD_NAME,
        api_key: env.CLOUDINARY_API_KEY,
        api_secret: env.CLOUDINARY_API_SECRET,
        secure: true,
      });
      this.configured = true;
    } else {
      console.warn('⚠️ Cloudinary credentials not fully configured in environment.');
    }
  }

  isConfigured(): boolean {
    return this.configured;
  }

  /**
   * Uploads an image buffer directly to Cloudinary
   */
  async uploadImage(
    buffer: Buffer,
    options: { folder?: string; tags?: string[] } = {}
  ): Promise<ICloudinaryUploadResult> {
    if (!this.configured) {
      throw new ServiceUnavailableError(
        'Cloudinary image storage is unconfigured. Please provide CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, and CLOUDINARY_API_SECRET.'
      );
    }

    const folder = options.folder || env.CLOUDINARY_FOLDER;

    return new Promise<ICloudinaryUploadResult>((resolve, reject) => {
      const uploadStream = cloudinary.uploader.upload_stream(
        {
          folder,
          resource_type: 'image',
          tags: options.tags || ['civicpulse'],
        },
        (error, result?: UploadApiResponse) => {
          if (error || !result) {
            console.error('❌ Cloudinary Upload Error:', error);
            return reject(new Error(`Cloudinary upload failed: ${error?.message || 'Unknown error'}`));
          }

          resolve({
            publicId: result.public_id,
            secureUrl: result.secure_url,
            format: result.format,
            bytes: result.bytes,
            width: result.width,
            height: result.height,
          });
        }
      );

      uploadStream.end(buffer);
    });
  }
}

export const cloudinaryService = new CloudinaryService();
