import { eq, asc, inArray } from "drizzle-orm";
import { db } from "../../../core/database/connection";
import { classes, ClassModel } from "../../../core/database/schema/index";
import { NotFoundError } from "../../../core/errors/app-error";

export class ClassesRepository {
  /**
   * List active classes ordered by display_order ASC, name ASC (for registration dropdown)
   */
  async listActive(): Promise<ClassModel[]> {
    return await db
      .select()
      .from(classes)
      .where(eq(classes.is_active, true))
      .orderBy(asc(classes.display_order), asc(classes.name));
  }

  /**
   * List all classes for Admin management (ordered by display_order ASC)
   */
  async listAll(): Promise<ClassModel[]> {
    return await db
      .select()
      .from(classes)
      .orderBy(asc(classes.display_order), asc(classes.name));
  }

  async findById(id: number): Promise<ClassModel | null> {
    const [found] = await db.select().from(classes).where(eq(classes.id, id)).limit(1);
    return found || null;
  }

  async create(data: { name: string; displayOrder?: number; isActive?: boolean }): Promise<ClassModel> {
    const [result] = await db.insert(classes).values({
      name: data.name.trim(),
      display_order: data.displayOrder ?? 0,
      is_active: data.isActive ?? true,
    });
    const created = await this.findById(Number(result.insertId));
    if (!created) throw new Error("Failed to create class record");
    return created;
  }

  async update(
    id: number,
    data: { name?: string; displayOrder?: number; isActive?: boolean }
  ): Promise<ClassModel> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError("Class not found");

    const updatePayload: Partial<typeof classes.$inferInsert> = {};
    if (data.name !== undefined) updatePayload.name = data.name.trim();
    if (data.displayOrder !== undefined) updatePayload.display_order = data.displayOrder;
    if (data.isActive !== undefined) updatePayload.is_active = data.isActive;

    await db.update(classes).set(updatePayload).where(eq(classes.id, id));
    const updated = await this.findById(id);
    return updated!;
  }

  async delete(id: number): Promise<void> {
    const existing = await this.findById(id);
    if (!existing) throw new NotFoundError("Class not found");
    await db.delete(classes).where(eq(classes.id, id));
  }

  /**
   * Batch update display order
   */
  async reorder(items: { id: number; displayOrder: number }[]): Promise<void> {
    await db.transaction(async (tx) => {
      for (const item of items) {
        await tx
          .update(classes)
          .set({ display_order: item.displayOrder })
          .where(eq(classes.id, item.id));
      }
    });
  }
}

export const classesRepository = new ClassesRepository();
