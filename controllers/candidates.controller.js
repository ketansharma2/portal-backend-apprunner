import Candidate from "../models/candidate.model.js";
import ActivityLog from "../models/activityLog.model.js";
import { upsertCandidate } from "../services/candidate.service.js";
import {
  searchCandidatesES,
  buildHybridSearchQuery,
  ES_INDEX,
  indexCandidate,
} from "../services/elasticsearch.service.js";
import client from "../services/elasticsearch.service.js";
import logger from "../config/logger.js";
import {
  canDownloadResume,
  logDownload,
} from "../services/download.service.js";
import { logAction } from "../middlewares/logRecruiterMiddleware.js";

/* -------------------------------------------------------
   ADD / UPDATE CANDIDATE (MANUAL ENTRY)
------------------------------------------------------- */
export const addOrUpdateCandidate = async (req, res, next) => {
  try {
    const required = ["unique_id", "name", "resumeUrl"];
    for (const f of required) {
      if (!req.body[f]) {
        return res.status(400).json({ error: `${f} is required` });
      }
    }

    const candidate = await upsertCandidate(req.body);

    // index into ES
    await indexCandidate(candidate);

    await ActivityLog.create({
      userId: req.user._id,
      type: "ADD_CANDIDATE",
      payload: { candidateId: candidate._id },
    });

    res.json({ success: true, candidate });
  } catch (err) {
    logger.error("addOrUpdateCandidate error:", err);
    next(err);
  }
};

/* -------------------------------------------------------
   GET ONE CANDIDATE
------------------------------------------------------- */
export const getCandidate = async (req, res, next) => {
  try {
    const id = req.params.id;
    const c = await Candidate.findById(id);

    if (!c) return res.status(404).json({ error: "Not found" });

    // LOG ONLY AFTER SUCCESS
    await logAction("view_candidate")(req, res, () => {});

    res.json(c);
  } catch (err) {
    logger.error("getCandidate error:", err);
    next(err);
  }
};

