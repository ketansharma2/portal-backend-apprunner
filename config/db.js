import mongoose from "mongoose";
import logger from "./logger.js";

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI, {
      serverSelectionTimeoutMS: 5000, // optional, avoids long waits
    });

    logger.info("MongoDB connected successfully");
  } catch (err) {
    logger.error("MongoDB connection error:", err);
    process.exit(1); // stop server if DB is not connected
  }
};

export default connectDB;