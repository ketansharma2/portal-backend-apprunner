// services/candidate.service.js
import Candidate from "../models/candidate.model.js";
import { indexCandidate } from "./elasticsearch.service.js";

/**
 * Normalize candidate name fields
 */
const normalizeName = (data) => {
  const fullName =
    data.fullName?.trim() ||
    data.name?.trim() ||
    data.Name?.trim() ||
    "";

  const name = fullName; // keep name & fullName identical everywhere

  return { fullName, name };
};

/**
 * UPSERT CANDIDATE (Create or Update)
 */
export const upsertCandidate = async (data) => {
  // FIX: Normalize name
  const { fullName, name } = normalizeName(data);

  // Apply normalized fields
  const normalizedData = {
    ...data,
    fullName,
    name,
    updatedAt: new Date(),
  };

  const filter = { unique_id: normalizedData.unique_id };
  const update = { $set: normalizedData };
  const options = { new: true, upsert: true };

  const candidate = await Candidate.findOneAndUpdate(filter, update, options);

  // Index to ElasticSearch (non-blocking)
  indexCandidate(candidate).catch((err) => {
    console.error("ES Index Error:", err?.message);
  });

  return candidate;
};

/**
 * GET CANDIDATE BY ID
 */
export const getCandidateById = async (id) => {
  return Candidate.findById(id);
};
