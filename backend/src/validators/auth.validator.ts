import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number is too short').max(16, 'Phone number is too long'),
  purpose: z.enum(['citizen_login', 'staff_login', 'staff_register']).default('citizen_login'),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(8, 'Phone number is too short').max(16, 'Phone number is too long'),
  otp: z.string().regex(/^\d{6}$/, 'OTP must be a 6-digit number'),
  name: z.string().min(2, 'Name must be at least 2 characters').max(100).optional(),
  email: z.string().email('Invalid email address').optional().or(z.literal('')),
  preferredLanguage: z.string().max(10).optional(),
  purpose: z.enum(['citizen_login', 'staff_login', 'staff_register']).default('citizen_login'),
  role: z.enum(['officer', 'field_worker']).optional(),
  departmentName: z.string().optional(),
  ward: z.string().optional(),
});
