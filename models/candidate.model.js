import mongoose from "mongoose";

const candidateSchema = new mongoose.Schema(
  {
    // Unique system ID
    unique_id: { type: String, required: true, unique: true },

    // Basic Info
    name: { type: String, required: true },
    email: { type: String, required: true },
    mobile: { type: String, required: true },
    gender: { type: String },
    location: { type: String, required: true },

    // Highest Qualification (Dropdown)
    qualification: { type: String, required: true },

    // Resume
    resumeUrl: { type: String }, // Google Drive link
    pdfFile: { type: String, required: true }, // PDF filename stored on server

    resumeText: {
      type: String,
      select: false, // NEVER expose directly
    },

    resumeKeywords: [{ type: String }],

    // Portal Information
    portal: { type: String },
    portalDate: { type: Date },

    // Experience & Job Info
    experience: { type: String }, // Example: "2 years"
    relevantExp: { type: Number }, // numeric value
    designation: { type: String, required: true },
    recentCompany: { type: String },

    // Education Section (NEW FIELD)
    education: [
      {
        degree: { type: String },
        institute: { type: String },
        passingYear: { type: String },
        score: { type: String }, // percentage or CGPA
      },
    ],

    // Dates
    applyDate: { type: Date },
    callingDate: { type: Date },

    // CTC Information
    currCTC: { type: Number },
    expCTC: { type: Number },

    // Skills as arrays
    topSkills: [{ type: String }],
    skillsAll: [{ type: String }],
    companyNamesAll: [{ type: String }],

    // Extra Info
    feedback: { type: String },
    remarks: [
      {
        text: { type: String, required: true },
        email: { type: String, required: true },
        name: { type: String, required: true },
        date: { type: Date, default: Date.now },
      },
    ],

    jdBrief: { type: String },

    // Admin Who Added
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
    },
  },
  { timestamps: true }
);

export default mongoose.model("Candidate", candidateSchema);
