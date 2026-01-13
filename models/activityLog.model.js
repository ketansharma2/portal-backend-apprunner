// models/activityLog.model.js
import mongoose from "mongoose";

const ActivityLogSchema = new mongoose.Schema({
  userId: {
    type: mongoose.Schema.Types.ObjectId,
    ref: "User",
    required: true,
  },

  type: {
    type: String,
    enum: [
      "search_candidates",
      "view_candidate",
      "resume_download",
      "update_remark",
      "add_candidate",
      "login",
      "logout",
      "BULK_UPLOAD",
      "create_recruiter",
      "resume_view",
    ],
    required: true,
  },

  details: {
    type: Object,
    default: {},
  },

  createdAt: {
    type: Date,
    default: Date.now,
  },
});

export default mongoose.model("ActivityLog", ActivityLogSchema);
