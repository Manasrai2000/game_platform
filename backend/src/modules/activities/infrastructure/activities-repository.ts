import { eq, and, desc } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import {
  class_activities,
  student_journey_progress,
  classes,
  ClassActivityModel,
  StudentJourneyProgressModel,
} from "../../../core/database/schema/index";
import { NotFoundError } from "../../../core/errors/app-error";

export class ActivitiesRepository {
  async findByClassId(classId: number): Promise<ClassActivityModel | null> {
    const [found] = await db
      .select()
      .from(class_activities)
      .where(and(eq(class_activities.class_id, classId), eq(class_activities.is_active, true)))
      .limit(1);
    return found || null;
  }

  async findById(id: number): Promise<ClassActivityModel | null> {
    const [found] = await db
      .select()
      .from(class_activities)
      .where(eq(class_activities.id, id))
      .limit(1);
    return found || null;
  }

  async upsertClassActivity(data: {
    classId: number;
    title: string;
    description?: string;
    storagePath: string;
    entryFile: string;
    totalCheckpoints: number;
  }): Promise<ClassActivityModel> {
    const existing = await this.findByClassId(data.classId);

    if (existing) {
      await db
        .update(class_activities)
        .set({
          title: data.title,
          description: data.description || existing.description,
          version: existing.version + 1,
          storage_path: data.storagePath,
          entry_file: data.entryFile,
          total_checkpoints: data.totalCheckpoints,
          is_active: true,
        })
        .where(eq(class_activities.id, existing.id));

      const updated = await this.findById(existing.id);
      return updated!;
    }

    const [result] = await db.insert(class_activities).values({
      class_id: data.classId,
      title: data.title,
      description: data.description,
      version: 1,
      storage_path: data.storagePath,
      entry_file: data.entryFile,
      total_checkpoints: data.totalCheckpoints,
      is_active: true,
    });

    const created = await this.findById(Number(result.insertId));
    return created!;
  }

  async listAllWithClasses(): Promise<
    Array<{
      id: number;
      classId: number;
      className: string;
      title: string;
      version: number;
      storagePath: string;
      entryFile: string;
      totalCheckpoints: number;
      isActive: boolean;
      createdAt: Date;
      updatedAt: Date;
    }>
  > {
    const rows = await db
      .select({
        id: class_activities.id,
        classId: class_activities.class_id,
        className: classes.name,
        title: class_activities.title,
        version: class_activities.version,
        storagePath: class_activities.storage_path,
        entryFile: class_activities.entry_file,
        totalCheckpoints: class_activities.total_checkpoints,
        isActive: class_activities.is_active,
        createdAt: class_activities.created_at,
        updatedAt: class_activities.updated_at,
      })
      .from(class_activities)
      .innerJoin(classes, eq(class_activities.class_id, classes.id))
      .orderBy(desc(class_activities.created_at));

    return rows;
  }

  async deleteById(id: number): Promise<ClassActivityModel> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError("Activity package not found");
    await db.delete(class_activities).where(eq(class_activities.id, id));
    return existing;
  }

  /**
   * Retrieves or initializes the single journey progress for a student
   */
  async getOrCreateStudentProgress(
    userId: number,
    classId: number,
    activityId: number
  ): Promise<StudentJourneyProgressModel> {
    const [existing] = await db
      .select()
      .from(student_journey_progress)
      .where(
        and(
          eq(student_journey_progress.user_id, userId),
          eq(student_journey_progress.class_id, classId)
        )
      )
      .limit(1);

    if (existing) {
      return existing;
    }

    const [insertResult] = await db.insert(student_journey_progress).values({
      user_id: userId,
      class_id: classId,
      activity_id: activityId,
      current_checkpoint: 1,
      max_completed_checkpoint: 0,
      journey_state: JSON.stringify({ currentLevel: 1, completedLevels: [] }),
      is_journey_completed: false,
    });

    const [created] = await db
      .select()
      .from(student_journey_progress)
      .where(eq(student_journey_progress.id, Number(insertResult.insertId)))
      .limit(1);

    return created;
  }

  /**
   * Advances student to next checkpoint. Prevents going backward (no replaying past levels).
   */
  async advanceStudentCheckpoint(
    userId: number,
    classId: number,
    completedCheckpoint: number,
    nextCheckpoint: number,
    totalCheckpoints: number,
    stateData?: string
  ): Promise<StudentJourneyProgressModel> {
    const [current] = await db
      .select()
      .from(student_journey_progress)
      .where(
        and(
          eq(student_journey_progress.user_id, userId),
          eq(student_journey_progress.class_id, classId)
        )
      )
      .limit(1);

    if (!current) {
      throw new NotFoundError("Student progress record not found");
    }

    // Client rule: Past activities cannot be replayed. Current checkpoint advances monotonically.
    const newMaxCompleted = Math.max(current.max_completed_checkpoint, completedCheckpoint);
    const newCurrentCheckpoint = Math.max(current.current_checkpoint, nextCheckpoint);
    const isCompleted = newMaxCompleted >= totalCheckpoints;

    await db
      .update(student_journey_progress)
      .set({
        max_completed_checkpoint: newMaxCompleted,
        current_checkpoint: newCurrentCheckpoint,
        journey_state: stateData || current.journey_state,
        is_journey_completed: isCompleted,
        last_played_at: new Date(),
      })
      .where(eq(student_journey_progress.id, current.id));

    const [updated] = await db
      .select()
      .from(student_journey_progress)
      .where(eq(student_journey_progress.id, current.id))
      .limit(1);

    return updated;
  }
}

export const activitiesRepository = new ActivitiesRepository();
