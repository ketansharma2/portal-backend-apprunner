import Candidate from "../models/candidate.model.js";
import { v2 as cloudinary } from "cloudinary";
import fs from "fs";
import { indexCandidate } from "../services/elasticsearch.service.js";
import ActivityLog from "../models/activityLog.model.js";
import { extractTextFromPdfUrl } from "../utils/extractPdfText.js";
import { extractKeywords } from "../utils/keywordExtractor.js";

export const addCandidateManual = async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        message: "PDF file missing",
      });
    }

    // ------------------------------
    // UPLOAD PDF → CLOUDINARY
    // ------------------------------
    const uploaded = await cloudinary.uploader.upload(req.file.path, {
      folder: "candidate_resumes",
      resource_type: "auto",
      format: "pdf",
      public_id: `candidate_${Date.now()}`,
      use_filename: true,
      unique_filename: false,
    });

    // Viewable PDF URL
    const viewUrl = cloudinary.url(uploaded.public_id + ".pdf", {
      resource_type: "image",
      type: "upload",
      secure: true,
    });

    // Remove temp uploaded file
    try {
      fs.unlinkSync(req.file.path);
    } catch (_) {}

    // ------------------------------
    // Helper Functions
    // ------------------------------
    const toArray = (val) => {
      try {
        if (!val) return [];
        if (Array.isArray(val)) return val;
        return JSON.parse(val);
      } catch {
        return val.split(",").map((v) => v.trim());
      }
    };

    const toDate = (val) => {
      const d = new Date(val);
      return isNaN(d.getTime()) ? null : d;
    };

    const safeNumber = (val) => {
      if (!val) return null;
      const cleaned = val.toString().replace(/[^0-9.]/g, "");
      return cleaned ? Number(cleaned) : null;
    };

    const normalizeExperience = (value) => {
      if (!value) return null;
      const cleaned = value.toString().toLowerCase();

      if (cleaned.includes("-")) {
        const first = cleaned.split("-")[0].replace(/[^0-9.]/g, "");
        return first ? Number(first) : null;
      }
      const digits = cleaned.replace(/[^0-9.]/g, "");
      return digits ? Number(digits) : null;
    };

    const parseEducation = (val) => {
      try {
        return val ? JSON.parse(val) : [];
      } catch {
        return [];
      }
    };

    // ------------------------------
    // CANDIDATE DATA
    // ------------------------------
    const unique_id =
      req.body.unique_id ||
      `UID-${Date.now()}-${Math.floor(Math.random() * 9999)}`;

    const data = {
      unique_id,
      name: req.body.name,
      email: req.body.email || null,
      mobile: req.body.mobile || null,
      gender: req.body.gender || null,
      location: req.body.location || null,
      qualification: req.body.qualification || null,

      resumeUrl: viewUrl,
      resumePublicId: uploaded.public_id,

      resumeText: "",
      resumeKeywords: [],

      pdfFile: uploaded.secure_url,

      portal: req.body.portal || null,
      portalDate: toDate(req.body.portalDate),

      experience: normalizeExperience(req.body.experience),
      relevantExp: normalizeExperience(req.body.relevantExp),

      designation: req.body.designation || null,
      recentCompany: req.body.recentCompany || null,

      education: parseEducation(req.body.education),

      applyDate: toDate(req.body.applyDate),
      callingDate: toDate(req.body.callingDate),

      currCTC: safeNumber(req.body.currCTC),
      expCTC: safeNumber(req.body.expCTC),

      topSkills: toArray(req.body.topSkills),
      skillsAll: toArray(req.body.skillsAll),
      companyNamesAll: toArray(req.body.companyNamesAll),

      feedback: req.body.feedback || null,
      remark: req.body.remark || null,
      jdBrief: req.body.jdBrief || null,

      createdBy: req.user?.id || null,
    };

    // ------------------------------
    // SAVE → MONGO
    // ------------------------------
    const saved = await Candidate.create(data);

    // ------------------------------
    // ASYNC RESUME TEXT EXTRACTION
    // ------------------------------
    (async () => {
      try {
        const text = await extractTextFromPdfUrl(saved.pdfFile);
        const keywords = extractKeywords(text);

        await Candidate.findByIdAndUpdate(saved._id, {
          resumeText: text,
          resumeKeywords: keywords,
        });

        await indexCandidate({
          ...saved.toObject(),
          resumeText: text,
          resumeKeywords: keywords,
        });
      } catch (err) {
        console.error("Async resume extraction failed:", err.message);
      }
    })();

    await ActivityLog.create({
      userId: req.user._id,
      type: "add_candidate",
      details: {
        candidateId: saved._id,
        source: "manual",
        name: saved.name,
        email: saved.email,
      },
    });

    // ------------------------------
    // INDEX → ELASTICSEARCH
    // (never block API response)
    // ------------------------------
    indexCandidate(saved).catch((err) => {
      console.error("Elasticsearch indexing failed:", err.message);
    });

    // ------------------------------
    // RESPONSE
    // ------------------------------
    return res.status(201).json({
      success: true,
      message: "Candidate added successfully",
      candidate: saved,
    });
  } catch (err) {
    return res.status(500).json({
      success: false,
      error: "Failed to add candidate",
      reason: err.message,
    });
  }
};
