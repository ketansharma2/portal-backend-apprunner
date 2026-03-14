// routes/candidate.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import {
  addOrUpdateCandidate,
  getCandidate,
  searchCandidates,
  updateFeedback,
  viewResume,
} from "../controllers/candidates.controller.js";

import { logAction } from "../middlewares/logRecruiterMiddleware.js";

const router = express.Router();

// CREATE / UPDATE
router.post("/", authMiddleware(["RECRUITER", "ADMIN"]), addOrUpdateCandidate);

// SEARCH
router.get(
  "/search",
  authMiddleware(["RECRUITER", "ADMIN"]),
  logAction("search_candidates"),
  searchCandidates
);

// VIEW PROFILE
router.get(
  "/:id",
  authMiddleware(["RECRUITER", "ADMIN"]),
  // logAction("view_candidate"),
  getCandidate
);

// UPDATE FEEDBACK
router.patch(
  "/:id/feedback",
  authMiddleware(["RECRUITER", "ADMIN"]),
  logAction("update_remark"),
  updateFeedback
);

// VIEW RESUME (+ LIMITS)
router.get(
  "/:id/resume",
  authMiddleware(["RECRUITER", "ADMIN"]),
  logAction("resume_view"),
  viewResume
);

export default router;
