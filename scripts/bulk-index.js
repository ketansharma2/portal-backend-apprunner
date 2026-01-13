// scripts/bulk-index.js
import Candidate from "../models/candidate.model.js";
import {
  indexCandidate,
  ensureIndex,
} from "../services/elasticsearch.service.js";

const BULK = 300;

const bulkIndex = async () => {
  console.log("🚀 Starting bulk index…");

  await ensureIndex();

  const total = await Candidate.countDocuments();
  console.log(`📌 Total candidates: ${total}`);

  let processed = 0;

  while (processed < total) {
    const batch = await Candidate.find({})
      .skip(processed)
      .limit(BULK);

    console.log(`📦 Indexing ${processed} → ${processed + batch.length}`);

    for (const c of batch) {
      const resolvedName =
        c.fullName ||
        c.name ||
        c.candidateName ||
        `${c.firstName || ""} ${c.lastName || ""}`.trim();

      console.log(
        "Indexing:",
        c._id.toString(),
        "resolvedName:",
        resolvedName
      );

      await indexCandidate(c);
    }

    processed += batch.length;
  }

  console.log("✅ Bulk indexing completed.");
};

export default bulkIndex;
