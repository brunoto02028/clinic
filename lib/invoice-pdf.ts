// Real PDF version of the invoice — replaces the old ".html" file attachment
// (activity 70). Gmail (and most mail clients) never render an HTML
// attachment inline for security reasons; they show the raw markup instead,
// so every invoice ever emailed this way looked broken to the patient. A PDF
// previews natively. Mirrors lib/invoice-html.ts's layout/colours so the two
// stay visually consistent (the HTML version is still used for the admin's
// own in-browser preview, where rendering was never the problem).
import { jsPDF } from "jspdf";
import type { InvoiceData } from "@/lib/invoice-html";

const BRAND: [number, number, number] = [79, 115, 97]; // #4F7361
const INK: [number, number, number] = [38, 51, 43]; // #26332B
const GOLD: [number, number, number] = [138, 109, 59]; // #8A6D3B
const GRAY: [number, number, number] = [85, 85, 85]; // #555
const FOOTER_GRAY: [number, number, number] = [136, 136, 136]; // #888 — matches lib/invoice-html.ts .footer
const LINE: [number, number, number] = [228, 225, 216]; // #E4E1D8
const PANEL: [number, number, number] = [245, 244, 241]; // #F5F4F1
const WHITE: [number, number, number] = [255, 255, 255];

const MARGIN = 20;
const PAGE_W = 210;
const PAGE_H = 297; // A4
const BOTTOM = PAGE_H - 20; // nothing is drawn below this without a page break first
const CONTENT_W = PAGE_W - MARGIN * 2;

function fmtDate(d: Date): string {
  return d.toLocaleDateString("en-GB", { day: "numeric", month: "long", year: "numeric" });
}
function fmtMoney(n: number): string {
  return `£${n.toFixed(2)}`;
}

// helvetica (jsPDF's default, no embedded font) only covers WinAnsi/Latin-1.
// A character outside that range doesn't just render as a missing glyph — it
// throws the whole string into a different encoding path with broken letter
// spacing. Business/client text here is free-typed by staff, so this is a
// cheap safety net rather than a real i18n fix: still legible, never mangled.
function safeText(s: string | null | undefined): string {
  if (!s) return "";
  return String(s).replace(/[^\u0000-ÿ]/g, "?");
}

