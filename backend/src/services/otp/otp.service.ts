import crypto from 'crypto';
import bcrypt from 'bcryptjs';
import { env } from '../../config/env';
import { IOtpProvider } from './otpProvider.interface';
import { Msg91Provider } from './msg91Provider';
import { ConsoleOtpProvider } from './consoleProvider';
import { BadRequestError } from '../../utils/errors';

interface IOtpRecord {
  hashedOtp: string;
  createdAt: number;
  expiresAt: number;
  attempts: number;
  lastSentAt: number;
  sendCountInHour: number;
  hourWindowStart: number;
}

// In-memory OTP storage with automatic memory cleanup
const otpStore = new Map<string, IOtpRecord>();

// Cleanup expired OTP records every 10 minutes
setInterval(() => {
  const now = Date.now();
  for (const [phone, record] of otpStore.entries()) {
    if (now > record.expiresAt + 3600000) {
      otpStore.delete(phone);
    }
  }
}, 600000);

export class OtpService {
  private provider: IOtpProvider;

  constructor() {
    if (env.OTP_PROVIDER === 'msg91' && env.MSG91_AUTH_KEY) {
      this.provider = new Msg91Provider();
    } else {
      if (env.OTP_PROVIDER === 'msg91' && !env.MSG91_AUTH_KEY) {
        console.warn('⚠️ MSG91_AUTH_KEY not configured. Using ConsoleOtpProvider for local development/testing.');
      }
      this.provider = new ConsoleOtpProvider();
    }
  }

  /**
   * Generates, hashes, stores, and sends an OTP to the given phone number
   */
  async sendOtp(phone: string): Promise<{ success: boolean; message: string; cooldownSeconds: number }> {
    const now = Date.now();
    const existing = otpStore.get(phone);

    // 1. Rate limiting & cooldown check
    if (existing) {
      // 60-second cooldown
      const timeSinceLastSent = now - existing.lastSentAt;
      if (timeSinceLastSent < 60000) {
        const remainingCooldown = Math.ceil((60000 - timeSinceLastSent) / 1000);
        throw new BadRequestError(`Please wait ${remainingCooldown}s before requesting another OTP`);
      }

      // Max 5 OTPs per hour window
      if (now - existing.hourWindowStart < 3600000) {
        if (existing.sendCountInHour >= 5) {
          throw new BadRequestError('Too many OTP requests. Please try again after 1 hour.');
        }
      } else {
        // Reset 1-hour window
        existing.hourWindowStart = now;
        existing.sendCountInHour = 0;
      }
    }

    // 2. Generate 6-digit numeric OTP
    const rawOtp = crypto.randomInt(100000, 999999).toString();

    // 3. Hash OTP securely with bcrypt
    const salt = await bcrypt.genSalt(10);
    const hashedOtp = await bcrypt.hash(rawOtp, salt);

    // 4. Save to store (valid for 5 minutes)
    const expiresAt = now + 5 * 60 * 1000;
    const sendCountInHour = existing ? existing.sendCountInHour + 1 : 1;
    const hourWindowStart = existing && now - existing.hourWindowStart < 3600000 ? existing.hourWindowStart : now;

    otpStore.set(phone, {
      hashedOtp,
      createdAt: now,
      expiresAt,
      attempts: 0,
      lastSentAt: now,
      sendCountInHour,
      hourWindowStart,
    });

    // 5. Send through provider
    const result = await this.provider.sendOtp(phone, rawOtp);

    return {
      success: result.success,
      message: result.message,
      cooldownSeconds: 60,
    };
  }

  /**
   * Verifies the submitted OTP against the stored hashed OTP
   */
  async verifyOtp(phone: string, submittedOtp: string): Promise<boolean> {
    const record = otpStore.get(phone);
    if (!record) {
      throw new BadRequestError('No OTP request found for this phone number. Please request a new OTP.');
    }

    const now = Date.now();
    if (now > record.expiresAt) {
      otpStore.delete(phone);
      throw new BadRequestError('OTP has expired. Please request a new OTP.');
    }

    if (record.attempts >= 3) {
      otpStore.delete(phone);
      throw new BadRequestError('Too many incorrect verification attempts. Please request a new OTP.');
    }

    // Increment attempt count
    record.attempts += 1;

    // Verify bcrypt hash
    const isValid = await bcrypt.compare(submittedOtp, record.hashedOtp);

    if (!isValid) {
      const remainingAttempts = 3 - record.attempts;
      throw new BadRequestError(
        `Incorrect OTP. ${remainingAttempts} ${remainingAttempts === 1 ? 'attempt' : 'attempts'} remaining.`
      );
    }

    // Successful verification: consume OTP
    otpStore.delete(phone);
    return true;
  }
}

export const otpService = new OtpService();
