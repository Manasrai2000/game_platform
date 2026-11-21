import { eq, and, sql } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { user_devices, users, sessions, auth_audit_logs } from "../../../core/database/schema/index";
import { generateSecureToken, hashToken } from "../../../core/security/tokens";
import { DeviceLockedError } from "../../../core/errors/app-error";
import { VerifyDeviceParams, DeviceBindingResult } from "../domain/device";

export class DeviceRepository {
  /**
   * Verifies the client device against the student's single ACTIVE binding,
   * or binds the first device if the account has no active device.
   * Runs inside an InnoDB transaction with SELECT ... FOR UPDATE.
   */
  async verifyOrBindDevice(
    params: VerifyDeviceParams
  ): Promise<DeviceBindingResult | null> {
    const { userId, role, rawDeviceToken, clientPublicKeySpki, dbscSessionId, deviceLabel, clientIp } =
      params;

    // Admin accounts are exempt from single-device lock
    if (role === "ADMIN") {
      return null;
    }

    return await db.transaction(async (tx) => {
      // 1. Acquire row lock on the user to prevent simultaneous concurrent login races
      await tx.execute(
        sql`SELECT id, is_active FROM users WHERE id = ${userId} FOR UPDATE`
      );

      // 2. Fetch the student's single ACTIVE device
      const [activeDevice] = await tx
        .select()
        .from(user_devices)
        .where(
          and(
            eq(user_devices.user_id, userId),
            eq(user_devices.status, "ACTIVE")
          )
        )
        .limit(1);

      // 3. CASE A: No active device bound yet -> First Login Binding
      if (!activeDevice) {
        const newDeviceToken = generateSecureToken();
        const hashedToken = hashToken(newDeviceToken);

        const [insertResult] = await tx.insert(user_devices).values({
          user_id: userId,
          device_token_hash: hashedToken,
          public_key_spki: clientPublicKeySpki || null,
          dbsc_session_id: dbscSessionId || null,
          device_label: deviceLabel,
          status: "ACTIVE",
          bound_ip: clientIp,
        });

        // Audit Log
        await tx.insert(auth_audit_logs).values({
          actor_user_id: userId,
          target_user_id: userId,
          event_type: "DEVICE_FIRST_BOUND",
          ip_address: clientIp,
          metadata_json: { deviceLabel, boundIp: clientIp },
        });

        return {
          deviceId: Number(insertResult.insertId),
          rawDeviceToken: newDeviceToken,
          isNewBinding: true,
        };
      }

      // 4. CASE B: Active device exists -> Verify possession
      const incomingTokenHash = rawDeviceToken ? hashToken(rawDeviceToken) : null;
      const isTokenMatch = incomingTokenHash && incomingTokenHash === activeDevice.device_token_hash;

      if (!isTokenMatch) {
        // Unauthorized device login attempt!
        await tx.insert(auth_audit_logs).values({
          actor_user_id: userId,
          target_user_id: userId,
          event_type: "DEVICE_LOCK_BLOCKED",
          ip_address: clientIp,
          metadata_json: {
            attemptedDeviceLabel: deviceLabel,
            attemptedIp: clientIp,
            activeDeviceId: activeDevice.id,
          },
        });

        // Exact required user error message
        throw new DeviceLockedError(
          "Sorry, this account cannot able to access this is not the right device"
        );
      }

      // 5. CASE C: Authorized device verified -> Update last_seen_at
      await tx
        .update(user_devices)
        .set({
          last_seen_at: new Date(),
          bound_ip: clientIp,
        })
        .where(eq(user_devices.id, activeDevice.id));

      return {
        deviceId: activeDevice.id,
        rawDeviceToken: null,
        isNewBinding: false,
      };
    });
  }

  /**
   * Admin-Only Device Reset:
   * Atomically marks the active device as REVOKED and kills all active sessions.
   */
  async adminRevokeDevice(
    adminUserId: number,
    targetUserId: number,
    reason: string,
    adminIp: string
  ): Promise<void> {
    await db.transaction(async (tx) => {
      // Row lock on target user
      await tx.execute(
        sql`SELECT id FROM users WHERE id = ${targetUserId} FOR UPDATE`
      );

      // Revoke the ACTIVE device
      await tx
        .update(user_devices)
        .set({
          status: "REVOKED",
          revoked_at: new Date(),
          revoked_by_admin_id: adminUserId,
          revoke_reason: reason || "Admin Reset via Management Console",
        })
        .where(
          and(
            eq(user_devices.user_id, targetUserId),
            eq(user_devices.status, "ACTIVE")
          )
        );

      // Atomically terminate all sessions for this student
      await tx
        .update(sessions)
        .set({ revoked_at: new Date() })
        .where(
          and(eq(sessions.user_id, targetUserId), sql`revoked_at IS NULL`)
        );

      // Audit Log
      await tx.insert(auth_audit_logs).values({
        actor_user_id: adminUserId,
        target_user_id: targetUserId,
        event_type: "ADMIN_DEVICE_RESET",
        ip_address: adminIp,
        metadata_json: { reason },
      });
    });
  }
}

export const deviceRepository = new DeviceRepository();
