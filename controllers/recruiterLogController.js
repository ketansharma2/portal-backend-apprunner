import RecruiterLog from "../models/RecruiterLog.js";

export const getRecruiterLogs = async (req, res) => {
  try {
    const userId = req.user._id || req.user.id;

    let logs;

    if (req.user.role === "ADMIN") {
      logs = await RecruiterLog.find()
        .populate("recruiterId", "email name")
        .sort({ createdAt: -1 })
        .limit(500);
    } else {
      logs = await RecruiterLog.find({ recruiterId: userId })
        .populate("recruiterId", "email name")
        .sort({ createdAt: -1 })
        .limit(200);
    }

    return res.json({ logs });
  } catch (err) {
    console.error("Error fetching recruiter logs:", err);
    return res.status(500).json({ error: "Failed to fetch recruiter logs" });
  }
};
