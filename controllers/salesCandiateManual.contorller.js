// controllers/candidate.controller.js
import ActivityLog from "../models/activityLog.model.js";
import Candidate from "../models/candidate.model.js";
import { upsertCandidate } from "../services/candidate.service.js";
import { checkDuplicateCandidate } from "../utils/duplicateChecker.js";

// Helper functions
const safeNumber = (v) => {
  const n = Number(v);
  return isNaN(n) ? 0 : n;
};

const toArray = (val) => {
  if (!val) return [];
  if (Array.isArray(val)) return val;
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
 * SINGLE CANDIDATE UPLOAD (Manual Entry - No File)
 * If duplicate found, update specific fields only
 */
export const addCandidateManually = async (req, res, next) => {
  try {
    const {
      unique_id,
      fullName,
      email,
      phone,
      resumeUrl,
      designation,
      location,
      topSkills,
      skills,
      companyNamesAll,
      recentCompany,
      portal,
      portalDate,
      applyDate,
      experience,
      ctcCurrent,
      ctcExpected,
      feedback,
      remark,
    } = req.body;
    console.log("Received candidate data:", req.body);
    // Validate required fields
    const requiredFields = [
      { field: unique_id, name: "Unique ID" },
      { field: fullName, name: "Full Name" },
      { field: email, name: "Email" },
      { field: phone, name: "Phone" },
    ];

    for (const reqField of requiredFields) {
      if (!reqField.field) {
        return res.status(400).json({ 
          error: `Missing required field: ${reqField.name}` 
        });
      }
    }

    // Check for duplicate candidate
    const existingCandidate = await checkDuplicateCandidate({
      email,
      unique_id,
      phone,
    });


    console.log("Duplicate check result:", existingCandidate ? {
      unique_id: existingCandidate.unique_id,
      fullName: existingCandidate.fullName,
      email: existingCandidate.email,
      phone: existingCandidate.phone,
    } : null);
    // If duplicate found, UPDATE only the specified fields
    if (existingCandidate) {
      console.log(`⚠️ Duplicate candidate found: ${existingCandidate.unique_id} - ${existingCandidate.fullName}`);
      console.log(`🔄 Updating fields: applyDate, experience, ctcCurrent, ctcExpected, feedback, remark`);

      // Prepare update data (only the fields that should be updated)
      const updateData = {};

      // Only add fields if they are provided in the request
      if (applyDate !== undefined) updateData.applyDate = applyDate ? new Date(applyDate) : null;
      if (experience !== undefined) updateData.experience = safeNumber(experience);
      if (ctcCurrent !== undefined) updateData.ctcCurrent = safeNumber(ctcCurrent);
      if (ctcExpected !== undefined) updateData.ctcExpected = safeNumber(ctcExpected);
      if (feedback !== undefined) updateData.feedback = clean(feedback);
      if (remark !== undefined) updateData.remarks = clean(remark);

      
   

      // Update the existing candidate
const updatedCandidate =
  await Candidate.findOneAndUpdate(
    {
      unique_id: existingCandidate.unique_id,
    },
    {
      $set: {
        ...updateData,
      },
    },
    {
      new: true,
    }
  );

      // Log activity
      await ActivityLog.create({
        userId:"697c577c3b497f0d3af06c46",
        type: "update_remark",
        details: {
          candidateId: existingCandidate._id,
          unique_id: existingCandidate.unique_id,
          fullName: existingCandidate.fullName,
          method: "manual_update_on_duplicate",
          updatedFields: Object.keys(updateData),
        },
      });

      return res.status(200).json({
        success: true,
        message: "Duplicate candidate found. Specified fields updated successfully.",
        data: updatedCandidate,
        isDuplicate: true,
        updatedFields: Object.keys(updateData),
      });
    }

    // If NO duplicate, create new candidate
    const candidateData = {
      unique_id: clean(unique_id),
      fullName: clean(fullName),
      email: clean(email),
      phone: clean(phone),
      resumeUrl: clean(resumeUrl) || "",
      designation: clean(designation) || "",
      location: clean(location) || "",
      topSkills: toArray(topSkills),
      skills: toArray(skills),
      companyNamesAll: toArray(companyNamesAll),
      recentCompany: clean(recentCompany) || "",
      portal: clean(portal) || "",
      portalDate: portalDate ? new Date(portalDate) : null,
      applyDate: applyDate ? new Date(applyDate) : null,
      experience: safeNumber(experience),
      ctcCurrent: safeNumber(ctcCurrent),
      ctcExpected: safeNumber(ctcExpected),
      feedback: clean(feedback) || "",
      remarks: clean(remark) || "",
    };

    // Insert new candidate
    let savedCandidate = await upsertCandidate(candidateData);
   
if (!savedCandidate || !savedCandidate._id) {
  console.log("⚠️ upsertCandidate returned undefined, fetching candidate from database...");
  
  // Try to find by unique_id or email
  savedCandidate = await (await import("../models/candidate.model.js")).default.findOne({ 
    $or: [
      { unique_id: candidateData.unique_id },
      { email: candidateData.email }
    ]
  }).lean(); // .lean() gives plain JavaScript object
  
  if (!savedCandidate) {
    throw new Error("Candidate was created but cannot be retrieved from database");
  }
  
  console.log(`✅ Retrieved candidate from DB: ${savedCandidate._id}`);
}


    console.log(`✅ New candidate added: ${candidateData.unique_id} - ${candidateData.fullName}`);

    // Log activity
    await ActivityLog.create({
      userId: "697c577c3b497f0d3af06c46",
      type: "add_candidate",
      details: {
        candidateId: savedCandidate._id,
        unique_id: candidateData.unique_id,
        fullName: candidateData.fullName,
        method: "manual_entry",
      },
    });

    res.status(201).json({
      success: true,
      message: "Candidate added successfully",
      data: savedCandidate,
      isDuplicate: false,
    });

  } catch (err) {
    console.error("Error adding candidate:", err);
    next(err);
  }
};

/**
 * UPDATE EXISTING CANDIDATE (Manual Edit - Full Update)
 */
export const updateCandidateManually = async (req, res, next) => {
  try {
    const { id } = req.params;
    const updateData = req.body;

    // Prepare update data
    const candidateData = {
      fullName: updateData.fullName ? clean(updateData.fullName) : undefined,
      email: updateData.email ? clean(updateData.email) : undefined,
      phone: updateData.phone ? clean(updateData.phone) : undefined,
      resumeUrl: updateData.resumeUrl ? clean(updateData.resumeUrl) : undefined,
      designation: updateData.designation ? clean(updateData.designation) : "",
      location: updateData.location ? clean(updateData.location) : "",
      topSkills: updateData.topSkills ? toArray(updateData.topSkills) : undefined,
      skills: updateData.skills ? toArray(updateData.skills) : undefined,
      companyNamesAll: updateData.companyNamesAll ? toArray(updateData.companyNamesAll) : undefined,
      recentCompany: updateData.recentCompany ? clean(updateData.recentCompany) : "",
      portal: updateData.portal ? clean(updateData.portal) : "",
      portalDate: updateData.portalDate ? new Date(updateData.portalDate) : null,
      applyDate: updateData.applyDate ? new Date(updateData.applyDate) : null,
      experience: updateData.experience ? safeNumber(updateData.experience) : undefined,
      ctcCurrent: updateData.ctcCurrent ? safeNumber(updateData.ctcCurrent) : undefined,
      ctcExpected: updateData.ctcExpected ? safeNumber(updateData.ctcExpected) : undefined,
      feedback: updateData.feedback ? clean(updateData.feedback) : "",
      remarks: updateData.remark ? clean(updateData.remark) : "",
      updatedAt: new Date(),
    };

    // Remove undefined fields
    Object.keys(candidateData).forEach(key => {
      if (candidateData[key] === undefined) {
        delete candidateData[key];
      }
    });

    const updatedCandidate = await upsertCandidate({ _id: id, ...candidateData });

    if (!updatedCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      type: "CANDIDATE_UPDATE",
      details: {
        candidateId: id,
        unique_id: updatedCandidate.unique_id,
        fullName: updatedCandidate.fullName,
        method: "manual_edit",
      },
    });

    res.json({
      success: true,
      message: "Candidate updated successfully",
      data: updatedCandidate,
    });

  } catch (err) {
    console.error("Error updating candidate:", err);
    next(err);
  }
};

