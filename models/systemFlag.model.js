import mongoose from "mongoose";

const systemFlagSchema = new mongoose.Schema({
  key: { type: String, unique: true }, 
  value: { type: Boolean, default: false }
});

export default mongoose.model("SystemFlag", systemFlagSchema);
