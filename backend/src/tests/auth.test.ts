import { describe, it, expect, beforeEach } from 'vitest';
import { normalizePhoneNumber } from '../utils/phone';
import { otpService } from '../services/otp/otp.service';
import { authService } from '../services/auth.service';
import { IUser } from '../models/User';
import mongoose from 'mongoose';

describe('Phone Number Normalization', () => {
  it('should normalize standard 10-digit Indian phone numbers', () => {
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
  });

  it('should preserve already formatted international numbers', () => {
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    expect(normalizePhoneNumber('+14155552671')).toBe('+14155552671');
  });

  it('should strip spaces, dashes, and parentheses', () => {
    expect(normalizePhoneNumber('+91 98765-43210')).toBe('+919876543210');
    expect(normalizePhoneNumber('(987) 654-3210')).toBe('+919876543210');
  });

  it('should strip leading zero trunk prefix', () => {
    expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
  });

  it('should throw error for invalid numbers', () => {
    expect(() => normalizePhoneNumber('123')).toThrow();
    expect(() => normalizePhoneNumber('abcd')).toThrow();
  });
});

describe('OTP Service Logic', () => {
  const testPhone = '+919999888877';

  it('should send an OTP and return cooldown info', async () => {
    const res = await otpService.sendOtp(testPhone);
    expect(res.success).toBe(true);
    expect(res.cooldownSeconds).toBe(60);
  });

  it('should block immediate OTP resend within 60s cooldown', async () => {
    await expect(otpService.sendOtp(testPhone)).rejects.toThrow(/Please wait/);
  });

  it('should reject incorrect OTP code', async () => {
    await expect(otpService.verifyOtp(testPhone, '000000')).rejects.toThrow(/Incorrect OTP/);
  });
});

describe('Auth Service & JWT Token Lifecycle', () => {
  const mockUser: Partial<IUser> = {
    _id: new mongoose.Types.ObjectId(),
    name: 'Citizen Tester',
    phone: '+919876543210',
    role: 'citizen',
    preferredLanguage: 'en',
    isActive: true,
  };

  it('should generate valid access and refresh tokens', () => {
    const tokens = authService.generateTokens(mockUser as IUser);
    expect(tokens.accessToken).toBeDefined();
    expect(tokens.refreshToken).toBeDefined();

    const decoded = authService.verifyAccessToken(tokens.accessToken);
    expect(decoded.userId).toBe(mockUser._id?.toString());
    expect(decoded.role).toBe('citizen');
    expect(decoded.phone).toBe(mockUser.phone);
  });

  it('should throw UnauthorizedError on invalid token string', () => {
    expect(() => authService.verifyAccessToken('invalid.token.string')).toThrow();
  });
});
