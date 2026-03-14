import mongoose from "mongoose";

const bulkUploadLogSchema = new mongoose.Schema({
  uploadedBy: { type: mongoose.Schema.Types.ObjectId, ref: "User", required: true },
  fileName: String,
  totalRows: Number,
  successRows: Number,
  failedRows: Number,
  errors: [Object],
  createdAt: { type: Date, default: Date.now },
});

export default mongoose.model("BulkUploadLog", bulkUploadLogSchema);