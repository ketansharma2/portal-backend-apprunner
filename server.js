import 'dotenv/config';
import app from "./app.js";
import connectDB from "./config/db.js";
import { testESConnection, ensureIndex } from "./services/elasticsearch.service.js";
import runOnce from "./scripts/runOnce.js";



// dotenv.config();
const PORT = process.env.PORT || 3000;

const startServer = async () => {
  try {
    // Connect MongoDB
    await connectDB();
    console.log(`\n✅ MongoDB connected`);

    // Test Elasticsearch (wrapped in try-catch to allow server to start even if ES fails)
    try {
      await testESConnection();
      // Ensure ES index exists
      await ensureIndex();
      // Run bulk index ONCE only
      await runOnce();
    } catch (esErr) {
      console.warn("⚠️ OpenSearch connection failed, continuing without ES:", esErr.message);
    }

    // Start Express
    app.listen(PORT, () => {
      console.log(`\n🚀 Server running at Port : ${PORT}\n`);
    });

  } catch (err) {
    console.error("❌ Server startup error:", err);
    process.exit(1);
  }
};

startServer();
