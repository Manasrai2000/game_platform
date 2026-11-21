import { Request, Response, NextFunction } from "express";
import { authUseCases } from "../application/auth-use-cases";
import { registerSchema, loginSchema, adminSetPasswordSchema } from "../domain/user";
import { env } from "../../../core/config/env";

export class AuthController {
  async register(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = registerSchema.parse(req.body);
      const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "unknown";

      const result = await authUseCases.register(validated, clientIp, userAgent);

      // Set session cookie
      res.cookie(env.SESSION_COOKIE_NAME, result.rawSessionToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        expires: result.expiresAt,
      });

      // Set device binding cookie if newly bound
      if (result.rawDeviceToken) {
        res.cookie(env.DEVICE_COOKIE_NAME, result.rawDeviceToken, {
          httpOnly: true,
          secure: env.COOKIE_SECURE,
          sameSite: "lax",
          path: "/",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000), // 1 year
        });
      }

      res.status(201).json({
        success: true,
        data: {
          user: result.user,
          deviceBound: !!result.rawDeviceToken,
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async login(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = loginSchema.parse(req.body);
      const rawDeviceCookie = req.cookies[env.DEVICE_COOKIE_NAME];
      const clientIp = req.ip || req.socket.remoteAddress || "127.0.0.1";
      const userAgent = req.headers["user-agent"] || "unknown";

      const result = await authUseCases.login(
        validated,
        rawDeviceCookie,
        clientIp,
        userAgent
      );

      // Set session cookie
      res.cookie(env.SESSION_COOKIE_NAME, result.rawSessionToken, {
        httpOnly: true,
        secure: env.COOKIE_SECURE,
        sameSite: "lax",
        path: "/",
        expires: result.expiresAt,
      });

      // Set device cookie if it was first binding
      if (result.rawDeviceToken) {
        res.cookie(env.DEVICE_COOKIE_NAME, result.rawDeviceToken, {
          httpOnly: true,
          secure: env.COOKIE_SECURE,
          sameSite: "lax",
          path: "/",
          expires: new Date(Date.now() + 365 * 24 * 60 * 60 * 1000),
        });
      }

      res.status(200).json({
        success: true,
        data: {
          user: result.user,
          deviceBound: result.user.role === "STUDENT",
        },
      });
    } catch (err) {
      next(err);
    }
  }

  async logout(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const rawSid = req.cookies[env.SESSION_COOKIE_NAME];
      if (rawSid) {
        await authUseCases.logout(rawSid);
      }

      res.clearCookie(env.SESSION_COOKIE_NAME, { path: "/" });

      res.status(200).json({
        success: true,
        message: "Successfully logged out",
      });
    } catch (err) {
      next(err);
    }
  }

  async me(req: Request, res: Response): Promise<void> {
    res.status(200).json({
      success: true,
      data: {
        user: req.user,
      },
    });
  }

  async adminSetPassword(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = adminSetPasswordSchema.parse(req.body);
      const adminUserId = req.user!.id;
      const adminIp = req.ip || req.socket.remoteAddress || "127.0.0.1";

      await authUseCases.adminSetPassword(
        adminUserId,
        validated.targetUserId,
        validated.newPassword,
        adminIp
      );

      res.status(200).json({
        success: true,
        message: "Student password updated successfully. All previous sessions terminated.",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const authController = new AuthController();
