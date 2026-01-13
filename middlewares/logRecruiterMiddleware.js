import { logRecruiterAction } from "../utils/logRecruiterAction.js";

export const logAction = (actionName) => {
  return async (req, res, next) => {
    try {
      // Only recruiters
      if (!req.user || req.user.role !== "RECRUITER") {
        return next();
      }

      // Avoid logging the logs page
      if (req.originalUrl.includes("/recruiter/logs")) {
        return next();
      }

       // skip system / background lookups
      if (req.query.noLog === "true") {
        return next();
      }

      await logRecruiterAction(
        req.user._id || req.user.id,
        actionName,
        {
          query: req.query,
          params: req.params,
          body: req.body,
        },
        req.user.role
      );
    } catch (err) {
      console.error("Log error:", err);
    }

    next();
  };
};
