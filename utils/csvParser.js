// utils/csvParser.js
import fs from "fs";
import { parse } from "csv-parse/sync";
import xlsx from "xlsx";

export const parseCSVBuffer = (buffer) => {
  const str = buffer.toString("utf8");
  const records = parse(str, {
    columns: true,
    skip_empty_lines: true,
  });
  return records;
};

export const parseXLSXBuffer = (buffer) => {
  const workbook = xlsx.read(buffer, { type: "buffer" });
  const sheetName = workbook.SheetNames[0];
  const sheet = workbook.Sheets[ sheetName ];
  const json = xlsx.utils.sheet_to_json(sheet, { defval: "" });
  return json;
};