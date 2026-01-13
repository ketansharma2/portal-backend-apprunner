import RecruiterLog from "../models/RecruiterLog.js";

export const logRecruiterAction = async (
  recruiterId,
  action,
  details = {},
  role
) => {
  try {
    if (role !== "RECRUITER") return;

    await RecruiterLog.create({
      recruiterId,
      action,
      details,
    });
  } catch (err) {
    console.error("Failed to write log:", err);
  }
};
