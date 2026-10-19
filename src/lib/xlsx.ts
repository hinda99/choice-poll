import zlib from "zlib";
import { Poll } from "./types";
import { fixMojibake } from "./encoding";

function crc32(buf: Buffer): number {
  const table: number[] = [];
  for (let i = 0; i < 256; i++) {
    let c = i;
    for (let k = 0; k < 8; k++) {
      c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
    }
    table[i] = c;
  }
  let crc = -1;
  for (let i = 0; i < buf.length; i++) {
    crc = (crc >>> 8) ^ table[(crc ^ buf[i]) & 0xff];
  }
  return (crc ^ -1) >>> 0;
}

interface ZipFileEntry {
  name: string;
  content: string;
}

function createZipArchive(files: ZipFileEntry[]): Buffer {
  const localHeaders: Buffer[] = [];
  const centralHeaders: Buffer[] = [];
  let offset = 0;

  for (const file of files) {
    const data = Buffer.from(file.content, "utf8");
    const compressed = zlib.deflateRawSync(data);
    const crc = crc32(data);
    const nameBuf = Buffer.from(file.name, "utf8");

    // Local file header (30 bytes + name)
    const lh = Buffer.alloc(30 + nameBuf.length);
    lh.writeUInt32LE(0x04034b50, 0); // Local file header signature
    lh.writeUInt16LE(20, 4); // Version needed to extract (2.0)
    lh.writeUInt16LE(0, 6); // General purpose bit flag
    lh.writeUInt16LE(8, 8); // Compression method: Deflate (8)
    lh.writeUInt16LE(0, 10); // File last mod time
    lh.writeUInt16LE(0, 12); // File last mod date
    lh.writeUInt32LE(crc, 14); // CRC-32
    lh.writeUInt32LE(compressed.length, 18); // Compressed size
    lh.writeUInt32LE(data.length, 22); // Uncompressed size
    lh.writeUInt16LE(nameBuf.length, 26); // File name length
    lh.writeUInt16LE(0, 28); // Extra field length
    nameBuf.copy(lh, 30);

    localHeaders.push(lh, compressed);

    // Central directory header (46 bytes + name)
    const ch = Buffer.alloc(46 + nameBuf.length);
    ch.writeUInt32LE(0x02014b50, 0); // Central file header signature
    ch.writeUInt16LE(20, 4); // Version made by
    ch.writeUInt16LE(20, 6); // Version needed to extract
    ch.writeUInt16LE(0, 8); // General purpose bit flag
    ch.writeUInt16LE(8, 10); // Compression method: Deflate
    ch.writeUInt16LE(0, 12); // Last mod file time
    ch.writeUInt16LE(0, 14); // Last mod file date
    ch.writeUInt32LE(crc, 16); // CRC-32
    ch.writeUInt32LE(compressed.length, 20); // Compressed size
    ch.writeUInt32LE(data.length, 24); // Uncompressed size
    ch.writeUInt16LE(nameBuf.length, 28); // File name length
    ch.writeUInt16LE(0, 30); // Extra field length
    ch.writeUInt16LE(0, 32); // File comment length
    ch.writeUInt16LE(0, 34); // Disk number start
    ch.writeUInt16LE(0, 36); // Internal file attributes
    ch.writeUInt32LE(0, 38); // External file attributes
    ch.writeUInt32LE(offset, 42); // Relative offset of local header
    nameBuf.copy(ch, 46);

    centralHeaders.push(ch);
    offset += lh.length + compressed.length;
  }

  const cdOffset = offset;
  let cdSize = 0;
  for (const ch of centralHeaders) cdSize += ch.length;

  // End of central directory record (22 bytes)
  const eocd = Buffer.alloc(22);
  eocd.writeUInt32LE(0x06054b50, 0); // End of central dir signature
  eocd.writeUInt16LE(0, 4); // Number of this disk
  eocd.writeUInt16LE(0, 6); // Disk with the start of central dir
  eocd.writeUInt16LE(files.length, 8); // Total entries on this disk
  eocd.writeUInt16LE(files.length, 10); // Total entries in central dir
  eocd.writeUInt32LE(cdSize, 12); // Size of the central directory
  eocd.writeUInt32LE(cdOffset, 16); // Offset of central directory
  eocd.writeUInt16LE(0, 20); // ZIP file comment length

  return Buffer.concat([...localHeaders, ...centralHeaders, eocd]);
}

