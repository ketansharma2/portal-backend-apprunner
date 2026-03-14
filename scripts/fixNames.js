import mongoose from "mongoose";
import Candidate from "../models/candidate.model.js";
import dotenv from "dotenv";

dotenv.config();

/**
 * Normalize name fields for all candidates
 */
const normalizeName = (c) => {
  const fullName =
    (c.fullName && c.fullName.trim()) ||
    (c.name && c.name.trim()) ||
    ((c.firstName && c.lastName) ? `${c.firstName} ${c.lastName}` : null) ||
    "Unknown";

  return fullName;
};

const start = async () => {
  await mongoose.connect(process.env.MONGO_URI);
  console.log("Connected to MongoDB");

  const candidates = await Candidate.find({});
  console.log("Total candidates:", candidates.length);

  for (const c of candidates) {
    const fullName = normalizeName(c);

    await Candidate.updateOne(
      { _id: c._id },
      { $set: { fullName, name: fullName } }
    );

    console.log(`Updated candidate ${c._id} → ${fullName}`);
  }

  console.log("All names normalized.");
  process.exit(0);
};

start().catch((err) => {
  console.error(err);
  process.exit(1);
});
