// services/elasticsearch.service.js
import dotenv from "dotenv";
dotenv.config();
import { Client } from "@elastic/elasticsearch";
import logger from "../config/logger.js";

/* ----------------------- LOG WRAPPER ----------------------- */
const log = {
  info: (...a) => console.log("[ES INFO]", ...a),
  error: (...a) => console.error("[ES ERROR]", ...a),
};

/* ----------------------- CLIENT INIT ----------------------- */
const client = new Client({
  node: process.env.ELASTICSEARCH_NODE,
  auth: { apiKey: process.env.ELASTICSEARCH_API_KEY },
  tls: { rejectUnauthorized: false },
});

export const ES_INDEX = process.env.ES_INDEX || "candidates";

/* ------------------------------------------------------------
   CREATE INDEX — FIXED FOR ELASTIC CLOUD
------------------------------------------------------------- */
export const ensureIndex = async () => {
  try {
    const exists = await client.indices.exists({ index: ES_INDEX });
    if (exists) return;

    await client.indices.create({
      index: ES_INDEX,
      settings: {
        analysis: {
          analyzer: {
            ngram_analyzer: {
              type: "custom",
              tokenizer: "ngram_tokenizer",
              filter: ["lowercase"],
            },
          },
          tokenizer: {
            ngram_tokenizer: {
              type: "ngram",
              min_gram: 2,
              max_gram: 3,
              token_chars: ["letter", "digit"],
            },
          },
        },
      },

      mappings: {
        properties: {
          candidateId: { type: "keyword" },

          name: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
              ngram: { type: "text", analyzer: "ngram_analyzer" },
            },
          },

          designation: { type: "text" },
          skills: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
              ngram: {
                type: "text",
                analyzer: "ngram_analyzer",
              },
            },
          },

          topSkills: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
              ngram: {
                type: "text",
                analyzer: "ngram_analyzer",
              },
            },
          },

          resumeText: {
            type: "text",
            analyzer: "standard",
          },

          resumeKeywords: {
            type: "keyword",
          },

          recentCompany: { type: "text" },
          companyNamesAll: { type: "keyword" },

          location: {
            type: "text",
            fields: {
              keyword: { type: "keyword" },
              ngram: { type: "text", analyzer: "ngram_analyzer" },
            },
          },

          experience: { type: "float" },
          ctcCurrent: { type: "float" },
          ctcExpected: { type: "float" },

          portal: { type: "keyword" },
          portalDate: { type: "date" },
          applyDate: { type: "date" },
        },
      },
    });

    log.info(`[ES] Index '${ES_INDEX}' created successfully`);
  } catch (err) {
    log.error("ensureIndex error:", err);
  }
};

/* ------------------- HELPERS ------------------- */
const parseExperience = (value) => {
  if (value === undefined || value === null) return 0;

  const cleaned = String(value).replace(/[^0-9.]/g, "");
  if (!cleaned) return 0;

  return Number(cleaned);
};

const toArray = (v) => (Array.isArray(v) ? v : v ? [String(v)] : []);

/* ------------------- INDEX CANDIDATE ------------------- */
export const indexCandidate = async (candidate) => {
  try {
    const id = candidate._id.toString();

    const resolvedName =
      candidate.fullName?.trim() ||
      candidate.name?.trim() ||
      candidate.candidateName?.trim() ||
      `${candidate.firstName || ""} ${candidate.lastName || ""}`.trim() ||
      null;

    const finalName = resolvedName === "Unknown" ? null : resolvedName;

    const body = {
      candidateId: id,
      name: finalName,

      designation: candidate.designation || "",
      topSkills: toArray(candidate.topSkills),
      skills: toArray(candidate.skills || candidate.skillsAll),

      recentCompany: candidate.recentCompany || "",
      companyNamesAll: toArray(candidate.companyNamesAll),

      resumeText: candidate.resumeText || "",
      resumeKeywords: candidate.resumeKeywords || [],

      location: (candidate.location || "").trim(),

      experience: parseExperience(candidate.experience),

      ctcCurrent: Number(candidate.currCTC || 0),
      ctcExpected: Number(candidate.expCTC || 0),

      portal: candidate.portal || "",
      portalDate: candidate.portalDate || null,
      applyDate: candidate.applyDate || null,
    };

    await client.index({
      index: ES_INDEX,
      id,
      body,
      refresh: true,
    });

    log.info("Indexed candidate:", id, "name:", finalName);
  } catch (err) {
    log.error("indexCandidate error:", err?.message);
  }
};

