import { Router } from "express";
import multer from "multer";
import { activitiesController } from "./activities-controller";
import { requireAuth, requireAdmin } from "../../../core/middleware/auth-guard";
import { BadRequestError } from "../../../core/errors/app-error";

const storage = multer.memoryStorage();
const upload = multer({
  storage,
  limits: {
    fileSize: 100 * 1024 * 1024, // 100 MB max ZIP file
  },
  fileFilter: (_req, file, cb) => {
    const isZip =
      file.mimetype === "application/zip" ||
      file.mimetype === "application/x-zip-compressed" ||
      file.mimetype === "application/octet-stream" ||
      file.originalname.toLowerCase().endsWith(".zip");

    if (isZip) {
      cb(null, true);
    } else {
      cb(new BadRequestError("Only .zip archive packages are allowed"));
    }
  },
});

const router = Router();

// --- Student Journey Endpoints ---
router.get("/my-journey", requireAuth, (req, res, next) =>
  activitiesController.getMyJourney(req, res, next)
);

router.post("/my-journey/checkpoint", requireAuth, (req, res, next) =>
  activitiesController.advanceCheckpoint(req, res, next)
);

// --- Admin Activity Management Endpoints ---
router.get("/admin", requireAuth, requireAdmin, (req, res, next) =>
  activitiesController.listAdminActivities(req, res, next)
);

router.post(
  "/upload",
  requireAuth,
  requireAdmin,
  upload.single("file"),
  (req, res, next) => activitiesController.uploadPackage(req, res, next)
);

router.delete("/:id", requireAuth, requireAdmin, (req, res, next) =>
  activitiesController.deleteActivity(req, res, next)
);

export const activitiesRoutes = router;
