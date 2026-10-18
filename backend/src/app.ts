import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, getIntegrationStatus } from './config/env';
import { isDatabaseConnected } from './config/database';
import { errorHandler } from './middleware/errorHandler';

export const createApp = (): Express => {
  const app = express();

  // Security headers
  app.use(helmet({
    crossOriginResourcePolicy: { policy: 'cross-origin' },
  }));

  // CORS configuration
  app.use(cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (e.g. mobile apps, curl, server-to-server) or matching client origin
      if (!origin || origin === env.CLIENT_ORIGIN || origin.startsWith('http://localhost:')) {
        callback(null, true);
      } else {
        callback(new Error('Blocked by CORS policy'));
      }
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  }));

  // Parsing middleware
  app.use(express.json({ limit: `${env.MAX_IMAGE_SIZE_MB}mb` }));
  app.use(express.urlencoded({ extended: true, limit: `${env.MAX_IMAGE_SIZE_MB}mb` }));
  app.use(cookieParser());

  // Health and Readiness Check Endpoint
  app.get('/api/health', (_req: Request, res: Response) => {
    const dbConnected = isDatabaseConnected();
    const integrations = getIntegrationStatus();

    res.status(200).json({
      status: 'ok',
      timestamp: new Date().toISOString(),
      uptimeSeconds: Math.floor(process.uptime()),
      database: {
        status: dbConnected ? 'connected' : 'disconnected',
      },
      integrations: {
        groq: integrations.groq ? 'configured' : 'unconfigured',
        sarvam: integrations.sarvam ? 'configured' : 'unconfigured',
        cloudinary: integrations.cloudinary ? 'configured' : 'unconfigured',
        otp: integrations.otp ? 'configured' : 'unconfigured (console/mock active)',
      },
      environment: env.NODE_ENV,
    });
  });

  // Global Error Handler (must be mounted after routes)
  // Routes will be registered here in upcoming commits

  return app;
};
