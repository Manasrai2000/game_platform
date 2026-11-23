import { Router } from "express";
import { classesController } from "./classes-controller";
import { requireAuth, requireAdmin } from "../../../core/middleware/auth-guard";

const router = Router();

// Public: for registration dropdown
router.get("/active", (req, res, next) => classesController.getActiveClasses(req, res, next));

// Admin CRUD
router.get("/", requireAuth, requireAdmin, (req, res, next) =>
  classesController.getAllClasses(req, res, next)
);
router.post("/", requireAuth, requireAdmin, (req, res, next) =>
  classesController.createClass(req, res, next)
);
router.patch("/reorder", requireAuth, requireAdmin, (req, res, next) =>
  classesController.reorderClasses(req, res, next)
);
router.put("/:id", requireAuth, requireAdmin, (req, res, next) =>
  classesController.updateClass(req, res, next)
);
router.delete("/:id", requireAuth, requireAdmin, (req, res, next) =>
  classesController.deleteClass(req, res, next)
);

export const classesRoutes = router;
