import { z } from "zod";

export const registerSchema = z.object({
  fullName: z.string().min(2, "Full name must be at least 2 characters").max(150),
  email: z.string().email("Invalid email address").max(255),
  mobileNumber: z
    .string()
    .min(10, "Mobile number must be at least 10 digits")
    .max(15, "Mobile number too long"),
  classGrade: z.string().min(1, "Class/grade is required").max(50),
  schoolName: z.string().min(2, "School name is required").max(200),
  password: z.string().min(8, "Password must be at least 8 characters").max(100),
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

export type RegisterInput = z.infer<typeof registerSchema>;
export type LoginInput = z.infer<typeof loginSchema>;
export type AdminSetPasswordInput = z.infer<typeof adminSetPasswordSchema>;