/* ---------------------------------------------------------
   HYBRID SEARCH QUERY (Exact + Phrase + Match + Ngram + Fuzzy)
--------------------------------------------------------- */
export const buildHybridSearchQuery = (q, filters = {}) => {
  const { minExp = null, maxExp = null, keywords = [] } = filters;
  let must = [];
  let should = [];
  let filter = [];

  /* ---------------------------------------------------------
     1) NAME SEARCH (Exact + Phrase + Fuzzy)
  --------------------------------------------------------- */
  if (q) {
    should.push(
      /* EXACT match */
      {
        term: {
          "name.keyword": {
            value: q,
            boost: 25,
          },
        },
      },

      /* PHRASE match */
      {
        match_phrase: {
          name: {
            query: q,
            boost: 15,
          },
        },
      },

      /* SAFE FUZZY (VERY controlled):
       - fuzziness: 1 → max one typo
       - prefix_length: 2 → first 2 letters must match
       Example:
         "rahul" → matches "rahool" but NOT "sahul"
    */
      {
        match: {
          name: {
            query: q,
            fuzziness: 1,
            prefix_length: 2,
            max_expansions: 5,
            boost: 8,
          },
        },
      }

      /* NGRAM (soft boost, DOES NOT override exact/fuzzy)
       Useful for partials: "rah" → Rahul
       But NOT strong enough to match "Sahul"
    */
      // {
      //   match: {
      //     "name.ngram": {
      //       query: q,
      //       boost: 3,
      //     },
      //   },
      // }
    );
  }

  /* ---------------------------------------------------------
     2) DESIGNATION SEARCH
  --------------------------------------------------------- */
  if (q) {
    should.push(
      { match_phrase: { designation: { query: q, boost: 15 } } },

      { match: { designation: { query: q, operator: "and", boost: 8 } } },

      { match: { "designation.ngram": { query: q, boost: 4 } } }
    );
  }

  /* ---------------------------------------------------------
     3) SKILLS & TOPSKILLS SEARCH
  --------------------------------------------------------- */
  if (q) {
    should.push(
      { term: { "skills.keyword": { value: q, boost: 15 } } },
      { term: { "topSkills.keyword": { value: q, boost: 15 } } },

      { match: { skills: { query: q, fuzziness: "AUTO", boost: 7 } } },
      { match: { topSkills: { query: q, fuzziness: "AUTO", boost: 7 } } }
    );
  }

  /* ---------------------------------------------------------
     4) COMPANY SEARCH
  --------------------------------------------------------- */
  if (q) {
    should.push(
      { match_phrase: { recentCompany: { query: q, boost: 12 } } },

      { match: { recentCompany: { query: q, fuzziness: 1, boost: 6 } } },

      { term: { "companyNamesAll.keyword": { value: q, boost: 10 } } },

      { match: { companyNamesAll: { query: q, fuzziness: "AUTO", boost: 5 } } }
    );
  }

  /* ---------------------------------------------------------
     EXPERIENCE FILTER
  --------------------------------------------------------- */
  /* EXPERIENCE FILTER */

  if (minExp !== null && maxExp !== null) {
    filter.push({
      range: { experience: { gte: minExp, lte: maxExp } },
    });
  } else if (minExp !== null) {
    filter.push({
      range: { experience: { gte: minExp } },
    });
  } else if (maxExp !== null) {
    filter.push({
      range: { experience: { lte: maxExp } },
    });
  }

  /* ---------------------------------------------------------
     DESIGNATION FILTER
  --------------------------------------------------------- */
  if (filters.designation) {
    filter.push({ match_phrase: { designation: filters.designation } });
  }

  /* ---------------------------------------------------------
     SKILLS FILTER
  --------------------------------------------------------- */
  if (filters.skills && filters.skills.length > 0) {
    filter.push({
      terms: { skills: filters.skills.map((s) => s.toLowerCase()) },
    });
  }

  /* ---------------------------------------------------------
   5) RESUME KEYWORDS SEARCH (PDF CONTENT)
--------------------------------------------------------- */
  if (keywords && keywords.length > 0) {
    keywords
      .flatMap((k) => k.toLowerCase().split(/\s+/))
      .forEach((kw) => {
        should.push(
          // Exact extracted keyword match
          {
            term: {
              resumeKeywords: {
                value: kw,
                boost: 20,
              },
            },
          },

          // Full resume text match
          {
            match: {
              resumeText: {
                query: kw,
                boost: 10,
              },
            },
          }
        );
      });
  }

  return {
    query: {
      bool: {
        must,
        should,
        filter,
        minimum_should_match: should.length > 0 ? 1 : 0,
      },
    },
  };
};

/* ------------------- SEARCH WRAPPER ------------------- */
export const searchCandidatesES = async (queryBody, from = 0, size = 20) => {
  try {
    return await client.search({
      index: ES_INDEX,
      from,
      size,
      body: queryBody,
    });
  } catch (err) {
    log.error("searchCandidatesES error:", err.meta?.body?.error || err);
    throw err;
  }
};

/* ------------------- SEARCH WRAPPER ------------------- */
// export const searchCandidatesES = async (queryBody, from = 0, size = 20) => {
//   try {
//     return await client.search({
//       index: ES_INDEX,
//       from,
//       size,
//       body: queryBody,
//     });
//   } catch (err) {
//     log.error("searchCandidatesES error:", err.meta?.body?.error || err);
//     throw err;
//   }
// };

/* ------------------- CONNECTION TEST ------------------- */
export const testESConnection = async () => {
  try {
    const info = await client.info();
    log.info("Connected to ES:", info.version.number);
  } catch (err) {
    log.error("Connection failed:", err?.message || err);
    throw err;
  }
};

export default client;
