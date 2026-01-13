import ActivityLog from "../models/activityLog.model.js";

export const getAdminUploadLogs = async (req, res) => {
  try {
    if (req.user.role !== "ADMIN") {
      return res.status(403).json({ error: "Access denied" });
    }

    const logs = await ActivityLog.find({
      userId: req.user._id,
      type: { $in: ["add_candidate", "BULK_UPLOAD", "create_recruiter"] },
    })
      .populate("userId", "name email role")
      .sort({ createdAt: -1 })
      .limit(500);

    return res.json({
      logs: logs.map((l) => ({
        _id: l._id,
        action: l.type.toLowerCase(), // 🔥 normalize
        details: l.details,
        createdAt: l.createdAt,
        adminId: l.userId, // 🔥 frontend-friendly
      })),
    });
  } catch (err) {
    console.error("Admin upload logs error:", err);
    return res.status(500).json({ error: "Failed to fetch upload logs" });
  }
};
