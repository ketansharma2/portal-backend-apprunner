// controllers/download.controller.js
import DownloadLog from "../models/downloadLog.model.js";
import Candidate from "../models/candidate.model.js";
import ActivityLog from "../models/activityLog.model.js";
import config from "../config/index.js";
import { startOfDayUTC, endOfDayUTC } from "../utils/dateUtils.js";

/**
 * Handle resume download: check limit, record download, return resume URL
 */
export const downloadResume = async (req, res, next) => {
  try {
    const candidateId = req.params.id;
    const candidate = await Candidate.findById(candidateId);

    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const user = req.user;

    // Count today's downloads
    const todayStart = startOfDayUTC();
    const todayEnd = endOfDayUTC();

    const todayCount = await DownloadLog.countDocuments({
      userId: user._id,
      downloadedAt: { $gte: todayStart, $lte: todayEnd },
    });

    const limit = user.dailyDownloadLimit || config.defaultDailyDownloadLimit;

    if (todayCount >= limit) {
      return res.status(403).json({ error: "Daily download limit exceeded" });
    }

    // Log download
    await DownloadLog.create({
      userId: user._id,
      candidateId: candidate._id,
      ip: req.ip,
    });

    await ActivityLog.create({
      userId: user._id,
      type: "resume_download",
      payload: { candidateId: candidate._id },
    });

    // Return the correct resume URL
    const resumeUrl =
      candidate.pdfFile || // Cloudinary manual upload
      candidate.resumeUrl || // Auto parsing upload
      null;

    if (!resumeUrl) {
      return res.status(400).json({ error: "Candidate resume not available" });
    }

    return res.json({
      success: true,
      resumeUrl,
      downloadsToday: todayCount + 1,
      limit,
    });
  } catch (err) {
    next(err);
  }
};
