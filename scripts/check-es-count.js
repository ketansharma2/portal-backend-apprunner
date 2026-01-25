// scripts/check-es-count.js
import client, { ES_INDEX } from "../services/elasticsearch.service.js";

(async () => {
  try {
    const response = await client.count({ index: ES_INDEX });
    console.log(`Indexed candidates in ES: ${response.count}`);
  } catch (err) {
    console.error("Error getting count:", err.message);
  }
  process.exit(0);
})();