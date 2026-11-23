import { Request, Response, NextFunction } from "express";
import { z } from "zod";
import { classesRepository } from "./classes-repository";

const classInputSchema = z.object({
  name: z.string().min(1, "Class name is required").max(100),
  displayOrder: z.coerce.number().int().default(0),
  isActive: z.boolean().default(true),
});

const reorderSchema = z.object({
  items: z.array(
    z.object({
      id: z.number().positive(),
      displayOrder: z.number().int(),
    })
  ),
});

export class ClassesController {
  /**
   * Public: List active classes ordered for dropdown
   */
  async getActiveClasses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await classesRepository.listActive();
      res.status(200).json({
        success: true,
        data: { classes: list },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: List all classes
   */
  async getAllClasses(_req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const list = await classesRepository.listAll();
      res.status(200).json({
        success: true,
        data: { classes: list },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Create class
   */
  async createClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const validated = classInputSchema.parse(req.body);
      const created = await classesRepository.create(validated);
      res.status(201).json({
        success: true,
        message: "Class created successfully",
        data: { class: created },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Update class
   */
  async updateClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      const validated = classInputSchema.partial().parse(req.body);
      const updated = await classesRepository.update(id, validated);
      res.status(200).json({
        success: true,
        message: "Class updated successfully",
        data: { class: updated },
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Delete class
   */
  async deleteClass(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const id = Number(req.params.id);
      await classesRepository.delete(id);
      res.status(200).json({
        success: true,
        message: "Class deleted successfully",
      });
    } catch (err) {
      next(err);
    }
  }

  /**
   * Admin: Reorder classes
   */
  async reorderClasses(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const { items } = reorderSchema.parse(req.body);
      await classesRepository.reorder(items);
      res.status(200).json({
        success: true,
        message: "Classes reordered successfully",
      });
    } catch (err) {
      next(err);
    }
  }
}

export const classesController = new ClassesController();
