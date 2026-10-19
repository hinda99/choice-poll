/**
 * Utility functions for UTF-8 character encoding and mojibake repair.
 * Fixes double-encoded or Latin-1/Windows-1252 misinterpreted UTF-8 strings.
 * Example: "OpÃ©rations" -> "Opérations"
 * Example: "InÃ©galitÃ©" -> "Inégalité"
 * Example: "Ãquations" -> "Équations"
 * Example: "dâ€™un" -> "d’un"
 */

const WIN1252_TO_BYTE: Record<number, number> = {
  0x20ac: 0x80,
  0x201a: 0x82,
  0x0192: 0x83,
  0x201e: 0x84,
  0x2026: 0x85,
  0x2020: 0x86,
  0x2021: 0x87,
  0x02c6: 0x88,
  0x2030: 0x89,
  0x0160: 0x8a,
  0x2039: 0x8b,
  0x0152: 0x8c,
  0x017d: 0x8e,
  0x2018: 0x91,
  0x2019: 0x92,
  0x201c: 0x93,
  0x201d: 0x94,
  0x2022: 0x95,
  0x2013: 0x96,
  0x2014: 0x97,
  0x02dc: 0x98,
  0x2122: 0x99,
  0x0161: 0x9a,
  0x203a: 0x9b,
  0x0153: 0x9c,
  0x017e: 0x9e,
  0x0178: 0x9f,
};

const WIN1252_CHARS = Object.keys(WIN1252_TO_BYTE)
  .map((c) => String.fromCharCode(Number(c)))
  .join("");

const MOJIBAKE_REGEX = new RegExp(
  "([\\u00C2-\\u00DF][\\u0080-\\u00BF" + WIN1252_CHARS + "])|(â[\\u0080-\\u00BF" + WIN1252_CHARS + "]{2})"
);

export function fixMojibake(str: string | null | undefined): string {
  if (!str) return "";

  // Check if string contains typical UTF-8 multi-byte sequences mistakenly decoded as Windows-1252/Latin-1
  if (!MOJIBAKE_REGEX.test(str)) {
    return str;
  }

  try {
    const bytes = new Uint8Array(str.length);
    for (let i = 0; i < str.length; i++) {
      const code = str.charCodeAt(i);
      bytes[i] = WIN1252_TO_BYTE[code] ?? (code & 0xff);
    }
    const decoded = new TextDecoder("utf-8", { fatal: true }).decode(bytes);
    return decoded;
  } catch {
    return str;
  }
}
