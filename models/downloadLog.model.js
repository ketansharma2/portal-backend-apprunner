import mongoose from "mongoose";

const downloadLogSchema = new mongoose.Schema({
  userId: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  candidateId: { type: mongoose.Schema.Types.ObjectId, ref: "Candidate", required: true },
  downloadedAt: { type: Date, default: Date.now },
});

export default mongoose.model("DownloadLog", downloadLogSchema);