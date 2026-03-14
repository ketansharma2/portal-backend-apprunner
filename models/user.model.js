import mongoose from "mongoose";

const userSchema = new mongoose.Schema({
  name: { type: String, required: true },
  email: { type: String, required: true, unique: true },
  password: { type: String, required: true },
  role: { type: String, enum: ["ADMIN", "RECRUITER"], default: "RECRUITER" },
  active: { type: Boolean, default: true },
  dailyDownloadLimit: { type: Number, default: process.env.DAILY_DOWNLOAD_LIMIT },
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("User", userSchema);