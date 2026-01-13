// middlewares/auth.middleware.js
import jwt from "jsonwebtoken";
import config from "../config/index.js";
import User from "../models/user.model.js";

export const authMiddleware = (roles = []) => {
  // roles can be empty (all authenticated) or array of roles
  return async (req, res, next) => {
    try {
      const authHeader = req.headers.authorization;
      if (!authHeader || !authHeader.startsWith("Bearer ")) {
        return res.status(401).json({ error: "No token provided" });
      }
      const token = authHeader.split(" ")[1];
      const payload = jwt.verify(token, config.jwtSecret);
      const user = await User.findById(payload.sub);
      if (!user || !user.active) return res.status(403).json({ error: "Access denied" });

      if (Array.isArray(roles) && roles.length > 0 && !roles.includes(user.role)) {
        return res.status(403).json({ error: "Insufficient permissions" });
      }

      req.user = user;
      next();
    } catch (err) {
      next(err);
    }
  };
};