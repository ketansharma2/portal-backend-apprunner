// config/index.js
import dotenv from "dotenv";
dotenv.config();

const config = {
  port: process.env.PORT || 3000,
  mongoUri: process.env.MONGO_URI,
  jwtSecret: process.env.JWT_SECRET || "change_this_secret",
  jwtExpiresIn: process.env.JWT_EXPIRES_IN || "1d",
  rateLimitMax: parseInt(process.env.RATE_LIMIT_MAX || "300", 10),
  esNode: process.env.ELASTICSEARCH_NODE || "http://localhost:9200",
  esPassword: process.env.ELASTICSEARCH_PASSWORD,
  defaultDailyDownloadLimit: parseInt(process.env.DAILY_DOWNLOAD_LIMIT || "10", 10),
  frontendUrl: process.env.FRONTEND_URL || "*",
};

export default config;