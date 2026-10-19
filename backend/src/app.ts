import express, { Express, Request, Response } from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env, getIntegrationStatus } from './config/env';
import { isDatabaseConnected } from './config/database';
import { errorHandler } from './middleware/errorHandler';

import { authenticateUser } from './middleware/auth';
import authRoutes from './routes/auth.routes';
import voiceRoutes from './routes/voice.routes';
import reportRoutes from './routes/report.routes';
import taxonomyRoutes from './routes/taxonomy.routes';
import municipalRoutes from './routes/municipal.routes';
import workerRoutes from './routes/worker.routes';

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

  // Global user authentication context from cookie/header
  app.use(authenticateUser);

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

  // Authentication API Routes
  app.use('/api/auth', authRoutes);

  // Multilingual Voice & Speech API Routes
  app.use('/api/voice', voiceRoutes);

  // Citizen Complaint Reporting & Tracking Routes
  app.use('/api/reports', reportRoutes);

  // Central Taxonomies (Departments & Issue Categories)
  app.use('/api', taxonomyRoutes);

  // Municipal Operations & Incident Management Routes
  app.use('/api/municipal', municipalRoutes);

  // Field Worker Operations Routes
  app.use('/api/worker', workerRoutes);

  return app;
};

