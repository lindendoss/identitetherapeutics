// ===== NDA PDF GENERATION (Section 10 Option A — Bespoke) =====
// Server-side PDF generation — never on the client.

import { PDFDocument, StandardFonts, rgb } from "pdf-lib";
import { NDA_FULL_TEXT, NDA_VERSION, NDA_SHA256, generateExecutionRecord } from "./nda-agreement";
import type { NdaExecutionRecord } from "./nda-agreement";
import fs from "fs";
import path from "path";

const DATA_DIR = path.join(process.cwd(), "data", "nda");

function ensureDir() {
  if (!fs.existsSync(DATA_DIR)) fs.mkdirSync(DATA_DIR, { recursive: true });
}

// Wrap text to fit within a given width
function wrapText(text: string, font: any, fontSize: number, maxWidth: number): string[] {
  const lines: string[] = [];
  const paragraphs = text.split("\n");

  for (const paragraph of paragraphs) {
    if (!paragraph.trim()) {
      lines.push("");
      continue;
    }
    const words = paragraph.split(" ");
    let currentLine = "";

    for (const word of words) {
      const testLine = currentLine ? currentLine + " " + word : word;
      const width = font.widthOfTextAtSize(testLine, fontSize);
      if (width > maxWidth && currentLine) {
        lines.push(currentLine);
        currentLine = word;
      } else {
        currentLine = testLine;
      }
    }
    if (currentLine) lines.push(currentLine);
  }
  return lines;
}

export async function generateSignedNdaPdf(record: NdaExecutionRecord): Promise<Buffer> {
  const pdfDoc = await PDFDocument.create();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);
  const fontItalic = await pdfDoc.embedFont(StandardFonts.HelveticaOblique);

  const pageWidth = 612; // US Letter 8.5x11
  const pageHeight = 792;
  const margin = 72;
  const textWidth = pageWidth - margin * 2;
  const fontSize = 9;
  const lineHeight = 13;
  const sectionFontSize = 10;

  // Parse NDA text into sections
  const sections = NDA_FULL_TEXT.split(/\n(?=\d+\.\s)/);

  let page = pdfDoc.addPage([pageWidth, pageHeight]);
  let y = pageHeight - margin;

  // Helper to add text
  function addText(text: string, size: number, opts?: { bold?: boolean; italic?: boolean; color?: any }) {
    const f = opts?.bold ? fontBold : opts?.italic ? fontItalic : font;
    const lines = wrapText(text, f, size, textWidth);
    for (const line of lines) {
      if (y < margin + lineHeight) {
        page = pdfDoc.addPage([pageWidth, pageHeight]);
        y = pageHeight - margin;
      }
      page.drawText(line, {
        x: margin,
        y: y - size,
        size,
        font: f,
        color: opts?.color || rgb(0, 0, 0),
      });
      y -= lineHeight;
    }
  }

  function addSpace(n = 1) {
    y -= lineHeight * n;
  }

  // Title page
  addText("CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT", 14, { bold: true });
  addSpace(0.5);
  addText("IDENTIT\u00c9 Therapeutics, Inc.", 11, { italic: true });
  addSpace(2);

  // Preamble
  const preamble = sections[0].replace(/CONFIDENTIALITY AND NON-DISCLOSURE AGREEMENT\s*\n\s*IDENTIT\u00c9 Therapeutics, Inc\.\s*\n*/, "").trim();
  addText(preamble, fontSize);
  addSpace(2);

  // Sections 1-15
  for (let i = 1; i < sections.length; i++) {
    const section = sections[i].trim();
    const match = section.match(/^(\d+)\.\s*(.+?)\./);
    if (match) {
      addText(`${match[1]}. ${match[2]}`, sectionFontSize, { bold: true });
      const body = section.substring(match[0].length).trim();
      if (body) {
        addSpace(0.5);
        addText(body, fontSize);
      }
    } else {
      addText(section, fontSize);
    }
    addSpace(1);
  }

  // Signature block
  addSpace(2);
  addText("ACCEPTED AND AGREED", 11, { bold: true });
  addSpace(0.5);
  addText("By signing below, Recipient acknowledges that it has read, understood, and agrees to be bound by this Agreement as of the Effective Date.", fontSize, { italic: true });
  addSpace(1);

  addText("IDENTIT\u00c9 THERAPEUTICS, INC.", fontSize, { bold: true });
  addText("By: Linden Doss, MD", fontSize);
  addText("Title: Founder", fontSize);
  addText("The Company executes and accepts this Agreement by granting Recipient access to the Vault.", fontSize, { italic: true });
  addSpace(1);

  addText("RECIPIENT", fontSize, { bold: true });
  addText(`Name: ${record.signerName}`, fontSize);
  addText(`Entity: ${record.signerEntity}`, fontSize);
  addText(`Title: ${record.signerTitle}`, fontSize);
  addText(`Email: ${record.signerEmail}`, fontSize);
  addText(`Phone: ${record.signerPhone}`, fontSize);
  addText(`Electronic Signature: ${record.signerName} (typed)`, fontSize);
  addSpace(1);
  addText(`Date/Time (UTC): ${record.signedAt}`, fontSize);

  // Page break + Execution Record page
  page = pdfDoc.addPage([pageWidth, pageHeight]);
  y = pageHeight - margin;

  addText("EXECUTION RECORD", 14, { bold: true });
  addSpace(1);
  addText(`Agreement Version: ${record.agreementVersion}`, fontSize);
  addText(`Agreement SHA-256: ${record.agreementSha256}`, fontSize);
  addSpace(1);
  addText("SIGNER", sectionFontSize, { bold: true });
  addText(`Name: ${record.signerName}`, fontSize);
  addText(`Entity: ${record.signerEntity}`, fontSize);
  addText(`Title: ${record.signerTitle}`, fontSize);
  addText(`Email: ${record.signerEmail}`, fontSize);
  addText(`Phone: ${record.signerPhone}`, fontSize);
  addSpace(1);
  addText("EXECUTION", sectionFontSize, { bold: true });
  addText(`Date/Time (UTC): ${record.signedAt}`, fontSize);
  addText(`IP Address: ${record.ip || "N/A"}`, fontSize);
  addText(`User-Agent: ${record.userAgent || "N/A"}`, fontSize);
  addSpace(2);
  addText("VERIFICATION", sectionFontSize, { bold: true });
  addText("This execution record is cryptographically bound to the agreement text via SHA-256 hash.", fontSize);
  addText("Any alteration to the agreement text will invalidate this record.", fontSize);

  const pdfBytes = await pdfDoc.save();
  return Buffer.from(pdfBytes);
}

// Save signed NDA to disk (in production: R2 private bucket)
export async function storeSignedNda(requestId: number, pdf: Buffer): Promise<string> {
  ensureDir();
  const key = `nda/${requestId}.pdf`;
  const filepath = path.join(DATA_DIR, `${requestId}.pdf`);
  fs.writeFileSync(filepath, pdf);
  return key;
}

// Retrieve signed NDA (in production: from R2)
export function getSignedNda(requestId: number): Buffer | null {
  const filepath = path.join(DATA_DIR, `${requestId}.pdf`);
  if (!fs.existsSync(filepath)) return null;
  return fs.readFileSync(filepath);
}
