import { z } from 'zod';

export const locationInputSchema = z.object({
  longitude: z.coerce.number().min(-180).max(180),
  latitude: z.coerce.number().min(-90).max(90),
  locationSource: z.enum(['device', 'exif', 'manual']).default('manual'),
  addressText: z.string().max(300).optional(),
  deviceAccuracy: z.coerce.number().optional(),
  rawDeviceLocation: z
    .object({
      latitude: z.coerce.number().min(-90).max(90),
      longitude: z.coerce.number().min(-180).max(180),
      accuracy: z.coerce.number().optional(),
    })
    .optional(),
});
