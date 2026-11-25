import { z } from "zod";

export const sendOtpSchema = z.object({
  email: z.string().email("Invalid email address").max(255),
  fullName: z.string().max(150).optional(),
});

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(150),
  email: z.string().email("Invalid email address").max(255),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number too long"),
  classGrade: z.string().min(1, "Class/grade is required").max(50),
  schoolName: z.string().min(2, "School name is required").max(200),
  city: z.string().min(1, "City is required").max(100),
  state: z.string().min(1, "State is required").max(100),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
  otp: z.string().min(6, "Verification code must be 6 digits").max(6, "Verification code must be 6 digits"),
  deviceLabel: z.string().max(200).default("Desktop Browser"),
  clientPublicKeySpki: z.string().optional(),
  dbscSessionId: z.string().optional(),
});

export const loginSchema = z.object({
  email: z.string().email("Invalid email address"),
  password: z.string().min(1, "Password is required"),
  deviceLabel: z.string().max(200).default("Desktop Browser"),
  clientPublicKeySpki: z.string().optional(),
  dbscSessionId: z.string().optional(),
});

export const adminSetPasswordSchema = z.object({
  targetUserId: z.number().positive(),
  newPassword: z.string().min(8, "Password must be at least 8 characters"),
});

export const updateProfileSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(150).optional(),
  mobileNumber: z.string().min(10, "Mobile number must be at least 10 digits").max(15).optional(),
  schoolName: z.string().max(200).optional(),
  city: z.string().max(100).optional(),
  state: z.string().max(100).optional(),
  password: z.string().min(8, "Password must be at least 8 characters").max(100).optional(),
});

export type SendOtpInput = z.infer<typeof sendOtpSchema>;
export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
export type UpdateProfileInput = z.infer<typeof updateProfileSchema>;
