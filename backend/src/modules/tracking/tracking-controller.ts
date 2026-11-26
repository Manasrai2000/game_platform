import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { trackingService } from "./tracking-service";
import { NotFoundError } from "../../core/errors/app-error";

const trackEventSchema = z.object({
  eventType: z.string().min(2).max(64),
  classId: z.number().optional().nullable(),
  metadata: z.record(z.string(), z.unknown()).optional(),
});

export class TrackingController {
  async getStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const status = await trackingService.getUserActivityStatus(user.id, user.classGrade);
      if (!status) {
        throw new NotFoundError("User tracking profile not found");
      }
      res.status(200).json({
        success: true,
        data: status,
      });
    } catch (err) {
      next(err);
    }
  }

  async logEvent(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const parsed = trackEventSchema.parse(req.body);
      await trackingService.trackEvent(
        user.id,
        parsed.classId || null,
        parsed.eventType,
        parsed.metadata
      );
      res.status(201).json({
        success: true,
        message: "Event tracked",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const trackingController = new TrackingController();