/* -------------------------------------------------------
   SEARCH CANDIDATES (FULL HYBRID SEARCH + FILTERS)
------------------------------------------------------- */
export const searchCandidates = async (req, res, next) => {
  try {
    const q = req.query.q?.trim() || null;
    const location = req.query.location?.trim()?.toLowerCase() || null;
    const designation = req.query.designation?.trim() || null;

    /* FIX — read both skills and skills[] */
    let rawSkills = req.query.skills || req.query["skills[]"] || [];
    const skills = Array.isArray(rawSkills) ? rawSkills : [rawSkills];

    const minExp =
      req.query.minExp !== undefined ? Number(req.query.minExp) : null;
    const maxExp =
      req.query.maxExp !== undefined ? Number(req.query.maxExp) : null;

    const page = Number(req.query.page || 1);
    const size = Number(req.query.size || 20);
    const from = (page - 1) * size;

    // 1️⃣ READ KEYWORDS
    let rawKeywords = req.query.keywords || req.query["keywords[]"] || [];
    const keywords = Array.isArray(rawKeywords)
      ? rawKeywords
      : rawKeywords
      ? [rawKeywords]
      : [];

    // 2️⃣ EMPTY SEARCH CHECK
    if (
      !q &&
      keywords.length === 0 &&
      !location &&
      !designation &&
      skills.length === 0 &&
      minExp === null &&
      maxExp === null
    ) {
      return res.json({ total: 0, page, size, results: [] });
    }

    // 3️⃣ BUILD QUERY CORRECTLY
    let esQuery =
      q || keywords.length > 0
        ? buildHybridSearchQuery(q, {
            keywords,
            minExp,
            maxExp,
            designation,
            skills,
          })
        : { query: { bool: { must: [], filter: [] } } };

    if (!esQuery.query.bool.must) esQuery.query.bool.must = [];
    if (!esQuery.query.bool.filter) esQuery.query.bool.filter = [];

    /* ---------------------------------------------
       LOCATION FILTER (STRONG + CASE-SAFE)
    --------------------------------------------- */
    if (location) {
      esQuery.query.bool.filter.push({
        bool: {
          should: [
            // exact match
            { term: { "location.keyword": location } },

            // phrase match (Panipat)
            {
              match_phrase: {
                location: {
                  query: location,
                  slop: 0,
                },
              },
            },

            // matches "... Panipat"
            {
              wildcard: {
                location: `* ${location}`,
              },
            },

            // matches "Panipat ..."
            {
              wildcard: {
                location: `${location} *`,
              },
            },

            // matches anywhere (Panipat inside long address)
            {
              wildcard: {
                location: `*${location}*`,
              },
            },
          ],
          minimum_should_match: 1,
        },
      });
    }

    /* ---------------------------------------------
       DESIGNATION FILTER
    --------------------------------------------- */
    if (designation) {
      esQuery.query.bool.filter.push({
        match_phrase: { designation },
      });
    }

    /* ---------------------------------------------
   SKILLS FILTER (WORKS FOR skills[] + topSkills[])
--------------------------------------------- */
    if (skills.length > 0) {
      const normalizedSkills = skills.map((s) => s.trim().toLowerCase());

      esQuery.query.bool.filter.push({
        bool: {
          must: normalizedSkills.map((s) => ({
            bool: {
              should: [
                {
                  match_phrase: {
                    skills: {
                      query: s,
                    },
                  },
                },
                {
                  match_phrase: {
                    topSkills: {
                      query: s,
                    },
                  },
                },
              ],
              minimum_should_match: 1,
            },
          })),
        },
      });
    }

    /* ---------------------------------------------
       EXPERIENCE RANGE FILTER (CORRECT)
    --------------------------------------------- */

    if (minExp !== null && maxExp !== null) {
      esQuery.query.bool.filter.push({
        range: {
          experience: { gte: minExp, lte: maxExp },
        },
      });
    } else if (minExp !== null) {
      esQuery.query.bool.filter.push({
        range: {
          experience: { gte: minExp },
        },
      });
    } else if (maxExp !== null) {
      esQuery.query.bool.filter.push({
        bool: {
          should: [
            { range: { experience: { lte: maxExp } } },

            // include 0-experience people (experience null)
            { bool: { must_not: { exists: { field: "experience" } } } },
          ],
          minimum_should_match: 1,
        },
      });
    }

    /* ---------------------------------------------
       EXECUTE SEARCH
    --------------------------------------------- */
    const response = await client.search({
      index: ES_INDEX,
      from,
      size,
      body: esQuery,
    });

    return res.json({
      total: response.hits.total.value,
      page,
      size,
      results: response.hits.hits.map((h) => ({
        id: h._id,
        score: h._score,
        source: h._source,
      })),
    });
  } catch (err) {
    console.error("Search Error:", err.meta?.body?.error || err);
    next(err);
  }
};

/* -------------------------------------------------------
   UPDATE FEEDBACK
------------------------------------------------------- */
/* -------------------------------------------------------
   UPDATE FEEDBACK + ADD REMARK ENTRY
------------------------------------------------------- */
export const updateFeedback = async (req, res, next) => {
  try {
    const id = req.params.id;
    const { feedback, remark } = req.body;

    // If remark is provided, push it into the remarks[] array
    let updateQuery = { $set: { updatedAt: new Date() } };

    if (feedback !== undefined) {
      updateQuery.$set.feedback = feedback;
    }

    if (remark) {
      updateQuery.$push = { remarks: remark };
    }

    const updated = await Candidate.findByIdAndUpdate(id, updateQuery, {
      new: true,
    });

    if (!updated) return res.status(404).json({ error: "Candidate not found" });

    return res.json({ success: true, candidate: updated });
  } catch (err) {
    logger.error("updateFeedback error:", err);
    next(err);
  }
};

/* -------------------------------------------------------
   RESUME PREVIEW (NO LIMIT, NO LOG)
------------------------------------------------------- */
export const viewResume = async (req, res, next) => {
  try {
    const { id } = req.params;

    const candidate = await Candidate.findById(id).lean();
    if (!candidate)
      return res.status(404).json({ error: "Candidate not found" });

    const resumeUrl = candidate.pdfFile || candidate.resumeUrl;
    if (!resumeUrl) return res.status(404).json({ error: "Resume not found" });

    // ✅ Preview mode → NO LIMIT CHECK, NO LOGGING
    return res.json({
      resumeUrl,
      preview: true,
    });
  } catch (err) {
    next(err);
  }
};
