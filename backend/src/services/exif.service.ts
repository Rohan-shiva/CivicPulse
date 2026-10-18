import exifr from 'exifr';

export interface IExifGpsData {
  latitude: number;
  longitude: number;
  altitude?: number;
}

export class ExifService {
  /**
   * Extracts GPS coordinates from raw photo buffer using exifr
   */
  async extractGps(buffer: Buffer): Promise<IExifGpsData | null> {
    try {
      const gps = await exifr.gps(buffer);
      if (gps && typeof gps.latitude === 'number' && typeof gps.longitude === 'number') {
        // Validate coordinates range
        if (
          gps.latitude >= -90 &&
          gps.latitude <= 90 &&
          gps.longitude >= -180 &&
          gps.longitude <= 180
        ) {
          return {
            latitude: Number(gps.latitude.toFixed(6)),
            longitude: Number(gps.longitude.toFixed(6)),
            altitude: typeof (gps as any).altitude === 'number' ? Number((gps as any).altitude.toFixed(2)) : undefined,
          };
        }
      }
      return null;
    } catch (error) {
      // Images without EXIF or non-JPEG/TIFF buffers should safely return null
      return null;
    }
  }
}

export const exifService = new ExifService();
