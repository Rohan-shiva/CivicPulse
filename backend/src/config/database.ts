import mongoose from 'mongoose';
import { env } from './env';

export const connectDatabase = async (): Promise<typeof mongoose | null> => {
  if (!env.MONGODB_URI) {
    console.warn('⚠️ No MONGODB_URI provided. Skipping database connection.');
    return null;
  }

  try {
    mongoose.connection.on('connected', () => {
      console.log('✅ MongoDB connected successfully');
    });

    mongoose.connection.on('error', (err) => {
      console.error('❌ MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
      console.warn('⚠️ MongoDB disconnected');
    });

    const conn = await mongoose.connect(env.MONGODB_URI, {
      serverSelectionTimeoutMS: 5000,
      autoIndex: true,
    });

    return conn;
  } catch (error) {
    console.error('❌ Failed to connect to MongoDB:', error);
    if (env.NODE_ENV === 'production') {
      throw error;
    }
    return null;
  }
};

export const disconnectDatabase = async (): Promise<void> => {
  if (mongoose.connection.readyState !== 0) {
    await mongoose.disconnect();
    console.log('🔌 MongoDB connection closed gracefully');
  }
};

export const isDatabaseConnected = (): boolean => {
  return mongoose.connection.readyState === 1;
};
