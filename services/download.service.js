import DownloadLog from "../models/downloadLog.model.js";
import User from "../models/user.model.js";
import config from "../config/index.js";
import { startOfDayUTC, endOfDayUTC } from "../utils/dateUtils.js";

/**
 * Check if recruiter can download more resumes today
 */
export const canDownloadResume = async (userId) => {
  const user = await User.findById(userId);
  if (!user) throw new Error("User not found");

  // Use UTC boundaries
  const todayStart = startOfDayUTC();
  const todayEnd = endOfDayUTC();

  // Count today's downloads
  const count = await DownloadLog.countDocuments({
    userId,
    downloadedAt: { $gte: todayStart, $lte: todayEnd },
  });

  // FIX: Use fallback from config
  const limit = user.dailyDownloadLimit ?? config.defaultDailyDownloadLimit;

  return count < limit;
};


/**
 * Log the download action
 */
export const logDownload = async (userId, candidateId) => {
  await DownloadLog.create({
    userId,
    candidateId,
    downloadedAt: new Date(), // ISO UTC timestamp
  });
};
