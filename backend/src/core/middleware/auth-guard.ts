import { Request, Response, NextFunction } from "express";
import { eq, and, isNull, gt } from "drizzle-orm";
import { db } from "../database/connection";
import { sessions, users } from "../database/schema/index";
import { hashToken } from "../security/tokens";
import { UnauthorizedError, ForbiddenError } from "../errors/app-error";
import { env } from "../config/env";

export interface AuthenticatedUser {
  id: number;
  email: string;
  fullName: string;
  role: "STUDENT" | "ADMIN";
  mobileNumber: string | null;
  classGrade: string | null;
  schoolName: string | null;
  city: string | null;
  state: string | null;
  isActive: boolean;
  referralCode: string | null;
  referredByCode: string | null;
  rewardWalletBalance: number;
  sessionId: string;
  deviceId: number | null;
}

declare global {
  namespace Express {
    interface Request {
      user?: AuthenticatedUser;
    }
  }
}

/**
 * Resolves session cookie (__Host-sid) against MySQL on every authenticated request.
 * Guarantees instant revocation when an Admin resets a device or deactivates a user.
 */
export async function requireAuth(
  req: Request,
  _res: Response,
  next: NextFunction
): Promise<void> {
  try {
    const rawSid = req.cookies[env.SESSION_COOKIE_NAME];
    if (!rawSid) {
      throw new UnauthorizedError("Authentication session cookie missing");
    }

    const hashedSid = hashToken(rawSid);
    const now = new Date();

    // Query active session joined with live user record
    const result = await db
      .select({
        sessionId: sessions.id,
        userId: users.id,
        email: users.email,
        fullName: users.full_name,
        role: users.role,
        mobileNumber: users.mobile_number,
        classGrade: users.class_grade,
        schoolName: users.school_name,
        city: users.city,
        state: users.state,
        isActive: users.is_active,
        referralCode: users.referral_code,
        referredByCode: users.referred_by_code,
        rewardWalletBalance: users.reward_wallet_balance,
        deviceId: sessions.device_id,
        revokedAt: sessions.revoked_at,
        expiresAt: sessions.expires_at,
      })
      .from(sessions)
      .innerJoin(users, eq(sessions.user_id, users.id))
      .where(
        and(
          eq(sessions.session_token_hash, hashedSid),
          isNull(sessions.revoked_at),
          gt(sessions.expires_at, now)
        )
      )
      .limit(1);

    if (result.length === 0) {
      throw new UnauthorizedError("Session is invalid, expired, or revoked");
    }

    const sessionData = result[0];

    if (!sessionData.isActive) {
      throw new ForbiddenError("Account is inactive. Contact Administrator.");
    }

    req.user = {
      id: sessionData.userId,
      email: sessionData.email,
      fullName: sessionData.fullName,
      role: sessionData.role,
      mobileNumber: sessionData.mobileNumber,
      classGrade: sessionData.classGrade,
      schoolName: sessionData.schoolName,
      city: sessionData.city,
      state: sessionData.state,
      isActive: sessionData.isActive,
      referralCode: sessionData.referralCode,
      referredByCode: sessionData.referredByCode,
      rewardWalletBalance: sessionData.rewardWalletBalance,
      sessionId: sessionData.sessionId,
      deviceId: sessionData.deviceId,
    };

    next();
  } catch (err) {
    next(err);
  }
}

/**
 * Optional Auth middleware: attaches req.user if a valid session cookie exists,
 * otherwise proceeds silently as an unauthenticated guest.
 */
export async function optionalAuth(
  req: Request,
  res: Response,
  next: NextFunction
): Promise<void> {
  const rawSid = req.cookies[env.SESSION_COOKIE_NAME];
  if (!rawSid) {
    next();
    return;
  }
  await requireAuth(req, res, (err?: unknown) => {
    if (err) {
      // Ignore auth failure for optional endpoints; treat as guest
      req.user = undefined;
    }
    next();
  });
}

/**
 * RBAC Guard for Admin-only routes
 */
export function requireAdmin(
  req: Request,
  _res: Response,
  next: NextFunction
): void {
  if (!req.user || req.user.role !== "ADMIN") {
    next(new ForbiddenError("Access denied: Administrator privileges required"));
    return;
  }
  next();
}
