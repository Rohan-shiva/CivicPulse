import { Request, Response, NextFunction } from 'express';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors';
import { env } from '../config/env';

export const errorHandler = (
  err: Error,
  _req: Request,
  res: Response,
  _next: NextFunction
): void => {
  // Zod Validation Error
  if (err instanceof ZodError) {
    res.status(400).json({
      success: false,
      error: 'Validation failed',
      details: err.flatten().fieldErrors,
    });
    return;
  }

  // Known AppError
  if (err instanceof AppError) {
    res.status(err.statusCode).json({
      success: false,
      error: err.message,
      ...(err.details ? { details: err.details } : {}),
    });
    return;
  }

  // Mongoose CastError (invalid ObjectId, etc.)
  if (err.name === 'CastError') {
    res.status(400).json({
      success: false,
      error: 'Invalid resource identifier format',
    });
    return;
  }

  // Mongoose Duplicate Key Error (code 11000)
  if ((err as { code?: number }).code === 11000) {
    res.status(409).json({
      success: false,
      error: 'A duplicate record with this unique attribute already exists',
    });
    return;
  }

  // Multer Error
  if (err.name === 'MulterError') {
    res.status(400).json({
      success: false,
      error: `File upload error: ${err.message}`,
    });
    return;
  }

  // Unhandled / Internal Server Error
  console.error('💥 Unhandled Error:', err);

  res.status(500).json({
    success: false,
    error: 'Internal server error',
    ...(env.NODE_ENV === 'development' ? { message: err.message, stack: err.stack } : {}),
  });
};
