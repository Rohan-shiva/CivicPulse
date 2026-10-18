import { Request, Response, NextFunction } from 'express';
import { authService, ITokenPayload } from '../services/auth.service';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import { UserRole } from '../models/User';

declare global {
  namespace Express {
    interface Request {
      user?: ITokenPayload;
    }
  }
}

export const authenticateUser = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  try {
    let token: string | undefined;

    // 1. Check HTTP-only cookie
    if (req.cookies && req.cookies.cp_access_token) {
      token = req.cookies.cp_access_token;
    }

    // 2. Fallback to Authorization Header
    if (!token && req.headers.authorization) {
      const parts = req.headers.authorization.split(' ');
      if (parts.length === 2 && parts[0] === 'Bearer') {
        token = parts[1];
      }
    }

    if (!token) {
      next();
      return;
    }

    const decoded = authService.verifyAccessToken(token);
    req.user = decoded;
    next();
  } catch (error) {
    // If token is invalid or expired, continue without setting req.user
    next();
  }
};

export const requireAuth = (
  req: Request,
  _res: Response,
  next: NextFunction
): void => {
  if (!req.user) {
    next(new UnauthorizedError('Authentication required. Please log in.'));
    return;
  }
  next();
};

export const requireRole = (allowedRoles: UserRole[]) => {
  return (req: Request, _res: Response, next: NextFunction): void => {
    if (!req.user) {
      next(new UnauthorizedError('Authentication required'));
      return;
    }

    if (!allowedRoles.includes(req.user.role)) {
      next(
        new ForbiddenError(
          `Access denied. Requires one of roles: [${allowedRoles.join(', ')}]. Current role: ${req.user.role}`
        )
      );
      return;
    }

    next();
  };
};
