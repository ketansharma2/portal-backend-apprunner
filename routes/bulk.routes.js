// routes/bulk.routes.js
import express from "express";
import { authMiddleware } from "../middlewares/auth.middleware.js";
import { uploadMiddleware, bulkUploadHandler } from "../controllers/bulk.controller.js";

const router = express.Router();

router.post("/upload", authMiddleware(["ADMIN"]), uploadMiddleware, bulkUploadHandler);

export default router;