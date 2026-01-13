import User from "../models/user.model.js";
import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import ActivityLog from "../models/activityLog.model.js";
import config from "../config/index.js";
import { logRecruiterAction } from "../utils/logRecruiterAction.js";

/* ----------------------------------------------
   REGISTER INITIAL ADMIN
---------------------------------------------- */
export const registerInitialAdmin = async (req, res, next) => {
  try {
    const existingAdmin = await User.findOne({ role: "ADMIN" });
    if (existingAdmin) {
      return res.status(403).json({ error: "Admin already exists" });
    }

    const { name, email, password } = req.body;
    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email, password required" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const admin = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "ADMIN",
    });

    return res.status(201).json({
      message: "Admin created successfully",
      adminId: admin._id,
    });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------------------------
   ADMIN → CREATE RECRUITER
---------------------------------------------- */
export const registerRecruiter = async (req, res, next) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res
        .status(403)
        .json({ error: "Only admin can create recruiters" });
    }

    const { name, email, password, dailyDownloadLimit } = req.body;

    if (!name || !email || !password)
      return res.status(400).json({ error: "Name, email, password required" });

    const existingUser = await User.findOne({ email });
    if (existingUser)
      return res.status(400).json({ error: "Email already exists" });

    const hashedPassword = await bcrypt.hash(password, 10);

    const recruiter = await User.create({
      name,
      email,
      password: hashedPassword,
      role: "RECRUITER",
      dailyDownloadLimit:
        dailyDownloadLimit || config.defaultDailyDownloadLimit,
    });

    // Log admin action (optional)
    await ActivityLog.create({
      userId: req.user._id,
      type: "create_recruiter",
      details: {
        recruiterId: recruiter._id,
        name: recruiter.name,
        email: recruiter.email,
        dailyDownloadLimit: recruiter.dailyDownloadLimit,
      },
    });

    res.status(201).json({
      message: "Recruiter created successfully",
      recruiterId: recruiter._id,
    });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------------------------
   LOGIN
---------------------------------------------- */
export const loginController = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password)
      return res.status(400).json({ error: "Email & password required" });

    const user = await User.findOne({ email, active: true });
    if (!user) return res.status(401).json({ error: "Invalid credentials" });

    const validRoles = ["RECRUITER", "ADMIN"];
    if (!validRoles.includes(user.role))
      return res.status(403).json({ error: "Invalid user role" });

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) return res.status(401).json({ error: "Invalid credentials" });

    // Generate token
    const token = jwt.sign(
      { sub: user._id, role: user.role, email: user.email },
      config.jwtSecret,
      { expiresIn: config.jwtExpiresIn }
    );

    // Log recruiter login
    if (user.role === "RECRUITER") {
      await logRecruiterAction(user._id, "login", { ip: req.ip }, user.role);
    }

    return res.json({
      token,
      user: {
        id: user._id,
        name: user.name,
        email: user.email,
        role: user.role,
        active: user.active,
        dailyDownloadLimit: user.dailyDownloadLimit,
      },
    });
  } catch (err) {
    next(err);
  }
};

/* ----------------------------------------------
   LOGOUT
---------------------------------------------- */
export const logoutController = async (req, res, next) => {
  try {
    if (!req.user) {
      return res.status(401).json({ error: "Unauthorized" });
    }

    // Log recruiter logout
    if (req.user.role === "RECRUITER") {
      await logRecruiterAction(
        req.user._id,
        "logout",
        { ip: req.ip },
        req.user.role
      );
    }

    return res.json({ success: true, message: "Logged out successfully" });
  } catch (err) {
    next(err);
  }
};
