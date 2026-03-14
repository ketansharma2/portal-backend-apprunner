import axios from "axios";
import { createRequire } from "module";

const require = createRequire(import.meta.url);
const pdfParse = require("pdf-parse"); // ✅ works in v1.1.1

export const extractTextFromPdfUrl = async (pdfUrl) => {
  if (!pdfUrl || typeof pdfUrl !== "string") {
    throw new Error("Invalid URL");
  }

  const res = await axios.get(pdfUrl, {
    responseType: "arraybuffer",
    timeout: 20000,
  });

  const data = await pdfParse(res.data);
  return data.text || "";
};
