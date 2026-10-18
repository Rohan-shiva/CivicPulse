import { Request, Response, NextFunction } from 'express';
import { sendOtpSchema, verifyOtpSchema } from '../validators/auth.validator';
import { normalizePhoneNumber } from '../utils/phone';
import { otpService } from '../services/otp/otp.service';
import { authService } from '../services/auth.service';
import { User } from '../models/User';
import { BadRequestError, NotFoundError } from '../utils/errors';

export class AuthController {
  /**
   * POST /api/auth/send-otp
   */
  async sendOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = sendOtpSchema.parse(req.body);
      const normalizedPhone = normalizePhoneNumber(parsed.phone);

      // If purpose is staff_login, verify staff account exists beforehand
      if (parsed.purpose === 'staff_login') {
        const staff = await User.findOne({ phone: normalizedPhone });
        if (!staff || staff.role === 'citizen') {
          throw new BadRequestError('No municipal staff account registered with this phone number.');
        }
      }

      const result = await otpService.sendOtp(normalizedPhone);

      res.status(200).json({
        success: true,
        message: result.message,
        phone: normalizedPhone,
        cooldownSeconds: result.cooldownSeconds,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/verify-otp
   */
  async verifyOtp(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const parsed = verifyOtpSchema.parse(req.body);
      const normalizedPhone = normalizePhoneNumber(parsed.phone);

      // 1. Verify OTP with OTP service
      await otpService.verifyOtp(normalizedPhone, parsed.otp);

      // 2. Authenticate or Register based on purpose
      let user;
      let tokens;

      if (parsed.purpose === 'staff_login') {
        const result = await authService.staffLogin(normalizedPhone);
        user = result.user;
        tokens = result.tokens;
      } else {
        // Citizen login / registration
        if (!parsed.name) {
          const existing = await User.findOne({ phone: normalizedPhone });
          if (!existing) {
            throw new BadRequestError('Full name is required for new citizen registration.');
          }
        }

        const result = await authService.loginOrRegisterCitizen({
          name: parsed.name || 'Citizen',
          phone: normalizedPhone,
          email: parsed.email || undefined,
          preferredLanguage: parsed.preferredLanguage || 'en',
        });
        user = result.user;
        tokens = result.tokens;
      }

      // 3. Set secure cookies
      authService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        message: 'Authentication successful',
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          departmentId: user.departmentId,
          departmentName: user.departmentName,
          ward: user.ward,
        },
        token: tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/refresh
   */
  async refreshToken(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const token = req.cookies?.cp_refresh_token || req.body?.refreshToken;
      if (!token) {
        throw new BadRequestError('Refresh token required');
      }

      const decoded = authService.verifyRefreshToken(token);
      const user = await User.findById(decoded.userId);

      if (!user || !user.isActive) {
        throw new NotFoundError('User not found or account deactivated');
      }

      const tokens = authService.generateTokens(user);
      authService.setAuthCookies(res, tokens.accessToken, tokens.refreshToken);

      res.status(200).json({
        success: true,
        token: tokens.accessToken,
      });
    } catch (error) {
      next(error);
    }
  }

  /**
   * POST /api/auth/logout
   */
  async logout(_req: Request, res: Response): Promise<void> {
    authService.clearAuthCookies(res);
    res.status(200).json({
      success: true,
      message: 'Logged out successfully',
    });
  }

  /**
   * GET /api/auth/me
   */
  async getMe(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.user) {
        throw new NotFoundError('Not authenticated');
      }

      const user = await User.findById(req.user.userId);
      if (!user) {
        throw new NotFoundError('User not found');
      }

      res.status(200).json({
        success: true,
        user: {
          id: user._id,
          name: user.name,
          phone: user.phone,
          email: user.email,
          role: user.role,
          preferredLanguage: user.preferredLanguage,
          departmentId: user.departmentId,
          departmentName: user.departmentName,
          ward: user.ward,
        },
      });
    } catch (error) {
      next(error);
    }
  }
}

export const authController = new AuthController();
