// routes/admin.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  listRecruiters,
  updateRecruiter,
  downloadsSummary,
  analytics,
  deleteRecruiter,
  recruiterDownloadUsageToday,
} from "../controllers/admin.controller.js";
import { addCandidateManual } from "../controllers/candidateManual.controller.js";
import { uploadPDF } from "../middlewares/uploadPdf.js";
import { getAdminUploadLogs } from "../controllers/adminLogs.controller.js";

const router = express.Router();

router.get("/recruiters", authMiddleware(["ADMIN"]), listRecruiters);
router.patch("/recruiters/:id", authMiddleware(["ADMIN"]), updateRecruiter);
router.delete("/recruiters/:id", authMiddleware(["ADMIN"]), deleteRecruiter);
router.get("/downloads/summary", authMiddleware(["ADMIN"]), downloadsSummary);
router.get("/analytics", authMiddleware(["ADMIN"]), analytics);
router.post(
  "/add-manual",
  authMiddleware(["ADMIN"]),
  uploadPDF,
  addCandidateManual
);

router.get(
  "/analytics/recruiter-download-usage",
  authMiddleware(["ADMIN"]),
  recruiterDownloadUsageToday
);

router.get(
  "/upload-logs",
  authMiddleware(["ADMIN"]),
  getAdminUploadLogs
);

export default router;
