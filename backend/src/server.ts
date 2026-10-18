import http from 'http';
import { createApp } from './app';
import { env } from './config/env';
import { connectDatabase, disconnectDatabase } from './config/database';
import { errorHandler } from './middleware/errorHandler';

const app = createApp();

// Global error handler
app.use(errorHandler);

const server = http.createServer(app);

const startServer = async () => {
  try {
    await connectDatabase();

    server.listen(env.PORT, () => {
      console.log(`🚀 CivicPulse API Server running in ${env.NODE_ENV} mode on port ${env.PORT}`);
      console.log(`📡 Client Origin allowed: ${env.CLIENT_ORIGIN}`);
    });
  } catch (err) {
    console.error('Fatal error starting server:', err);
    process.exit(1);
  }
};

const handleShutdown = async (signal: string) => {
  console.log(`\n🛑 Received ${signal}. Shutting down gracefully...`);
  server.close(async () => {
    console.log('🔒 HTTP server closed');
    await disconnectDatabase();
    process.exit(0);
  });

  // Force shutdown after 10s timeout
  setTimeout(() => {
    console.error('⚠️ Forcefully terminating process after timeout');
    process.exit(1);
  }, 10000);
};

process.on('SIGINT', () => handleShutdown('SIGINT'));
process.on('SIGTERM', () => handleShutdown('SIGTERM'));

if (process.env.NODE_ENV !== 'test') {
  startServer();
}

export { app, server };