export function buildInvoicePdf(data: InvoiceData): Buffer {
  const doc = new jsPDF({ orientation: "portrait", unit: "mm", format: "a4" });
  const total = data.items.reduce((sum, it) => sum + it.quantity * it.unitPrice, 0);
  const rightX = PAGE_W - MARGIN;
  let y = MARGIN;

  // Breaks to a new page when the next block of `needed` mm wouldn't fit
  // above BOTTOM. jsPDF has no auto page-break, so every section that can
  // grow with staff-entered content (items, notes, the payment panel) has to
  // check this itself — otherwise content past the bottom margin is simply
  // never seen again (found in code review: a long invoice silently lost its
  // Total and payment instructions off the bottom of the page).
  function ensureSpace(needed: number) {
    if (y + needed > BOTTOM) {
      doc.addPage();
      y = MARGIN;
    }
  }

  function drawItemsHeader() {
    doc.setFillColor(...BRAND);
    doc.rect(MARGIN, y, CONTENT_W, 8, "F");
    doc.setFont("helvetica", "bold");
    doc.setFontSize(8.5);
    doc.setTextColor(...WHITE);
    doc.text("DESCRIPTION", colDesc + 3, y + 5.5);
    doc.text("QTY", colQty, y + 5.5, { align: "right" });
    doc.text("UNIT PRICE", colUnit, y + 5.5, { align: "right" });
    doc.text("AMOUNT", colAmt, y + 5.5, { align: "right" });
    y += 8;
  }

  // ── Header: business on the left, invoice meta on the right ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(16);
  doc.setTextColor(...BRAND);
  doc.text(safeText(data.business.tradingName || data.business.name), MARGIN, y + 4);

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  let leftY = y + 10;
  for (const line of (data.business.addressLines || []).filter(Boolean)) {
    doc.text(safeText(line), MARGIN, leftY);
    leftY += 4.5;
  }
  if (data.business.phone) { doc.text(safeText(data.business.phone), MARGIN, leftY); leftY += 4.5; }
  if (data.business.email) { doc.text(safeText(data.business.email), MARGIN, leftY); leftY += 4.5; }

  doc.setFont("helvetica", "bold");
  doc.setFontSize(15);
  doc.setTextColor(...INK);
  doc.text("INVOICE", rightX, y + 4, { align: "right" });
  doc.setFont("helvetica", "normal");
  doc.setFontSize(9);
  doc.setTextColor(...GRAY);
  let rightY = y + 10;
  doc.text(`Number: ${safeText(data.invoiceNumber)}`, rightX, rightY, { align: "right" }); rightY += 4.5;
  doc.text(`Date: ${fmtDate(data.issueDate)}`, rightX, rightY, { align: "right" }); rightY += 4.5;
  if (data.dueDate) { doc.text(`Due: ${fmtDate(data.dueDate)}`, rightX, rightY, { align: "right" }); rightY += 4.5; }

  y = Math.max(leftY, rightY) + 4;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.8);
  doc.line(MARGIN, y, rightX, y);
  y += 10;

  // ── Billed to ──
  doc.setFont("helvetica", "bold");
  doc.setFontSize(8.5);
  doc.setTextColor(...GOLD);
  doc.text("BILLED TO", MARGIN, y);
  y += 5;
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text(safeText(data.clientName), MARGIN, y);
  y += 5;
  if (data.clientEmail) {
    doc.setFontSize(9.5);
    doc.setTextColor(...GRAY);
    doc.text(safeText(data.clientEmail), MARGIN, y);
    y += 5;
  }
  y += 6;

  // ── Items table ──
  const colDesc = MARGIN, colQty = MARGIN + 100, colUnit = MARGIN + 125, colAmt = rightX;
  drawItemsHeader();

  doc.setFont("helvetica", "normal");
  doc.setFontSize(9.5);
  for (const it of data.items) {
    const lines = doc.splitTextToSize(safeText(it.description), colQty - colDesc - 6) as string[];
    const rowH = Math.max(8, lines.length * 4.2 + 3.5);
    ensureSpace(rowH);
    // A page break just repeats the column header so a continued table is
    // still legible without scrolling back to page 1.
    if (y === MARGIN) drawItemsHeader();
    doc.setTextColor(...INK);
    doc.text(lines, colDesc + 3, y + 5.5);
    doc.text(String(it.quantity), colQty, y + 5.5, { align: "right" });
    doc.text(fmtMoney(it.unitPrice), colUnit, y + 5.5, { align: "right" });
    doc.text(fmtMoney(it.quantity * it.unitPrice), colAmt, y + 5.5, { align: "right" });
    y += rowH;
    doc.setDrawColor(...LINE);
    doc.setLineWidth(0.2);
    doc.line(MARGIN, y, rightX, y);
  }

  ensureSpace(18);
  y += 2;
  doc.setDrawColor(...BRAND);
  doc.setLineWidth(0.6);
  doc.line(MARGIN, y, rightX, y);
  y += 6;
  doc.setFont("helvetica", "bold");
  doc.setFontSize(11);
  doc.setTextColor(...INK);
  doc.text("Total", colDesc + 3, y);
  doc.text(fmtMoney(total), colAmt, y, { align: "right" });
  y += 12;

  // ── Payment options ──
  const payBlocks: { title: string; lines: string[] }[] = [];
  if (data.acceptsCash) {
    payBlocks.push({ title: "Cash", lines: ["Payable in person at the time of your appointment."] });
  }
  if (data.acceptsBankTransfer && data.business.bankAccountNumber) {
    payBlocks.push({
      title: "Bank Transfer",
      lines: [
        `Account name: ${safeText(data.business.bankAccountName || data.business.name)}`,
        `Bank: ${safeText(data.business.bankName)}`,
        `Sort code: ${safeText(data.business.bankSortCode)}`,
        `Account number: ${safeText(data.business.bankAccountNumber)}`,
        `Reference: ${safeText(data.invoiceNumber)}`,
      ],
    });
  }
  if (payBlocks.length) {
    // Measure the block height by counting lines first — jsPDF draws in strict
    // z-order, so the panel fill has to happen before any text, not after.
    const panelHeight = 8 + 6 + payBlocks.reduce((sum, b) => sum + 4.5 + b.lines.length * 4.2 + 2, 0);
    ensureSpace(panelHeight);
    const panelStart = y;
    doc.setFillColor(...PANEL);
    doc.roundedRect(MARGIN, panelStart, CONTENT_W, panelHeight, 2, 2, "F");

    let py = panelStart + 8;
    doc.setFont("helvetica", "bold");
    doc.setFontSize(10);
    doc.setTextColor(...INK);
    doc.text("How to pay", MARGIN + 5, py);
    py += 6;
    for (const block of payBlocks) {
      doc.setFont("helvetica", "bold");
      doc.setFontSize(9);
      doc.setTextColor(...BRAND);
      doc.text(block.title, MARGIN + 5, py);
      py += 4.5;
      doc.setFont("helvetica", "normal");
      doc.setFontSize(8.5);
      doc.setTextColor(68, 68, 68);
      for (const line of block.lines) { doc.text(line, MARGIN + 5, py); py += 4.2; }
      py += 2;
    }
    y = panelStart + panelHeight + 6;
  }

  if (data.notes) {
    doc.setFont("helvetica", "normal");
    doc.setFontSize(9);
    doc.setTextColor(...GRAY);
    const noteLines = doc.splitTextToSize(safeText(data.notes), CONTENT_W) as string[];
    ensureSpace(noteLines.length * 4.2 + 6);
    doc.text(noteLines, MARGIN, y);
    y += noteLines.length * 4.2 + 6;
  }

  // ── Footer — right after the content, not pinned to a fixed y, so it can
  // never land on top of (or past) whatever content precedes it. ──
  ensureSpace(14);
  const footerY = y + 6;
  doc.setDrawColor(...LINE);
  doc.setLineWidth(0.2);
  doc.line(MARGIN, footerY - 4, rightX, footerY - 4);
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(...FOOTER_GRAY);
  const footerLine = [data.business.tradingName || data.business.name, data.business.email].filter(Boolean).map((s) => safeText(s)).join(" · ");
  doc.text(footerLine, PAGE_W / 2, footerY, { align: "center" });
  doc.text("Thank you for your trust in our care.", PAGE_W / 2, footerY + 4.2, { align: "center" });

  return Buffer.from(doc.output("arraybuffer"));
}
