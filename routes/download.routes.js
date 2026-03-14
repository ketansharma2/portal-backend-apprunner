// routes/download.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { downloadResume } from "../controllers/download.controller.js";
import { logAction } from "../middlewares/logRecruiterMiddleware.js";

const router = express.Router();

// GET is the correct HTTP verb for downloading
router.post(
  "/:id",
  authMiddleware(["RECRUITER", "ADMIN"]),
  logAction("resume_download"),
  downloadResume
);

export default router;
