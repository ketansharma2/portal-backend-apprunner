// controllers/admin.controller.js
import User from "../models/user.model.js";
import DownloadLog from "../models/downloadLog.model.js";
import ActivityLog from "../models/activityLog.model.js";
import Candidate from "../models/candidate.model.js";
import bcrypt from "bcryptjs";

/**
 * List recruiters (admin only)
 */
export const listRecruiters = async (req, res, next) => {
  try {
    const recruiters = await User.find(
      { role: "RECRUITER" },
      "-password"
    ).lean();
    res.json({ recruiters });
  } catch (err) {
    next(err);
  }
};

/**
 * Update recruiter's limit / activate / deactivate
 */
export const updateRecruiter = async (req, res, next) => {
  try {
    const { id } = req.params;

    const user = await User.findById(id);
    if (!user) return res.status(404).json({ error: "Recruiter not found" });

    // Update fields
    if (req.body.name !== undefined) user.name = req.body.name;
    if (req.body.email !== undefined) user.email = req.body.email;

    if (req.body.dailyDownloadLimit !== undefined)
      user.dailyDownloadLimit = req.body.dailyDownloadLimit;

    if (req.body.active !== undefined) user.active = req.body.active;

    // Update password (with hashing)
    if (req.body.password && req.body.password.trim() !== "") {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(req.body.password, salt);
    }

    const updated = await user.save();
    

    return res.json({ recruiter: updated });
  } catch (err) {
    next(err);
  }
};

/**
 * Permanently delete recruiter (ADMIN ONLY)
 */
