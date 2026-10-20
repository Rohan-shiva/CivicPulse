import jwt from 'jsonwebtoken';
import { Response } from 'express';
import { env } from '../config/env';
import { User, IUser, UserRole } from '../models/User';
import { BadRequestError, UnauthorizedError, ForbiddenError } from '../utils/errors';

export interface ITokenPayload {
  userId: string;
  role: UserRole;
  phone: string;
  name: string;
  departmentId?: string;
}

export class AuthService {
  /**
   * Generates JWT Access and Refresh tokens
   */
  generateTokens(user: IUser): { accessToken: string; refreshToken: string } {
    const payload: ITokenPayload = {
      userId: user._id.toString(),
      role: user.role,
      phone: user.phone,
      name: user.name,
      departmentId: user.departmentId ? user.departmentId.toString() : undefined,
    };

    const accessToken = jwt.sign(payload, env.JWT_ACCESS_SECRET, {
      expiresIn: env.JWT_ACCESS_TTL as any,
    });

    const refreshToken = jwt.sign(payload, env.JWT_REFRESH_SECRET, {
      expiresIn: env.JWT_REFRESH_TTL as any,
    });

    return { accessToken, refreshToken };
  }

  /**
   * Sets secure HTTP-only cookies on the response
   */
  setAuthCookies(res: Response, accessToken: string, refreshToken: string): void {
    const isProduction = env.NODE_ENV === 'production';

    res.cookie('cp_access_token', accessToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 15 * 60 * 1000, // 15 mins
      path: '/',
    });

    res.cookie('cp_refresh_token', refreshToken, {
      httpOnly: true,
      secure: isProduction,
      sameSite: 'lax',
      maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
      path: '/',
    });
  }

  /**
   * Clears auth cookies upon logout
   */
  clearAuthCookies(res: Response): void {
    res.clearCookie('cp_access_token', { path: '/' });
    res.clearCookie('cp_refresh_token', { path: '/' });
  }

  /**
   * Verifies access token
   */
  verifyAccessToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, env.JWT_ACCESS_SECRET) as ITokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Access token expired');
      }
      throw new UnauthorizedError('Invalid access token');
    }
  }

  /**
   * Verifies refresh token
   */
  verifyRefreshToken(token: string): ITokenPayload {
    try {
      return jwt.verify(token, env.JWT_REFRESH_SECRET) as ITokenPayload;
    } catch (err: any) {
      if (err.name === 'TokenExpiredError') {
        throw new UnauthorizedError('Refresh token expired. Please log in again.');
      }
      throw new UnauthorizedError('Invalid refresh token');
    }
  }

  /**
   * Handles Citizen Login or Registration after OTP verification
   */
  async loginOrRegisterCitizen(data: {
    name: string;
    phone: string;
    email?: string;
    preferredLanguage?: string;
  }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    let user = await User.findOne({ phone: data.phone });

    if (user) {
      // Existing user: update name and phoneVerifiedAt
      user.name = data.name.trim() || user.name;
      user.phoneVerifiedAt = new Date();
      if (data.email) user.email = data.email.toLowerCase().trim();
      if (data.preferredLanguage) user.preferredLanguage = data.preferredLanguage;
      await user.save();
    } else {
      // New Citizen user - role ALWAYS defaulted to 'citizen'
      user = await User.create({
        name: data.name.trim(),
        phone: data.phone,
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        preferredLanguage: data.preferredLanguage || 'en',
        role: 'citizen',
        phoneVerifiedAt: new Date(),
        isActive: true,
      });
    }

    if (!user.isActive) {
      throw new ForbiddenError('This account has been deactivated. Please contact municipal support.');
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Handles Staff Login after OTP verification
   */
  async staffLogin(phone: string): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    const user = await User.findOne({ phone });

    if (!user) {
      throw new ForbiddenError('Staff account not found. Please contact your municipal administrator.');
    }

    if (user.role === 'citizen') {
      throw new ForbiddenError('Citizen accounts cannot access staff portals.');
    }

    if (!user.isActive) {
      throw new ForbiddenError('Staff account is inactive. Please contact your supervisor.');
    }

    user.phoneVerifiedAt = new Date();
    await user.save();

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }

  /**
   * Handles Staff Registration after OTP verification
   */
  async registerStaff(data: {
    name: string;
    phone: string;
    role: 'officer' | 'field_worker';
    departmentName?: string;
    ward?: string;
    email?: string;
  }): Promise<{ user: IUser; tokens: { accessToken: string; refreshToken: string } }> {
    let user = await User.findOne({ phone: data.phone });

    if (user) {
      user.name = data.name.trim() || user.name;
      user.role = data.role;
      if (data.departmentName) user.departmentName = data.departmentName.toUpperCase().trim();
      if (data.ward) user.ward = data.ward.trim();
      if (data.email) user.email = data.email.toLowerCase().trim();
      user.phoneVerifiedAt = new Date();
      user.isActive = true;
      await user.save();
    } else {
      user = await User.create({
        name: data.name.trim(),
        phone: data.phone,
        role: data.role,
        departmentName: (data.departmentName || 'ROADS').toUpperCase().trim(),
        ward: data.ward?.trim(),
        email: data.email ? data.email.toLowerCase().trim() : undefined,
        preferredLanguage: 'en',
        phoneVerifiedAt: new Date(),
        isActive: true,
      });
    }

    const tokens = this.generateTokens(user);
    return { user, tokens };
  }
}

export const authService = new AuthService();
