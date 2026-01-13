import natural from "natural";
import stopword from "stopword";

const tokenizer = new natural.WordTokenizer();

export const extractKeywords = (text = "") => {
  if (!text) return [];

  const cleaned = text
    .replace(/\n+/g, " ")
    .replace(/[^a-zA-Z0-9+#. ]/g, " ")
    .toLowerCase();

  let tokens = tokenizer.tokenize(cleaned);
  tokens = stopword.removeStopwords(tokens);
  tokens = tokens.filter((w) => w.length > 2);

  const freq = {};
  tokens.forEach((t) => (freq[t] = (freq[t] || 0) + 1));

  return Object.entries(freq)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 40)
    .map(([word]) => word);
};
