// services/auth.service.js
import User from "../models/user.model.js";
import bcrypt from "bcryptjs";

export const createAdminIfNone = async ({ name, email, password }) => {
  const existing = await User.findOne({ role: "ADMIN" });
  if (existing) throw new Error("Admin already exists");
  const hashed = await bcrypt.hash(password, 10);
  const admin = await User.create({ name, email, password: hashed, role: "ADMIN" });
  return admin;
};

export const createRecruiter = async ({ name, email, password, dailyDownloadLimit }) => {
  const existing = await User.findOne({ email });
  if (existing) throw new Error("Email already exists");
  const hashed = await bcrypt.hash(password, 10);
  const r = await User.create({ name, email, password: hashed, role: "RECRUITER", dailyDownloadLimit });
  return r;
};