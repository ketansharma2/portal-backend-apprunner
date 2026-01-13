import express from "express";
import {
  loginController,
  logoutController,
  registerInitialAdmin,
  registerRecruiter,
} from "../controllers/auth.controller.js";
import { authMiddleware } from "../middlewares/auth.middleware.js";

const router = express.Router();

router.post("/register-admin", registerInitialAdmin);

router.post("/login", loginController);

router.post(
  "/logout",
  authMiddleware(["RECRUITER", "ADMIN"]),
  logoutController
);

router.post(
  "/register-recruiter",
  authMiddleware(["ADMIN"]),
  registerRecruiter
);

export default router;
