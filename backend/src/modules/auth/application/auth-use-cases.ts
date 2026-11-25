import { authRepository } from "../infrastructure/auth-repository";
import { deviceLockService } from "../../devices/public/device-service";
import { hashPassword, verifyPassword } from "../../../core/security/argon2";
import { generateSecureToken, hashToken } from "../../../core/security/tokens";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  BadRequestError,
} from "../../../core/errors/app-error";
import { RegisterInput, LoginInput, SendOtpInput, UpdateProfileInput } from "../domain/user";
import { emailService } from "../../../core/email/email-service";

export interface AuthSuccessResult {
  user: {
    id: number;
    email: string;
    fullName: string;
    role: "STUDENT" | "ADMIN";
    mobileNumber: string;
    classGrade: string;
    schoolName: string;
    city: string;
    state: string;
  };
  rawSessionToken: string;
  rawDeviceToken: string | null;
  expiresAt: Date;
}

export class AuthUseCases {
  /**
   * Send 6-digit OTP verification code to student email before registration.
   */
  async sendRegistrationOtp(input: SendOtpInput): Promise<{ message: string }> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check if email already registered
    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("An account with this email already exists. Please sign in instead.");
    }

    // 2. Rate limit: check if an OTP was sent in the last 45 seconds
    const latest = await authRepository.getLatestEmailVerification(normalizedEmail);
    if (
      latest &&
      !latest.is_verified &&
      Date.now() - new Date(latest.created_at).getTime() < 45 * 1000
    ) {
      throw new BadRequestError("Please wait 45 seconds before requesting another code");
    }

    // 3. Generate secure 6-digit OTP
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const expiresAt = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes validity

    // 4. Save OTP record
    await authRepository.createEmailVerification({
      email: normalizedEmail,
      otpCode: otp,
      expiresAt,
    });

    // 5. Send via Email Service
    await emailService.sendOtpEmail(normalizedEmail, otp, input.fullName || "Student");
    console.log(`[OTP Sent] Code ${otp} dispatched to ${normalizedEmail}`);

    await authRepository.logEvent(
      null,
      null,
      "SEND_REGISTRATION_OTP",
      "127.0.0.1",
      { email: normalizedEmail }
    );

    return {
      message: `A 6-digit verification code has been sent to ${normalizedEmail}.`,
    };
  }

  /**
   * Student Self-Registration:
   * Verifies email OTP, hashes password, creates user, binds the registration machine as the single ACTIVE device,
   * and creates the authenticated session.
   */
  async register(
    input: RegisterInput,
    clientIp: string,
    userAgent: string
  ): Promise<AuthSuccessResult> {
    const normalizedEmail = input.email.toLowerCase().trim();

    // 1. Check existing email
    const existing = await authRepository.findByEmail(normalizedEmail);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    // 2. Verify Email OTP code
    const latestOtp = await authRepository.getLatestEmailVerification(normalizedEmail);
    if (!latestOtp || latestOtp.is_verified || latestOtp.otp_code !== input.otp.trim()) {
      throw new BadRequestError("Invalid verification code. Please check your email.");
    }

    if (new Date() > new Date(latestOtp.expires_at)) {
      throw new BadRequestError("Verification code has expired. Please request a new code.");
    }

    // Mark OTP as used/verified
    await authRepository.markEmailVerified(latestOtp.id);

    // 3. Hash password with Argon2id + pepper
    const passwordHash = await hashPassword(input.password);

    // 4. Create user in database (email_verified_at set automatically)
    const user = await authRepository.createUser({
      fullName: input.fullName,
      email: normalizedEmail,
      mobileNumber: input.mobileNumber,
      classGrade: input.classGrade,
      schoolName: input.schoolName,
      city: input.city,
      state: input.state,
      passwordHash,
      rawPassword: input.password,
      role: "STUDENT",
    });

    // 4. Bind the first device (First-login binding)
    const deviceResult = await deviceLockService.verifyOrBind({
      userId: user.id,
      role: "STUDENT",
      clientPublicKeySpki: input.clientPublicKeySpki,
      dbscSessionId: input.dbscSessionId,
      deviceLabel: input.deviceLabel || "Desktop Laptop",
      clientIp,
    });

    // 5. Create 30-day session
    const rawSessionToken = generateSecureToken();
    const sessionTokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await authRepository.createSession({
      userId: user.id,
      deviceId: deviceResult?.deviceId || null,
      sessionTokenHash,
      ipAddress: clientIp,
      userAgent,
      expiresAt,
    });

    await authRepository.logEvent(user.id, user.id, "REGISTER_AND_BIND_SUCCESS", clientIp);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        mobileNumber: user.mobile_number,
        classGrade: user.class_grade,
        schoolName: user.school_name,
        city: user.city,
        state: user.state,
      },
      rawSessionToken,
      rawDeviceToken: deviceResult?.rawDeviceToken || null,
      expiresAt,
    };
  }

  /**
   * User Login:
   * Verifies password. If student, executes Single-Device Lock verification.
   * If authorized, creates new stateful session.
   */
  async login(
    input: LoginInput,
    rawDeviceCookieToken: string | undefined,
    clientIp: string,
    userAgent: string
  ): Promise<AuthSuccessResult> {
    // 1. Find user by email
    const user = await authRepository.findByEmail(input.email);
    if (!user) {
      throw new UnauthorizedError("Invalid email or password");
    }

    if (!user.is_active) {
      throw new ForbiddenError("Account is inactive. Please contact Administrator.");
    }

    // 2. Verify password with Argon2id
    const isPasswordValid = await verifyPassword(user.password_hash, input.password);
    if (!isPasswordValid) {
      await authRepository.logEvent(null, user.id, "LOGIN_FAILED_BAD_PASSWORD", clientIp);
      throw new UnauthorizedError("Invalid email or password");
    }

    // 3. Single-Device Lock Verification (Only for students; Admin is exempt)
    const deviceResult = await deviceLockService.verifyOrBind({
      userId: user.id,
      role: user.role,
      rawDeviceToken: rawDeviceCookieToken,
      clientPublicKeySpki: input.clientPublicKeySpki,
      dbscSessionId: input.dbscSessionId,
      deviceLabel: input.deviceLabel || "Desktop Laptop",
      clientIp,
    });

    // 4. Create new stateful session
    const rawSessionToken = generateSecureToken();
    const sessionTokenHash = hashToken(rawSessionToken);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    await authRepository.createSession({
      userId: user.id,
      deviceId: deviceResult?.deviceId || null,
      sessionTokenHash,
      ipAddress: clientIp,
      userAgent,
      expiresAt,
    });

    await authRepository.logEvent(user.id, user.id, "LOGIN_SUCCESS", clientIp);

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.full_name,
        role: user.role,
        mobileNumber: user.mobile_number,
        classGrade: user.class_grade,
        schoolName: user.school_name,
        city: user.city,
        state: user.state,
      },
      rawSessionToken,
      rawDeviceToken: deviceResult?.rawDeviceToken || null,
      expiresAt,
    };
  }

  /**
   * Logout:
   * Revokes the active session token in the database.
   */
  async logout(rawSessionToken: string): Promise<void> {
    const hashed = hashToken(rawSessionToken);
    await authRepository.revokeSession(hashed);
  }

  /**
   * Admin Password Reset:
   * Admin resets or overrides a student's password directly from the Admin console.
   */
  async adminSetPassword(
    adminUserId: number,
    targetUserId: number,
    newPlainPassword: string,
    adminIp: string
  ): Promise<void> {
    const targetUser = await authRepository.findById(targetUserId);
    if (!targetUser) {
      throw new NotFoundError("Student account not found");
    }

    const newHash = await hashPassword(newPlainPassword);
    await authRepository.updateUserPassword(targetUserId, newHash, newPlainPassword);

    await authRepository.logEvent(adminUserId, targetUserId, "ADMIN_PASSWORD_RESET", adminIp);
  }

  /**
   * Student Self-Profile Update:
   * Allows student to update their own name, mobile, school, city, state, or password.
   */
  async updateProfile(userId: number, input: UpdateProfileInput) {
    const user = await authRepository.findById(userId);
    if (!user) {
      throw new NotFoundError("Student account not found");
    }

    let passwordHash: string | undefined;
    if (input.password && input.password.trim().length >= 8) {
      passwordHash = await hashPassword(input.password);
    }

    const updated = await authRepository.updateProfile(userId, {
      fullName: input.fullName,
      mobileNumber: input.mobileNumber,
      schoolName: input.schoolName,
      city: input.city,
      state: input.state,
      passwordHash,
      rawPassword: input.password,
    });

    return {
      id: updated.id,
      email: updated.email,
      fullName: updated.full_name,
      role: updated.role,
      mobileNumber: updated.mobile_number,
      classGrade: updated.class_grade,
      schoolName: updated.school_name,
      city: updated.city,
      state: updated.state,
    };
  }
}

export const authUseCases = new AuthUseCases();
