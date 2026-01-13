import express from "express";
import { getRecruiterLogs } from "../controllers/recruiterLogController.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.get("/logs", authMiddleware(["RECRUITER", "ADMIN"]), getRecruiterLogs);

export default router;
