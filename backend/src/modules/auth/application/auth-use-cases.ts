import { authRepository } from "../infrastructure/auth-repository";
import { deviceLockService } from "../../devices/public/device-service";
import { hashPassword, verifyPassword } from "../../../core/security/argon2";
import { generateSecureToken, hashToken } from "../../../core/security/tokens";
import {
  ConflictError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
} from "../../../core/errors/app-error";
import { RegisterInput, LoginInput } from "../domain/user";

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
   * Student Self-Registration:
   * Hashes password, creates user, binds the registration laptop as the single ACTIVE device,
   * and creates the authenticated session.
   */
  async register(
    input: RegisterInput,
    clientIp: string,
    userAgent: string
  ): Promise<AuthSuccessResult> {
    // 1. Check existing email
    const existing = await authRepository.findByEmail(input.email);
    if (existing) {
      throw new ConflictError("An account with this email already exists");
    }

    // 2. Hash password with Argon2id + pepper
    const passwordHash = await hashPassword(input.password);

    // 3. Create user in database
    const user = await authRepository.createUser({
      fullName: input.fullName,
      email: input.email,
      mobileNumber: input.mobileNumber,
      classGrade: input.classGrade,
      schoolName: input.schoolName,
      city: input.city,
      state: input.state,
      passwordHash,
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
    await authRepository.updateUserPassword(targetUserId, newHash);

    await authRepository.logEvent(adminUserId, targetUserId, "ADMIN_PASSWORD_RESET", adminIp);
  }
}

export const authUseCases = new AuthUseCases();
