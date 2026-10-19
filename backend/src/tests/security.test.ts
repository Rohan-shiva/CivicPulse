import { describe, it, expect, vi } from 'vitest';
import { requireAuth, requireRole, authenticateUser } from '../middleware/auth';
import { authService } from '../services/auth.service';
import { validateCoordinates } from '../utils/geo';
import { normalizePhoneNumber } from '../utils/phone';
import { UnauthorizedError, ForbiddenError } from '../utils/errors';
import mongoose from 'mongoose';

describe('Security Hardening & Role-Based Access Control (RBAC)', () => {
  it('should call next with UnauthorizedError if request is unauthenticated in requireAuth', () => {
    const req: any = {};
    const res: any = {};
    let errorPassed: any = null;
    const next = (err?: any) => {
      errorPassed = err;
    };

    requireAuth(req, res, next);

    expect(errorPassed).toBeInstanceOf(UnauthorizedError);
    expect(errorPassed.message).toMatch(/Authentication required/);
  });

  it('should proceed cleanly if req.user is populated in requireAuth', () => {
    const req: any = {
      user: { userId: '123', phone: '+919999999999', role: 'citizen' },
    };
    const res: any = {};
    let calledNextWithoutError = false;
    const next = (err?: any) => {
      if (!err) calledNextWithoutError = true;
    };

    requireAuth(req, res, next);

    expect(calledNextWithoutError).toBe(true);
  });

  it('should reject unauthorized role with ForbiddenError in requireRole', () => {
    const officerOnlyGuard = requireRole(['officer', 'admin']);

    // Citizen attempting officer access
    const req: any = {
      user: { userId: '123', phone: '+919999999999', role: 'citizen' },
    };
    const res: any = {};
    let errorPassed: any = null;
    const next = (err?: any) => {
      errorPassed = err;
    };

    officerOnlyGuard(req, res, next);

    expect(errorPassed).toBeInstanceOf(ForbiddenError);
    expect(errorPassed.message).toMatch(/Access denied/);
  });

  it('should allow authorized role in requireRole', () => {
    const officerOnlyGuard = requireRole(['officer', 'admin']);

    // Officer attempting officer access
    const req: any = {
      user: { userId: '456', phone: '+919999999998', role: 'officer' },
    };
    const res: any = {};
    let calledNextWithoutError = false;
    const next = (err?: any) => {
      if (!err) calledNextWithoutError = true;
    };

    officerOnlyGuard(req, res, next);

    expect(calledNextWithoutError).toBe(true);
  });

  it('should verify and extract user payload from Bearer token in authenticateUser', () => {
    const mockUser: any = {
      _id: new mongoose.Types.ObjectId(),
      phone: '+919999999997',
      role: 'field_worker',
      name: 'Test Worker',
    };

    const { accessToken } = authService.generateTokens(mockUser);

    const req: any = {
      headers: {
        authorization: `Bearer ${accessToken}`,
      },
    };
    const res: any = {};
    const next = vi.fn();

    authenticateUser(req, res, next);

    expect(next).toHaveBeenCalled();
    expect(req.user).toBeDefined();
    expect(req.user.phone).toBe('+919999999997');
    expect(req.user.role).toBe('field_worker');
  });
});

describe('Input Validation & Boundary Hardening', () => {
  it('should reject invalid coordinates outside standard WGS-84 ranges', () => {
    // Latitude must be -90 to +90
    expect(() => validateCoordinates(77.5946, 95.0)).toThrow(/Invalid latitude/);
    expect(() => validateCoordinates(77.5946, -91.0)).toThrow(/Invalid latitude/);

    // Longitude must be -180 to +180
    expect(() => validateCoordinates(185.0, 12.9716)).toThrow(/Invalid longitude/);
    expect(() => validateCoordinates(-181.0, 12.9716)).toThrow(/Invalid longitude/);

    // Non-numeric
    expect(() => validateCoordinates(NaN, 12.9716)).toThrow(/Invalid longitude/);
    expect(() => validateCoordinates(77.5946, NaN)).toThrow(/Invalid latitude/);
  });

  it('should strictly format Indian and international phone numbers into E.164', () => {
    // 10-digit Indian local format
    expect(normalizePhoneNumber('9876543210')).toBe('+919876543210');
    // Leading 0
    expect(normalizePhoneNumber('09876543210')).toBe('+919876543210');
    // Already E.164
    expect(normalizePhoneNumber('+919876543210')).toBe('+919876543210');
    // Punctuation & spaces
    expect(normalizePhoneNumber('+91 98765-43210')).toBe('+919876543210');

    // Invalid phone strings
    expect(() => normalizePhoneNumber('12345')).toThrow(/Invalid phone number format/);
    expect(() => normalizePhoneNumber('abcdefghij')).toThrow(/Invalid phone number format/);
    expect(() => normalizePhoneNumber('')).toThrow(/Phone number must be a non-empty string/);
  });
});