function escapeXml(str: string | null | undefined): string {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&apos;");
}

/**
 * Generates an Excel (.xlsx) file buffer from a Poll object.
 * Features:
 * - Dynamic column width calculation to prevent choice text truncation.
 * - Text wrapping (wrapText=1) on all cells so choices never collide with voter names.
 * - Cell borders and bold styled header for clean visual separation.
 * - Zero external dependencies. Uses Node's built-in zlib for high performance and total security.
 * - UTF-8 is strictly enforced by XML, ensuring 100% correct rendering of French accents on mobile devices.
 */
export function generatePollExcel(poll: Poll): Buffer {
  let sheetRowsXml = "";
  let maxChoiceLen = 20;
  let maxVoterLen = 16;

  // Row 1: Header Row (styled with bold, background fill, borders, vertical center)
  sheetRowsXml +=
    `<row r="1" ht="28" customHeight="1">` +
    `<c r="A1" t="inlineStr" s="1"><is><t>Selected Choice</t></is></c>` +
    `<c r="B1" t="inlineStr" s="1"><is><t>Voters (Names)</t></is></c>` +
    `<c r="C1" t="inlineStr" s="1"><is><t>Total Votes</t></is></c>` +
    `</row>`;

  let rowIndex = 2;
  for (const opt of poll.options) {
    // Find all votes for this specific option
    const votersForOption = (poll.voteRecords || [])
      .filter((record) => record.optionIds.includes(opt.id))
      .map((record) => record.voterName);

    // In elimination mode, also include claims recorded in opt.claimedBy if any
    const claimsForOption = opt.claimedBy || [];

    // Combine both sources without duplicates
    const combinedVoters = Array.from(
      new Set([...votersForOption, ...claimsForOption])
    );

    const cleanVoters = combinedVoters
      .filter((name) => typeof name === "string" && name.trim().length > 0)
      .map((name) => fixMojibake(name.trim()));

    const votersCell = cleanVoters.join(", ");
    const totalVotes = Math.max(
      cleanVoters.length,
      typeof opt.votes === "number" ? opt.votes : 0
    );

    const choiceText = fixMojibake(opt.text);

    if (choiceText.length > maxChoiceLen) {
      maxChoiceLen = choiceText.length;
    }
    if (votersCell.length > maxVoterLen) {
      maxVoterLen = votersCell.length;
    }

    // Data Row (s="2" for text with wrapText + borders, s="3" for centered count)
    sheetRowsXml +=
      `<row r="${rowIndex}">` +
      `<c r="A${rowIndex}" t="inlineStr" s="2"><is><t>${escapeXml(choiceText)}</t></is></c>` +
      `<c r="B${rowIndex}" t="inlineStr" s="2"><is><t>${escapeXml(votersCell)}</t></is></c>` +
      `<c r="C${rowIndex}" s="3"><v>${totalVotes}</v></c>` +
      `</row>`;

    rowIndex++;
  }

  // Calculate generous column widths based on actual data
  // Ensures choice column never squishes text and voter column has comfortable room
  const colAWidth = Math.min(75, Math.max(48, maxChoiceLen + 4));
  const colBWidth = Math.min(50, Math.max(30, maxVoterLen + 4));
  const colCWidth = 16;

  const sheet1Xml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<worksheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<cols>` +
    `<col min="1" max="1" width="${colAWidth}" customWidth="1"/>` +
    `<col min="2" max="2" width="${colBWidth}" customWidth="1"/>` +
    `<col min="3" max="3" width="${colCWidth}" customWidth="1"/>` +
    `</cols>` +
    `<sheetData>${sheetRowsXml}</sheetData>` +
    `</worksheet>`;

  // Standard OpenXML Spreadsheet styles
  // s="0": Normal default
  // s="1": Header (Bold, soft gray background, border, wrapText)
  // s="2": Data text (WrapText, border, left aligned, vertical center)
  // s="3": Data number (Centered, border, vertical center)
  const stylesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<styleSheet xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main">` +
    `<fonts count="2">` +
    `<font><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>` +
    `<font><b/><sz val="11"/><color rgb="FF0F172A"/><name val="Calibri"/><family val="2"/></font>` +
    `</fonts>` +
    `<fills count="3">` +
    `<fill><patternFill patternType="none"/></fill>` +
    `<fill><patternFill patternType="gray125"/></fill>` +
    `<fill><patternFill patternType="solid"><fgColor rgb="FFF1F5F9"/></patternFill></fill>` +
    `</fills>` +
    `<borders count="2">` +
    `<border><left/><right/><top/><bottom/><diagonal/></border>` +
    `<border>` +
    `<left style="thin"><color rgb="FFE2E8F0"/></left>` +
    `<right style="thin"><color rgb="FFE2E8F0"/></right>` +
    `<top style="thin"><color rgb="FFE2E8F0"/></top>` +
    `<bottom style="thin"><color rgb="FFE2E8F0"/></bottom>` +
    `<diagonal/>` +
    `</border>` +
    `</borders>` +
    `<cellStyleXfs count="1"><xf numFmtId="0" fontId="0" fillId="0" borderId="0"/></cellStyleXfs>` +
    `<cellXfs count="4">` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="0" xfId="0"/>` +
    `<xf numFmtId="0" fontId="1" fillId="2" borderId="1" xfId="0" applyFont="1" applyFill="1" applyBorder="1" applyAlignment="1">` +
    `<alignment horizontal="left" vertical="center" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">` +
    `<alignment horizontal="left" vertical="center" wrapText="1"/>` +
    `</xf>` +
    `<xf numFmtId="0" fontId="0" fillId="0" borderId="1" xfId="0" applyBorder="1" applyAlignment="1">` +
    `<alignment horizontal="center" vertical="center"/>` +
    `</xf>` +
    `</cellXfs>` +
    `</styleSheet>`;

  const contentTypesXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Types xmlns="http://schemas.openxmlformats.org/package/2006/content-types">` +
    `<Default Extension="rels" ContentType="application/vnd.openxmlformats-package.relationships+xml"/>` +
    `<Default Extension="xml" ContentType="application/xml"/>` +
    `<Override PartName="/xl/workbook.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.sheet.main+xml"/>` +
    `<Override PartName="/xl/worksheets/sheet1.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.worksheet+xml"/>` +
    `<Override PartName="/xl/styles.xml" ContentType="application/vnd.openxmlformats-officedocument.spreadsheetml.styles+xml"/>` +
    `</Types>`;

  const relsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/officeDocument" Target="xl/workbook.xml"/>` +
    `</Relationships>`;

  const workbookRelsXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<Relationships xmlns="http://schemas.openxmlformats.org/package/2006/relationships">` +
    `<Relationship Id="rId1" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/worksheet" Target="worksheets/sheet1.xml"/>` +
    `<Relationship Id="rId2" Type="http://schemas.openxmlformats.org/officeDocument/2006/relationships/styles" Target="styles.xml"/>` +
    `</Relationships>`;

  const workbookXml =
    `<?xml version="1.0" encoding="UTF-8" standalone="yes"?>` +
    `<workbook xmlns="http://schemas.openxmlformats.org/spreadsheetml/2006/main" xmlns:r="http://schemas.openxmlformats.org/officeDocument/2006/relationships">` +
    `<sheets><sheet name="Results" sheetId="1" r:id="rId1"/></sheets>` +
    `</workbook>`;

  const files: ZipFileEntry[] = [
    { name: "[Content_Types].xml", content: contentTypesXml },
    { name: "_rels/.rels", content: relsXml },
    { name: "xl/_rels/workbook.xml.rels", content: workbookRelsXml },
    { name: "xl/workbook.xml", content: workbookXml },
    { name: "xl/styles.xml", content: stylesXml },
    { name: "xl/worksheets/sheet1.xml", content: sheet1Xml },
  ];

  return createZipArchive(files);
}
