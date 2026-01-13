// scripts/runOnce.js
import fs from "fs";
import path from "path";
import bulkIndex from "./bulk-index.js";

const flagPath = path.join("scripts", "indexed.flag");

const runOnce = async () => {
  if (fs.existsSync(flagPath)) {
    console.log("⛷️ Bulk index already executed → skipping.");
    return;
  }

  console.log("🚀 Running first-time bulk index…");

  await bulkIndex();

  fs.writeFileSync(flagPath, "done");

  console.log("✅ Bulk index complete + flag saved.");
};

export default runOnce;
