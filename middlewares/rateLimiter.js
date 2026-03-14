// middlewares/rateLimiter.js
import rateLimit from "express-rate-limit";
import config from "../config/index.js";

export const limiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: config.rateLimitMax,
  message: { error: "Too many requests, try again later." },
});