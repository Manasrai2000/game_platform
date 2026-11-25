import { Router } from "express";
import { userController } from "./user-controller";
import { requireAuth, requireAdmin } from "../../../core/middleware/auth-guard";

const router = Router();

// All routes here require ADMIN authentication
router.use(requireAuth, requireAdmin);

router.get("/students", (req, res, next) => userController.listStudents(req, res, next));
router.get("/students/:id", (req, res, next) => userController.getStudentDetails(req, res, next));
router.put("/students/:id", (req, res, next) => userController.updateStudent(req, res, next));
router.patch("/students/:id/status", (req, res, next) => userController.toggleStatus(req, res, next));
router.post("/students/:id/reset-device", (req, res, next) => userController.resetDevice(req, res, next));

export const userRoutes = router;
