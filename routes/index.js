// routes/index.js
import express from "express";
import auth from "./auth.routes.js";
import candidates from "./candidate.routes.js";
import admin from "./admin.routes.js";
import downloads from "./download.routes.js";
import bulk from "./bulk.routes.js";
import recruiterLogs from './recruiterLog.routes.js'

const router = express.Router();

router.use("/auth", auth);
router.use("/candidates", candidates);
router.use("/admin", admin);
router.use("/downloads", downloads);
router.use("/bulk", bulk);
router.use("/recruiter",recruiterLogs);

export default router;