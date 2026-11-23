import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { users, sessions, auth_audit_logs, User } from "../../../core/database/schema/index";
import { generateUUID } from "../../../core/security/tokens";

export class AuthRepository {
  async findByEmail(email: string): Promise<User | null> {
    const [user] = await db
      .select()
      .from(users)
      .where(eq(users.email, email.toLowerCase().trim()))
      .limit(1);
    return user || null;
  }

  async findById(id: number): Promise<User | null> {
    const [user] = await db.select().from(users).where(eq(users.id, id)).limit(1);
    return user || null;
  }

  async createUser(data: {
    fullName: string;
    email: string;
    mobileNumber: string;
    classGrade: string;
    schoolName: string;
    city?: string;
    state?: string;
    passwordHash: string;
    role?: "STUDENT" | "ADMIN";
  }): Promise<User> {
    const [result] = await db.insert(users).values({
      full_name: data.fullName,
      email: data.email.toLowerCase().trim(),
      mobile_number: data.mobileNumber.trim(),
      class_grade: data.classGrade.trim(),
      school_name: data.schoolName.trim(),
      city: (data.city || "").trim(),
      state: (data.state || "").trim(),
      password_hash: data.passwordHash,
      role: data.role || "STUDENT",
      is_active: true,
    });

    const user = await this.findById(Number(result.insertId));
    if (!user) throw new Error("User creation failed to return entity");
    return user;
  }

  async createSession(data: {
    userId: number;
    deviceId: number | null;
    sessionTokenHash: string;
    ipAddress: string;
    userAgent: string;
    expiresAt: Date;
  }): Promise<string> {
    const sessionId = generateUUID();
    await db.insert(sessions).values({
      id: sessionId,
      user_id: data.userId,
      device_id: data.deviceId,
      session_token_hash: data.sessionTokenHash,
      ip_address: data.ipAddress,
      user_agent: data.userAgent,
      expires_at: data.expiresAt,
    });
    return sessionId;
  }

  async revokeSession(sessionTokenHash: string): Promise<void> {
    await db
      .update(sessions)
      .set({ revoked_at: new Date() })
      .where(eq(sessions.session_token_hash, sessionTokenHash));
  }

  async updateUserPassword(userId: number, newPasswordHash: string): Promise<void> {
    await db.transaction(async (tx) => {
      // 1. Update password
      await tx
        .update(users)
        .set({ password_hash: newPasswordHash })
        .where(eq(users.id, userId));

      // 2. Terminate all active sessions for this user (preserves user_devices lock!)
      await tx
        .update(sessions)
        .set({ revoked_at: new Date() })
        .where(and(eq(sessions.user_id, userId), sql`revoked_at IS NULL`));
    });
  }

  async logEvent(
    actorId: number | null,
    targetId: number | null,
    eventType: string,
    ip: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await db.insert(auth_audit_logs).values({
      actor_user_id: actorId,
      target_user_id: targetId,
      event_type: eventType,
      ip_address: ip,
      metadata_json: metadata || null,
    });
  }
}

export const authRepository = new AuthRepository();
