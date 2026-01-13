// controllers/bulk.controller.js
import multer from "multer";
import { parseCSVBuffer, parseXLSXBuffer } from "../utils/csvParser.js";
import BulkUploadLog from "../models/bulkUploadLog.model.js";
import ActivityLog from "../models/activityLog.model.js";
import { upsertCandidate } from "../services/candidate.service.js";
import { checkDuplicateCandidate } from "../utils/duplicateChecker.js";

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 50 * 1024 * 1024 },
});

export const uploadMiddleware = upload.single("file");

// Safely convert numeric fields
const safeNumber = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

// Universal name detection (supports all Excel headers)
const detectName = (row) => {
  return (
    row["Name"] ||
    row["Full Name"] ||
    row["Candidate Name"] ||
    row["FullName"] ||
    row["fullName"] ||
    (row["First Name"] && row["Last Name"]
      ? `${row["First Name"]} ${row["Last Name"]}`
      : null)
  );
};

// Split a CSV cell into array safely
const toArray = (val) => {
  if (!val) return [];
  return String(val)
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
};

const clean = (v) => {
  if (!v) return "";
  return String(v).trim();
};

/**
 * BULK UPLOAD HANDLER (FINAL FIXED)
 */
export const bulkUploadHandler = async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ error: "No file uploaded" });

    const buffer = req.file.buffer;
    const isCSV = req.file.originalname.toLowerCase().endsWith(".csv");

    const rows = isCSV ? parseCSVBuffer(buffer) : parseXLSXBuffer(buffer);

    const total = rows.length;
    let success = 0;
    const errors = [];

    for (let i = 0; i < rows.length; i++) {
      const row = rows[i];

      try {
        // FIX: Always determine fullName & fallback
        const name = detectName(row);
        if (!name) throw new Error("Missing Name");

        const candidateData = {
          unique_id: row["Unique ID"] || row["unique_id"],
          fullName: clean(row["Name"]) || clean(row["fullName"]),

          resumeUrl: row["Resume URLs (Drive)"] || row["resumeUrl"],

          email: row["Email ID"] || row["email"],
          phone: row["Mobile No"] || row["phone"],

          designation: row["Designation"] || row["designation"] || "",
          location: row["Location"] || row["location"] || "",

          topSkills: toArray(row["Top Skills"]),
          skills: toArray(row["Skills (All)"]),
          companyNamesAll: toArray(row["Company Names (All)"]),

          recentCompany: row["Recent Company"] || "",

          portal: row["Portal"] || "",
          portalDate: row["Portal Date"] ? new Date(row["Portal Date"]) : null,
          applyDate: row["Apply Date"] ? new Date(row["Apply Date"]) : null,

          experience: safeNumber(row["Experience"]),
          ctcCurrent: safeNumber(row["Curr CTC"]),
          ctcExpected: safeNumber(row["Exp CTC"]),

          feedback: row["Feedback"] || "",
          remark: row["Remark"] || "",
        };

        // Required fields validation
        const required = ["unique_id", "fullName", "resumeUrl"];
        for (const f of required) {
          if (!candidateData[f]) throw new Error(`Missing ${f}`);
        }

        // inside for-loop BEFORE insert
        const duplicate = await checkDuplicateCandidate({
          email: candidateData.email,
          unique_id: candidateData.unique_id,
          phone: candidateData.phone,
        });

        if (duplicate) {
          throw new Error(
            "Duplicate candidate (email / phone / unique_id already exists)"
          );
        }

        // ✅ INSERT NEW CANDIDATE
        await upsertCandidate(candidateData);
        success++;
      } catch (err) {
        errors.push({
          row: i + 1,
          error: err.message,
          email: row["Email ID"] || row["email"] || "",
        });
      }
    }

    // Log bulk upload
    const log = await BulkUploadLog.create({
      uploadedBy: req.user._id,
      fileName: req.file.originalname,
      totalRows: total,
      successRows: success,
      failedRows: total - success,
      errors,
    });

    await ActivityLog.create({
      userId: req.user._id,
      type: "BULK_UPLOAD",
      details: {
        bulkUploadId: log._id,
        fileName: req.file.originalname,
        totalRows: total,
        successRows: success,
        failedRows: total - success,
      },
    });

    res.json({
      total,
      success,
      failed: total - success,
      errors,
    });
  } catch (err) {
    next(err);
  }
};
