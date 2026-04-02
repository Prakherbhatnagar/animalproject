import { z } from 'zod';

export const sendOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is too short").max(15, "Phone number is too long"),
});

export const verifyOtpSchema = z.object({
  phone: z.string().min(10, "Phone number is too short").max(15, "Phone number is too long"),
  code: z.string().length(6, "OTP must be exactly 6 digits"),
  role: z.enum(['reporter', 'admin', 'ngo_admin', '']).optional(),
  name: z.string().optional()
});

export const googleAuthSchema = z.object({
  idToken: z.string().min(1, "Google idToken is required"),
  role: z.enum(['reporter', 'admin', 'ngo_admin', '']).optional(),
  name: z.string().optional()
});