/**
 * UPDATE SPECIFIC FIELDS ONLY (Partial Update)
 * For updating only applyDate, experience, ctcCurrent, ctcExpected, feedback, remark
 */
export const updateCandidatePartial = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      applyDate,
      experience,
      ctcCurrent,
      ctcExpected,
      feedback,
      remark,
    } = req.body;

    // Prepare update data (only updatable fields)
    const updateData = { updatedAt: new Date() };
    
    if (applyDate !== undefined) updateData.applyDate = applyDate ? new Date(applyDate) : null;
    if (experience !== undefined) updateData.experience = safeNumber(experience);
    if (ctcCurrent !== undefined) updateData.ctcCurrent = safeNumber(ctcCurrent);
    if (ctcExpected !== undefined) updateData.ctcExpected = safeNumber(ctcExpected);
    if (feedback !== undefined) updateData.feedback = clean(feedback);
    if (remark !== undefined) updateData.remark = clean(remark);

    const updatedCandidate = await upsertCandidate({ _id: id, ...updateData });

    if (!updatedCandidate) {
      return res.status(404).json({ error: "Candidate not found" });
    }

    // Log activity
    await ActivityLog.create({
      userId: req.user._id,
      type: "CANDIDATE_PARTIAL_UPDATE",
      details: {
        candidateId: id,
        unique_id: updatedCandidate.unique_id,
        fullName: updatedCandidate.fullName,
        updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      },
    });

    res.json({
      success: true,
      message: "Candidate fields updated successfully",
      updatedFields: Object.keys(updateData).filter(k => k !== 'updatedAt'),
      data: updatedCandidate,
    });

  } catch (err) {
    console.error("Error updating candidate fields:", err);
    next(err);
  }
};