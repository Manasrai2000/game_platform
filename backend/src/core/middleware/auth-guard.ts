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
  classGrade: string | null;
  isActive: boolean;
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
        classGrade: users.class_grade,
        isActive: users.is_active,
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
      classGrade: sessionData.classGrade,
      isActive: sessionData.isActive,
      sessionId: sessionData.sessionId,
      deviceId: sessionData.deviceId,
    };

    next();
  } catch (err) {
    next(err);
  }
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
