import express from "express";

import { addCandidateManually } from "../controllers/salesCandiateManual.contorller.js";

const router = express.Router();

router.post("/upload", addCandidateManually);

export default router;