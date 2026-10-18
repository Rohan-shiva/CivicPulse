import dotenv from 'dotenv';
import path from 'path';
import { z } from 'zod';

// Load environment variables from backend/.env or parent .env
dotenv.config({ path: path.resolve(process.cwd(), '.env') });

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().default(5000),
  CLIENT_ORIGIN: z.string().default('http://localhost:5173'),
  PUBLIC_APP_URL: z.string().default('http://localhost:5173'),

  MONGODB_URI: z.string().default('mongodb://localhost:27017/civicpulse'),

  JWT_ACCESS_SECRET: z.string().default('civicpulse_dev_jwt_access_secret_key_32bytes_min'),
  JWT_REFRESH_SECRET: z.string().default('civicpulse_dev_jwt_refresh_secret_key_32bytes_min'),
  JWT_ACCESS_TTL: z.string().default('15m'),
  JWT_REFRESH_TTL: z.string().default('7d'),

  OTP_PROVIDER: z.enum(['msg91', 'mock', 'console']).default('msg91'),
  MSG91_AUTH_KEY: z.string().optional().default(''),
  MSG91_TEMPLATE_ID: z.string().optional().default(''),
  MSG91_SENDER_ID: z.string().optional().default(''),

  GROQ_API_KEY: z.string().optional().default(''),
  GROQ_MODEL: z.string().default('openai/gpt-oss-120b'),

  SARVAM_API_KEY: z.string().optional().default(''),
  SARVAM_STT_MODEL: z.string().default('saaras:v4'),

  CLOUDINARY_CLOUD_NAME: z.string().optional().default(''),
  CLOUDINARY_API_KEY: z.string().optional().default(''),
  CLOUDINARY_API_SECRET: z.string().optional().default(''),
  CLOUDINARY_FOLDER: z.string().default('civicpulse'),

  EMBEDDING_MODEL: z.string().default('Xenova/all-MiniLM-L6-v2'),
  DUPLICATE_SEARCH_RADIUS_METERS: z.coerce.number().default(75),
  DUPLICATE_AUTO_LINK_THRESHOLD: z.coerce.number().default(0.88),
  DUPLICATE_REVIEW_THRESHOLD: z.coerce.number().default(0.68),

  MAX_IMAGE_SIZE_MB: z.coerce.number().default(10),
  MAX_AUDIO_SIZE_MB: z.coerce.number().default(10),
  MAX_AUDIO_DURATION_SECONDS: z.coerce.number().default(30),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('❌ Invalid environment variables:', parsed.error.format());
  throw new Error('Environment configuration validation failed');
}

export const env = parsed.data;

export const getIntegrationStatus = () => ({
  database: Boolean(env.MONGODB_URI),
  groq: Boolean(env.GROQ_API_KEY && env.GROQ_API_KEY.trim().length > 0),
  sarvam: Boolean(env.SARVAM_API_KEY && env.SARVAM_API_KEY.trim().length > 0),
  cloudinary: Boolean(
    env.CLOUDINARY_CLOUD_NAME &&
    env.CLOUDINARY_API_KEY &&
    env.CLOUDINARY_API_SECRET
  ),
  otp: Boolean(env.MSG91_AUTH_KEY && env.MSG91_AUTH_KEY.trim().length > 0)
});
