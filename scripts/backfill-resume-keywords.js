import { extractTextFromPdfUrl } from "../utils/extractPdfText.js";
import { extractKeywords } from "../utils/keywordExtractor.js";

for (const c of candidates) {
  try {
    const text = await extractTextFromPdfUrl(c.pdfFile);
    const keywords = extractKeywords(text);

    if (keywords.length === 0) continue;

    c.resumeText = text;
    c.resumeKeywords = keywords;
    await c.save();

    await indexCandidate(c);

    console.log("Processed:", c.name, keywords.length, "keywords");
  } catch (err) {
    console.error("Failed for:", c.name, err.message);
  }
}
