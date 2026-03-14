import mongoose from "mongoose";
import Candidate from "../models/candidate.model.js";
import { indexCandidate } from "../services/elasticsearch.service.js";
import dotenv from "dotenv";

dotenv.config();

(async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);

    const candidates = await Candidate.find({
      resumeKeywords: { $exists: true, $ne: [] },
    });

    console.log("Reindexing:", candidates.length, "candidates");

    for (const c of candidates) {
      await indexCandidate(c);
      console.log("Indexed:", c.name);
    }

    console.log("Reindex completed");
    process.exit(0);
  } catch (err) {
    console.error("Reindex failed:", err);
    process.exit(1);
  }
})();
