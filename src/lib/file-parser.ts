/**
 * Utility functions for parsing choices from uploaded .csv and .txt files.
 */

/**
 * Cleans an individual choice string:
 * - Removes surrounding quotes
 * - Strips leading list bullets (- , * , • , – )
 * - Strips leading numbered prefixes (1. , 01) , [1] )
 * - Trims whitespace
 * - Enforces max length of 150 characters
 */
export function cleanChoiceString(str: string): string {
  let cleaned = str.trim();

  // Remove surrounding single or double quotes
  if (
    (cleaned.startsWith('"') && cleaned.endsWith('"')) ||
    (cleaned.startsWith("'") && cleaned.endsWith("'"))
  ) {
    cleaned = cleaned.slice(1, -1).trim();
  }

  // Remove numbered prefixes like "1. ", "01) ", "[1] "
  cleaned = cleaned.replace(/^\[?\d+\]?[.)\]]\s*/, "");

  // Remove bullet points like "- ", "* ", "• ", "– ", "— "
  cleaned = cleaned.replace(/^[-*•–—]\s*/, "");

  cleaned = cleaned.trim();

  // Enforce max length of 150 characters
  if (cleaned.length > 150) {
    cleaned = cleaned.substring(0, 150).trim();
  }

  return cleaned;
}

/**
 * Robust CSV/TSV parser supporting quotes and escaped quotes according to RFC 4180.
 * Automatically detects whether comma (,), semicolon (;), or tab (\t) is the delimiter.
 */
export function parseCsvRecords(text: string): string[][] {
  const firstLine = text.split(/\r?\n/)[0] || "";
  let delimiter = ",";

  const semicolons = (firstLine.match(/;/g) || []).length;
  const commas = (firstLine.match(/,/g) || []).length;
  const tabs = (firstLine.match(/\t/g) || []).length;

  if (semicolons > commas && semicolons >= tabs) {
    delimiter = ";";
  } else if (tabs > commas && tabs > semicolons) {
    delimiter = "\t";
  }

  const rows: string[][] = [];
  let currentRow: string[] = [];
  let currentField = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i++) {
    const char = text[i];
    const nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"') {
        if (nextChar === '"') {
          currentField += '"';
          i++; // skip escaped quote
        } else {
          inQuotes = false;
        }
      } else {
        currentField += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentField);
        currentField = "";
      } else if (char === "\r") {
        if (nextChar === "\n") i++;
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else if (char === "\n") {
        currentRow.push(currentField);
        rows.push(currentRow);
        currentRow = [];
        currentField = "";
      } else {
        currentField += char;
      }
    }
  }

  if (currentField !== "" || currentRow.length > 0) {
    currentRow.push(currentField);
    rows.push(currentRow);
  }

  return rows;
}

const COMMON_HEADER_KEYWORDS = new Set([
  "option",
  "options",
  "choice",
  "choices",
  "choix",
  "reponse",
  "reponses",
  "réponse",
  "réponses",
  "vote",
  "votes",
  "name",
  "names",
  "nom",
  "noms",
  "label",
  "labels",
  "item",
  "items",
  "answer",
  "answers",
  "title",
  "titre",
]);

/**
 * Parses raw text from a .csv or .txt file into a clean array of choice strings.
 * - Extracts lines or cells
 * - Strips bullets, numbers, formatting
 * - Omits blank entries
 * - Discards common table headers if detected
 * - Limits to maximum 200 options
 */
export function parseOptionsFromFile(
  content: string,
  fileName: string = ""
): string[] {
  // Strip BOM if present
  const cleanContent = content.replace(/^\uFEFF/, "").trim();
  if (!cleanContent) return [];

  const isCsv = fileName.toLowerCase().endsWith(".csv") || fileName.toLowerCase().endsWith(".tsv");
  const extracted: string[] = [];

  if (isCsv) {
    const rows = parseCsvRecords(cleanContent);
    for (const row of rows) {
      for (const cell of row) {
        const cleaned = cleanChoiceString(cell);
        if (cleaned) {
          extracted.push(cleaned);
        }
      }
    }
  } else {
    // .txt or generic line-by-line
    const lines = cleanContent.split(/\r?\n/);
    for (const line of lines) {
      const cleaned = cleanChoiceString(line);
      if (cleaned) {
        extracted.push(cleaned);
      }
    }
  }

  // Detect and discard table headers if there are at least 2 remaining valid choices
  if (extracted.length > 2) {
    const firstLower = extracted[0].toLowerCase().trim();
    if (COMMON_HEADER_KEYWORDS.has(firstLower)) {
      extracted.shift();
    }
  }

  // Enforce maximum 200 choices
  return extracted.slice(0, 200);
}
