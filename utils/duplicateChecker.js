// utils/duplicateChecker.js
import Candidate from "../models/candidate.model.js";

export const checkDuplicateCandidate = async ({ email, unique_id, phone }) => {
  const query = {
    $or: [
      email ? { email } : null,
      unique_id ? { unique_id } : null,
      phone ? { phone } : null,
    ].filter(Boolean),
  };

  if (query.$or.length === 0) return null;

  return await Candidate.findOne(query).select("_id email unique_id phone");
};