export const deleteRecruiter = async (req, res, next) => {
  try {
    const { id } = req.params;

    // 1️⃣ Check recruiter exists
    const recruiter = await User.findOne({ _id: id, role: "RECRUITER" });
    if (!recruiter) {
      return res.status(404).json({ error: "Recruiter not found" });
    }

    // 2️⃣ Delete related download logs
    await DownloadLog.deleteMany({ userId: id });

    // 3️⃣ Delete activity logs
    await ActivityLog.deleteMany({ userId: id });

    // 4️⃣ Unassign candidates (DO NOT DELETE candidates)
    await Candidate.updateMany(
      { recruiterId: id },
      { $unset: { recruiterId: "" } }
    );

    // 5️⃣ Delete recruiter account (HARD DELETE)
    await User.findByIdAndDelete(id);

    res.json({
      success: true,
      message: "Recruiter deleted permanently",
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get today's downloads per recruiter (summary)
 */
export const downloadsSummary = async (req, res, next) => {
  try {
    // simple aggregation: count downloads grouped by userId for today
    const start = new Date();
    start.setHours(0, 0, 0, 0);
    const end = new Date();
    end.setHours(23, 59, 59, 999);

    const agg = await DownloadLog.aggregate([
      { $match: { downloadedAt: { $gte: start, $lte: end } } },
      { $group: { _id: "$userId", count: { $sum: 1 } } },
    ]);

    res.json({ summary: agg });
  } catch (err) {
    next(err);
  }
};

/**
 * Advanced Analytics Controller
 */
export const analytics = async (req, res, next) => {
  try {
    const totalCandidates = await Candidate.countDocuments();

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const last7 = new Date();
    last7.setDate(last7.getDate() - 7);

    const todayCount = await Candidate.countDocuments({
      createdAt: { $gte: today },
    });

    const last7Count = await Candidate.countDocuments({
      createdAt: { $gte: last7 },
    });

    // ---------------------------------------
    // LOCATION COUNTS (ALL LOCATIONS)
    // ---------------------------------------
    const locationCounts = await Candidate.aggregate([
      { $match: { location: { $exists: true, $ne: "" } } },
      { $group: { _id: "$location", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ---------------------------------------
    // SKILL COUNTS (ALL SKILLS)
    // ---------------------------------------
    const skillCounts = await Candidate.aggregate([
      { $project: { allSkills: "$skillsAll" } },
      { $unwind: "$allSkills" },
      { $group: { _id: "$allSkills", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ---------------------------------------
    // DESIGNATION COUNTS (ALL TITLES)
    // ---------------------------------------
    const designationCounts = await Candidate.aggregate([
      { $match: { designation: { $exists: true, $ne: "" } } },
      { $group: { _id: "$designation", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ---------------------------------------
// DESIGNATION BY LOCATION (NEW)
// ---------------------------------------
const designationByLocation = await Candidate.aggregate([
  {
    $project: {
      designation: {
        $cond: [
          { $and: [{ $ne: ["$designation", null] }, { $ne: ["$designation", ""] }] },
          "$designation",
          "Unknown",
        ],
      },
      location: {
        $cond: [
          { $and: [{ $ne: ["$location", null] }, { $ne: ["$location", ""] }] },
          {
            $toLower: {
              $trim: {
                input: {
                  $arrayElemAt: [{ $split: ["$location", ","] }, 0],
                },
              },
            },
          },
          "unknown",
        ],
      },
    },
  },
  {
    $group: {
      _id: {
        designation: "$designation",
        location: "$location",
      },
      count: { $sum: 1 },
    },
  },
  {
    $project: {
      _id: 0,
      designation: "$_id.designation",
      location: "$_id.location",
      count: 1,
    },
  },
  { $sort: { designation: 1, count: -1 } },
]);


    // ---------------------------------------
    // COMPANY COUNTS (ALL RECENT COMPANIES)
    // ---------------------------------------
    const companyCounts = await Candidate.aggregate([
      { $match: { recentCompany: { $exists: true, $ne: "" } } },
      { $group: { _id: "$recentCompany", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ---------------------------------------
    // PORTAL COUNTS (ALL SOURCES)
    // ---------------------------------------
    const portalCounts = await Candidate.aggregate([
      { $match: { portal: { $exists: true, $ne: "" } } },
      { $group: { _id: "$portal", count: { $sum: 1 } } },
      { $sort: { count: -1 } },
    ]);

    // ---------------------------------------
    // EXPERIENCE COUNTS (EXACT YEARS)
    // ---------------------------------------
    const experienceCounts = await Candidate.aggregate([
      {
        $addFields: {
          expString: { $toString: "$experience" },
        },
      },
      {
        $addFields: {
          extracted: {
            $regexFind: {
              input: "$expString",
              regex: /([0-9]+(\.[0-9]+)?)/,
            },
          },
        },
      },
      {
        $addFields: {
          parsedExp: {
            $cond: [
              { $gt: ["$extracted", null] },
              { $toDouble: "$extracted.match" },
              null,
            ],
          },
        },
      },
      {
        $addFields: {
          expYear: {
            $cond: [
              { $eq: ["$parsedExp", null] },
              null,
              { $floor: "$parsedExp" },
            ],
          },
        },
      },
      { $match: { expYear: { $ne: null } } },
      {
        $group: {
          _id: "$expYear",
          count: { $sum: 1 },
        },
      },
      { $sort: { _id: 1 } },
    ]);

    // ---------------------------------------
    // FINAL RESPONSE (MOST IMPORTANT PART)
    // ---------------------------------------
    res.json({
      totalCandidates,
      todayCount,
      last7Count,

      locationCounts,
      skillCounts,
      designationCounts,
      designationByLocation,
      companyCounts,
      portalCounts,
      experienceCounts,
    });
  } catch (err) {
    console.error("Analytics error:", err);
    next(err);
  }
};

/**
 * Recruiter download usage (GLOBAL + PER RECRUITER) — TODAY
 */
export const recruiterDownloadUsageToday = async (req, res, next) => {
  try {
    // 1️⃣ Today time window
    const start = new Date();
    start.setHours(0, 0, 0, 0);

    const end = new Date();
    end.setHours(23, 59, 59, 999);

    // 2️⃣ Aggregate downloads per recruiter (today)
    const usageAgg = await DownloadLog.aggregate([
      {
        $match: {
          downloadedAt: { $gte: start, $lte: end },
        },
      },
      {
        $group: {
          _id: "$userId",
          usedToday: { $sum: 1 },
        },
      },
    ]);

    // Convert to map for fast lookup
    const usageMap = {};
    usageAgg.forEach((u) => {
      usageMap[u._id.toString()] = u.usedToday;
    });

    // 3️⃣ Fetch recruiters
    const recruiters = await User.find(
      { role: "RECRUITER" },
      "name email dailyDownloadLimit active"
    ).lean();

    let globalUsed = 0;
    let globalLimit = 0;

    // 4️⃣ Merge recruiter + usage
    const recruiterUsage = recruiters.map((r) => {
      const usedToday = usageMap[r._id.toString()] || 0;
      const limit = r.dailyDownloadLimit || 0;

      globalUsed += usedToday;
      globalLimit += limit;

      return {
        recruiterId: r._id,
        name: r.name,
        email: r.email,
        active: r.active,
        dailyLimit: limit,
        usedToday,
        remainingToday: Math.max(limit - usedToday, 0),
      };
    });

    // 5️⃣ Final response
    res.json({
      global: {
        totalLimit: globalLimit,
        usedToday: globalUsed,
        remainingToday: Math.max(globalLimit - globalUsed, 0),
      },
      recruiters: recruiterUsage,
      date: start.toISOString().slice(0, 10),
    });
  } catch (err) {
    next(err);
  }
};
