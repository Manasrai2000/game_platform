import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { activitiesRepository } from "./activities-repository";
import { activityStorageService } from "./activity-storage-service";
import { classesRepository } from "../../classes/infrastructure/classes-repository";
import { BadRequestError, NotFoundError } from "../../../core/errors/app-error";

const uploadInputSchema = z.object({
  classId: z.coerce.number().positive("Valid class is required"),
  title: z.string().min(1, "Title is required").max(255),
  description: z.string().optional(),
  totalCheckpoints: z.coerce.number().int().min(1).default(3),
});

const checkpointInputSchema = z.object({
  completedCheckpoint: z.number().int().min(1),
  nextCheckpoint: z.number().int().min(1),
  stateData: z.record(z.string(), z.any()).optional(),
});

export class ActivitiesController {
  /**
   * Admin: Upload and extract ZIP journey package for a class
   */
  async uploadPackage(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      if (!req.file) {
        throw new BadRequestError("ZIP package file is required");
      }

      const validated = uploadInputSchema.parse(req.body);

      // Verify class exists
      const targetClass = await classesRepository.findById(validated.classId);
      if (!targetClass) {
        throw new NotFoundError("Selected class not found");
      }

      // Safe extract with Zip Slip & Zip Bomb validation
      const extracted = await activityStorageService.extractPackage(
        req.file.buffer,
        validated.classId
      );

      // Upsert record in database
      const activity = await activitiesRepository.upsertClassActivity({
        classId: validated.classId,
        title: validated.title,
        description: validated.description,
        storagePath: extracted.storagePath,
        entryFile: extracted.entryFile,
        totalCheckpoints: validated.totalCheckpoints,
      });

      res.status(201).json({
        success: true,
        message: `Journey package for ${targetClass.name} uploaded and extracted successfully!`,
        data: { activity },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List all uploaded packages
   */
  async listAdminActivities(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const activities = await activitiesRepository.listAllWithClasses();
      res.status(200).json({
        success: true,
        data: { activities },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Delete package
   */
  async deleteActivity(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const activity = await activitiesRepository.deleteById(id);
      activityStorageService.deletePackage(activity.class_id);

      res.status(200).json({
        success: true,
        message: "Activity journey package deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student: Get the journey package & saved progress for the logged-in student's class
   */
  async getMyJourney(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      if (!user.classGrade) {
        res.status(200).json({
          success: true,
          data: {
            hasPackage: false,
            message: "No class assigned to your profile",
          },
        });
        return;
      }

      // Find class matching student's classGrade
      const allClasses = await classesRepository.listAll();
      const matchedClass = allClasses.find(
        (c) => c.name.toLowerCase().trim() === user.classGrade!.toLowerCase().trim()
      );

      if (!matchedClass) {
        res.status(200).json({
          success: true,
          data: {
            hasPackage: false,
            message: `Class "${user.classGrade}" has no configured game package yet`,
          },
        });
        return;
      }

      // Find activity package for this class
      const activity = await activitiesRepository.findByClassId(matchedClass.id);
      if (!activity) {
        res.status(200).json({
          success: true,
          data: {
            hasPackage: false,
            className: matchedClass.name,
            message: `Learning journey for ${matchedClass.name} is being prepared by administrators`,
          },
        });
        return;
      }

      // Get or initialize student progress
      const progress = await activitiesRepository.getOrCreateStudentProgress(
        user.id,
        matchedClass.id,
        activity.id
      );

      res.status(200).json({
        success: true,
        data: {
          hasPackage: true,
          class: {
            id: matchedClass.id,
            name: matchedClass.name,
          },
          activity: {
            id: activity.id,
            title: activity.title,
            description: activity.description,
            version: activity.version,
            storagePath: activity.storage_path,
            entryFile: activity.entry_file,
            totalCheckpoints: activity.total_checkpoints,
            // Full URL to the index.html inside the static activities-storage path
            playUrl: `/activities-storage/${activity.storage_path}/${activity.entry_file}`,
          },
          progress: {
            currentCheckpoint: progress.current_checkpoint,
            maxCompletedCheckpoint: progress.max_completed_checkpoint,
            isCompleted: progress.is_journey_completed,
            journeyState: progress.journey_state ? JSON.parse(progress.journey_state) : null,
            lastPlayedAt: progress.last_played_at,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Student: Advance to next checkpoint upon completing a level
   * Prevents replaying past activities (monotonically non-decreasing checkpoints)
   */
  async advanceCheckpoint(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const user = req.user!;
      const validated = checkpointInputSchema.parse(req.body);

      // Find student's class
      const allClasses = await classesRepository.listAll();
      const matchedClass = allClasses.find(
        (c) => c.name.toLowerCase().trim() === user.classGrade!.toLowerCase().trim()
      );

      if (!matchedClass) {
        throw new NotFoundError("Student class not found");
      }

      const activity = await activitiesRepository.findByClassId(matchedClass.id);
      if (!activity) {
        throw new NotFoundError("Class activity journey not found");
      }

      const updated = await activitiesRepository.advanceStudentCheckpoint(
        user.id,
        matchedClass.id,
        validated.completedCheckpoint,
        validated.nextCheckpoint,
        activity.total_checkpoints,
        validated.stateData ? JSON.stringify(validated.stateData) : undefined
      );

      res.status(200).json({
        success: true,
        message: `Level ${validated.completedCheckpoint} completed! Advancing to Level ${updated.current_checkpoint}`,
        data: {
          progress: {
            currentCheckpoint: updated.current_checkpoint,
            maxCompletedCheckpoint: updated.max_completed_checkpoint,
            isCompleted: updated.is_journey_completed,
            journeyState: updated.journey_state ? JSON.parse(updated.journey_state) : null,
          },
        },
      });
    } catch (err) {
      next(err);
    }
  }
}

export const activitiesController = new ActivitiesController();
