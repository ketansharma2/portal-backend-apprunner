import mongoose from "mongoose";

const RecruiterLogSchema = new mongoose.Schema(
  {
    recruiterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User", // must match your actual User model
      required: true,
    },
    action: { type: String, required: true },
    details: { type: Object, default: {} },
  },
  { timestamps: true }
);

// Fast fetch
RecruiterLogSchema.index({ recruiterId: 1, createdAt: -1 });

export default mongoose.model("RecruiterLog", RecruiterLogSchema);
